import { TServiceParams } from "@digital-alchemy/core";

export function Kitchen({ automation, context, hass }: TServiceParams) {
  const houseMode = hass.entity.byId("select.house_mode");
  const room = automation.room({
    area: "kitchen",
    context,
    scenes: {
      auto: {
        aggressive: false,
        definition: {
          "switch.dining_room_light": { state: "on" },
          "switch.kitchen_light": { state: "on" },
        },
        friendly_name: "Auto",
      },
      handoff: {
        aggressive: false,
        definition: {
          "switch.alfred_light": { state: "off" },
          "switch.dining_room_light": { state: "off" },
        },
        friendly_name: "Handoff",
      },
      high: {
        aggressive: false,
        definition: {
          "switch.dining_room_light": { state: "on" },
          "switch.kitchen_light": { state: "on" },
        },
        friendly_name: "High",
      },
      off: {
        aggressive: false,
        definition: {
          // "switch.bar_light": { state: "off" },
          "switch.dining_room_light": { state: "off" },
          "switch.kitchen_light": { state: "off" },
        },
        friendly_name: "Off",
      },
    },
  });

  automation.managed_switch({
    context,
    entity_id: "switch.alfred_light",
    onUpdate: [houseMode],
    shouldBeOn: () => {
      return (
        automation.solar.isBetween("sunrise", "sunset") &&
        automation.time.isBefore(houseMode.state === "guest" ? "PM4" : "PM6:30")
      );
    },
  });

  return room;
}
