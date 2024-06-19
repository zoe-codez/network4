import { TServiceParams } from "@digital-alchemy/core";
import { GENERIC_SUCCESS_RESPONSE } from "@digital-alchemy/fastify-extension";

import {
  BackupCompletePayload,
  BackupDevicePayload,
  BackupProgressPayload,
} from "../../core";

export function BackupController({ pando, fastify }: TServiceParams) {
  fastify.routes(server => {
    server.post<{ Body: BackupDevicePayload }>("/backup/device", ({ body }) => {
      setImmediate(async () => {
        if (body.offsite) {
          await pando.backup.offsiteSync(body.hostname, body.reason);
          return;
        }
        await pando.backup.executeBackup(body.hostname, body.reason);
      });
      return GENERIC_SUCCESS_RESPONSE;
    });

    server.post<{ Body: BackupCompletePayload }>(
      "/backup/backup-complete",
      async ({ body }) => {
        await pando.backup.onBackupComplete(body);
        return GENERIC_SUCCESS_RESPONSE;
      },
    );

    server.post("/backup/cron", () => {
      setImmediate(async () => {
        await pando.backup.onBackupCron(true);
      });
      return GENERIC_SUCCESS_RESPONSE;
    });

    server.post("/backup/force-unlock", async () => {
      await pando.backup.onBackupForceUnlock();
      return GENERIC_SUCCESS_RESPONSE;
    });

    server.post<{ Body: BackupProgressPayload }>(
      "/backup/backup-progress",
      async ({ body }) => {
        await pando.backup.onBackupProgress(body);
        return GENERIC_SUCCESS_RESPONSE;
      },
    );

    server.post("/backup/sync-complete", async () => {
      await pando.backup.onSyncComplete();
      return GENERIC_SUCCESS_RESPONSE;
    });

    server.post<{ Body: { msg: string } }>(
      "/backup/sync-progress",
      async ({ body }) => {
        await pando.backup.onSyncProgress(body.msg);
        return GENERIC_SUCCESS_RESPONSE;
      },
    );
  });
}
