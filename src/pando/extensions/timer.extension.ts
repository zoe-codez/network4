import {
  each,
  HALF,
  HOUR,
  is,
  MINUTE,
  SECOND,
  sleep,
  TServiceParams,
} from "@digital-alchemy/core";
import { NotFoundError } from "@digital-alchemy/fastify-extension";
import { MessagePriority } from "@digital-alchemy/gotify-extension";
import { TodoItems } from "@prisma/client";
import dayjs from "dayjs";

import { SetChatTimer } from "../../core/helpers";

export const TIMERS_UPDATED = "TIMERS_UPDATED";
export const TIMER_ADDED = "TIMER_ADDED";
const WORK_TIMER_CACHE = "WORK_TIMER_CACHE";
const COUNTDOWN_TIMER_CACHE = "COUNTDOWN_TIMER_CACHE";
const CUTOFF = 5;
const BELL_ALERT = "bell_alert.mp3";

type ChatTimerCache = SetChatTimer & { generatedResponse?: string };

export function Timers({
  logger,
  lifecycle,
  cache,
  vividra,
  context,
  internal,
  event,
  pando,
}: TServiceParams) {
  let napCountdown: ReturnType<typeof sleep>;
  let napSleep: ReturnType<typeof sleep>;
  const timers = new Map<number, ReturnType<typeof sleep>>();

  lifecycle.onBootstrap(async () => {
    const list = await pando.database.listAllTodo();
    setImmediate(async () => {
      await each(list, async item => {
        await watchTodo(item);
      });
    });

    const workTimer = await cache.get<SetChatTimer>(WORK_TIMER_CACHE);
    if (workTimer) {
      logger.debug(`loading work timer {%s}`, workTimer.end);
      out.workTimerTarget = new Date(workTimer.end);
      setImmediate(async () => {
        await workTimerFinish(out.workTimerTarget);
      });
    }
  });

  async function countdownTimerFinish(target: Date) {
    const now = Date.now();
    const end = target.getTime();
    if (now > end) {
      logger.warn("nap timer already completed");
      out.countdownTimerTarget = undefined;
      await cache.del(COUNTDOWN_TIMER_CACHE);
      event.emit(TIMERS_UPDATED);
      return;
    }
    setImmediate(async () => {
      napSleep = sleep(end - now);
      await napSleep;
      logger.info(`countdown completed`);
      const data = await cache.get<ChatTimerCache>(COUNTDOWN_TIMER_CACHE);
      await out.countdownTimerStop();
      await vividra.orchid.playSound(BELL_ALERT);
      await vividra.graft.audioAlert(BELL_ALERT);
      if (!is.empty(data.generatedResponse)) {
        await vividra.gotify.reminders({
          message: data.generatedResponse,
          priority: MessagePriority.high,
          title: `Countdown timer completed`,
        });
      }
      await pando.persistent_notifications.addNotification({
        duration: HALF * MINUTE,
        message: is.empty(data.generatedResponse)
          ? "countdown timer finished"
          : data.generatedResponse,
      });
    });
  }

  async function watchTodo(item: TodoItems): Promise<void> {
    const now = dayjs();
    if (now.isAfter(item.next_duedate)) {
      logger.debug(`[%s] duedate already passed`, item.title);
      return;
    }
    const diff = now.diff(item.next_duedate, "millisecond");
    const timer = sleep(diff);
    timers.set(item.id, timer);
    await timer;
  }

  async function workTimerFinish(target: Date) {
    const now = Date.now();
    const end = target.getTime();
    if (now > end) {
      logger.warn("nap timer already completed");
      out.workTimerTarget = undefined;

      await cache.del(WORK_TIMER_CACHE);
      event.emit(TIMERS_UPDATED);
      return;
    }
    setImmediate(async () => {
      napSleep = sleep(end - now);
      await napSleep;
      logger.info(`work session completed`);
      await out.workTimerStop();
      await vividra.orchid.playSound(BELL_ALERT);
      await vividra.graft.audioAlert(BELL_ALERT);
      await pando.persistent_notifications.addNotification({
        duration: SECOND * 10,
        message: "Work timer finished",
      });
    });
  }

  const out = {
    /**
     * One off long term events
     *
     * Identified by:
     *  - RecurPeriod: None
     *  - No flag: COUNTDOWN
     */
    alarms: new Map<number, TodoItems>(),

    async countdownTimer(data: SetChatTimer): Promise<void> {
      const target = new Date(data.end);
      out.countdownTimerTarget = target;
      const now = Date.now();
      if (!dayjs(target).isBetween(now, now + CUTOFF * HOUR)) {
        logger.warn(`Cannot set countdown timer past {${CUTOFF}} hours`);
        vividra.gotify.reminders({
          message: `Failed to create countdown timer for ${internal.utils.relativeDate(target)}`,
        });
        return;
      }
      const [, reason] = data.msg.split("for");
      if (!is.empty(reason)) {
        setImmediate(async () => {
          const generatedResponse =
            await pando.open_ai.getCountdownTimerCompletionMessage(reason);
          await cache.set<ChatTimerCache>(COUNTDOWN_TIMER_CACHE, {
            ...data,
            generatedResponse,
          });
        });
      }
      logger.info(
        {
          locale: target.toLocaleString(),
          target: internal.utils.relativeDate(target),
        },
        `starting countdown timer`,
      );
      await cache.set<ChatTimerCache>(COUNTDOWN_TIMER_CACHE, data);
      event.emit(TIMERS_UPDATED);
      setImmediate(async () => {
        await countdownTimerFinish(out.countdownTimerTarget);
      });
    },

    async countdownTimerStop(): Promise<void> {
      if (napCountdown) {
        logger.info("killing countdown timer");
        napCountdown.kill("stop");
        napCountdown = undefined;
      }
      out.countdownTimerTarget = undefined;
      await cache.del(COUNTDOWN_TIMER_CACHE);
      event.emit(TIMERS_UPDATED);
    },

    countdownTimerTarget: undefined as Date,

    /**
     * One off long term events
     *
     * Identified by:
     *  - RecurPeriod: None
     *  - Yes flag: COUNTDOWN
     */
    countdowns: new Map<number, TodoItems>(),

    async stop(id: number): Promise<void> {
      const todo = await pando.database.client.todoItems.findFirst({
        where: { id },
      });
      if (!todo) {
        throw new NotFoundError(context, "INVALID_ID", `Invalid id: ${id}`);
      }
      logger.info(`[%s] stopping timer`, todo.title);
      await pando.database.client.todoItems.update({
        data: { active: false },
        where: { id },
      });
      const timeout = timers.get(id);
      if (timeout) {
        timeout.kill("stop");
      }
    },

    async workTimer(data: SetChatTimer): Promise<void> {
      const target = new Date(data.end);
      out.workTimerTarget = target;
      const now = Date.now();
      if (!dayjs(target).isBetween(now, now + CUTOFF * HOUR)) {
        logger.warn(`cannot set work timer past {${CUTOFF}} hours`);
        vividra.gotify.reminders({
          message: `Failed to create work timer for ${internal.utils.relativeDate(target)}`,
        });
        return;
      }
      logger.info(
        {
          locale: target.toLocaleString(),
          target: internal.utils.relativeDate(target),
        },
        `starting work timer`,
      );
      await cache.set<SetChatTimer>(WORK_TIMER_CACHE, data);
      event.emit(TIMERS_UPDATED);
      setImmediate(async () => {
        await workTimerFinish(out.workTimerTarget);
      });
    },

    async workTimerStop(): Promise<void> {
      if (napSleep) {
        logger.info("killing timer");
        napSleep.kill("stop");
        napSleep = undefined;
      }
      out.workTimerTarget = undefined;
      await cache.del(WORK_TIMER_CACHE);
      event.emit(TIMERS_UPDATED);
    },

    workTimerTarget: undefined as Date,
  };
  return out;
}
