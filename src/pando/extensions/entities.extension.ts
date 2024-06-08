import { TServiceParams } from "@digital-alchemy/core";

export function EntitiesExtension({ synapse, context }: TServiceParams) {
  return {
    backupActive: synapse.binary_sensor({
      context,
      name: "Backup active",
    }),
    backupCronActive: synapse.switch({
      context,
      name: "Backup cron active",
    }),
    backupState: synapse.sensor({
      context,
      name: "Backup state",
    }),
    pauseMatrixUpdates: synapse.switch({
      context,
      name: "Pause matrix updates",
    }),
  };
}
