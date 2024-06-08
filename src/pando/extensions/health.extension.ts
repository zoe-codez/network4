import {
  DEFAULT_LIMIT,
  is,
  START,
  TServiceParams,
} from "@digital-alchemy/core";
import { MessagePriority } from "@digital-alchemy/gotify-extension";
import dayjs from "dayjs";

import {
  APP_HEALTHCHECK,
  HEALTHCHECK_PANDO_RELOAD,
  OnlineDevice,
  PopulatedService,
  ProcessIdentify,
  SERVICE_ONLINE,
  ServiceOnlineGlobalPayload,
  SystemInitResponse,
} from "../../core/helpers";

const CACHE_KEY = `LAST_SEEN_SYSTEM_HEALTH`;
type CacheData = {
  last_save: string;
  online: OnlineDevice[];
};
const CACHE_RELOAD_CUTOFF = 5;

function logTag(service: PopulatedService): string {
  return `${service.Network3Account.Network3Device.hostname}#${service.app}`;
}

export function Health({
  logger,
  vividra,
  cache,
  scheduler,
  pando,
  mqtt,
  context,
  lifecycle,
}: TServiceParams) {
  let online = new Set<OnlineDevice>();

  async function onHealthCheck(
    incoming: ServiceOnlineGlobalPayload,
  ): Promise<void> {
    const { pid, service_id } = incoming;
    let found = false;
    online.forEach(payload => {
      if (service_id !== payload.service_id || pid !== payload.pid) {
        return;
      }
      found = true;
      payload.last_seen = dayjs();
    });
    if (!found) {
      await onServiceOnline(incoming);
    }
  }

  mqtt.subscribe({
    context,
    exec: async (data: ServiceOnlineGlobalPayload) => await onHealthCheck(data),
    parse: "json",
    topic: APP_HEALTHCHECK,
  });

  scheduler.interval({
    async exec() {
      const now = dayjs().subtract(DEFAULT_LIMIT, "minutes");
      online.forEach(payload => {
        if (now.isAfter(payload.last_seen)) {
          logger.warn(
            `${logTag(payload.service)} ({${payload.service.Network3Account.user}} - {(${
              payload.pid
            })}) service offline`,
          );
          online.delete(payload);
        }
      });
      await saveCache();
    },
    interval: 5000,
  });

  lifecycle.onBootstrap(async () => {
    vividra.system.network3Service = await out.identify(
      vividra.system.identificationData,
    );
    await loadCache();
    if (is.empty(online)) {
      mqtt.publish(HEALTHCHECK_PANDO_RELOAD);
    }
  });

  async function onServiceOnline(
    payload: ServiceOnlineGlobalPayload,
  ): Promise<void> {
    let exists = false;
    online.forEach(({ service_id, pid }) => {
      if (service_id === payload.service_id && pid === payload.pid) {
        exists = true;
      }
    });
    if (exists) {
      return;
    }
    const service = await pando.database.client.network3Services.findFirst({
      include: {
        Network3Account: { include: { Network3Device: true } },
      },
      where: {
        id: payload.service_id,
      },
    });

    if (!service) {
      logger.error(`Invalid service id!`);
      vividra.gotify.pando({
        message: JSON.stringify(payload).slice(START, 100),
        priority: MessagePriority.high,
        title: `A service attempted to sign on with an invalid id`,
      });
      return;
    }

    logger.debug(
      { name: logTag(service) },
      `{${service.Network3Account.user}} - {${payload.pid}} service online`,
    );

    // Announce for targeted interest
    mqtt.publish(SERVICE_ONLINE(service.app));

    online.add({
      ...payload,
      last_seen: dayjs(),
      service,
    });
    await saveCache();
  }

  async function loadCache(): Promise<void> {
    const data = await cache.get<CacheData>(CACHE_KEY, {
      last_save: new Date().toISOString(),
      online: [],
    });
    if (
      dayjs(data.last_save).isBefore(
        dayjs().subtract(CACHE_RELOAD_CUTOFF, "second"),
      )
    ) {
      data.online = [];
      return;
    }
    online = new Set(data.online);
  }

  async function saveCache(): Promise<void> {
    await cache.set(CACHE_KEY, {
      last_save: new Date().toISOString(),
      online: [...online.values()],
    });
  }

  const out = {
    byId(serviceId: number): PopulatedService {
      let out: PopulatedService;
      online.forEach(i => {
        if (i.service_id === serviceId) {
          out = i.service;
        }
      });
      return out;
    },
    async identify(data: ProcessIdentify): Promise<PopulatedService> {
      const out = await pando.database.client.network3Services.findFirst({
        include: { Network3Account: { include: { Network3Device: true } } },
        where: {
          Network3Account: {
            Network3Device: { hostname: data.host },
            user: data.user,
          },
          app: data.app.split("_").shift(),
        },
      });
      return out;
    },

    async identifyById(id: number): Promise<PopulatedService> {
      return await pando.database.client.network3Services.findFirst({
        include: { Network3Account: { include: { Network3Device: true } } },
        where: { id },
      });
    },

    isOnline({
      host,
      user = "root",
      app = "cambium",
    }: {
      app?: string;
      host: string;
      user?: string;
    }): boolean {
      return [...online.values()].some(
        ({ service }) =>
          service.app === app &&
          service.Network3Account.user === user &&
          service.Network3Account.Network3Device.hostname === host,
      );
    },

    async onInit(
      username: string,
      hostname: string,
      application: string,
    ): Promise<SystemInitResponse> {
      return {
        config: await pando.dynamic_config.buildDynamicConfig(
          username,
          hostname,
          application,
        ),
      };
    },

    online,

    onlineServices(app?: string): number[] {
      let list = [...online.values()];
      if (!is.empty(app)) {
        list = list.filter(({ service }) => service.app === app);
      }
      return list.map(({ service }) => service.id);
    },

    async refreshOnline() {
      const services = await pando.database.client.network3Services.findMany({
        include: { Network3Account: { include: { Network3Device: true } } },
      });
      online.forEach(i => {
        i.service = services.find(({ id }) => id === i.service_id);
      });
    },
  };
  return out;
}
