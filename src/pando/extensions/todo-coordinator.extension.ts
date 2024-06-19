import {
  CronExpression,
  eachSeries,
  HALF,
  is,
  MINUTE,
  SINGLE,
  TServiceParams,
} from "@digital-alchemy/core";
import { MessagePriority } from "@digital-alchemy/gotify-extension";
import { GrocyChore, GrocyObjectChoreDetail } from "@digital-alchemy/grocy";
import dayjs, { Dayjs } from "dayjs";

import { WttrWeather } from "../helpers";

type MorningReportCache = {
  generatedAt: string;
  lastSentAt: string;
  message: string;
  note: string;
  raw: string;
  title: string;
};
const MORNING_REPORT_CACHE = "MORNING_REPORT_CACHE";
type ChoreCache = Set<GrocyObjectChoreDetail & GrocyChore>;

export function TodoCoordinator({
  logger,
  cache,
  grocy,
  vividra,
  lifecycle,
  hass,
  automation,
  internal,
  pando,
  scheduler,
  context,
}: TServiceParams) {
  const { fetch } = internal.boilerplate.fetch({ context });
  async function getWeather(): Promise<WttrWeather> {
    return await fetch({
      baseUrl: "https://wttr.in",
      params: {
        format: "j1",
      },
      url: `/78653`,
    });
  }
  // @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async function buildMorningReport(
    immediate = false,
    recurse = true,
  ): Promise<void> {
    logger.info(`Building morning report`);
    const [TOMORROW, PM06, NOW] = automation.time.shortTime([
      "TOMORROW",
      "PM06",
      "NOW",
    ]);
    let target = TOMORROW;
    if (NOW.isAfter(PM06)) {
      target = TOMORROW.add(SINGLE, "day");
    }
    const chores = await getChores(target);
    const calendar = await getCalendar();
    const weather = await getWeather();
    const result = await pando.open_ai.getMorningReport(
      chores,
      calendar,
      weather,
    );

    const data = await cache.get<MorningReportCache>(MORNING_REPORT_CACHE, {
      generatedAt: new Date().toISOString(),
      lastSentAt: dayjs().subtract(SINGLE, "hour").toISOString(),
      message: "",
      note: "",
      raw: "empty cache",
      title: "",
    });
    const [meta, ...body] = data.message.split("-----");
    const { title, note } = JSON.parse(meta) as Record<string, string>;
    logger.debug({ body, note, title }, `Received message parts`);
    const message = body.join(`\n`).trim();
    if (is.empty(message)) {
      if (recurse) {
        logger.error(
          { raw: data.message },
          `Seconded failed generation, aborting`,
        );
      }
      logger.error(
        { raw: data.message },
        `Failed to correctly generate message, retrying`,
      );
      setImmediate(async () => await buildMorningReport(immediate, true));
      return;
    }

    await cache.set<MorningReportCache>(MORNING_REPORT_CACHE, {
      ...data,
      generatedAt: new Date().toISOString(),
      message,
      note,
      raw: result,
      title,
    });
    if (immediate) {
      await sendMessage();
    }
  }

  scheduler.cron({
    exec: async () => await buildMorningReport(),
    schedule: CronExpression.EVERY_DAY_AT_5AM,
  });
  lifecycle.onBootstrap(async () => {
    setTimeout(() => {
      // buildMorningReport(true);
    }, 5000);
    if (automation.time.isAfter("AM11")) {
      const data = await cache.get<MorningReportCache>(MORNING_REPORT_CACHE);
      if (!data) {
        logger.warn(`init: no cache`);
        return;
      }
      const last = dayjs(data.lastSentAt);
      const generated = dayjs(data.generatedAt);
      if (last.isBefore(generated)) {
        logger.info(`init: Should send morning message`);
        setTimeout(async () => {
          logger.warn(`catching up on morning message`);
          await sendMessage();
        }, HALF * MINUTE);
        return;
      }
      logger.debug(`init: Caught up`);
    }
  });

  async function getCalendar(): Promise<string> {
    const [AM1] = automation.time.shortTime(["AM01"]);
    const upcoming = await hass.fetch.calendarSearch({
      calendar: "calendar.personal",
      end: AM1.add(1, "day"),
      start: AM1,
    });
    // console.log(inspect(upcoming, true, 10, true));
    const out: string[] = [];

    await eachSeries(upcoming, async i => {
      let depart = "";
      if (!is.empty(i.location)) {
        const travel = await pando.maps.calculateTravelTime(
          i.location,
          i.start,
        );
        depart = i.start.subtract(travel, "minutes").toDate().toLocaleString();
      }
      out.push(
        `- ${i.summary} :: ${i.description} :: ${i.start.toDate().toLocaleString()} :: ${i.end
          .toDate()
          .toLocaleString()}${is.empty(i.location) ? "" : " :: " + i.location + " :: " + depart}`,
      );
    });
    // console.log(out);
    return out.join(`\n`);
  }

  async function getChores(target: Dayjs): Promise<string> {
    const values = [...(grocy.aggregator.CHORES_CACHE as ChoreCache).values()];
    const chores = values
      .filter(({ next_estimated_execution_time }) =>
        dayjs(next_estimated_execution_time).isBefore(target),
      )
      .map(i => `${i.userfields.aiDescription || i.name} :: ${i.description}`);
    if (chores.length > 5) {
      chores.push(
        "It seems like there is a lot of chores, remind me to not get behind on chores",
      );
    }
    return chores.join(`\n`);
  }

  async function sendMessage(): Promise<void> {
    const data = await cache.get<MorningReportCache>(MORNING_REPORT_CACHE);
    if (!data) {
      logger.error(`onWokeUp: no cache`);
      return;
    }
    try {
      const { note, title, message } = data;
      // const [meta, ...body] = cache.message.split("-----");
      // const { title, note } = JSON.parse(meta) as Record<string, string>;
      logger.debug({ message, note, title });
      await vividra.gotify.reminders({
        message,
        priority: MessagePriority.normal,
        title: title,
      });
      await cache.set<MorningReportCache>(MORNING_REPORT_CACHE, {
        ...data,
        lastSentAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ error, raw: data.raw });
    }
  }

  const out = {
    async onWakeUp(): Promise<void> {
      const data = await cache.get<MorningReportCache>(MORNING_REPORT_CACHE);
      if (!data) {
        logger.error(`onWakeUp: no cache`);
        return;
      }
      const generatedAt = dayjs(data.generatedAt);
      const lastSent = dayjs(data.lastSentAt);
      if (lastSent.isBefore(generatedAt)) {
        await sendMessage();
      }
    },
  };
  return out;
}
