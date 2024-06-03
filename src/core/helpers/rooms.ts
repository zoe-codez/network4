export enum GlobalScenes {
  high = "high",
  auto = "auto",
  off = "off",
  evening_high = "evening_high",
  evening = "evening",
}
export type GLOBAL_SCENES = `${GlobalScenes}`;

export type RoomNames =
  | "office"
  | "loft"
  | "misc"
  | "living"
  | "games"
  | "bedroom"
  | "kitchen";
