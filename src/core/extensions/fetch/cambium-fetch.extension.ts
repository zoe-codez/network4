import { TServiceParams } from "@digital-alchemy/core";

import { Network3Hosts, Network3Users } from "../../helpers";

export function Cambium({ logger, context, network4 }: TServiceParams) {
  const fetchService = network4.base(context);

  return {
    async backupBreakLock() {
      logger.trace("backupBreakLock");
      await fetchService.fetch({
        method: "post",
        url: `/root/backup-break-lock`,
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

    async upgradePackages() {
      logger.trace("upgradePackages");
      await fetchService.fetch({
        method: "post",
        url: "/upgrade/package",
      });
    },

    async upgradeReboot() {
      logger.trace("upgradeReboot");
      await fetchService.fetch({
        method: "post",
        url: "/upgrade/reboot",
      });
    },
  };
}
