export type GrowStatus = {
  currentNutrients: GrowMixture;
  flipDate?: string;
  name: string;
  stage: GrowStages;
  startDate: string;
  week: number;
};

export enum GrowNutrients {
  armorSi = "Armor Si",
  calMag = "CALiMAGic",
  floraMicro = "Flora Micro",
  floraGro = "Flora Gro",
  floraBloom = "Flora Bloom",
  humicAcid = "Humic Acid",
  floraBlend = "Flora Blend",
  liquidKoolBloom = "Liquid Kool Bloom",
  dryKoolBloom = "Dry Kool Bloom",
}

export type GrowStages = "veg" | "flower";

export type GrowMixture = Partial<Record<GrowNutrients, number>>;

export type MasterSchedule = Record<GrowStages, GrowMixture[]>;
