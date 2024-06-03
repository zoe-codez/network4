import { TServiceParams } from "@digital-alchemy/core";

export function SensorsExtension({ context, synapse }: TServiceParams) {
  return {
    fanSoundPlaying: synapse.binary_sensor({
      context,
      is_on: false,
      name: "Bedroom White Noise",
      suggested_object_id: "bedroom_white_noise",
    }),
    houseMode: synapse.select({
      context,
      current_option: "normal",
      name: "House Mode",
      options: ["normal", "away", "guest", "chores", "sleep"],
      suggested_object_id: "house_mode",
    }),
    isHome: synapse.binary_sensor({ context, name: "Zoe is home" }),
    meetingMode: synapse.switch({
      context,
      is_on: false,
      name: "Meeting Mode",
    }),
    tent: {
      flipDate: synapse.date({
        context,
        name: "Tent Flip",
        native_value: "2024-01-01",
        suggested_object_id: "tent_flip",
      }),
      growStart: synapse.date({
        context,
        name: "Tent Start",
        native_value: "2024-01-01",
      }),
      mode: synapse.select({
        context,
        current_option: "veg-early",
        name: "Tent Mode",
        options: ["veg-early", "veg-late", "flower", "debug"],
        suggested_object_id: "tent_mode",
      }),
      name: synapse.text({
        context,
        name: "Tent Name",
        native_value: "",
        suggested_object_id: "tent_name",
      }),
    },
    windowsOpen: synapse.switch({
      context,
      is_on: false,
      name: "Windows Open",
    }),
  };
}
