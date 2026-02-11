import type { Section } from "./schema";
import { sections as heartSutraSections } from "./heart-sutra";
import { sections as fourGreatVowsSections } from "./four-great-vows";

export interface SutraInfo {
  id: string;
  titleJa: string;
  titleEn: string;
  sections: Section[];
}

export const sutras: SutraInfo[] = [
  {
    id: "heart-sutra",
    titleJa: "般若心經",
    titleEn: "Heart Sutra",
    sections: heartSutraSections,
  },
  {
    id: "four-great-vows",
    titleJa: "四弘誓願",
    titleEn: "Four Great Vows",
    sections: fourGreatVowsSections,
  },
];
