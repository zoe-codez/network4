/* eslint-disable @typescript-eslint/no-empty-interface */

export type PandoCreateProxyHostPayload = Pick<
  ProxyHost,
  "domain_names" | "forward_host" | "forward_port"
>;

export type PandoEditProxyHostPayload = PandoCreateProxyHostPayload & {
  id: number;
};

export type PandoFindProxyHostPayload = {
  proxy: number;
  service: number;
};

export type NGINXCreateProxyHostPayload = {
  access_list_id: string;
  advanced_config: string;
  allow_websocket_upgrade: boolean;
  block_exploits: boolean;
  caching_enabled: boolean;
  certificate_id: number;
  domain_names: string[];
  forward_host: string;
  forward_port: number;
  forward_scheme: "http";
  hsts_enabled: boolean;
  hsts_subdomains: boolean;
  http2_support: boolean;
  locations: [];
  meta: Partial<HostMeta>;
  ssl_forced: boolean;
};
export interface ProxyHost {
  access_list: null;
  access_list_id: number | string;
  advanced_config: string;
  allow_websocket_upgrade: number;
  block_exploits: number;
  caching_enabled: number;
  certificate: Certificate;
  certificate_id: number;
  created_on: string;
  domain_names: string[];
  enabled: number;
  forward_host: string;
  forward_port: number;
  forward_scheme: string;
  hsts_enabled: number;
  hsts_subdomains: number;
  http2_support: number;
  id: number;
  ipv6?: boolean;
  locations: unknown[];
  meta: Partial<HostMeta>;
  modified_on: string;
  owner: Owner;
  owner_user_id: number;
  ssl_forced: number;
  use_default_location?: boolean;
}

export interface Certificate {
  created_on: string;
  domain_names: string[];
  expires_on: string;
  id: number;
  is_deleted: number;
  meta: CertificateMeta;
  modified_on: string;
  nice_name: string;
  owner_user_id: number;
  provider: string;
}

export interface CertificateMeta {}

export interface HostMeta {
  dns_challenge: boolean;
  dns_provider: string;
  dns_provider_credentials: string;
  letsencrypt_agree: boolean;
  letsencrypt_email: string;
  nginx_err: null;
  nginx_online: boolean;
}

export interface Owner {
  avatar: string;
  created_on: string;
  email: string;
  id: number;
  is_deleted: number;
  is_disabled: number;
  modified_on: string;
  name: string;
  nickname: string;
  roles: string[];
}

export interface ProxyManagerUser {
  avatar: string;
  created_on: string;
  email: string;
  id: number;
  is_disabled: number;
  modified_on: string;
  name: string;
  nickname: string;
  permissions: ProxyManagerPermissions;
  roles: string[];
}

export interface ProxyManagerPermissions {
  access_lists: string;
  certificates: string;
  created_on: string;
  dead_hosts: string;
  id: number;
  modified_on: string;
  proxy_hosts: string;
  redirection_hosts: string;
  streams: string;
  user_id: number;
  visibility: string;
}
