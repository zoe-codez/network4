import { SECOND, sleep, TServiceParams } from "@digital-alchemy/core";

export type DisplayStatus = {
  enabled: boolean;
  monitor?: boolean;
  off: number;
  standby: number;
  suspend: number;
};
const DECIMAL_SHIFT = 100;

const HIGH = 100;
const LOW = 70;

export function Graft({ logger, context, network4, lifecycle }: TServiceParams) {
  const fetchService = network4.base(context);

  lifecycle.onPostConfig(() => {
    fetchService.setTarget({ app: "cambium", hostname: "graft", user: "zoe" });
  });

  async function setMonitorTimeout(timeout: number) {
    logger.trace("setTimeout");
    await fetchService.fetch({
      body: { timeout },
      method: "post",
      url: `/monitor-timeout`,
    });
  }

  const api = {
    async audioAlert(file: string) {
      logger.trace("audioAlert");
      await fetchService.fetch({
        body: { file },
        method: "post",
        url: "/audio-alert",
      });
    },

    async displayStatus(): Promise<DisplayStatus> {
      logger.trace("displayStatus");
      return await fetchService.fetch({
        url: "/display-status",
      });
    },

    async findPhone(): Promise<void> {
      await fetchService.fetch({
        method: "post",
        url: "/find-phone",
      });
    },

    async forceOff() {
      await api.shortTimeout();
      await api.setMonitor(false);
    },

    async longTimeout() {
      setImmediate(async () => {
        await sleep(SECOND);
        await api.setDPMS(false);
      });
      await api.setTimeout(60 * 60);
      await api.setMonitor(true);
    },

    async setDPMS(state: boolean): Promise<void> {
      logger.trace("setDPMS");
      await fetchService.fetch({
        body: { state },
        method: "post",
        url: `/display-state`,
      });
    },

    async setMonitor(state: boolean): Promise<void> {
      logger.trace("setMonitor");
      await fetchService.fetch({
        body: { state },
        method: "post",
        url: `/monitor-state`,
      });
    },

    async setMonitorBright() {
      logger.debug("set monitor bright");
      await api.setMonitorBrightness(HIGH);
    },

    /**
     * 0-100
     */
    async setMonitorBrightness(brightness: number): Promise<void> {
      logger.trace("setMonitorBrightness");
      await fetchService.fetch({
        body: { brightness: brightness / DECIMAL_SHIFT },
        method: "post",
        url: `/monitor-brightness`,
      });
    },

    async setMonitorDim() {
      logger.debug("set monitor dim");
      await api.setMonitorBrightness(LOW);
    },

    setTimeout: setMonitorTimeout,

    async shortTimeout() {
      setImmediate(async () => {
        await sleep(SECOND);
        await api.setDPMS(true);
      });
      await api.setTimeout(5 * 60);
      await api.setMonitor(false);
    },
  };
  return api;
}
