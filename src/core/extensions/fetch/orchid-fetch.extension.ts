import { TServiceParams } from "@digital-alchemy/core";

export function Orchid({ logger, context, network4, lifecycle }: TServiceParams) {
  const fetchService = network4.base(context);

  lifecycle.onPostConfig(() => {
    fetchService.setTarget({ app: "cambium", hostname: "orchid", user: "zoe" });
  });

  return {
    async listFiles(): Promise<string[]> {
      logger.trace(`listFiles`);
      return await fetchService.fetch({
        url: "/sound-files",
      });
    },

    async playSound(sound: string): Promise<void> {
      logger.trace({ sound }, `playSound`);
      await fetchService.fetch({
        body: { sound },
        method: "post",
        url: `/play-sound`,
      });
    },
  };
}
