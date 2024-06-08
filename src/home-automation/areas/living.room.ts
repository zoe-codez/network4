import { CronExpression, TServiceParams } from "@digital-alchemy/core";

export function LivingRoom({
  automation,
  context,
  hass,
  scheduler,
  home_automation,
}: TServiceParams) {
  // # Scheduled actions
  automation.solar.onEvent({
    eventName: "sunriseEnd",
    exec: async () => {
      if (room.scene === "evening_high") {
        room.scene = "high";
      }
    },
  });

  automation.solar.onEvent({
    eventName: "sunsetStart",
    exec: async () => {
      if (room.scene === "high") {
        room.scene = "evening_high";
      }
    },
  });

  scheduler.cron({
    exec: async () => {
      if (room.scene === "auto") {
        room.scene = "evening";
      }
    },
    schedule: CronExpression.EVERY_DAY_AT_11PM,
  });

  // # Room definition
  const room = automation.room({
    area: "living_room",
    context,
    scenes: {
      auto: {
        definition: {
          "light.living_room_fan": { brightness: 100, state: "on" },
          "light.tower_left": { brightness: 200, state: "on" },
          "light.tower_right": { brightness: 200, state: "on" },
          "switch.living_room_accessories": { state: "on" },
        },
        friendly_name: "Auto",
      },
      dimmed: {
        definition: {
          "light.living_room_fan": { brightness: 100, state: "on" },
          "light.tower_left": { brightness: 200, state: "on" },
          "light.tower_right": { brightness: 200, state: "on" },
          "switch.living_room_accessories": { state: "on" },
        },
        friendly_name: "Dimmed",
      },
      evening: {
        definition: {
          "light.living_room_fan": { brightness: 80, state: "on" },
          "light.tower_left": { brightness: 100, state: "on" },
          "light.tower_right": { brightness: 100, state: "on" },
          "switch.living_room_accessories": { state: "off" },
        },
        friendly_name: "Evening",
      },
      evening_high: {
        definition: {
          "light.living_room_fan": { brightness: 200, state: "on" },
          "light.tower_left": { brightness: 200, state: "on" },
          "light.tower_right": { brightness: 200, state: "on" },
          "switch.living_room_accessories": { state: "on" },
        },
        friendly_name: "Evening High",
      },
      high: {
        definition: {
          "light.living_room_fan": { brightness: 255, state: "on" },
          "light.tower_left": { brightness: 255, state: "on" },
          "light.tower_right": { brightness: 255, state: "on" },
          "switch.living_room_accessories": { state: "on" },
        },
        friendly_name: "High",
      },
      off: {
        definition: {
          "light.living_room_fan": { state: "off" },
          "light.tower_left": { state: "off" },
          "light.tower_right": { state: "off" },
          "switch.living_room_accessories": { state: "off" },
        },
        friendly_name: "Off",
      },
    },
  });

  // # Entities
  const { isHome, meetingMode, houseMode } = home_automation.sensors;

  async function focus() {
    home_automation.kitchen.scene = "off";
    home_automation.office.scene = "off";
    home_automation.bedroom.scene = "off";
  }

  // # Managed switches
  automation.managed_switch({
    context,
    entity_id: "switch.media_backdrop",
    onUpdate: [meetingMode, isHome],
    shouldBeOn() {
      if (!isHome.is_on) {
        return false;
      }
      if (automation.solar.isBetween("sunriseEnd", "sunriseEnd")) {
        return false;
      }
      return automation.time.isAfter("PM8") && !room.scene.includes("high");
    },
  });

  automation.managed_switch({
    context,
    entity_id: "switch.moon_mirror",
    onUpdate: [houseMode],
    shouldBeOn() {
      if (!automation.time.isBetween("AM5", "PM5")) {
        return true;
      }
      return houseMode.current_option === "guest";
    },
  });

  // # Pico bindings
  home_automation.pico.living({
    context,
    exec: async () => (room.scene = "auto"),
    match: ["stop", "stop"],
  });

  home_automation.pico.living({
    context,
    exec: async () => {
      home_automation.kitchen.scene = "off";
      home_automation.office.scene = "off";
      home_automation.bedroom.scene = "off";
      await hass.call.switch.turn_off({
        entity_id: hass.entity.byFloor("upstairs", "switch"),
      });
      await home_automation.global.focus();
    },
    match: ["stop", "stop", "stop"],
  });

  home_automation.pico.living({
    context,
    exec: () =>
      (room.scene = automation.solar.isBetween("sunriseEnd", "sunsetStart")
        ? "high"
        : "evening_high"),
    match: ["on"],
  });

  home_automation.pico.living({
    context,
    exec: async () => (room.scene = "off"),
    match: ["off"],
  });

  return room;
}
