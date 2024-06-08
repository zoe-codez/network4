import { TServiceParams } from "@digital-alchemy/core";

export function Loft({ automation, context, home_automation, hass }: TServiceParams) {
  const room = automation.room({
    area: "loft",
    context,
    scenes: {
      auto: {
        definition: {
          "light.loft_fan": { brightness: 150, state: "on" },
        },
        friendly_name: "Auto",
      },
      evening_auto: {
        definition: {
          "light.loft_fan": { brightness: 50, state: "on" },
        },
        friendly_name: "Evening auto",
      },
      evening_high: {
        definition: {
          "light.loft_fan": { brightness: 175, state: "on" },
        },
        friendly_name: "Evening high",
      },
      high: {
        definition: {
          "light.loft_fan": { brightness: 255, state: "on" },
        },
        friendly_name: "High",
      },
      off: {
        definition: {
          "light.loft_fan": { state: "off" },
        },
        friendly_name: "Off",
      },
      to_bed: {
        definition: {
          "light.loft_fan": { brightness: 10, state: "on" },
        },
        friendly_name: "To bed",
      },
    },
  });

  const meetingMode = hass.entity.byId("switch.meeting_mode");
  const loftScene = hass.entity.byId("select.loft_current_scene");
  const isHome = hass.entity.byId("binary_sensor.zoe_is_home");
  const climate = hass.entity.byId("climate.ecobee_upstairs");
  const mode = hass.entity.byId("select.house_mode");

  automation.managed_switch({
    context,
    entity_id: "switch.loft_box_fan",
    onUpdate: [isHome, meetingMode, climate, mode],
    shouldBeOn() {
      if (meetingMode.state === "on") {
        return false;
      }
      if (!automation.solar.isBetween("dawn", "dusk") || automation.time.isBefore("AM8")) {
        return false;
      }
      if (isHome.state === "off") {
        return true;
      }
      if (mode.state === "chores") {
        return true;
      }
      return climate.attributes.hvac_action === "cooling";
    },
  });

  isHome.onUpdate(async ({ state }) => {
    if (state === "off") {
      await hass.call.fan.turn_off({ entity_id: "fan.loft_ceiling_fan" });
    }
  });

  automation.managed_switch({
    context,
    entity_id: "switch.loft_plant_lights",
    onUpdate: [meetingMode, loftScene],
    shouldBeOn() {
      if (meetingMode.state === "on") {
        return false;
      }
      if (!automation.solar.isBetween("dawn", "dusk")) {
        return false;
      }
      if (automation.time.isBetween("AM8", "PM5")) {
        return true;
      }
      if (automation.time.isAfter("PM7")) {
        return false;
      }
      return room.scene !== "off";
    },
  });

  home_automation.pico.loft({
    context,
    exec: () => (room.scene = "auto"),
    match: ["stop", "stop"],
  });

  home_automation.pico.loft({
    context,
    exec: () => (room.scene = "high"),
    match: ["on"],
  });

  home_automation.pico.loft({
    context,
    exec: async () => {
      if (room.scene === "off") {
        await hass.call.switch.turn_off({
          entity_id: "switch.loft_hallway_light",
        });
        return;
      }
      room.scene = "off";
    },
    match: ["off"],
  });

  return room;
}
