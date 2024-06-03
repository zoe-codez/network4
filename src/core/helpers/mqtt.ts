import { Dayjs } from "dayjs";

import { BorgRepoStats } from "./backup";
import { PopulatedService } from "./database";

// <Global>
export const SERVICE_ONLINE = (service: string) => `service/online/${service}`;
export const SERVICE_ONLINE_GLOBAL = `service/online`;

export interface ServiceOnlineGlobalPayload {
  pid: number;
  service_id: number;
}
export type OnlineDevice = ServiceOnlineGlobalPayload & {
  last_seen: Dayjs;
  service: PopulatedService;
};

export const SERVICE_HEALTHCHECK = (service: string) =>
  `service/health/${service}`;
export const APP_HEALTHCHECK = `service/health`;

export const SERVICE_REBOOT = (service: string) => `service/reboot/${service}`;
// </Global>

// <Pi Matrix>
export const SET_MATRIX_WIDGETS = "pi-matrix/update";
export const RUN_MATRIX_ANIMATION = "pi-matrix/animation";
// </Pi Matrix>

// <Cambium.Bamboo>
export const BAMBOO_FIND_AIR_PLANT = "bamboo/find-device/air-plant";
// </Cambium.Bamboo>

// <Database>
export const TODO_UPDATED = "database/todo/updated";
// </Database>

// <Pando>
// <Pando.Network3>
export const HEALTHCHECK_PANDO_RELOAD = "health-check/reload";
// </Pando.Network3>

// <Pando.Cambium>

/**
 * Modules are pulled on a per-device basis
 */
export const UPGRADE_PULL = (id: string) => `upgrade/pull/${id}`;
export type DeviceReloadPayload = {
  /**
   * don't upgrade if already at this version
   */
  targetVersion: string;
};

/**
 * Execute a `pm2 restart` to refresh all the applications for an account at once
 */
export const ACCOUNT_RELOAD = (id: string) => `upgrade/account/reload/${id}`;

// Request pando to resubmit keys to all connected devices

// The devices database was updated
export type DevicesUpdatedPayload = { id: number };

// Data sync message, carries payload
export const KEYS_UPDATED = "key_sync/global";
export type KeysUpdatedPayload = Record<
  "hostsFile" | "sshConfig" | "keys" | "hostsFilter",
  string
>;
// </Pando.Cambium>

// <Pando.Backups>
export type InitBackupPayload = {
  type?: string;
};
export const INIT_BACKUP = (service: number) => `backup/init/${service}`;
export const BREAK_BACKUP_LOCK = (service: number) =>
  `backup/break-lock/${service}`;

export type BackupProgressPayload = {
  device_id: number;
  lastMessage?: string;
};
export const BACKUP_PROGRESS = `backup/progress`;

export type BackupRefreshLock = {
  action: string;
  comment?: string;
};
/**
 * Issue a temporary backup interrupt.
 * New backups will not be initiated while active
 *
 * Lasts 1 minute from time of last being emitted.
 * Recommend 1s interval
 */
export const BACKUP_GRANT_LOCK = `backup/lock/grant`;
export const BACKUP_GRANT_REJECT = `backup/lock/reject`;

export type BackupRequestNextPayload = {
  device: number;
  prefix: string;
};
export const BACKUP_REQUEST_NEXT = `backup/device/request`;

export type BackupCompletePayload = {
  archive: BorgRepoStats;
  device_id: number;
  name: string;
  stderr?: string;
};
// </Pando.Backups>
// </Pando>
