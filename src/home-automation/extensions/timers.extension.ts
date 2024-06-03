import { HOUR, MINUTE, SECOND, sleep, TServiceParams } from "@digital-alchemy/core";
import dayjs from "dayjs";

import { SetChatTimer } from "../../core/helpers";

const CUTOFF = 5;
const NAP_TIMER_CACHE = "NAP_TIMER_CACHE";
const BELL_TIMEOUT = 5;

export function Timers({
  logger,
  cache,
  network4,
  internal,
  home_automation,
  gotify,
}: TServiceParams) {
  let napSleep: ReturnType<typeof sleep>;

  async function napTimerFinish(target: Date) {
    const now = Date.now();
    const end = target.getTime();
    if (now > end) {
      logger.warn("nap timer already completed");
      await cache.del(NAP_TIMER_CACHE);
      return;
    }
    const data = await cache.get<SetChatTimer>(NAP_TIMER_CACHE);
    setImmediate(async () => {
      napSleep = sleep(end - now);
      await napSleep;
      napSleep = undefined;
      logger.info(`nap completed`);
      await network4.maple.stopSound();
      home_automation.bedroom.scene = "high";
      await cache.del(NAP_TIMER_CACHE);
      await sleep(BELL_TIMEOUT * SECOND);
      await network4.maple.playSound("bells.mp3");
      timers.napExtension = data;
      await sleep(MINUTE);
      timers.napExtension = undefined;
    });
  }

  const timers = {
    napExtension: undefined as SetChatTimer,
    async napTimerStart(data: SetChatTimer) {
      const target = new Date(data.end);
      const now = Date.now();
      if (!dayjs(target).isBetween(now, now + CUTOFF * HOUR)) {
        logger.warn(`Cannot set nap timer past {${CUTOFF}} hours`);
        network4.gotify.controller({
          message: `Failed to create nap timer for ${internal.utils.relativeDate(target)}`,
        });
        return;
      }
      logger.info({ target: internal.utils.relativeDate(target) }, `starting nap timer`);
      await network4.maple.startSound();
      await home_automation.global.globalOff();
      await cache.set<SetChatTimer>(NAP_TIMER_CACHE, data);
      napTimerFinish(target);
    },

    async napTimerStop() {
      if (!napSleep) {
        logger.debug("No sleep");
        return;
      }
      logger.info(`stopping nap timer`);
      const data = await cache.get<SetChatTimer>(NAP_TIMER_CACHE);
      const difference = internal.utils.relativeDate(new Date(data.end));
      gotify.message.create({
        message: `Timer was scheduled for ${difference} from now`,
        title: `Early stop on nap timer`,
      });
      napSleep.kill("stop");
      napSleep = undefined;
      await network4.symbiote.stopNap(data);
      await network4.maple.stopSound();
      await cache.del(NAP_TIMER_CACHE);
    },
  };

  return timers;
}
