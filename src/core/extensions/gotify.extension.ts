import { TServiceParams } from "@digital-alchemy/core";
import { Message } from "@digital-alchemy/gotify-extension";

enum GotifyApps {
  graft = "graft",
  controller = "controller",
  testing = "testing",
  reminders = "reminders",
  pando = "pando",
  cambium = "cambium",
}

export function Gotify({ logger, gotify, config }: TServiceParams) {
  return {
    ...(Object.fromEntries(
      Object.values(GotifyApps).map(i => [
        i,
        async (message: Message): Promise<unknown> => {
          logger.info({
            data: {
              ...message,
              appid: config.gotify.CHANNEL_MAPPING[i],
            },
          });
          return await gotify.message.create({
            ...message,
            appid: config.gotify.CHANNEL_MAPPING[i],
          });
        },
      ]),
    ) as Record<`${GotifyApps}`, (message: Message) => Promise<unknown>>),
  };
}
