export type StudyMode = "readings" | "kanji" | "mandarin" | "glosses" | "translation";

export interface Settings {
  script: "romaji" | "kana";
  kanjiForm: "traditional" | "simplified";
  ttsEnabled: boolean;
  showGlosses: boolean;
  mode: StudyMode;
}
