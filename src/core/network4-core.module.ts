import { CreateLibrary, StringConfig } from "@digital-alchemy/core";
import { LIB_GOTIFY } from "@digital-alchemy/gotify-extension";
import { LIB_HASS } from "@digital-alchemy/hass";
import { LIB_SYNAPSE } from "@digital-alchemy/synapse";

import {
  BaseFetch,
  Cambium,
  ESMExtension,
  Gotify,
  Graft,
  Handoff,
  Heartwood,
  HomeAutomation,
  Juniper,
  Maple,
  MatrixFetch,
  Orchid,
  Pando,
  Pith,
  Symbiote,
  System,
} from "./extensions";

export const LIB_NETWORK4 = CreateLibrary({
  configuration: {
    CROSSTALK_DATA: {
      default: {},
      type: "record",
    },
    ENVIRONMENT: {
      default: "deploy",
      enum: ["deploy", "develop"],
      type: "string",
    } as StringConfig<"deploy" | "develop">,
    SERVICE_ID: {
      type: "number",
    },
  },
  depends: [LIB_HASS, LIB_SYNAPSE, LIB_GOTIFY],
  name: "network4",
  priorityInit: ["base"],
  services: {
    automation: HomeAutomation,
    base: BaseFetch,
    cambium: Cambium,
    esm: ESMExtension,
    gotify: Gotify,
    graft: Graft,
    handoff: Handoff,
    heartwood: Heartwood,
    juniper: Juniper,
    maple: Maple,
    matrix: MatrixFetch,
    orchid: Orchid,
    pando: Pando,
    pith: Pith,
    symbiote: Symbiote,
    system: System,
  },
});

declare module "@digital-alchemy/core" {
  export interface LoadedModules {
    network4: typeof LIB_NETWORK4;
  }
}
