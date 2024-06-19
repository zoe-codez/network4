import { eachSeries, is, TServiceParams } from "@digital-alchemy/core";
import { hostname } from "os";

import { Network3Hosts, Network3Users } from "../../core/helpers";
import { CAMBIUM_DEVICE_LAST_DEPLOY } from "../helpers";

const TARGET = `/usr/share/digital-alchemy/node/cambium/`;
const SOURCE = "/home/zoe/internal/dist/apps/cambium/";
const SELF = hostname();

export function UpgradeCoordinator({ vividra, logger, pando }: TServiceParams) {
  const { execa } = vividra.esm;

  async function distributeCambium(): Promise<void> {
    const online = pando.health.onlineServices("cambium");
    const services = await pando.database.client.network3Services.findMany({
      include: {
        Network3Account: {
          include: { Network3Device: true },
        },
        proxies: true,
      },
      where: {
        Network3Account: {
          Network3Device: {
            hostname: { not: SELF },
          },
          user: { not: "root" },
        },
        app: "cambium",
        id: { in: online },
        // ensure that there is at least one proxy
        proxies: { some: {} },
      },
    });
    await eachSeries(
      services,
      async ({
        Network3Account: {
          user,
          Network3Device: { hostname },
        },
      }) => {
        vividra.cambium.setTarget(
          user as Network3Users,
          hostname as Network3Hosts,
        );
        await vividra.cambium.upgradePackages();
      },
    );
  }

  async function rebootCambium(): Promise<void> {
    const online = pando.health.onlineServices("cambium");
    const services = await pando.database.client.network3Services.findMany({
      include: {
        Network3Account: {
          include: { Network3Device: true },
        },
        proxies: true,
      },
      where: {
        Network3Account: {
          Network3Device: {
            hostname: { not: SELF },
          },
        },
        accountId: { not: null },
        app: "cambium",
        id: { in: online },
        // ensure that there is at least one proxy
        proxies: { some: {} },
      },
    });

    await eachSeries(
      services,
      async ({
        Network3Account: {
          user,
          Network3Device: { hostname },
        },
      }) => {
        vividra.cambium.setTarget(
          user as Network3Users,
          hostname as Network3Hosts,
        );
        await vividra.cambium.upgradeReboot();
      },
    );
  }

  async function upgradeCambium(user: string, hostname: string): Promise<void> {
    logger.info({ name: hostname }, `Sync {cambium}`);
    const { stdout } = await execa("rsync", [
      "-ahP",
      SOURCE,
      `${user}@${hostname}:${TARGET}`,
    ]);
    logger.debug({
      stdout: stdout
        .split("\n")
        .map(i => i.trim())
        .filter(line => !is.empty(line)),
    });
    vividra.cambium.setTarget(user as Network3Users, hostname as Network3Hosts);
    logger.info({ name: hostname }, `Upgrade dependencies`);
    await vividra.cambium.upgradePackages();
  }

  const out = {
    async upgradeAllCambium(): Promise<void> {
      logger.info("Upgrade cambium");
      await vividra.pith.buildCambium();
      await distributeCambium();
      await rebootCambium();
    },

    async upgradeHostCambium(host: string) {
      logger.info({ name: host }, `Upgrade cambium`);
      logger.debug("Create build");
      await vividra.pith.buildCambium();
      logger.debug("Done");
      const service = await pando.database.client.network3Services.findFirst({
        include: {
          Network3Account: {
            include: { Network3Device: true },
          },
        },
        where: {
          Network3Account: {
            Network3Device: { hostname: host },
            user: { not: "root" },
          },
          app: "cambium",
          // ensure that there is at least one proxy
          proxies: { some: {} },
        },
      });
      const {
        Network3Account: {
          user,
          Network3Device: { hostname },
        },
      } = service;
      logger.info({ name: host }, `Sending changes`);
      await upgradeCambium(user, hostname);
      CAMBIUM_DEVICE_LAST_DEPLOY.labels(hostname).setToCurrentTime();
      logger.info({ name: host }, `Rebooting`);
      const fullList = await pando.database.client.network3Services.findMany({
        include: {
          Network3Account: {
            include: {
              Network3Device: true,
            },
          },
        },
        where: {
          Network3Account: {
            Network3Device: { hostname: host },
          },
          app: "cambium",
          // ensure that there is at least one proxy
          proxies: { some: {} },
        },
      });
      await eachSeries(
        fullList,
        async ({
          Network3Account: {
            user,
            Network3Device: { hostname },
          },
        }) => {
          logger.debug(`Reboot {%s}`, user);
          vividra.cambium.setTarget(
            user as Network3Users,
            hostname as Network3Hosts,
          );
          await vividra.cambium.upgradeReboot();
        },
      );
    },
  };
  return out;
}
