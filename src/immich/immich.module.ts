import { CreateLibrary } from "@digital-alchemy/core";

import { SDK } from "./sdk.extension";

export const LIB_IMMICH = CreateLibrary({
  configuration: {
    API_KEY: {
      required: true,
      type: "string",
    },
    BASE_URL: {
      required: true,
      type: "string",
    },
  },
  name: "immich",
  priorityInit: ["sdk"],
  services: {
    sdk: SDK,
  },
});

declare module "@digital-alchemy/core" {
  export interface LoadedModules {
    immich: typeof LIB_IMMICH;
  }
}
