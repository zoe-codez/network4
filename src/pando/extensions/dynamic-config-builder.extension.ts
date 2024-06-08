import { FIRST, HALF, is, MINUTE, TServiceParams } from "@digital-alchemy/core";
import { NotFoundError } from "@digital-alchemy/fastify-extension";
import {
  Network3Account,
  Network3Device,
  Network3Services,
  ProxyEntry,
} from "@prisma/client";

import { ProxyHost } from "../../core/helpers";

type FullService = Network3Services & {
  Network3Account: Network3Account & {
    Network3Device: Network3Device;
  };
  proxies: ProxyEntry[];
};

export function DynamicConfigBuilder({
  context,
  logger,
  config,
  lifecycle,
  internal,
  pando,
}: TServiceParams) {
  let hosts: ProxyHost[] = [];
  lifecycle.onBootstrap(async () => {
    const crosstalk = await crossTalk();
    internal.boilerplate.configuration.set(
      "vividra",
      "CROSSTALK_DATA",
      crosstalk,
    );
    hosts = await pando.proxy_manager.listHosts();
    setInterval(async () => {
      hosts = await pando.proxy_manager.listHosts();
    }, HALF * MINUTE);
  });

  async function buildAutomationConfig(service: FullService) {
    return {
      fastify: await getServer(service),
      gotify: config.gotify,
      hass: config.hass,
      mqtt: config.mqtt,
      vividra: config.vividra,
    };
  }

  async function buildCambiumConfig(service: FullService) {
    return {
      cambium: { BORG_PASSPHRASE: config.pando.BORG_PASSPHRASE },
      fastify: await getServer(service),
      gotify: config.gotify,
      hass: config.hass,
      mqtt: config.mqtt,
      vividra: await getNetwork3Config(),
    };
  }

  // async function buildCrystalBallConfig(service: FullService) {
  //   return {
  //     libs: {
  //       "database-utils": databaseConfig,
  //       gotify: gotifyConfig,
  //       "home-assistant": homeAssistantConfig,
  //       mqtt: mqttConfig,
  //       network3: await getNetwork3Config(),
  //       server: getServer(service),
  //     },
  //   };
  // }

  // async function buildDangerNoodleConfig(service: FullService) {
  //   return {
  //     libs: {
  //       boilerplate: {
  //         CACHE_HOST: cacheHost,
  //         CACHE_PROVIDER: cachePort,
  //       },
  //       gotify: gotifyConfig,
  //       grocy: grocyConfig,
  //       "home-assistant": homeAssistantConfig,
  //       server: await getServer(service),
  //     },
  //   };
  // }

  // async function buildSymbioteConfig(service: FullService) {
  //   return {
  //     libs: {
  //       "database-utils": databaseConfig,
  //       "home-assistant": homeAssistantConfig,
  //       mqtt: mqttConfig,
  //       network3: await getNetwork3Config(),
  //       server: await getServer(service),
  //     },
  //   };
  // }

  async function crossTalk() {
    const services = await pando.database.client.network3Services.findMany({
      include: {
        Network3Account: {
          include: { Network3Device: true },
        },
        proxies: true,
      },
      where: {
        Network3Account: { user: { not: "" } },
        proxies: { some: { admin_key: { not: "" } } },
      },
    });
    const data: Record<string, Record<string, Record<string, string>>> = {};
    services.forEach(service => {
      const { user } = service.Network3Account;
      const { hostname } = service.Network3Account.Network3Device;
      const [{ admin_key }] = service.proxies;
      const { app } = service;
      data[user] ??= {};
      data[user][hostname.toLowerCase()] ??= {};
      data[user][hostname.toLowerCase()][app] = admin_key;
    });
    return data as typeof config.vividra.CROSSTALK_DATA;
  }

  async function getNetwork3Config() {
    return {
      CROSSTALK_DATA: await crossTalk(),
    };
  }

  function getServer(service: FullService) {
    const primary =
      service.proxies.find(({ primary }) => primary) || service.proxies[FIRST];

    let server;
    if (is.object(primary)) {
      const host = hosts.find(({ id }) => id === primary.proxy_id);
      server = {
        ADMIN_KEY: primary.admin_key,
        PORT: host.forward_port,
      };
    }
    return server;
  }

  return {
    async buildDynamicConfig(user: string, hostname: string, app: string) {
      const [service] = await pando.database.client.network3Services.findMany({
        include: {
          Network3Account: {
            include: { Network3Device: true },
          },
          proxies: true,
        },
        where: {
          Network3Account: {
            Network3Device: { hostname },
            user,
          },
          app,
        },
      });
      logger.info({ name: app }, `build config`);
      switch (app) {
        // case "crystal-ball":
        //   return await buildCrystalBallConfig(service);
        case "cambium":
          return await buildCambiumConfig(service);
        case "home-automation":
          return await buildAutomationConfig(service);
        // case "symbiote":
        //   return await buildSymbioteConfig(service);
        // case "danger-noodle":
        //   return await buildDangerNoodleConfig(service);
        // case "craft-survey":
        //   return await buildDangerNoodleConfig(service);
        default:
          throw new NotFoundError(
            context,
            "UNKNOWN_APPLICATION",
            `Unknown application: ${app}`,
          );
      }
    },
  };
}
