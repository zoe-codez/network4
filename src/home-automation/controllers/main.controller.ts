import { TServiceParams } from "@digital-alchemy/core";
import { GENERIC_SUCCESS_RESPONSE } from "@digital-alchemy/fastify-extension";

export function MainController({
  logger,
  fastify,
  config,
  home_automation,
  network4,
}: TServiceParams) {
  fastify.routes(server => {
    server.post("/command/find-phone", async () => {
      await network4.graft.findPhone();
      return GENERIC_SUCCESS_RESPONSE;
    });
  });
}
