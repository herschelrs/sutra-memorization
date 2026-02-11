import rawData from "./four-great-vows.json";
import { parseSutra } from "./schema";

export const sections = parseSutra(rawData);
