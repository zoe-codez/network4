import { FilteredFetchArguments, TServiceParams } from "@digital-alchemy/core";
import { ProxyEntry } from "@prisma/client";
import dayjs from "dayjs";

import {
  NGINXCreateProxyHostPayload,
  PandoCreateProxyHostPayload,
  PandoEditProxyHostPayload,
  PandoFindProxyHostPayload,
  ProxyHost,
  ProxyManagerUser,
} from "../../core/helpers";
import {
  PANDO_REFRESH_PROXYMANAGER_TOKEN,
  PANDO_UPDATE_PROXYMANAGER_HOSTS,
} from "../helpers";

type ProxyManagerAuth = {
  expires: string;
  token: string;
};
const CACHE_KEY = "PROXY_MANAGER_CACHE";
type CacheData = {
  auth: ProxyManagerAuth;
  me: ProxyManagerUser;
};
// const NUM_FALSE = 0;
// const NUM_TRUE = 1;

export function ProxyManager({
  context,
  logger,
  pando,
  config,
  lifecycle,
  internal,
  cache,
}: TServiceParams) {
  const fetcher = internal.boilerplate.fetch({ context });

  let auth: ProxyManagerAuth;
  let me: ProxyManagerUser;

  lifecycle.onPostConfig(async () => {
    fetcher.setBaseUrl(config.pando.PROXY_BASE_URL);
    const data = await cache.get<CacheData>(CACHE_KEY);
    if (data) {
      logger.debug(`Loaded proxy manager cache data`);
      auth = data.auth;
      me = data.me;
      return;
    }
    logger.debug(`Proxy manager cache miss`);
  });

  function isAuth() {
    return auth && dayjs().isBefore(auth.expires);
  }

  async function fetch<T, BODY extends object = object>(
    data: FilteredFetchArguments<BODY>,
    force = false,
  ): Promise<T> {
    if (!force && !isAuth()) {
      await login();
    }
    return await fetcher.fetch<T, BODY>({
      ...data,
      headers: { Authorization: `Bearer ${auth?.token}` },
    });
  }

  async function login() {
    auth = await fetch(
      {
        body: {
          identity: config.pando.PROXY_USERNAME,
          secret: config.pando.PROXY_PASSWORD,
        },
        method: "post",
        url: "/api/tokens",
      },
      true,
    );
    me = await proxyManager.whoAmI();
    logger.warn({ name: me.name }, `New auth token`);
    PANDO_REFRESH_PROXYMANAGER_TOKEN.setToCurrentTime();
    cache.set<CacheData>(CACHE_KEY, { auth: auth, me: me });
  }

  const proxyManager = {
    async createHost(body: PandoCreateProxyHostPayload): Promise<ProxyHost> {
      logger.info({ ...body }, `Create host`);
      PANDO_UPDATE_PROXYMANAGER_HOSTS.labels(
        "create",
        body.forward_host,
      ).setToCurrentTime();
      return await fetch({
        body: {
          ...body,
          access_list_id: "0",
          advanced_config: "",
          allow_websocket_upgrade: false,
          block_exploits: false,
          caching_enabled: false,
          certificate_id: 0,
          forward_scheme: "http",
          hsts_enabled: false,
          hsts_subdomains: false,
          http2_support: false,
          locations: [],
          meta: { dns_challenge: false, letsencrypt_agree: false },
          ssl_forced: false,
        } as NGINXCreateProxyHostPayload,
        method: "post",
        url: "/api/nginx/proxy-hosts",
      });
    },

    async deleteHost(host: number) {
      const hosts = await proxyManager.listHosts();
      const item = hosts.find(({ id }) => id === host);
      if (!item) {
        logger.error({ host }, `Cannot find host to remove`);
        return;
      }
      PANDO_UPDATE_PROXYMANAGER_HOSTS.labels(
        "delete",
        item.forward_host,
      ).setToCurrentTime();

      logger.warn(
        { domains: item.domain_names, forward_host: item.forward_host, host },
        `Delete host`,
      );

      await fetch({
        method: "delete",
        url: `/api/nginx/proxy-hosts/${host}`,
      });
    },

    async editHost(body: PandoEditProxyHostPayload): Promise<ProxyHost> {
      const merge = {
        domain_names: body.domain_names,
        forward_host: body.forward_host,
        forward_port: body.forward_port,
      };
      PANDO_UPDATE_PROXYMANAGER_HOSTS.labels(
        "update",
        body.forward_host,
      ).setToCurrentTime();
      return await fetch({
        body: {
          ...merge,
          access_list_id: "0",
          advanced_config: "",
          allow_websocket_upgrade: false,
          block_exploits: false,
          caching_enabled: false,
          certificate_id: 0,
          forward_scheme: "http",
          hsts_enabled: false,
          hsts_subdomains: false,
          http2_support: false,
          locations: [],
          meta: { dns_challenge: false, letsencrypt_agree: false },
          ssl_forced: false,
        },
        method: "put",
        url: `/api/nginx/proxy-hosts/${body.id}`,
      });
    },

    async findById({
      proxy,
      service,
    }: PandoFindProxyHostPayload): Promise<ProxyHost> {
      const list = await proxyManager.listHosts();
      const item = await pando.database.client.network3Services.findFirst({
        include: { proxies: true },
        where: { id: service },
      });
      const proxyItem = item.proxies.find(({ id }) => id === proxy);
      return list.find(({ id }) => id === proxyItem.proxy_id);
    },

    async listHosts(): Promise<ProxyHost[]> {
      logger.trace(`List hosts`);
      return await fetch({
        params: { expand: "owner,access_list,certificate" },
        url: "/api/nginx/proxy-hosts",
      });
    },

    async translateDomains(
      entries: ProxyEntry[],
    ): Promise<Map<ProxyEntry, ProxyHost>> {
      const data = await proxyManager.listHosts();
      return new Map(
        entries.map(proxy => [
          proxy,
          data.find(({ id }) => proxy.proxy_id === id),
        ]),
      );
    },

    async updateHost(id: number, body: ProxyHost): Promise<ProxyHost> {
      logger.trace(`Modify hosts`);
      return await fetch({
        body,
        method: "put",
        url: `/nginx/proxy-hosts/${id}`,
      });
    },

    async whoAmI(): Promise<ProxyManagerUser> {
      return await fetch({
        params: { expand: "permissions" },
        url: `/api/users/me`,
      });
    },
  };
  return proxyManager;
}
