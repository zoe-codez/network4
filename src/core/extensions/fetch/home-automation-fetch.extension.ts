import { SceneDescription } from "@digital-alchemy/automation";
import { TServiceParams } from "@digital-alchemy/core";
import { Dayjs } from "dayjs";

import { GrowMixture, GrowStatus, RoomNames, SetChatTimer } from "../../helpers";

export function HomeAutomation({ logger, context, network4, lifecycle }: TServiceParams) {
  const fetchService = network4.base(context);

  lifecycle.onPostConfig(() => {
    fetchService.setTarget({
      app: "home-automation",
      hostname: "pith",
      user: "zoe",
    });
  });

  return {
    async controllerWasDown(downSince: Dayjs): Promise<void> {
      logger.trace(`controllerWasDown`);
      await fetchService.fetch({
        body: { time: downSince.toISOString() },
        method: "post",
        url: `/command/CONTROLLER_WAS_DOWN`,
      });
    },

    async findPhone(): Promise<void> {
      logger.trace(`findPhone`);
      await fetchService.fetch({
        method: "post",
        url: "/command/find-phone",
      });
    },

    async getCurrentTentNutrients(): Promise<GrowMixture> {
      logger.trace(`getCurrentTentNutrients`);
      return await fetchService.fetch({
        url: `/microgrowery/current-mixture`,
      });
    },

    async getCurrentTentStatus(): Promise<GrowStatus> {
      logger.trace(`getCurrentTentStatus`);
      return await fetchService.fetch({
        url: `/microgrowery/status`,
      });
    },

    async hassRebuild(): Promise<void> {
      logger.trace(`hassRebuild`);
      await fetchService.fetch({
        method: "post",
        url: `/command/hass-rebuild`,
      });
    },

    async iceTimer(body: SetChatTimer): Promise<void> {
      logger.trace(`iceTimer`);
      await fetchService.fetch({
        body,
        method: "post",
        url: `/command/ice-timer`,
      });
    },

    async napTimer(body: SetChatTimer): Promise<void> {
      logger.trace(`napTimer`);
      await fetchService.fetch({
        body,
        method: "post",
        url: "/command/nap-timer",
      });
    },

    async roomScenes(): Promise<SceneDescription<RoomNames>> {
      logger.trace(`roomScenes`);
      return await fetchService.fetch({
        url: `/room/all-scenes`,
      });
    },

    async setTentFlip(flip: string): Promise<void> {
      logger.trace(`setTentFlip`);
      await fetchService.fetch({
        body: { flip },
        method: "put",
        url: `/microgrowery/flip-tent`,
      });
    },

    async setTentGrowName(name: string): Promise<void> {
      logger.trace(`setTentGrowName`);
      await fetchService.fetch({
        body: { name },
        method: "put",
        url: `/microgrowery/grow-name`,
      });
    },

    async setTentStage(stage: "veg" | "flower"): Promise<void> {
      logger.trace(`setTentStage`);
      await fetchService.fetch({
        body: { stage },
        method: "put",
        url: `/microgrowery/grow-stage`,
      });
    },

    async setTentStart(start: string): Promise<void> {
      logger.trace(`setTentStart`);
      await fetchService.fetch({
        body: { start },
        method: "put",
        url: `/microgrowery/grow-start`,
      });
    },
  };
}
