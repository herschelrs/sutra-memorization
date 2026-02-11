import { z } from "zod";
import rawData from "./heart-sutra.json";

const CharacterSchema = z.object({
  char: z.string().length(1),
  simplified: z.string().length(1).optional(),
  type: z.enum(["s", "p", "n"]),
  on: z.string(),
  kana: z.string(),
  pinyin: z.string(),
  gloss: z.string().nullable(),
});

const ChunkSchema = z.object({
  start: z.number().int().min(0),
  end: z.number().int().min(1),
  ja: z.string(),
  jaKana: z.string(),
  zh: z.string(),
});

const SectionSchema = z.object({
  id: z.number().int().min(0),
  characters: z.array(CharacterSchema).min(1),
  chunks: z.array(ChunkSchema).min(1),
  translation: z.string(),
  sanskrit: z.string().optional(),
});

const SutraSchema = z.array(SectionSchema);

const parsed = SutraSchema.parse(rawData);

export type Character = z.infer<typeof CharacterSchema>;
export type Chunk = z.infer<typeof ChunkSchema>;

export interface Section {
  id: number;
  characters: Character[];
  chunks: Chunk[];
  translation: string;
  sanskrit?: string;
}

export const sections: Section[] = parsed;
