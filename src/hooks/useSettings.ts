import { useState, useCallback } from "react";
import type { Settings } from "../types";

const STORAGE_KEY = "sutras-settings";

const defaultSettings: Settings = {
  script: "romaji",
  kanjiForm: "traditional",
  ttsEnabled: true,
  mode: "readings",
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...defaultSettings, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return defaultSettings;
}

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(loadSettings);

  const setSettings = useCallback((update: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...update };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, setSettings };
}
