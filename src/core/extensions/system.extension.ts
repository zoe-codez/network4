import { HALF, MINUTE, TServiceParams } from "@digital-alchemy/core";
import { hostname, userInfo } from "os";

import { PopulatedService, ProcessIdentify } from "../helpers";

const HEALTH_CHECK_INTERVAL = HALF * MINUTE;
export const AUTOMATION_WELCOME_BACK = "AUTOMATION_WELCOME_BACK";

const { uid, username } = userInfo();
export const DEVICE_CHECKS = new Set<
  (hostname: string, username: string) => void
>();

const name = hostname();
const DEVICE_CACHE_KEY = app => `APP_${name.toLowerCase()}_${username}_${app}`;

export async function System({ logger, lifecycle, internal }: TServiceParams) {
  const execa = (await import("execa")).execa;

  // lifecycle.onBootstrap(async () => {
  //   // processInfo = await buildProcessInfo();
  //   if (out.network3Service) {
  //     logger.warn(`Network3 service data externally filled in`);
  //   } else {
  //     out.network3Service ??= await findApplication();
  //     logger.debug(
  //       `[%s] network3 load done {%s}`,
  //       out.network3Service.app,
  //       out.network3Service.id,
  //     );
  //   }
  //   if (!out.network3Service) {
  //     logger.fatal({ ...out.identificationData }, `Cannot identify self`);
  //     exit();
  //   }
  //   logger.info(
  //     { id: out.network3Service.id },
  //     `%s#%s online`,
  //     username,
  //     out.network3Service.app,
  //   );
  //   // eslint-disable-next-line sonarjs/no-empty-collection
  //   DEVICE_CHECKS.forEach(callback => callback(name, username));
  //   mqtt.subscribe(SERVICE_REBOOT(application), () => upgrade());
  //   setInterval(() => {
  //     mqtt.publish(APP_HEALTHCHECK, {
  //       pid,
  //       service_id: out.network3Service.id,
  //     } as ServiceOnlineGlobalPayload);
  //   }, HEALTH_CHECK_INTERVAL);
  //   event.emit(APPLICATION_IDENTIFY, out.network3Service);
  // });

  const out = {
    identificationData: {
      app: internal.boot.application.name,
      host: name,
      user: username,
    } as ProcessIdentify,
    network3Service: undefined as PopulatedService,
    upgrade: () =>
      setImmediate(
        async () =>
          await execa("./scripts/pull.sh", [internal.boot.application.name]),
      ),
  };

  return out;
}
