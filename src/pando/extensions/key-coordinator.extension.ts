import { INCREMENT, is, TServiceParams } from "@digital-alchemy/core";
import {
  Network3Account,
  Network3Device,
  Network3Services,
  ProxyEntry,
} from "@prisma/client";

import {
  DevicesUpdatedPayload,
  KEYS_UPDATED,
  KeysUpdatedPayload,
} from "../../core/helpers";

const HOSTS_FILTER = "CAMBIUM";
type FullDevice = Network3Device & {
  accounts: (Network3Account & {
    services: (Network3Services & {
      proxies: ProxyEntry[];
    })[];
  })[];
};

/**
 * ~/.ssh/authorized_keys
 */
function buildAuthorizedKeys(devices: FullDevice[]): string {
  return devices
    .flatMap(({ accounts }) =>
      accounts.filter(({ key }) => !is.empty(key)).map(({ key }) => key),
    )
    .join(`\n`);
}

/**
 * ~/.ssh/config
 */
function buildSshConfig(devices: FullDevice[]): string {
  const sshDevices = devices.filter(({ accounts }) =>
    accounts.some(({ capabilities }) => capabilities.includes("SSH_IN")),
  );
  return sshDevices
    .map(
      ({
        hostname,
        preferred_interface,
        accounts,
        title,
        description,
        device_class,
      }) =>
        [
          `# [${device_class}] ${title}`,
          is.empty(description)
            ? ``
            : description
                .split(`\n`)
                .map(line => `# ${line}`)
                .join(`\n`),
          `Host ${hostname.toLowerCase()}`,
          `  HostName ${preferred_interface}`,
          `  User ${accounts.find(({ capabilities }) => capabilities.includes("SSH_IN")).user}`,
          `  KeepAlive yes`,
          `  ServerAliveInterval 60`,
        ].join(`\n`),
    )
    .join(`\n\n`);
}

export function KeyCoordinator({ pando, logger, mqtt }: TServiceParams) {
  /**
   * /etc/hosts
   */
  async function buildHostsFile(devices: FullDevice[]): Promise<string> {
    const maxAddress = Math.max(
      ...devices.map(({ preferred_interface }) => preferred_interface.length),
    );
    const maxHost = Math.max(...devices.map(({ hostname }) => hostname.length));
    const hosts = await pando.proxy_manager.listHosts();

    logger.warn(`Hard coded all proxy urls to pith`);
    return devices
      .map(({ preferred_interface, hostname, title, aliases, id }) => {
        const proxyStuff = devices.flatMap(({ accounts }) =>
          accounts.flatMap(({ services }) =>
            services.flatMap(({ proxies }) =>
              proxies
                .filter(({ deviceId }) => hostname === "pith")
                .flatMap(
                  ({ proxy_id }) =>
                    hosts.find(({ id }) => id === proxy_id)?.domain_names,
                ),
            ),
          ),
        );
        return [
          // 192.168.1.1 pith a.b.c b.programmable.casa etc.local # CAMBIUM: Pith
          preferred_interface.padEnd(maxAddress + INCREMENT, " "),
          hostname.toLowerCase().padEnd(maxHost, " "),
          hostname,
          [
            // All domain sources
            ...aliases,
            ...proxyStuff,
          ].join(" "),
          "#",
          HOSTS_FILTER + ":",
          title,
        ].join(" ");
      })
      .join(`\n`);
  }

  return {
    async onDatabaseUpdated(data?: DevicesUpdatedPayload): Promise<void> {
      if (data) {
        const { id } = data;
        const device = await pando.database.client.network3Device.findFirst({
          include: {
            accounts: {
              include: {
                services: {
                  include: { proxies: true },
                },
              },
            },
          },
          where: { id },
        });
        logger.info(
          device
            ? `[${device.title}] updated / created`
            : `[${id}] device removed`,
        );
      }
      const devices = await pando.database.client.network3Device.findMany({
        include: {
          accounts: {
            include: {
              services: {
                include: { proxies: true },
              },
            },
          },
        },
        orderBy: [{ hostname: "asc" }, { preferred_interface: "asc" }],
      });
      const hostsFile = await buildHostsFile(devices);
      const sshConfig = buildSshConfig(devices);
      const keys = buildAuthorizedKeys(devices);
      logger.info("Sending");
      mqtt.publish(KEYS_UPDATED, {
        hostsFile,
        hostsFilter: HOSTS_FILTER,
        keys,
        sshConfig,
      } as KeysUpdatedPayload);
    },
  };
}
