import { TServiceParams } from "@digital-alchemy/core";
import { GENERIC_SUCCESS_RESPONSE } from "@digital-alchemy/fastify-extension";

import { SetChatTimer } from "../../core";

export function MiscController({ pando, fastify, context }: TServiceParams) {
  fastify.routes(server => {
    server.post("/wake-up", async () => {
      await pando.todo_coordinator.onWakeUp();
      return GENERIC_SUCCESS_RESPONSE;
    });

    server.post<{ Body: SetChatTimer }>("/work", async ({ body }) => {
      await pando.timer.workTimer(body);
      return GENERIC_SUCCESS_RESPONSE;
    });

    server.post<{ Body: SetChatTimer }>("/countdown", async ({ body }) => {
      await pando.timer.countdownTimer(body);
      return GENERIC_SUCCESS_RESPONSE;
    });

    server.post("/work/stop", async () => {
      await pando.timer.workTimerStop();
      return GENERIC_SUCCESS_RESPONSE;
    });
  });
}
