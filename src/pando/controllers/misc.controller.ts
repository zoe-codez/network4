import { TServiceParams } from "@digital-alchemy/core";
import {
  GENERIC_SUCCESS_RESPONSE,
  NotImplementedError,
} from "@digital-alchemy/fastify-extension";

import { OpenAIHints, OpenAIPrompts, SetChatTimer } from "../../core";

export function MiscController({ pando, fastify, context }: TServiceParams) {
  fastify.routes(server => {
    server.post<{ Body: OpenAIHints; Params: { type: OpenAIPrompts } }>(
      "/openai/generate/:type",
      async ({ body, params }) => {
        switch (params.type) {
          case OpenAIPrompts.wakeUp:
            return pando.open_ai.wakeUp.join("\n");
          case OpenAIPrompts.goToSleep:
            return pando.open_ai.goToBed.join("\n");
          case OpenAIPrompts.iceMaker:
            return await pando.open_ai.getIceMakerCompletionMessage();
          case OpenAIPrompts.workTimer:
            return await pando.open_ai.getWorkTimerCompletionMessage(body.hint);
          case OpenAIPrompts.countdown:
            return await pando.open_ai.getCountdownTimerCompletionMessage(
              body.hint,
            );
          default:
            throw new NotImplementedError(context, "BAD_GENERATE_TYPE");
        }
      },
    );

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
