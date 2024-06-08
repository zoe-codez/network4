import { TServiceParams } from "@digital-alchemy/core";
import { Client, TravelMode } from "@googlemaps/google-maps-services-js";
import { createHash } from "crypto";
import { Dayjs } from "dayjs";

const LOOKUP_CACHE = (destination: string, arrival: Dayjs) =>
  `TRAVEL_TIME:${generateHash(destination + arrival.toISOString())}`;

function generateHash(input: string) {
  const hash = createHash("sha256");
  hash.update(input);
  return hash.digest("hex");
}

export function Maps({ cache, logger, config }: TServiceParams) {
  const mapsClient = new Client();
  return {
    async calculateTravelTime(
      destination: string,
      arrival: Dayjs,
    ): Promise<number> {
      const cache_key = LOOKUP_CACHE(destination, arrival);
      const data = await cache.get<number>(cache_key);
      if (data) {
        return data;
      }
      const from = config.pando.DEFAULT_MAP_ORIGIN;
      logger.info({ arrival, destination, from }, `Calculate travel time`);
      const response = await mapsClient.directions({
        params: {
          arrival_time: Math.floor(
            arrival.subtract(10, "minutes").unix() / 1000,
          ),
          destination,
          key: config.pando.GOOGLE_MAPS_API_KEY,
          mode: TravelMode.driving,
          origin: from,
        },
      });

      const routes = response.data.routes;

      if (routes.length > 0) {
        const legs = routes[0].legs;

        if (legs.length > 0) {
          const durationInSeconds = legs.reduce(
            (total, leg) => total + leg.duration.value,
            0,
          );
          const durationInMinutes = Math.round(durationInSeconds / 60);
          logger.debug({ durationInMinutes });
          await cache.set(cache_key, durationInMinutes);
          return durationInMinutes;
        }
      }
      await cache.set(cache_key, -1);
      return -1;
    },
  };
}
