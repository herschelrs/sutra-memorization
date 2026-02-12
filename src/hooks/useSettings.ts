import { useState, useCallback, useEffect } from "react";
import type { Settings } from "../types";

const STORAGE_KEY = "sutras-settings";

const defaultSettings: Settings = {
  script: "romaji",
  kanjiForm: "traditional",
  ttsEnabled: false,
  showGlosses: false,
  mode: "readings",
  theme: "auto",
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

function getResolvedTheme(theme: Settings["theme"]): "light" | "dark" {
  if (theme !== "auto") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", getResolvedTheme(settings.theme));

    if (settings.theme === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => {
        document.documentElement.setAttribute("data-theme", getResolvedTheme("auto"));
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [settings.theme]);

  return { settings, setSettings };
}
