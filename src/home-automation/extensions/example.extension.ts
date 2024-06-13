import { TServiceParams } from "@digital-alchemy/core";

export function Example({ hass, lifecycle }: TServiceParams) {
  // lifecycle.onReady(() => {
  //   const sensor = hass.refBy.id("sensor.transmission_download_speed");
  //   sensor.onUpdate((new_state, old_state) => {
  //     console.log({ new_state, old_state });
  //   });
  // });
}
