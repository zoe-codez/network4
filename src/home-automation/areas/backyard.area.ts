import { HALF, SINGLE, TServiceParams } from "@digital-alchemy/core";

export function BackYard({ hass, automation, context }: TServiceParams) {
  const houseMode = hass.entity.byId("select.house_mode");
  const backYardLights = hass.entity.byId("light.back_yard_dimmer");
  const isHome = hass.entity.byId("binary_sensor.zoe_is_home");

  automation.managed_switch({
    context,
    entity_id: "switch.back_yard_low_voltage_lights",
    onUpdate: [houseMode, backYardLights],
    shouldBeOn() {
      const [NOW, PM7, PM3] = automation.time.shortTime(["NOW", "PM7", "PM3"]);
      if (houseMode.state === "guest") {
        return true;
      }
      if (backYardLights.state === "on" && NOW.isAfter(PM3)) {
        return true;
      }
      if (NOW.isBefore(automation.solar.sunrise)) {
        return true;
      }
      if (NOW.isAfter(PM7)) {
        return NOW.isAfter(automation.solar.sunset.subtract(SINGLE, "hour"));
      }
      return NOW.isAfter(automation.solar.sunset.subtract(HALF, "hour"));
    },
  });

  isHome.onUpdate(async () => {
    if (isHome.state !== "on") {
      await hass.call.light.turn_off({
        entity_id: "light.back_yard_dimmer",
      });
    }
  });
}