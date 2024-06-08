import { TServiceParams } from "@digital-alchemy/core";

export function GamesRoom({ automation, home_automation, context }: TServiceParams) {
  const room = automation.room({
    area: "games_room",
    context,
    scenes: {
      auto: {
        definition: {
          "light.games_room": { brightness: 150, state: "on" },
        },
        friendly_name: "Auto",
      },
      dimmed: {
        definition: {
          "light.games_room": { brightness: 75, state: "on" },
        },
        friendly_name: "Dimmed",
      },
      high: {
        definition: {
          "light.games_room": { brightness: 255, state: "on" },
        },
        friendly_name: "High",
      },
      off: {
        definition: {
          "light.games_room": { state: "off" },
        },
        friendly_name: "Off",
      },
    },
  });

  home_automation.pico.games({
    context,
    exec: () => (room.scene = "auto"),
    match: ["stop", "stop"],
  });

  home_automation.pico.games({
    context,
    exec: () => (room.scene = "high"),
    match: ["on"],
  });

  home_automation.pico.games({
    context,
    exec: async () => (room.scene = "off"),
    match: ["off"],
  });

  return room;
}
