import { CronExpression, is, TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY } from "@digital-alchemy/hass";
import dayjs from "dayjs";
import { join } from "path";

const BASICALLY_NOW = 10;
type states = "heat_cool" | "off";
const WAKE_UP_TARGET_TEMP = 78;

export function MiscAreas({
  automation,
  context,
  home_automation,
  network4,
  logger,
  synapse,
  lifecycle,
  hass,
  scheduler,
}: TServiceParams) {
  //
  // imports & definitions
  //

  const list = ["office", "bed", "bedroom", "living", "desk"] as const;
  const { isHome, houseMode } = home_automation.sensors;
  const downstairs = hass.entity.byId("climate.downstairs");
  const upstairs = hass.entity.byId("climate.ecobee_upstairs");
  automation.managed_switch({
    context,
    entity_id: hass.entity.byLabel("tplink_led"),
    shouldBeOn() {
      return automation.solar.isBetween("dawn", "dusk");
    },
  });

  async function globalOff() {
    home_automation.kitchen.scene = "off";
    home_automation.loft.scene = "off";
    home_automation.games.scene = "off";
    home_automation.living.scene = "off";
    home_automation.office.scene = "off";
    home_automation.bedroom.scene = "off";
    await hass.call.switch.turn_off({
      entity_id: hass.entity.byLabel("transition_device"),
    });
  }

  isHome.onUpdate(async (new_state, old_state) => {
    if (new_state.state === "off" && old_state.state === "on") {
      logger.debug("left home, turning off lights");
      await globalOff();
      return;
    }
    if (new_state.state === "on" && old_state.state === "off") {
      logger.debug("welcome home");
      home_automation.kitchen.scene = "high";
      home_automation.living.scene = "high";
    }
  });

  async function updateRecordingMode() {
    await hass.call.select.select_option({
      entity_id: "select.dining_room_recording_mode",
      option: houseMode.current_option === "guest" ? "Never" : "Always",
    });
  }

  houseMode.onUpdate(updateRecordingMode);
  lifecycle.onReady(updateRecordingMode);

  /**
   * Mental note: this does not properly respect high vs evening high type distinctions
   *
   * It serves a "make everything bright" role
   */
  async function globalOn() {
    home_automation.kitchen.scene = "high";
    home_automation.loft.scene = "high";
    // home_automation.games.scene = "high";
    home_automation.living.scene = "high";
    home_automation.office.scene = "high";
    home_automation.bedroom.scene = "high";
  }

  scheduler.cron({
    exec: async () => await TakeSnapshot(),
    schedule: CronExpression.EVERY_30_MINUTES,
  });

  async function TakeSnapshot(force = false) {
    if (!force && !automation.solar.isBetween("sunriseEnd", "dusk")) {
      return;
    }
    const file = `${dayjs().format("YYYY-MM-DD-HH-mm")}.png`;
    if (force) {
      logger.info({ file }, `manual snapshot`);
    } else {
      logger.debug({ file }, "scheduled snapshot");
    }
    await hass.call.camera.snapshot({
      entity_id: "camera.garage_high",
      filename: join("/config/snapshots/garage", file),
    });
    await hass.call.camera.snapshot({
      entity_id: "camera.back_yard_high",
      filename: join("/config/snapshots/back", file),
    });
    await hass.call.camera.snapshot({
      entity_id: "camera.back_yard_low",
      filename: join("/config/snapshots/plants", file),
    });
  }

  synapse.button({
    context,
    name: "Take Snapshot",
    press: async () => await TakeSnapshot(true),
  });

  async function setThermostat(entity: PICK_ENTITY<"climate">, current: string, expected: states) {
    if (current !== expected) {
      logger.info(`[%s] set state {%s}`, entity, expected);
      await hass.call.climate.set_hvac_mode({
        entity_id: entity,
        hvac_mode: expected,
      });
    }
  }

  scheduler.cron({
    async exec() {
      const current = upstairs.attributes.target_temp_high;
      if (current > WAKE_UP_TARGET_TEMP) {
        logger.info({ current, target: WAKE_UP_TARGET_TEMP }, `lowering temperature for wake up`);
        await hass.call.climate.set_temperature({
          entity_id: "climate.ecobee_upstairs",
          target_temp_high: WAKE_UP_TARGET_TEMP,
        });
      }
    },
    schedule: CronExpression.EVERY_DAY_AT_5AM,
  });

  const windowsOpen = hass.entity.byId("switch.windows_open");
  const guestMode = hass.entity.byId("switch.meeting_mode");

  windowsOpen.onUpdate(async () => {
    const expected = windowsOpen.state === "on" ? "off" : "heat_cool";
    await setThermostat("climate.ecobee_upstairs", upstairs.state, expected);
    await setThermostat("climate.downstairs", downstairs.state, expected);
  });

  async function globalDoorbell() {
    const files = await network4.orchid.listFiles();
    const file = is.random(files);
    await network4.orchid.playSound(file);
  }

  hass.entity.byId("binary_sensor.doorbell_doorbell").onUpdate(async () => await globalDoorbell());

  /**
   * Keep away tricker or treaters!
   *
   * Unless I'm having a party, and am expecting you
   */
  const keepLightsOff = () => {
    if (guestMode.state === "on") {
      return false;
    }
    const halloween = new Date();
    halloween.setMonth(10);
    halloween.setDate(1);
    halloween.setHours(0);

    const NOW = dayjs();
    if (Math.abs(NOW.diff(halloween, "hour")) <= BASICALLY_NOW) {
      return true;
    }
    return false;
  };

  automation.managed_switch({
    context,
    entity_id: "switch.front_porch_light",
    shouldBeOn() {
      if (keepLightsOff()) {
        return false;
      }
      return !automation.solar.isBetween("dawn", "dusk");
    },
  });

  list.forEach(i => {
    // You know how nice it is to push the secret code on any switch, and your phone rings?!
    home_automation.pico[i]({
      context,
      exec: async () => await network4.graft.findPhone(),
      match: ["stop", "lower", "raise"],
    });

    home_automation.pico[i]({
      context,
      exec: async () => await globalOff(),
      match: ["off", "off"],
    });

    home_automation.pico[i]({
      context,
      exec: async () => await globalOn(),
      match: ["on", "on"],
    });
  });

  return {
    focus: async () =>
      await hass.call.switch.turn_off({
        entity_id: hass.entity.byLabel("transition_device"),
      }),
    globalDoorbell,
    globalOff,
    globalOn,
  };
}
