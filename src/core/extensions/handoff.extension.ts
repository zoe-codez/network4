import { TServiceParams } from "@digital-alchemy/core";

export function Handoff({ logger, config, context, lifecycle, synapse, internal }: TServiceParams) {
  //
  lifecycle.onReady(() => {
    logger.warn({ environment: config.network4.ENVIRONMENT }, `loaded with environment`);
  });

  // synapse.button({
  //   context,
  //   async exec() {
  //     if (config.network4.ENVIRONMENT !== "develop") {
  //       return;
  //     }
  //     logger.warn("HIT");
  //   },
  //   name: `${internal.utils.TitleCase(internal.boot.application.name)} develop quit`,
  // });
}
