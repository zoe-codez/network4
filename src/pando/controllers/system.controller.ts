import { TServiceParams } from "@digital-alchemy/core";
import { GENERIC_SUCCESS_RESPONSE } from "@digital-alchemy/fastify-extension";

import {
  AddNotificationBody,
  CambiumError,
  DevicesUpdatedPayload,
  PandoCreateProxyHostPayload,
  PandoEditProxyHostPayload,
} from "../../core";

export function SystemController({ pando, fastify }: TServiceParams) {
  fastify.routes(server => {
    server.post("/system/announce-woke-up", async () => {
      setImmediate(async () => await pando.todo_coordinator.onWakeUp());
      return GENERIC_SUCCESS_RESPONSE;
    });

    server.post<{ Body: AddNotificationBody }>(
      "/system/persistent-notification",
      async ({ body }) => {
        const id = await pando.persistent_notifications.addNotification(body);
        return { id };
      },
    );

    server.delete("/system/persistent-notification", async () => {
      await pando.persistent_notifications.clearNotifications();
      return GENERIC_SUCCESS_RESPONSE;
    });

    server.delete<{ Params: { id: string } }>(
      "/system/persistent-notification/:id",
      async ({ params: { id } }) => {
        await pando.persistent_notifications.removeNotification(Number(id));
      },
    );

    server.post<{ Body: DevicesUpdatedPayload }>(
      "/system/key-sync",
      async ({ body }) => {
        await pando.key_coordinator.onDatabaseUpdated(body);
      },
    );

    server.post<{ Body: CambiumError }>(
      "/system/cambium-error",
      async ({ body }) => {
        await pando.relay.sendCambiumError(body);
        return GENERIC_SUCCESS_RESPONSE;
      },
    );

    server.post<{ Body: CambiumError }>(
      "/system/cambium-warning",
      async ({ body }) => {
        await pando.relay.sendCambiumWarning(body);
        return GENERIC_SUCCESS_RESPONSE;
      },
    );

    server.get<{ Params: { id: string } }>(
      "/system/describe/:id",
      async ({ params: { id } }) => {
        return await this.health.identifyById(Number(id));
      },
    );

    server.get("/system/online", async () => {
      return [...pando.health.online.values()];
    });

    server.get<{ Params: { service: string; proxy: string } }>(
      "/system/find/:service/:proxy",
      async ({ params }) => {
        return await pando.proxy_manager.findById({
          proxy: Number(params.proxy),
          service: Number(params.service),
        });
      },
    );

    server.get("/system/proxy-hosts", async () => {
      return await pando.proxy_manager.listHosts();
    });

    server.post<{ Body: PandoCreateProxyHostPayload }>(
      "/system/proxy-create",
      async ({ body }) => {
        return await pando.proxy_manager.createHost(body);
      },
    );

    server.put<{ Body: PandoEditProxyHostPayload }>(
      "/system/proxy-update",
      async ({ body }) => {
        return await pando.proxy_manager.editHost(body);
      },
    );

    server.post("/system/upgrade-all", () => {
      setImmediate(
        async () => await pando.upgrade_coordinator.upgradeAllCambium(),
      );
      return GENERIC_SUCCESS_RESPONSE;
    });

    server.post<{ Params: { host: string } }>(
      "/system/upgrade-cambium/:host",
      ({ params }) => {
        setImmediate(
          async () =>
            await pando.upgrade_coordinator.upgradeHostCambium(params.host),
        );
        return GENERIC_SUCCESS_RESPONSE;
      },
    );
  });
}
