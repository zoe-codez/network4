import {
  FIRST,
  INCREMENT,
  is,
  sleep,
  START,
  TServiceParams,
} from "@digital-alchemy/core";
import dayjs from "dayjs";

import { AddNotificationBody } from "../../core/extensions";

const NOTIFICATION_CACHE_METADATA = "NOTIFICATION_CACHE_METADATA";
export const ON_NOTIFICATIONS_UPDATED = "ON_NOTIFICATIONS_UPDATED";
export type PersistentNotification = {
  addedAt: string;
  id: number;
} & AddNotificationBody;
type NotificationCacheMetadata = {
  counter: number;
  notifications: PersistentNotification[];
};

function defaultMetadata(): NotificationCacheMetadata {
  return {
    counter: START,
    notifications: [],
  };
}

export function PersistentNotifications({
  cache,
  logger,
  event,
  pando,
  lifecycle,
}: TServiceParams) {
  lifecycle.onPostConfig(async () => {
    const cache = await getCache();
    cache.notifications.forEach(notification =>
      setImmediate(async () => await timeoutNotification(notification)),
    );
  });

  async function getCache() {
    return await cache.get<NotificationCacheMetadata>(
      NOTIFICATION_CACHE_METADATA,
      defaultMetadata(),
    );
  }

  async function timeoutNotification(notification: PersistentNotification) {
    if (!notification.duration) {
      return;
    }
    const target = dayjs(notification.addedAt).add(notification.duration, "ms");
    const now = dayjs();
    if (now.isAfter(target)) {
      logger.warn({ notification }, `Removing stale notification`);
      await out.removeNotification(notification.id);
      return;
    }
    logger.debug({ notification }, `Notification timeout`);
    await sleep(target.toDate());
    logger.info({ notification }, `Notification timeout reached`);
    await out.removeNotification(notification.id);
  }

  const out = {
    async addNotification(notification: AddNotificationBody): Promise<number> {
      const data = await getCache();
      const counter = data.counter + INCREMENT;
      const append = {
        ...notification,
        addedAt: new Date().toISOString(),
        id: counter,
      };
      let notifications = [...data.notifications, append];
      if (notification.channel?.replaceExisting) {
        notifications = [
          ...data.notifications.filter(
            i => i.channel?.name !== notification.channel?.name,
          ),
          append,
        ];
      }
      await cache.set<NotificationCacheMetadata>(NOTIFICATION_CACHE_METADATA, {
        counter,
        notifications,
      });
      event.emit(ON_NOTIFICATIONS_UPDATED);
      setImmediate(async () => await timeoutNotification(append));
      return counter;
    },

    async clearNotifications(channel?: string): Promise<void> {
      if (channel) {
        const data = await getCache();
        data.notifications = data.notifications.filter(
          i => i.channel?.name !== channel,
        );
        await cache.set<NotificationCacheMetadata>(
          NOTIFICATION_CACHE_METADATA,
          data,
        );
        event.emit(ON_NOTIFICATIONS_UPDATED);
        return;
      }
      await cache.set<NotificationCacheMetadata>(
        NOTIFICATION_CACHE_METADATA,
        defaultMetadata(),
      );
      event.emit(ON_NOTIFICATIONS_UPDATED);
    },

    async getCurrentNotification() {
      const backupsIdle =
        !pando.entities.backupActive.on ||
        pando.entities.backupState.state === "Idle";
      if (!backupsIdle) {
        // ? Override for backups
        return [];
      }
      if (pando.home_automation.shouldCloseWindows()) {
        return [`Close windows`];
      }
      const cache = await getCache();
      return is.empty(cache.notifications)
        ? []
        : [cache.notifications[FIRST].message];
    },

    async removeNotification(remove: number): Promise<void> {
      const data = await getCache();
      data.notifications = data.notifications.filter(({ id }) => id !== remove);
      await cache.set<NotificationCacheMetadata>(
        NOTIFICATION_CACHE_METADATA,
        data,
      );
      event.emit(ON_NOTIFICATIONS_UPDATED);
    },
  };
  return out;
}
