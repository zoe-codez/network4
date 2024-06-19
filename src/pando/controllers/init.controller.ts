import { TServiceParams } from "@digital-alchemy/core";
import {
  GENERIC_SUCCESS_RESPONSE,
  NotFoundError,
} from "@digital-alchemy/fastify-extension";

import { ProcessIdentify } from "../../core";

export function InitController({
  pando,
  logger,
  fastify,
  context,
}: TServiceParams) {
  fastify.routes(server => {
    server.post<{ Body: ProcessIdentify }>(
      "/init/identify",
      async ({ body }) => {
        const out = await pando.health.identify(body);
        if (!out) {
          throw new NotFoundError(context, "BAD_APP", `Bad app: ${body.app}`);
        }
        logger.info(
          `[%s] identify %s#%s`,
          out.app,
          out.Network3Account.Network3Device.hostname,
          out.Network3Account.user,
        );
        return out;
      },
    );

    server.post<{ Params: IdentifyParams }>(
      "/init/identify/:username/:hostname/:application",
      async ({ params }) => {
        await pando.health.onInit(
          params.username,
          params.hostname,
          params.application,
        );
        return GENERIC_SUCCESS_RESPONSE;
      },
    );
  });
}

type IdentifyParams = {
  username: string;
  hostname: string;
  application: string;
};
