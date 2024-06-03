import { TServiceParams } from "@digital-alchemy/core";

export type B2BucketStats = {
  fileCount: number;
  totalSize: number;
};
export function Heartwood({ logger, context, network4, lifecycle }: TServiceParams) {
  const fetchService = network4.base(context);

  lifecycle.onPostConfig(() => {
    fetchService.setTarget({
      app: "cambium",
      hostname: "heartwood",
      user: "root",
    });
  });

  return {
    async bucketStats(): Promise<B2BucketStats> {
      logger.trace(`bucketStats`);
      return await fetchService.fetch({
        method: "get",
        url: "/bucket-stats",
      });
    },

    async manualSyncFull(): Promise<void> {
      logger.trace(`manualSyncFull`);
      await fetchService.fetch({
        method: "post",
        url: `/force-sync`,
      });
    },

    async syncDevice(device: string): Promise<void> {
      logger.trace(`syncDevice`);
      await fetchService.fetch({
        body: { device },
        method: "post",
        url: `/force-sync`,
      });
    },
  };
}
