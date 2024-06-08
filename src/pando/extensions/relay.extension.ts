import { TServiceParams } from "@digital-alchemy/core";
import { MessagePriority } from "@digital-alchemy/gotify-extension";

import { CambiumError } from "../../core";

export function MessageRelay({ logger, vividra, pando }: TServiceParams) {
  return {
    async sendCambiumError(error: CambiumError): Promise<void> {
      const service = await pando.health.identifyById(error.service);
      if (!service) {
        logger.error(`Could not look up service {id: ${error.service}}`);
        return;
      }
      vividra.gotify.cambium({
        message: error.message,
        priority: MessagePriority.high,
        title: `${service.Network3Account.Network3Device.hostname}:${service.Network3Account.user}:${service.app} error`,
      });
    },

    async sendCambiumWarning(error: CambiumError): Promise<void> {
      const service = await pando.health.identifyById(error.service);
      if (!service) {
        logger.error(`Could not look up service {id: ${error.service}}`);
        return;
      }
      vividra.gotify.cambium({
        message: error.message,
        priority: MessagePriority.low,
        title: `${service.Network3Account.Network3Device.hostname}:${service.Network3Account.user}:${service.app} warning`,
      });
    },
  };
}
