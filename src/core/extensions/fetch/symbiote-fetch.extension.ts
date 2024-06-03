import { TServiceParams } from "@digital-alchemy/core";

import { SendChatReply, SetChatTimer } from "../../helpers";

export type AddReminderBody = {
  /**
   * Insert into code fence
   */
  content: string;
  /**
   * Generic extra object to print at the bottom
   */
  metadata?: object;
  /**
   * Who sent this?
   */
  source: [application: string, tag: string];
};

export function Symbiote({ logger, context, network4, lifecycle }: TServiceParams) {
  const fetchService = network4.base(context);

  lifecycle.onPostConfig(() => {
    fetchService.setTarget({ app: "cambium", hostname: "graft", user: "zoe" });
  });

  return {
    async addReminder(reminder: AddReminderBody) {
      logger.trace(`addReminder`);
      await fetchService.fetch({
        body: { reminder },
        method: "post",
        url: `/reminders/add`,
      });
    },

    async sendChatReply(body: SendChatReply) {
      logger.trace("sendChatReply");
      await fetchService.fetch({
        body,
        method: "post",
        url: "/timers/send-reply",
      });
    },

    async stopNap(body: Pick<SetChatTimer, "tmid" | "rid">) {
      logger.trace("stopNap");
      await fetchService.fetch({
        body,
        method: "post",
        url: `/timers/nap-stop`,
      });
    },
  };
}
