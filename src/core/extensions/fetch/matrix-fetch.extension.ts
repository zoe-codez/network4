import { TServiceParams } from "@digital-alchemy/core";
import {
  BorderSpinQueue,
  GenericWidgetDTO,
  PulseLaserOptions,
} from "@digital-alchemy/matrix-rendering";

import { Network3Hosts, Network3Users } from "../../helpers";

export function MatrixFetch({ logger, context, network4, lifecycle }: TServiceParams) {
  const fetchService = network4.base(context);
  lifecycle.onBootstrap(() => {
    fetchService.setTarget({
      app: "cambium",
      hostname: "orchid",
      user: "zoe",
    });
  });

  return {
    async animateBorderSpinQueue(body: BorderSpinQueue) {
      logger.trace("backupBreakLock");
      await fetchService.fetch({
        body,
        method: "post",
        url: "/animation/spin-queue",
      });
    },

    async animatePulseLaser(body: PulseLaserOptions) {
      logger.trace("upgradePackages");
      await fetchService.fetch({
        body,
        method: "post",
        url: "/animation/pulse-laser",
      });
    },

    async backupExec(type: string) {
      logger.trace("backupExec");
      await fetchService.fetch({
        body: { type },
        method: "post",
        url: "/root/backup-init",
      });
    },

    setTarget(user: Network3Users, hostname: Network3Hosts) {
      fetchService.setTarget({ app: "cambium", hostname, user });
    },

    async setWidgets(dash: GenericWidgetDTO[]) {
      logger.trace("upgradeReboot");
      await fetchService.fetch({
        body: { dash },
        method: "post",
        url: `/matrix/widgets`,
      });
    },
  };
}
