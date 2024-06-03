import {
  ConfigLoaderParams,
  ConfigLoaderReturn,
  is,
  OptionalModuleConfiguration,
  SECOND,
  ServiceMap,
  sleep,
  START,
  TServiceParams,
} from "@digital-alchemy/core";
import { hostname, userInfo } from "os";
import { exit } from "process";

import { SystemInitResponse } from "../helpers";

const { username } = userInfo();
const name = hostname();

const ATTEMPTS = 10;
const PRODUCTION = "zoe.pith.pando";

export function NetworkConfigLoader({
  logger,
  internal,
  context,
}: TServiceParams) {
  async function callback<
    S extends ServiceMap,
    C extends OptionalModuleConfiguration,
  >({ application }: ConfigLoaderParams<S, C>): Promise<ConfigLoaderReturn> {
    const url = `/init/identify/${username}/${name}/${application.name}`;
    const fetch = internal.boilerplate.fetch({ context }).fetch;
    for (let i = START; i <= ATTEMPTS; i++) {
      const configuration = await fetch<SystemInitResponse>({
        baseUrl: `http://${PRODUCTION}`,
        url,
      });
      if (is.object(configuration)) {
        return configuration.config;
      }
      logger.warn(
        `Failed to load configuration. Attempt [%s]/[%s]`,
        i,
        ATTEMPTS,
      );
      await sleep(SECOND);
    }
    logger.fatal(`FAILED TO LOAD CONFIGURATION`);
    exit();
    return undefined;
  }
  // internal.boilerplate.configuration.setConfigLoaders([
  //   callback,
  //   ConfigLoaderEnvironment as ConfigLoader,
  //   ConfigLoaderFile as ConfigLoader,
  // ]);
}
