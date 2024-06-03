import { TServiceParams } from "@digital-alchemy/core";

export function Pith({ logger, context, network4, lifecycle }: TServiceParams) {
  const fetchService = network4.base(context);

  lifecycle.onPostConfig(() => {
    fetchService.setTarget({ app: "cambium", hostname: "graft", user: "zoe" });
  });

  return {
    async buildCambium() {
      logger.trace(`buildCambium`);
      await fetchService.fetch({
        method: "post",
        url: `/build-cambium`,
      });
    },
  };
}
