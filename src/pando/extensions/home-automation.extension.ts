import {
  ARRAY_OFFSET,
  CronExpression,
  HALF,
  is,
  MINUTE,
  TServiceParams,
} from "@digital-alchemy/core";
import dayjs from "dayjs";

const INSIDE_TOO_WARM = 81;
const OUTSIDE_TEMP_WINDOW_CLOSED = 76;
const CACHE_KEY_WINDOW_CLOSE = "window_close_notification";
export const ANNOUNCE_WINDOW_SHOULD_CLOSE = "ANNOUNCE_WINDOW_SHOULD_CLOSE";
const SLIDE = 15;

export function HomeAutomation({
  cache,
  logger,
  pando,
  scheduler,
  vividra,
  event,
  hass,
  automation,
  lifecycle,
}: TServiceParams) {
  let lastGoToBedMessage = "";
  const windowOpen = hass.refBy.id("switch.windows_open");
  const weather = hass.refBy.id("weather.ecobee_upstairs");
  const climate = hass.refBy.id("climate.ecobee_upstairs");

  weather.onUpdate(async () => await warnWindowShouldBeClosed());
  climate.onUpdate(async () => await warnWindowShouldBeClosed());

  scheduler.cron({
    exec: async () => await warnWindowShouldBeClosed(),
    schedule: CronExpression.EVERY_30_MINUTES,
  });
  scheduler.cron({
    exec: async () => await setGoToBedMessage(),
    schedule: CronExpression.EVERY_5_MINUTES,
  });

  function shouldCloseWindows() {
    if (windowOpen.state === "off") {
      return false;
    }
    if (weather.attributes.temperature <= OUTSIDE_TEMP_WINDOW_CLOSED) {
      return false;
    }
    return climate.attributes.current_temperature > INSIDE_TOO_WARM;
  }

  lifecycle.onReady(() => {
    setTimeout(async () => {
      await warnWindowShouldBeClosed();
    }, HALF * MINUTE);
  });

  async function warnWindowShouldBeClosed(): Promise<void> {
    if (!shouldCloseWindows()) {
      return;
    }
    const notificationSent = await cache.get<string>(CACHE_KEY_WINDOW_CLOSE);
    const now = dayjs();
    if (!is.empty(notificationSent) && now.subtract(HALF, "hour").isBefore(notificationSent)) {
      // recently sent
      return;
    }
    logger.debug("Windows open");
    const message = [
      `Outside temperature is ${weather.attributes.temperature}${weather.attributes.temperature_unit}`,
      `Upstairs temperature is ${climate.attributes.current_temperature}${weather.attributes.temperature_unit}`,
    ].join(" & ");
    await vividra.gotify.pando({ message, title: "Close windows" });
    await cache.set(CACHE_KEY_WINDOW_CLOSE, now.toISOString());
    event.emit(ANNOUNCE_WINDOW_SHOULD_CLOSE);
  }

  async function setGoToBedMessage(): Promise<void> {
    const message = getCurrentGoToBedMessage();
    if (message === lastGoToBedMessage) {
      return;
    }
    lastGoToBedMessage = message;
    await pando.persistent_notifications.addNotification({
      channel: {
        name: "GO_TO_BED",
        replaceExisting: true,
      },
      duration: 20 * MINUTE,
      message,
    });
    logger.info({ message }, `Go to bed`);
    await vividra.symbiote.addReminder({
      content: message,
      source: ["pando", "HomeAutomationService"],
    });
  }

  function getCurrentGoToBedMessage(): string {
    const [PM10, AM1, NOW] = automation.time.shortTime(["PM10:00", "AM1", "NOW"]);
    if (NOW.isBefore(PM10) && NOW.isAfter(AM1)) {
      return "";
    }
    const lines = pando.open_ai.goToBed;
    if (NOW.isAfter(PM10)) {
      const diff = Math.floor(Math.abs(PM10.diff(NOW, "minutes")) / SLIDE);
      return lines[diff] || lines[lines.length + ARRAY_OFFSET];
    }
    return lines[lines.length + ARRAY_OFFSET];
  }

  return {
    shouldCloseWindows,
  };
}
