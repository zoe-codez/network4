import { ONE_THIRD } from "@digital-alchemy/core";

export type GrowStatus = {
  currentNutrients: GrowMixture;
  gallons: number;
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

// ? ml / g nutrients at 15 gallon dilution
export const SCHEDULE = {
  flower: [
    {
      [GrowNutrients.armorSi]: 38,
      [GrowNutrients.calMag]: 75,
      [GrowNutrients.floraMicro]: 113,
      [GrowNutrients.floraGro]: 113,
      [GrowNutrients.floraBloom]: 113,
      [GrowNutrients.humicAcid]: 75,
      [GrowNutrients.floraBlend]: 75,
    },
    {
      [GrowNutrients.armorSi]: 38,
      [GrowNutrients.calMag]: 75,
      [GrowNutrients.floraMicro]: 113,
      [GrowNutrients.floraGro]: 38,
      [GrowNutrients.floraBloom]: 150,
      [GrowNutrients.humicAcid]: 75,
      [GrowNutrients.floraBlend]: 75,
      [GrowNutrients.liquidKoolBloom]: 15,
    },
    {
      [GrowNutrients.armorSi]: 38,
      [GrowNutrients.calMag]: 75,
      [GrowNutrients.floraMicro]: 113,
      [GrowNutrients.floraGro]: 38,
      [GrowNutrients.floraBloom]: 150,
      [GrowNutrients.humicAcid]: 75,
      [GrowNutrients.floraBlend]: 75,
      [GrowNutrients.liquidKoolBloom]: 38,
    },
    {
      [GrowNutrients.armorSi]: 38,
      [GrowNutrients.calMag]: 75,
      [GrowNutrients.floraMicro]: 113,
      [GrowNutrients.floraGro]: 38,
      [GrowNutrients.floraBloom]: 188,
      [GrowNutrients.humicAcid]: 75,
      [GrowNutrients.liquidKoolBloom]: 38,
    },
    {
      [GrowNutrients.armorSi]: 38,
      [GrowNutrients.calMag]: 75,
      [GrowNutrients.floraMicro]: 113,
      [GrowNutrients.floraGro]: 38,
      [GrowNutrients.floraBloom]: 188,
      [GrowNutrients.humicAcid]: 75,
      [GrowNutrients.liquidKoolBloom]: 38,
    },
    {
      [GrowNutrients.armorSi]: 30,
      [GrowNutrients.calMag]: 38,
      [GrowNutrients.floraMicro]: 113,
      [GrowNutrients.floraGro]: 38,
      [GrowNutrients.floraBloom]: 225,
      [GrowNutrients.humicAcid]: 75,
      [GrowNutrients.liquidKoolBloom]: 75,
    },
    {
      [GrowNutrients.armorSi]: 30,
      [GrowNutrients.calMag]: 38,
      [GrowNutrients.floraMicro]: 113,
      [GrowNutrients.floraGro]: 38,
      [GrowNutrients.floraBloom]: 225,
      [GrowNutrients.humicAcid]: 75,
      [GrowNutrients.liquidKoolBloom]: 75,
    },
    {
      [GrowNutrients.armorSi]: 30,
      [GrowNutrients.calMag]: 38,
      [GrowNutrients.floraMicro]: 75,
      [GrowNutrients.floraGro]: 38,
      [GrowNutrients.floraBloom]: 225,
      [GrowNutrients.humicAcid]: 75,
      [GrowNutrients.liquidKoolBloom]: 75,
      [GrowNutrients.dryKoolBloom]: 8,
    },
  ],
  veg: [
    {
      [GrowNutrients.floraMicro]: 38,
      [GrowNutrients.floraGro]: 38,
      [GrowNutrients.floraBloom]: 38,
      [GrowNutrients.humicAcid]: 75,
      [GrowNutrients.floraBlend]: 150,
    },
    {
      [GrowNutrients.armorSi]: 23,
      [GrowNutrients.calMag]: 38,
      [GrowNutrients.floraMicro]: 113,
      [GrowNutrients.floraGro]: 150,
      [GrowNutrients.floraBloom]: 38,
      [GrowNutrients.humicAcid]: 150,
      [GrowNutrients.floraBlend]: 150,
    },
    {
      [GrowNutrients.armorSi]: 30,
      [GrowNutrients.calMag]: 75,
      [GrowNutrients.floraMicro]: 150,
      [GrowNutrients.floraGro]: 150,
      [GrowNutrients.floraBloom]: 75,
      [GrowNutrients.humicAcid]: 150,
      [GrowNutrients.floraBlend]: 150,
    },
  ],
};

export function scaleMixture(
  mixture: GrowMixture,
  gallons: number,
): GrowMixture {
  return Object.fromEntries(
    Object.entries(mixture).map(([key, value]) => [
      key as GrowNutrients,
      Math.floor((value / GAL_RATIO) * gallons),
    ]),
  );
}

const GAL_RATIO = 15;
