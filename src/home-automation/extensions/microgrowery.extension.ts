import {
  ARRAY_OFFSET,
  CronExpression,
  INCREMENT,
  is,
  sleep,
  START,
  TServiceParams,
} from "@digital-alchemy/core";
import { MessagePriority } from "@digital-alchemy/gotify-extension";
import dayjs from "dayjs";
import { join } from "path";

import { GrowMixture, GrowStatus, scaleMixture, SCHEDULE } from "../helpers";

export function Microgrowery({
  automation,
  home_automation,
  context,
  scheduler,
  hass,
  synapse,
  config,
  network4,
  logger,
}: TServiceParams) {
  const tentLight = hass.entity.byId("switch.tent_strip_lights");
  const { tent } = home_automation.sensors;
  const tentMode = hass.entity.byId("select.tent_mode");
  const houseMode = hass.entity.byId("select.house_mode");
  const gamesScene = hass.entity.byId("select.games_room_current_scene");

  scheduler.cron({
    async exec() {
      if (tentLight.state !== "on") {
        return;
      }
      if (home_automation.games.scene !== "off") {
        logger.debug("skipping picture, games scene = [%s]", home_automation.games.scene);
        return;
      }
      await hass.call.camera.snapshot({
        entity_id: "camera.wandering_high",
        filename: join("/config/snapshots/tent", dayjs().format("YYYY-MM-DD HH:mm") + ".png"),
      });
    },
    schedule: CronExpression.EVERY_10_MINUTES,
  });

  synapse.button({
    context,
    name: "Current grow schedule",
    async press() {
      const status = await getCurrentStatus();
      const keys = Object.keys(status.currentNutrients);
      await network4.gotify.controller({
        message: [
          `Current Plant: ${status.name}`,
          `Stage: ${status.stage.charAt(START).toUpperCase() + status.stage.slice(1)} (${status.week + INCREMENT})`,
          `Start: ${dayjs(status.startDate).toDate().toLocaleDateString()}`,
          ...(tentMode.state === "flower"
            ? [`Flip: ${dayjs(status.flipDate).toDate().toLocaleDateString()}`, , ""]
            : [``]),
          `Nutrients @ ${status.gallons} gallons`,
          ...keys.sort().map(i => `${status.currentNutrients[i]}ml ${i}`),
        ].join("\n"),
        priority: MessagePriority.high,
        title: "Nutrient Update",
      });
    },
  });

  automation.managed_switch({
    context,
    entity_id: "switch.tent_strip_lights",
    onUpdate: [tentMode],
    shouldBeOn: () => {
      if (tentMode.state === "debug") {
        return true;
      }
      if (tentMode.state === "flower") {
        return !automation.time.isBetween("AM6", "PM6");
      }
      return !automation.time.isBetween("AM2", "AM8");
    },
  });

  automation.managed_switch({
    context,
    entity_id: "switch.tent_strip_fan",
    onUpdate: [houseMode, tentMode, gamesScene],
    shouldBeOn: () => {
      if (home_automation.games.scene !== "off") {
        return false;
      }
      if (houseMode.state === "guest" || tentMode.state === "debug") {
        return false;
      }
      const minute = dayjs().minute();
      switch (tentMode.state) {
        case "debug": {
          return false;
        }
        case "veg-early": {
          return minute >= 50;
        }
        // case "veg-late":
        // case "flower":
        default: {
          return minute >= 50 || (minute >= 15 && minute <= 25);
        }
      }
    },
  });

  automation.managed_switch({
    context,
    entity_id: "switch.tent_strip_extra",
    onUpdate: [tentMode],
    shouldBeOn: () => {
      return tentMode.state !== "debug";
    },
  });

  let debugSleep: ReturnType<typeof sleep>;

  function stopDebugging() {
    if (!debugSleep) {
      return;
    }
    debugSleep.kill("continue");
    debugSleep = undefined;
  }

  function weekIndex() {
    const compare = dayjs(
      tentMode.state === "flower"
        ? tent.flipDate.storage.get("native_value")
        : tent.growStart.storage.get("native_value"),
    );
    const diff = Math.abs(Math.floor(dayjs().diff(compare, "week")));
    if (tentMode.state !== "flower") {
      return diff >= SCHEDULE.veg.length ? SCHEDULE.veg.length - ARRAY_OFFSET : diff;
    }
    return diff >= SCHEDULE.flower.length ? SCHEDULE.flower.length - ARRAY_OFFSET : diff;
  }

  async function getCurrentMixture(gallons: number): Promise<GrowMixture> {
    const start = dayjs(tent.growStart.storage.get("native_value"));
    const now = dayjs();
    if (start.isAfter(now)) {
      logger.debug({ start: start.toDate() }, `start date is in the future`);
      return {};
    }
    const stage = tentMode.state === "flower" ? "flower" : "veg";
    const options = SCHEDULE[stage];
    if (is.empty(options)) {
      logger.error(`could not load options for stage {%s}`, stage);
      return {};
    }
    const index = weekIndex();
    if (tentMode.state !== "flower") {
      return scaleMixture(SCHEDULE.veg[index], gallons);
    }
    return scaleMixture(SCHEDULE.flower[index], gallons);
  }

  async function getCurrentStatus(): Promise<GrowStatus> {
    const gallons = config.home_automation.DEFAULT_GALLONS;
    return {
      currentNutrients: await getCurrentMixture(gallons),
      flipDate: tent.flipDate.storage.get("native_value"),
      gallons,
      name: tent.name.storage.get("native_value"),
      stage: tentMode.state === "flower" ? "flower" : "veg",
      startDate: tent.growStart.storage.get("native_value"),
      week: weekIndex(),
    };
  }

  return {
    getCurrentMixture,
    getCurrentStatus,
    stopDebugging,
    weekIndex,
  };
}
