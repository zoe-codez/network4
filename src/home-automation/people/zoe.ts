import { SECOND, TServiceParams } from "@digital-alchemy/core";

export function Zoe({ hass, home_automation, logger, lifecycle }: TServiceParams) {
  const tracker = hass.entity.byId("device_tracker.air_plant");
  const wifi = hass.entity.byId("sensor.air_plant_wifi_connection");
  const { isHome } = home_automation.sensors;

  tracker.onUpdate(() => updateIsHome());
  wifi.onUpdate(() => updateIsHome());
  hass.socket.onConnect(() => setTimeout(() => updateIsHome(), SECOND));

  function updateIsHome() {
    const current = isHome.storage.get("is_on");
    const updated =
      ["home", "near home"].includes(tracker.state.toLowerCase()) || wifi.state === "TheGoodStuff";
    if (current !== updated) {
      logger.debug({ current, updated }, "updating is home");
      isHome.storage.set("is_on", updated);
    }
  }
}
