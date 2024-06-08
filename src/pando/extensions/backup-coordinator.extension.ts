import {
  CronExpression,
  DEFAULT_LIMIT,
  DOWN,
  eachSeries,
  is,
  NONE,
  SECOND,
  SINGLE,
  sleep,
  START,
  TBlackHole,
  TServiceParams,
  UP,
} from "@digital-alchemy/core";
import { Network3Device } from "@prisma/client";
import dayjs from "dayjs";

import {
  BackupCompletePayload,
  BackupProgressPayload,
  INIT_BACKUP,
  Network3Hosts,
} from "../../core/helpers";
import {
  BACKUP_EVENT,
  BORG_ARCHIVE_SIZE,
  BORG_DEVICE_BACKUP_FAILED,
  BORG_DEVICE_LAST_BACKUP,
  BORG_DEVICE_LAST_OFFSITE,
} from "../helpers";

const MAX_STATE_LENGTH = 255;
const CACHE_KEY = "backup/running";
const REPO_BASE = "heartwood:/root_ball/backups/borg";
type WaitingData = {
  action: string;
  comment: string;
  device_id: number;
  last_update: string;
  started_at: string;
};
/**
 * Prevent backups from kicking off if within this minutes of process start
 *
 * Can cause some annoying problems if backups are kicking off during development, they can wait
 */
const LOCKOUT_MINUTES = 20;
const OFFSITE_STEP_WAIT_SECONDS = 10;
const RETRY_ATTEMPTS = 5;

const RESTORED = `RESTORED FROM MISSING STATE`;
type BackupState = {
  compressed: string;
  deduplicated: string;
  last_message: string;
  original: string;
  total_files: string;
};

export function BackupCoordinator({
  config,
  pando,
  hass,
  context,
  logger,
  internal,
  scheduler,
  event,
  cache,
  network4,
}: TServiceParams) {
  const { execa } = network4.esm;
  let lockout = dayjs().add(LOCKOUT_MINUTES, "minutes");
  let offsiteInProgress = false;
  let offsiteWorkflow: () => TBlackHole;

  const meetingMode = hass.entity.byId("switch.meeting_mode");
  const waitingLocks: ((result: boolean) => TBlackHole)[] = [];
  const cambium = network4.base(context);

  scheduler.cron({
    exec: async () => await coordinator.onBackupCron(),
    schedule: CronExpression.EVERY_10_MINUTES,
  });

  function emit() {
    event.emit(BACKUP_EVENT);
  }

  async function getNextBackupDevice() {
    const onlineServices = pando.health.onlineServices("cambium");
    const hostName =
      meetingMode.state === "on"
        ? {
            hostname: {
              not: "graft",
            },
          }
        : {};

    // Look up the next device to back up
    const backupDevice = await pando.database.client.network3Device.findFirst({
      include: { accounts: { include: { services: true } } },
      // grab the oldest backup
      orderBy: [{ last_backup: "desc" }],
      where: {
        AND: {
          // and not backed up recently
          OR: [
            { last_backup: { equals: null } },
            { last_backup: { lte: dayjs().subtract(SINGLE, "hour").toDate() } },
          ],
          accounts: {
            some: {
              // must be borg backup capable
              capabilities: { hasSome: ["BORG"] },
              // In the list of online services
              services: { some: { id: { in: is.unique(onlineServices) } } },
            },
          },
          device_class: "FULL",
        },
        ...hostName,
      },
    });
    if (backupDevice) {
      return backupDevice;
    }
    const online = Object.fromEntries(
      onlineServices
        .map(i => pando.health.byId(i))
        .filter(
          ({ Network3Account: { Network3Device }, app }) =>
            Network3Device.device_class === "FULL" && app === "cambium",
        )
        .map(({ Network3Account: { Network3Device }, app }) => [
          `${app}:${Network3Device.hostname}`,
          internal.utils.relativeDate(Network3Device.last_backup),
        ])
        .filter(([, value]) => !!value)
        .sort(([a], [b]) => (a > b ? UP : DOWN)),
    );
    logger.debug({ ...online }, `Nothing to back up`);
    await updateHomeAssistant("cron done");
    return undefined;
  }

  /**
   * Run the borg prune operation from here.
   *
   * Probably shouldn't take that much time, `pando` may have more compute than the original backup target, so do the work here.
   */
  async function repositoryCleanup(device: string): Promise<void> {
    logger.info(`[%s] prune`, device);
    const repository = `${REPO_BASE}/${device}`;
    coordinator.backupState.last_message = `Prune repository: ${repository}`;
    emit();
    const current = await cache.get<WaitingData>(CACHE_KEY);
    await cache.set(CACHE_KEY, {
      ...current,
      // device_id:
      action: `Prune ${internal.utils.TitleCase(device)}`,
    });
    await updateHomeAssistant("prune");
    let process = execa(
      `borg`,
      [
        "prune",
        "--keep-within=14d",
        "--keep-weekly=4",
        "--keep-monthly=36",
        "--keep-yearly=10",
        repository,
      ],
      { env: { BORG_PASSPHRASE: config.pando.BORG_PASSPHRASE } },
    );
    process.stdout.on("data", (data: string | Buffer) => {
      coordinator.backupState.last_message = is.string(data) ? data : data.toString();
      emit();
    });
    await process;
    //
    logger.info(`[%s] compact`, device);
    coordinator.backupState.last_message = `Compact repository: ${repository}`;
    emit();
    await cache.set(CACHE_KEY, {
      ...current,
      action: `Compact ${internal.utils.TitleCase(device)}`,
    });
    await updateHomeAssistant("compact");
    process = execa(`borg`, ["compact", repository], {
      env: { BORG_PASSPHRASE: config.pando.BORG_PASSPHRASE },
    });
    process.stdout.on("data", (data: string | Buffer) => {
      coordinator.backupState.last_message = is.string(data) ? data : data.toString();
      emit();
    });
    await process;
    coordinator.backupState.last_message = "";
    emit();
  }

  function reset() {
    coordinator.syncMessage = "";
    coordinator.backupState = {
      compressed: "",
      deduplicated: "",
      last_message: "",
      original: "",
      total_files: "",
    };
    emit();
  }

  /**
   * Send an entity update to home assistant to reflect the current state
   */
  // @Cron(CronExpression.EVERY_HOUR)
  async function updateHomeAssistant(reason: string): Promise<void> {
    logger.trace(`%s sync`, reason);
    const check = await cache.get<WaitingData>(CACHE_KEY);
    if (!check) {
      pando.entities.backupActive.is_on = false;
      pando.entities.backupState.state = "Idle";
      coordinator.backupState.last_message = "";
      emit();
      return;
    }
    pando.entities.backupActive.is_on = true;
    const value = check.action ?? "unknown";
    if (value === pando.entities.backupState.state) {
      return;
    }
    pando.entities.backupState.state = check.action ?? "unknown";
  }

  async function workflowPause(): Promise<void> {
    if (offsiteWorkflow) {
      logger.error(
        `Aborted attempt to kick off a second workflow pause while one is currently in progress`,
      );
      return;
    }
    logger.debug("Pausing for external");
    await new Promise<void>(done => {
      offsiteWorkflow = done;
    });
    logger.debug("External completed");
    offsiteWorkflow = undefined;
  }

  const coordinator = {
    backupState: undefined as BackupState,
    async executeBackup(device: Network3Device | string, reason?: string): Promise<void> {
      if (is.string(device)) {
        device = await pando.database.client.network3Device.findFirst({
          where: { hostname: device },
        });
      }
      if (!device) {
        return;
      }
      logger.info(
        { topic: INIT_BACKUP(device.id) },
        `[%s] {(%s)} starting backup`,
        device.hostname,
        device.id,
      );
      cambium.setTarget({
        app: "cambium",
        hostname: device.hostname as Network3Hosts,
        user: "root",
      });
      await network4.cambium.backupExec(reason);
      await cache.set(CACHE_KEY, {
        action: `Backup ${internal.utils.TitleCase(device.hostname)}`,
        device_id: device.id,
        last_update: new Date().toISOString(),
        started_at: new Date().toISOString(),
      } as WaitingData);
      await updateHomeAssistant("backup kickoff");

      // Pause for a sec for the backup to be confirmed
      await sleep(DEFAULT_LIMIT * SECOND);

      // Sanity check the confirmation
      // If it isn't confirmed, then log an error and skip it
      const check = await cache.get<WaitingData>(CACHE_KEY);
      if (is.empty(check?.last_update)) {
        await cache.del(CACHE_KEY);
        logger.error(`[%s] backup failed to start`, device.hostname);
        BORG_DEVICE_BACKUP_FAILED.labels(device.hostname).setToCurrentTime();
        await pando.database.client.network3Device.update({
          data: { last_backup: new Date() },
          where: { id: device.id },
        });
      }
      // Have access to reason here, and it is confirmed to have started
      // The onComplete code path doesn't have access to the reason
      // Maybe todo? Wait for the callback to finish here
      BORG_DEVICE_LAST_BACKUP.labels(device.hostname, reason || "cron").setToCurrentTime();
    },

    // @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async offsiteSync(deviceName?: string, reason = "before-nightly-offsite") {
      if (!pando.entities.backupActive.is_on) {
        logger.debug(`B2 sync blocked by disabled backup cron`);
        return;
      }
      if (is.empty(deviceName)) {
        logger.info(`Starting B2 Sync (all)`);
      } else {
        logger.info({ deviceName }, `Starting B2 Sync`);
      }
      offsiteInProgress = true;
      const backupDevices = await pando.database.client.network3Device.findMany({
        include: { accounts: { include: { services: true } } },
        // grab the oldest backup
        orderBy: [{ last_backup: "desc" }],
        where: {
          accounts: {
            some: {
              // must be borg backup capable
              capabilities: { hasSome: ["BORG"] },
            },
          },
          device_class: "FULL",
          hostname: is.empty(deviceName) ? undefined : deviceName,
          last_backup: { gte: dayjs().subtract(SINGLE, "day").toDate() },
        },
      });

      await eachSeries(backupDevices, async device => {
        logger.info({ host: device.hostname }, `Preparing for offsite`);
        if (pando.health.isOnline({ host: device.hostname })) {
          logger.debug(
            { host: device.hostname, step: "1/3" },
            `Device is currently online, creating dedicated backup`,
          );
          await coordinator.executeBackup(device, reason);
          await workflowPause();
          reset();
          coordinator.backupState.last_message = `Catching breath`;
          emit();
          await sleep(OFFSITE_STEP_WAIT_SECONDS * SECOND);
        }
        for (let i = NONE; i <= RETRY_ATTEMPTS; i++) {
          try {
            logger.debug({ host: device.hostname, step: "2/3" }, `Cleanup`);
            await repositoryCleanup(device.hostname);
            break;
          } catch (error) {
            logger.error(
              {
                attempt: `${i}/${RETRY_ATTEMPTS}`,
                device_id: device.id,
                error,
              },
              "Cleanup failed, aborting offsite",
            );
            await sleep(OFFSITE_STEP_WAIT_SECONDS * SECOND);
          }
        }
        reset();
        coordinator.backupState.last_message = `Catching breath`;
        emit();
        await sleep(OFFSITE_STEP_WAIT_SECONDS * SECOND);
        logger.debug({ host: device.hostname, step: "3/3" }, `Offsite kickoff`);
        coordinator.backupState.last_message = `Offsite sync ${device.hostname}`;
        await network4.heartwood.syncDevice(device.hostname);
        await workflowPause();
        BORG_DEVICE_LAST_OFFSITE.labels(device.hostname).setToCurrentTime();
        logger.info({ host: device.hostname }, `Device offsite sync complete`);
        await cache.del(CACHE_KEY);
        reset();
      });

      offsiteInProgress = false;
    },

    /**
     * When a backup is successfully completed, it will emit this
     *
     * - look up the service, and verify it's the one we are expecting.
     * - find the full device data
     * - issue a borg prune command to clean up the data
     * - update `last_backup`
     * - clear device lock
     * - initiate backup of the next device (if any)
     */
    async onBackupComplete({ device_id, archive }: BackupCompletePayload): Promise<void> {
      const running = await cache.get<WaitingData>(CACHE_KEY);
      if (running?.device_id !== device_id) {
        if (running) {
          logger.warn(`{%s} !== {%s} id mismatch`, device_id, running?.device_id || "none");
        } else {
          logger.error(`Empty cache?`);
        }
      }
      const device = await pando.database.client.network3Device.findFirst({
        where: { id: device_id },
      });
      if (!device) {
        logger.error(`[%s] could not look up service`, device_id);
        return;
      }
      reset();

      const host = device.hostname.toLowerCase();
      BORG_ARCHIVE_SIZE.labels(host, "original").set(archive.cache.stats.total_size);
      BORG_ARCHIVE_SIZE.labels(host, "compressed").set(archive.cache.stats.total_csize);
      BORG_ARCHIVE_SIZE.labels(host, "deduplicated").set(archive.cache.stats.unique_csize);
      await pando.database.client.network3Device.updateMany({
        data: { last_backup: new Date() },
        where: { hostname: device.hostname },
      });
      await pando.health.refreshOnline();

      logger.info(`[%s] backup complete`, device.hostname);
      await cache.del(CACHE_KEY);
      reset();
      if (offsiteWorkflow) {
        logger.debug(`Completing offsite workflow step`);
        offsiteWorkflow();
      } else {
        logger.debug(`Kicking off next device backup`);
        await coordinator.onBackupCron();
      }
      await updateHomeAssistant("Backup done");
    },

    /**
     * ## Backup kickoff entrypoint
     *
     * - Run on schedule.
     * - Can be kicked off manually
     *
     * Goal is to ensure all relevant data gets stored hourly
     *
     * ## Workflow
     *
     * - check for existing locks (expire after 30s of inactivity)
     * - look up a list of back up capable devices that haven't done so within the last hour
     * - insert lock
     * - pause, verify backup started
     */
    async onBackupCron(force = false): Promise<void> {
      if (!pando.entities.backupActive.is_on) {
        logger.debug(`[onBackupCron] Backup skipped - cron disabled`);
        return;
      }
      if (offsiteInProgress) {
        logger.debug(`[onBackupCron] Backup skipped - offsite in progress`);
        return;
      }
      if (dayjs().isBefore(lockout) && !force) {
        logger.warn(`Backup lockout`);
        return;
      }

      if (!is.empty(waitingLocks)) {
        const lock = waitingLocks.shift();
        logger.debug(`Executing waiting lock ({%s} remaining)`, waitingLocks.length);
        lock(true);
        return;
      }

      const backupDevice = await getNextBackupDevice();
      await coordinator.executeBackup(backupDevice);
    },

    async onBackupForceUnlock(): Promise<void> {
      logger.warn(`Force clear backup lock`);
      lockout = dayjs().subtract(SINGLE, "hour");
    },

    /**
     * standard backup progress report
     */
    // @OnMQTT({ omitIncoming: true, topic: BACKUP_PROGRESS })
    async onBackupProgress({ device_id, lastMessage = "" }: BackupProgressPayload): Promise<void> {
      // const data = await pando.database.client.network3Device.findFirst({ where: { id: device_id } });
      // logger.debug({ name: data.hostname }, `Backup progress`);
      const current = await cache.get<WaitingData>(CACHE_KEY, {
        action: RESTORED,
        comment: "",
        device_id,
        last_update: new Date().toISOString(),
        started_at: new Date().toISOString(),
      });
      if (current.action === RESTORED) {
        logger.info(`Loading {${device_id}}`);
        const device = await pando.database.client.network3Device.findFirst({
          where: { id: device_id },
        });
        logger.info({ device }, `Loaded by id`);
        current.action = `Backup ${internal.utils.TitleCase(device.hostname)}`;
        await cache.set(CACHE_KEY, current);
      }
      // ! [Fri 02:11:19.438]: [BackupService] 50% Syncing chunks cache. Processing archive Graft-2023-11-09-1699528230296
      const matches = lastMessage.match(
        new RegExp(
          "([0-9.]* [A-Za-z]*) O ([0-9.]* [A-Za-z]*) C ([0-9.]* [A-Za-z]*) D ([0-9.]*) N (.*)",
        ),
      );
      if (matches) {
        const [, original, compressed, deduplicated, total_files, fileName] = matches;
        coordinator.backupState = {
          compressed,
          deduplicated,
          last_message: lastMessage.trim().slice(START, MAX_STATE_LENGTH),
          original,
          total_files,
        };
        emit();
        lastMessage = fileName.trim();
      } else {
        reset();
      }
      if (current.device_id !== device_id) {
        const data = await pando.database.client.network3Device.findFirst({
          where: { id: device_id },
        });
        logger.error({ current, data, device_id }, `current / update device_id mismatch`);
      }
      current.last_update = new Date().toISOString();
      await cache.set(CACHE_KEY, current);
      await updateHomeAssistant("progress");
      coordinator.backupState.last_message = lastMessage.trim().slice(START, MAX_STATE_LENGTH);
      emit();
    },

    async onSyncComplete() {
      logger.info(`Sync complete`);
      if (offsiteWorkflow) {
        offsiteWorkflow();
        return;
      }
      logger.error(`[onSyncComplete] No offsiteWorkFlow defined`);
      emit();
    },

    async onSyncProgress(message: string) {
      coordinator.syncMessage = message;
      emit();
    },

    syncMessage: undefined as string,
  };

  return coordinator;
}
