import { CronExpression, TServiceParams } from "@digital-alchemy/core";

export function Office({
  synapse,
  context,
  home_automation,
  automation,
  hass,
  logger,
  scheduler,
  network4,
}: TServiceParams) {
  const DIM_SCENES = new Set<typeof room.scene>(["off", "night", "dim", "evening"]);
  // // # General functions
  function AutoScene(hold = true): typeof room.scene {
    if (automation.time.isBetween("AM6", "PM10")) {
      return "auto";
    }
    return automation.time.isBetween("AM6", "PM10:30") || (!hold && room.scene === "night")
      ? "dim"
      : "night";
  }

  async function Focus() {
    logger.info(`focus office`);
    home_automation.bedroom.scene = "off";
    home_automation.loft.scene = "off";
    home_automation.kitchen.scene = "off";
    home_automation.living.scene = "off";
    await hass.call.switch.turn_off({
      entity_id: hass.entity.byLabel("transition_device"),
    });
    room.scene = AutoScene();
  }

  // # Scheduler
  scheduler.cron({
    exec: async () => {
      const auto = AutoScene();
      if (!DIM_SCENES.has(room.scene)) {
        return;
      }
      if ([auto, "off"].includes(room.scene)) {
        return;
      }
      logger.info(`changing scene {%s} => {%s}`, room.scene, auto);
      room.scene = auto;
    },
    schedule: CronExpression.EVERY_10_MINUTES,
  });

  // # Room definition
  const room = automation.room({
    area: "office",
    context,
    scenes: {
      auto: {
        definition: {
          "light.monitor_bloom": { brightness: 255, state: "on" },
          "light.office_fan": { brightness: 150, state: "on" },
          "light.office_plant_accent": { brightness: 200, state: "on" },
          "switch.desk_strip_dog_light": { state: "on" },
          "switch.mega_matrix": { state: "on" },
        },
        friendly_name: "Auto",
      },
      dim: {
        definition: {
          "light.monitor_bloom": { brightness: 150, state: "on" },
          "light.office_fan": { brightness: 100, state: "on" },
          "light.office_plant_accent": { brightness: 150, state: "on" },
          "switch.desk_strip_dog_light": { state: "off" },
          "switch.mega_matrix": { state: "on" },
        },
        friendly_name: "Dim",
      },
      evening: {
        definition: {
          "light.monitor_bloom": { brightness: 150, state: "on" },
          "light.office_fan": { brightness: 50, state: "on" },
          "light.office_plant_accent": { brightness: 150, state: "on" },
          "switch.desk_strip_dog_light": { state: "off" },
          "switch.mega_matrix": { state: "on" },
        },
        friendly_name: "Evening",
      },
      high: {
        definition: {
          "light.monitor_bloom": { brightness: 255, state: "on" },
          "light.office_fan": { brightness: 255, state: "on" },
          "light.office_plant_accent": { brightness: 255, state: "on" },
          "switch.desk_strip_dog_light": { state: "on" },
          "switch.mega_matrix": { state: "on" },
        },
        friendly_name: "High",
      },
      meeting: {
        definition: {
          "light.monitor_bloom": { brightness: 255, state: "on" },
          "light.office_fan": { brightness: 100, state: "on" },
          "light.office_plant_accent": { brightness: 100, state: "on" },
          "switch.desk_strip_crafts": { state: "off" },
          "switch.desk_strip_dog_light": { state: "off" },
          "switch.mega_matrix": { state: "on" },
        },
        friendly_name: "Meeting",
      },
      night: {
        definition: {
          "light.monitor_bloom": { brightness: 75, state: "on" },
          "light.office_fan": { brightness: 40, state: "on" },
          "light.office_plant_accent": { brightness: 80, state: "on" },
          "switch.desk_strip_dog_light": { state: "off" },
          "switch.mega_matrix": { state: "on" },
        },
        friendly_name: "Night",
      },
      off: {
        definition: {
          "light.monitor_bloom": { state: "off" },
          "light.office_fan": { state: "off" },
          "light.office_plant_accent": { state: "off" },
          "switch.desk_strip_crafts": { state: "off" },
          "switch.desk_strip_dog_light": { state: "off" },
          "switch.foot_fan": { state: "off" },
          "switch.mega_matrix": { state: "off" },
          "switch.office_box_fan": { state: "off" },
        },
        friendly_name: "Off",
      },
    },
  });

  // #MARK: Entities
  const upstairs = hass.entity.byId("climate.ecobee_upstairs");
  const officePlants = hass.entity.byId("switch.desk_strip_office_plants");
  const isHome = hass.entity.byId("binary_sensor.zoe_is_home");
  const currentScene = hass.entity.byId("select.office_current_scene");
  const meetingMode = hass.entity.byId("switch.meeting_mode");
  // const houseMode = hass.entity.byId("select.house_mode");

  synapse.button({
    context,
    name: "Office Focus",
    press: async () => await Focus(),
  });

  // # Managed switches
  // ## Blanket light
  automation.managed_switch({
    context,
    entity_id: "switch.blanket_light",
    onUpdate: [meetingMode, isHome],
    shouldBeOn() {
      if (isHome.state === "off") {
        return false;
      }
      if (meetingMode.state === "on") {
        return true;
      }
      return automation.time.isBetween("AM7", "PM7");
    },
  });

  // ## Fairy lights
  automation.managed_switch({
    context,
    entity_id: "switch.fairy_lights",
    onUpdate: [meetingMode, isHome],
    shouldBeOn() {
      if (isHome.state === "off") {
        return false;
      }
      return automation.time.isBetween("AM7", "PM10");
    },
  });

  automation.managed_switch({
    context,
    entity_id: "switch.dragonfly_lights",
    onUpdate: [officePlants, meetingMode, isHome],
    shouldBeOn() {
      if (isHome.state === "off") {
        return false;
      }
      if (meetingMode.state == "on") {
        return true;
      }
      return !automation.time.isBetween("AM1:30", "PM4");
    },
  });

  // ## Plant lights
  automation.managed_switch({
    context,
    entity_id: "switch.desk_strip_office_plants",
    onUpdate: [meetingMode, upstairs],
    shouldBeOn() {
      if (meetingMode.state === "on") {
        return false;
      }
      if (!automation.solar.isBetween("sunrise", "sunset")) {
        return false;
      }
      if (automation.time.isBefore("PM3")) {
        return true;
      }
      if (upstairs.attributes.hvac_action === "cooling") {
        return false;
      }
      if (automation.time.isAfter("PM5")) {
        return false;
      }
      if (room.scene !== "high") {
        return false;
      }
      // leave as is
      return undefined;
    },
  });

  // ## Wax warmer
  automation.managed_switch({
    context,
    entity_id: "switch.desk_strip_wax",
    onUpdate: [currentScene, isHome],
    shouldBeOn() {
      if (isHome.state === "off") {
        return false;
      }
      const scene = room.scene;
      return (scene !== "off" && automation.time.isBetween("AM5", "PM9")) || scene === "auto";
    },
  });

  // # Pico bindings
  // ## Wall
  home_automation.pico.office({
    context,
    exec: async () => (room.scene = "high"),
    match: ["on"],
  });

  home_automation.pico.office({
    context,
    exec: async () => (room.scene = AutoScene()),
    match: ["stop", "stop"],
  });

  home_automation.pico.office({
    context,
    exec: async () => (room.scene = "off"),
    match: ["off"],
  });

  // ## Spare
  home_automation.pico.spare({
    context,
    exec: async () =>
      await hass.call.switch.turn_off({
        entity_id: "switch.desk_strip_crafts",
      }),
    match: ["off"],
  });

  home_automation.pico.spare({
    context,
    exec: async () =>
      await hass.call.switch.turn_on({
        entity_id: "switch.desk_strip_crafts",
      }),
    match: ["on"],
  });

  // ## Desk
  home_automation.pico.desk({
    context,
    exec: async () =>
      await hass.call.fan.decrease_speed({
        entity_id: "fan.office_ceiling_fan",
      }),
    match: ["lower"],
  });

  home_automation.pico.desk({
    context,
    exec: async () => (room.scene = AutoScene()),
    match: ["stop", "stop"],
  });

  home_automation.pico.desk({
    context,
    exec: async () => hass.call.switch.toggle({ entity_id: "switch.meeting_mode" }),
    match: ["stop", "on"],
  });

  home_automation.pico.desk({
    context,
    exec: async () =>
      await hass.call.fan.turn_off({
        entity_id: "fan.office_ceiling_fan",
      }),
    match: ["lower", "lower"],
  });

  home_automation.pico.desk({
    context,
    exec: async () =>
      await hass.call.fan.increase_speed({
        entity_id: "fan.office_ceiling_fan",
      }),
    match: ["raise"],
  });

  // plug repurposed while cold out
  home_automation.pico.desk({
    context,
    exec: async () =>
      await hass.call.switch.toggle({
        entity_id: "switch.foot_fan",
      }),
    match: ["stop", "lower"],
  });

  home_automation.pico.desk({
    context,
    exec: async () => await Focus(),
    match: ["stop", "stop", "stop"],
  });

  home_automation.pico.desk({
    context,
    exec: async () => (room.scene = "high"),
    match: ["on"],
  });

  home_automation.pico.desk({
    context,
    exec: async () => (room.scene = "off"),
    match: ["off"],
  });

  currentScene.onUpdate(async () => {
    await (DIM_SCENES.has(room.scene)
      ? network4.graft.setMonitorDim()
      : network4.graft.setMonitorBright());
    await (room.scene === "off" ? network4.graft.shortTimeout() : network4.graft.longTimeout());
  });

  return room;
}