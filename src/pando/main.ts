import { LIB_AUTOMATION } from "@digital-alchemy/automation";
import { CreateApplication } from "@digital-alchemy/core";
import { LIB_FASTIFY } from "@digital-alchemy/fastify-extension";
import { LIB_GOTIFY } from "@digital-alchemy/gotify-extension";
import { LIB_GROCY } from "@digital-alchemy/grocy";
import { LIB_HASS } from "@digital-alchemy/hass";
import { LIB_MATRIX_RENDERING } from "@digital-alchemy/matrix-rendering";
import { LIB_MQTT } from "@digital-alchemy/mqtt-extension";
import { LIB_SYNAPSE } from "@digital-alchemy/synapse";

import { LIB_NETWORK4 } from "../core";
import { BackupController, InitController, MiscController, SystemController } from "./controllers";
import {
  BackupCoordinator,
  Dashboard,
  Database,
  DynamicConfigBuilder,
  EntitiesExtension,
  Health,
  HomeAutomation,
  KeyCoordinator,
  Maps,
  MessageRelay,
  OpenAIExtension,
  PersistentNotifications,
  ProxyManager,
  Timers,
  TodoCoordinator,
  UpgradeCoordinator,
} from "./extensions";

export const PANDO = CreateApplication({
  configuration: {
    BORG_PASSPHRASE: {
      description: "Access phrase for borg backup repositories",
      required: true,
      type: "string",
    },
    CLOUDFLARE_API_TOKEN: {
      required: true,
      type: "string",
    },
    DEFAULT_MAP_ORIGIN: {
      required: true,
      type: "string",
    },
    GOOGLE_MAPS_API_KEY: {
      required: true,
      type: "string",
    },
    INSTALL_ROOT: {
      default: "/usr/share/digital-alchemy",
      type: "string",
    },
    OPENAI_API_KEY: {
      required: true,
      type: "string",
    },
    PRISMA_URL: {
      type: "string",
    },
    PROXY_BASE_URL: {
      default: "https://proxy.programmable.casa",
      type: "string",
    },
    PROXY_PASSWORD: {
      required: true,
      type: "string",
    },
    PROXY_USERNAME: {
      required: true,
      type: "string",
    },
  },
  libraries: [
    LIB_AUTOMATION,
    LIB_GOTIFY,
    LIB_GROCY,
    LIB_MATRIX_RENDERING,
    LIB_HASS,
    LIB_MQTT,
    LIB_SYNAPSE,
    LIB_FASTIFY,
    LIB_NETWORK4,
  ],
  name: "pando",
  priorityInit: ["entities"],
  services: {
    BackupController,
    InitController,
    MiscController,
    SystemController,
    backup: BackupCoordinator,
    dashboard: Dashboard,
    database: Database,
    dynamic_config: DynamicConfigBuilder,
    entities: EntitiesExtension,
    health: Health,
    home_automation: HomeAutomation,
    key_coordinator: KeyCoordinator,
    maps: Maps,
    open_ai: OpenAIExtension,
    persistent_notifications: PersistentNotifications,
    proxy_manager: ProxyManager,
    relay: MessageRelay,
    timer: Timers,
    todo_coordinator: TodoCoordinator,
    upgrade_coordinator: UpgradeCoordinator,
  },
});

declare module "@digital-alchemy/core" {
  export interface LoadedModules {
    pando: typeof PANDO;
  }
}

setImmediate(async () => {
  await PANDO.bootstrap({
    configuration: {
      automation: { CIRCADIAN_ENABLED: false },
      boilerplate: { LOG_LEVEL: "debug" },
    },
  });
});
