import { CronExpression, HOUR, MINUTE, TServiceParams } from "@digital-alchemy/core";

export function BedRoom({
  automation,
  home_automation,
  hass,
  synapse,
  context,
  scheduler,
  network4,
}: TServiceParams) {
  let earlyStop = false;
  const stickLight = hass.entity.byId("switch.stick_light");
  const isHome = hass.entity.byId("binary_sensor.zoe_is_home");
  const { fanSoundPlaying } = home_automation.sensors;
  // # General functions

  async function napTime(time: number) {
    await home_automation.global.globalOff();
    fanSoundPlaying.storage.set("is_on", true);
    await network4.maple.startSound();
    setTimeout(async () => {
      room.scene = "high";
      fanSoundPlaying.storage.set("is_on", false);
      await network4.maple.stopSound();
    }, time);
  }

  synapse.button({
    context,
    name: "45 min nap",
    press: async () => await napTime(45 * MINUTE),
  });

  scheduler.cron({
    exec: async () => {
      earlyStop = false;
      fanSoundPlaying.storage.set("is_on", true);
      await network4.maple.startSound();
    },
    schedule: CronExpression.EVERY_DAY_AT_10PM,
  });

  scheduler.cron({
    exec: async () => {
      if (!earlyStop) {
        fanSoundPlaying.storage.set("is_on", false);
        await network4.maple.stopSound();
      }
    },
    schedule: CronExpression.EVERY_DAY_AT_8AM,
  });

  scheduler.cron({
    exec: async () => {
      await hass.call.switch.turn_off({
        entity_id: "switch.stick_light",
      });
    },
    schedule: CronExpression.EVERY_DAY_AT_MIDNIGHT,
  });

  scheduler.cron({
    exec: async () => {
      await hass.call.switch.turn_on({
        entity_id: "switch.stick_light",
      });
    },
    schedule: CronExpression.EVERY_DAY_AT_7PM,
  });

  automation.managed_switch({
    context,
    entity_id: "switch.bedroom_wax_warmer",
    onUpdate: [stickLight, isHome],
    shouldBeOn() {
      return isHome.state === "on" && automation.time.isAfter("PM9") && stickLight.state === "on";
    },
  });

  // # Room definition
  const room = automation.room({
    area: "master_bedroom",
    context,
    scenes: {
      auto: {
        definition: {
          "light.bedroom_ceiling_fan": { brightness: 75, state: "on" },
          "light.dangle": { brightness: 150, state: "on" },
          "light.under_bed": { brightness: 200, state: "on" },
          "light.womp": { brightness: 255, state: "on" },
        },
        friendly_name: "Auto",
      },
      dimmed: {
        definition: {
          "light.bedroom_ceiling_fan": { brightness: 75, state: "on" },
          "light.dangle": { brightness: 150, state: "on" },
          "light.under_bed": { brightness: 200, state: "on" },
          "light.womp": { brightness: 255, state: "on" },
        },
        friendly_name: "Dimmed",
      },
      early: {
        definition: {
          "light.bedroom_ceiling_fan": { brightness: 75, state: "on" },
          "light.dangle": { brightness: 200, state: "on" },
          "light.under_bed": { brightness: 200, state: "on" },
          "light.womp": { brightness: 255, state: "on" },
        },
        friendly_name: "Early",
      },
      high: {
        definition: {
          "light.bedroom_ceiling_fan": { brightness: 255, state: "on" },
          "light.dangle": { brightness: 255, state: "on" },
          "light.under_bed": { brightness: 255, state: "on" },
          "light.womp": { brightness: 255, state: "on" },
        },
        friendly_name: "High",
      },
      high_dimmed: {
        definition: {
          "light.bedroom_ceiling_fan": { brightness: 200, state: "on" },
          "light.dangle": { brightness: 200, state: "on" },
          "light.under_bed": { brightness: 200, state: "on" },
          "light.womp": { brightness: 255, state: "on" },
        },
        friendly_name: "High Dimmed",
      },
      night: {
        definition: {
          "light.bedroom_ceiling_fan": { state: "off" },
          "light.dangle": { state: "off" },
          "light.under_bed": { brightness: 128, state: "on" },
          "light.womp": { brightness: 128, state: "on" },
        },
        friendly_name: "Night",
      },
      night_idle: {
        definition: {
          "light.bedroom_ceiling_fan": { state: "off" },
          "light.dangle": { state: "off" },
          "light.under_bed": { brightness: 32, state: "on" },
          "light.womp": { brightness: 32, state: "on" },
        },
        friendly_name: "Night Idle",
      },
      off: {
        definition: {
          "light.bedroom_ceiling_fan": { state: "off" },
          "light.dangle": { state: "off" },
          "light.under_bed": { state: "off" },
          "light.womp": { state: "off" },
        },
        friendly_name: "Off",
      },
    },
  });

  // # Pico bindings
  home_automation.pico.bed({
    context,
    exec: async () =>
      await hass.call.fan.increase_speed({
        entity_id: "fan.master_bedroom_ceiling_fan",
      }),
    match: ["raise", "raise"],
  });

  home_automation.pico.bed({
    context,
    exec: async () => {
      room.scene = "auto";
      if (stickLight.state === "on") {
        await hass.call.switch.turn_off({
          entity_id: "switch.stick_light",
        });
      }
    },
    match: ["stop", "stop"],
  });

  home_automation.pico.bed({
    context,
    exec: async () =>
      await hass.call.fan.decrease_speed({
        entity_id: "fan.master_bedroom_ceiling_fan",
      }),
    match: ["lower", "lower"],
  });

  home_automation.pico.bed({
    context,
    exec: async () => await napTime(HOUR),
    match: ["stop", "off"],
  });

  home_automation.pico.bed({
    context,
    exec: () => (room.scene = "off"),
    match: ["off"],
  });

  home_automation.pico.bed({
    context,
    exec: async () => await hass.call.switch.turn_off({ entity_id: "switch.stick_light" }),
    match: ["off", "off"],
  });

  home_automation.pico.bed({
    context,
    exec: async () => {
      if (fanSoundPlaying.storage.get("is_on") === true) {
        return;
      }
      if (!automation.time.isBetween("AM8", "PM10")) {
        fanSoundPlaying.storage.set("is_on", true);
        await network4.maple.startSound();
      }
    },
    match: ["stop", "raise", "on"],
  });

  home_automation.pico.bedroom({
    context,
    exec: () => (room.scene = "off"),
    match: ["off"],
  });

  home_automation.pico.bedroom({
    context,
    exec: () => (room.scene = "auto"),
    match: ["stop", "stop"],
  });

  home_automation.pico.bed({
    context,
    exec: () => (room.scene = "high"),
    match: ["on"],
  });

  home_automation.pico.bedroom({
    context,
    exec: () => (room.scene = "high"),
    match: ["on"],
  });

  hass.entity.byId("select.master_bedroom_current_scene").onUpdate(async () => {
    if (automation.time.isBetween("AM6", "AM8") && room.scene.includes("high")) {
      fanSoundPlaying.storage.set("is_on", false);
      earlyStop = true;
      await network4.maple.stopSound();
    }
  });

  return room;
}
