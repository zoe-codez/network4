import { AbstractConfig } from "@digital-alchemy/core";

export interface ProcessInfo {
  allAddresses: string[];
  names: string[];
  preferredAddress: string;
  preferredName: string;
}
export interface ProcessIdentify {
  app: string;
  host: string;
  user: string;
}
export const APPLICATION_IDENTIFY = "APPLICATION_IDENTIFY";

export interface CambiumError {
  message: string;
  service: number;
}

export type SystemInitResponse = {
  config: AbstractConfig;
};
