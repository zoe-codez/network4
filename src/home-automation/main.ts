import { LIB_AUTOMATION } from "@digital-alchemy/automation";
import { CreateApplication } from "@digital-alchemy/core";
import { LIB_FASTIFY } from "@digital-alchemy/fastify-extension";
import { LIB_GOTIFY } from "@digital-alchemy/gotify-extension";
import { LIB_HASS } from "@digital-alchemy/hass";
import { LIB_SYNAPSE } from "@digital-alchemy/synapse";

import { LIB_NETWORK4 } from "../core";
import {
  BackYard,
  BedRoom,
  GamesRoom,
  Kitchen,
  LivingRoom,
  Loft,
  MiscAreas,
  Office,
} from "./areas";
import { MainController } from "./controllers";
import { LutronPicoBindings, Microgrowery, SensorsExtension, Timers } from "./extensions";
import { Zoe } from "./people";

export const HOME_AUTOMATION = CreateApplication({
  configuration: {
    DEFAULT_GALLONS: {
      default: 5,
      type: "number",
    },
  },
  libraries: [LIB_HASS, LIB_SYNAPSE, LIB_AUTOMATION, LIB_GOTIFY, LIB_FASTIFY, LIB_NETWORK4],
  name: "home_automation",
  priorityInit: ["pico", "sensors"],
  services: {
    back: BackYard,
    bedroom: BedRoom,
    games: GamesRoom,
    global: MiscAreas,
    kitchen: Kitchen,
    living: LivingRoom,
    loft: Loft,
    main: MainController,
    microgrowery: Microgrowery,
    office: Office,
    pico: LutronPicoBindings,
    sensors: SensorsExtension,
    timers: Timers,
    zoe: Zoe,
  },
});

declare module "@digital-alchemy/core" {
  export interface LoadedModules {
    home_automation: typeof HOME_AUTOMATION;
  }
}

setImmediate(async () => {
  await HOME_AUTOMATION.bootstrap({
    configuration: {
      boilerplate: {
        LOG_LEVEL: "trace",
      },
    },
    showExtraBootStats: true,
  });
});
