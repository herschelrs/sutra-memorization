import rawData from "./verse-of-repentance.json";
import { parseSutra } from "./schema";

export const sections = parseSutra(rawData);
