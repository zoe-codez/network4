import { is, SECOND, sleep, TServiceParams } from "@digital-alchemy/core";

import {
  BackupCompletePayload,
  BackupProgressPayload,
  CambiumError,
  DevicesUpdatedPayload,
  PandoCreateProxyHostPayload,
  PandoEditProxyHostPayload,
  PandoFindProxyHostPayload,
  PopulatedService,
  ProcessIdentify,
  ProxyHost,
  ServiceOnlineGlobalPayload,
  SetChatTimer,
} from "../../helpers";

const DELAY = 5;
export type AddNotificationBody = {
  channel?: {
    name: string;
    replaceExisting?: boolean;
  };
  duration?: number;
  message: string;
};
export type AddNotificationResponse = {
  id: number;
};

export enum OpenAIPrompts {
  iceMaker = "ice_maker",
  goToSleep = "go_to_sleep",
  wakeUp = "wake_up",
  workTimer = "work_timer",
  countdown = "countdown",
}

export type BackupDevicePayload = {
  hostname: string;
  offsite: boolean;
  reason: string;
};

export type OpenAIHints = {
  hint?: string;
};

export function Pando({ logger, context, network4, lifecycle, config }: TServiceParams) {
  const fetchService = network4.base(context);

  lifecycle.onPostConfig(() => {
    fetchService.setTarget({ app: "cambium", hostname: "graft", user: "zoe" });
  });

  async function identifySelf(body: ProcessIdentify, retry = false): Promise<PopulatedService> {
    logger.trace(`identifySelf`);
    try {
      logger.trace({ body }, `Identify self`);
      const out = await fetchService.fetch<PopulatedService, ProcessIdentify>({
        body,
        method: "post",
        url: `/init/identify`,
      });
      if (is.undefined(out)) {
        if (retry) {
          logger.error(`Failed to retrieve identification data`);
          return undefined;
        }
        logger.warn(`Failed to retrieve identification data, retrying in {${DELAY}} seconds`);
        await sleep(DELAY * SECOND);
        return await identifySelf(body, true);
      }
      return out;
    } catch {
      if (retry) {
        return undefined;
      }
      logger.warn(`Failed to retrieve identification data, retrying in {${DELAY}} seconds`);
      await sleep(DELAY * SECOND);
      return await identifySelf(body, true);
    }
  }

  return {
    async addNotification(body: AddNotificationBody): Promise<number> {
      logger.trace({ body }, `addNotification`);
      const result = await fetchService.fetch<AddNotificationResponse, AddNotificationBody>({
        body,
        method: "post",
        url: `/system/persistent-notification`,
      });
      return result.id;
    },

    async announceWokeUp(): Promise<void> {
      logger.trace(`announceWokeUp`);
      await fetchService.fetch({
        url: `/system/announce-woke-up`,
      });
    },

    async backupComplete(body: BackupCompletePayload): Promise<void> {
      logger.trace({ body }, `backupComplete`);
      await fetchService.fetch({
        body: { ...body },
        method: "post",
        url: `/backup/backup-complete`,
      });
    },

    async backupCronForce() {
      logger.trace(`backupCronForce`);
      await fetchService.fetch({
        method: "post",
        url: `/backup/cron`,
      });
    },

    async backupDevice(hostname: string, reason: string, offsite = false) {
      logger.trace({ hostname }, `backupDevice`);
      await fetchService.fetch({
        body: { hostname, offsite, reason } as BackupDevicePayload,
        method: "post",
        url: `/backup/device`,
      });
    },

    async backupForceUnlock() {
      logger.trace(`backupForceUnlock`);
      await fetchService.fetch({
        method: "post",
        url: `/backup/force-unlock`,
      });
    },

    async backupProgress(body: BackupProgressPayload): Promise<void> {
      logger.trace({ body }, `backupProgress`);
      await fetchService.fetch({
        body: { ...body },
        method: "post",
        url: `/backup/backup-progress`,
      });
    },

    async clearAllPersistentNotifications(): Promise<void> {
      logger.trace("editProxyHost");
      await fetchService.fetch({
        method: "delete",
        url: `/system/persistent-notification`,
      });
    },

    async countDownTimer(body: SetChatTimer): Promise<void> {
      logger.trace({ body }, "editProxyHost");
      return await fetchService.fetch({
        body,
        method: "post",
        url: `/timers/countdown`,
      });
    },

    async createProxyHost(body: PandoCreateProxyHostPayload): Promise<ProxyHost> {
      logger.trace({ body }, "editProxyHost");
      return await fetchService.fetch({
        body,
        method: "post",
        url: `/system/proxy-create`,
      });
    },

    async editProxyHost(body: PandoEditProxyHostPayload): Promise<ProxyHost> {
      logger.trace({ body }, "editProxyHost");
      return await fetchService.fetch({
        body,
        method: "put",
        url: `/system/proxy-update`,
      });
    },

    async findProxyHost({ proxy, service }: PandoFindProxyHostPayload): Promise<ProxyHost> {
      logger.trace({ proxy, service }, "findProxyHost");
      return await fetchService.fetch({
        url: `/system/find/${service}/${proxy}`,
      });
    },

    async generateOpenAIMessage(type: OpenAIPrompts, body: OpenAIHints = {}): Promise<string> {
      logger.trace({ body, type }, "generateOpenAIMessage");
      return await fetchService.fetch({
        body,
        method: "post",
        url: `/openai/generate/${type}`,
      });
    },

    async getSystemHealth(): Promise<ServiceOnlineGlobalPayload[]> {
      logger.trace("hassRebuild");
      return await fetchService.fetch({
        url: "/system/online",
      });
    },

    async hassRebuild(): Promise<void> {
      logger.trace("hassRebuild");
      await fetchService.fetch({
        method: "post",
        url: `/system/hass-rebuild`,
      });
    },

    async identifyById(id: number): Promise<PopulatedService> {
      logger.trace({ id }, `identifyById`);
      return await fetchService.fetch({
        url: `/system/describe/${id}`,
      });
    },

    identifySelf,

    async keySync(body?: DevicesUpdatedPayload): Promise<void> {
      logger.trace(`keySync`);
      await fetchService.fetch({
        body,
        method: "post",
        url: "/system/key-sync",
      });
    },

    async listProxyHosts(): Promise<ProxyHost[]> {
      logger.trace(`listProxyHosts`);
      return await fetchService.fetch({
        url: `/system/proxy-hosts`,
      });
    },

    async onSyncComplete(): Promise<void> {
      logger.trace(`onSyncComplete`);
      await fetchService.fetch({
        method: "post",
        url: `/backup/sync-complete`,
      });
    },

    async onSyncProgress(message: string): Promise<void> {
      logger.trace(`onSyncProgress`);
      await fetchService.fetch({
        body: { msg: message },
        method: "post",
        url: `/backup/sync-progress`,
      });
    },

    async onWakeUp(): Promise<void> {
      logger.trace("onWakeUp");
      await fetchService.fetch({
        method: "post",
        url: `/timers/wake-up`,
      });
    },

    async removeNotification(id: number): Promise<void> {
      logger.trace({ id }, "removeNotification");
      await fetchService.fetch({
        method: "delete",
        url: `/system/persistent-notification/${id}`,
      });
    },

    async sendCambiumError(message: string) {
      logger.error({ message }, `sendCambiumError`);
      return await fetchService.fetch({
        body: {
          message,
          service: config.network4.SERVICE_ID,
        } as CambiumError,
        method: "post",
        url: `/system/cambium-error`,
      });
    },

    async sendCambiumWarning(message: string) {
      logger.warn({ message }, `sendCambiumWarning`);
      await fetchService.fetch({
        body: {
          message,
          service: config.network4.SERVICE_ID,
        } as CambiumError,
        method: "post",
        url: `/system/cambium-warning`,
      });
    },

    async upgradeAll(): Promise<void> {
      logger.trace("upgradeAll");
      await fetchService.fetch({
        method: "post",
        url: `/system/upgrade-all`,
      });
    },

    async upgradeCambiumHost(host: string) {
      logger.trace({ host }, `upgradeCambiumHost`);
      await fetchService.fetch({
        method: "post",
        url: `/system/upgrade-cambium/${host}`,
      });
    },

    async workTimer(body: SetChatTimer): Promise<void> {
      logger.trace(`workTimer`);
      return await fetchService.fetch({
        body,
        method: "post",
        url: `/timers/work`,
      });
    },

    async workTimerStop(): Promise<void> {
      logger.trace(`workTimerStop`);
      return await fetchService.fetch({
        method: "post",
        url: `/timers/work/stop`,
      });
    },
  };
}
