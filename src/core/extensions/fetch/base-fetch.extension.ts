import { TContext, TServiceParams } from "@digital-alchemy/core";
import { get } from "object-path";

import { Network3Applications, Network3Hosts, Network3Users } from "../../helpers";

type FetchConfiguration = {
  user: Network3Users;
  hostname: Network3Hosts;
  app: Network3Applications;
};

export function BaseFetch({ logger, config, internal }: TServiceParams) {
  return function (context: TContext) {
    const fetcher = internal.boilerplate.fetch({ context });
    let current: FetchConfiguration;

    const objectPath = () => `${current.user}.${current.hostname.toLowerCase()}.${current.app}`;

    return {
      fetch: fetcher.fetch,
      objectPath,
      setTarget: (newConfig: FetchConfiguration) => {
        current = newConfig;
        const path = objectPath();
        logger.trace({ path }, `changed target`);
        fetcher.setBaseUrl(`http://${path}`);
        fetcher.setHeaders({
          "x-admin-key": get(config.network4.CROSSTALK_DATA, path),
        });
      },
    };
  };
}
