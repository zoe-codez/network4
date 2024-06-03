import { TServiceParams } from "@digital-alchemy/core";

export async function SDK({ config, lifecycle }: TServiceParams) {
  const { defaults, ...sdk } = await import("@immich/sdk");
  lifecycle.onPostConfig(() => {
    defaults.baseUrl = config.immich.BASE_URL;
    defaults.headers = { "x-api-key": config.immich.API_KEY };
  });
  return sdk;
}
