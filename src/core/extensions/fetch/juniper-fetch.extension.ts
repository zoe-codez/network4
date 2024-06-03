import { TServiceParams } from "@digital-alchemy/core";

import { ListSinksResponse, RenameBody } from "../../helpers";

export function Juniper({ logger, context, network4, lifecycle }: TServiceParams) {
  const fetchService = network4.base(context);

  lifecycle.onPostConfig(() => {
    fetchService.setTarget({
      app: "cambium",
      hostname: "juniper",
      user: "emily",
    });
  });

  return {
    async listSoundSinks(): Promise<ListSinksResponse> {
      logger.trace(`listSoundSinks`);
      return await fetchService.fetch({
        url: `/audio/sinks`,
      });
    },

    async playSound(sound: string): Promise<void> {
      logger.trace(`playSound`);
      await fetchService.fetch({
        body: { sound },
        method: "post",
        url: ``,
      });
    },

    async renameSink(sink: string, name: string): Promise<void> {
      logger.trace(`renameSink`);
      return await fetchService.fetch({
        body: { name, sink } as RenameBody,
        method: "post",
        url: `/audio/sink/rename`,
      });
    },

    async setDefaultSoundSink(sink: number): Promise<void> {
      logger.trace(`setDefaultSoundSink`);
      return await fetchService.fetch({
        method: "post",
        url: `/audio/sink/default/${sink}`,
      });
    },

    async setSinkVolume(sink: number, target: string): Promise<void> {
      logger.trace(`setSinkVolume`);
      return await fetchService.fetch({
        body: { target },
        method: "post",
        url: `/audio/sink/volume/${sink}`,
      });
    },
  };
}
