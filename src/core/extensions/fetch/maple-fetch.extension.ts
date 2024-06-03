import { TServiceParams } from "@digital-alchemy/core";

import { ListSinksResponse } from "../../helpers";

export type SoundStatusResponse = {
  playing: boolean;
  start?: string;
};
export type SoundStatus = {
  playing: boolean;
  start?: Date;
};

export function Maple({ logger, context, network4, lifecycle }: TServiceParams) {
  const fetchService = network4.base(context);

  lifecycle.onPostConfig(() => {
    fetchService.setTarget({
      app: "cambium",
      hostname: "maple",
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

    async playSound(file: string): Promise<void> {
      logger.trace(`playSound`);
      await fetchService.fetch({
        body: { file },
        method: "post",
        url: `/sound-play`,
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

    async soundStatus(): Promise<SoundStatus> {
      logger.trace(`soundStatus`);
      const response = await fetchService.fetch<SoundStatusResponse>({
        url: "/sound-status",
      });
      if (!response.playing) {
        return {
          playing: false,
        };
      }
      return {
        playing: true,
        start: new Date(response.start),
      };
    },

    async startSound(): Promise<void> {
      logger.trace(`startSound`);
      return await fetchService.fetch({
        method: "post",
        url: `/fan-start/`,
      });
    },

    async stopSound(): Promise<void> {
      logger.trace(`stopSound`);
      return await fetchService.fetch({
        method: "post",
        url: `/fan-stop`,
      });
    },
  };
}
