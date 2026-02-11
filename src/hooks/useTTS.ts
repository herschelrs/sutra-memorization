import { useCallback, useRef } from "react";
import type { Settings } from "../types";

export function useTTS(settings: Settings) {
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const findVoice = useCallback((lang: string): SpeechSynthesisVoice | null => {
    const voices = speechSynthesis.getVoices();
    const matching = voices.filter((v) => v.lang.startsWith(lang));
    // Prefer "Google" or "Premium" voices
    const preferred = matching.find(
      (v) => v.name.includes("Google") || v.name.includes("Premium"),
    );
    return preferred ?? matching[0] ?? null;
  }, []);

  const speak = useCallback(
    (text: string, lang: "ja-JP" | "zh-CN") => {
      if (!settings.ttsEnabled || !window.speechSynthesis) return;

      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.85;

      const voice = findVoice(lang.slice(0, 2));
      if (voice) {
        voiceRef.current = voice;
        utterance.voice = voice;
      }

      speechSynthesis.speak(utterance);
    },
    [settings.ttsEnabled, findVoice],
  );

  const speakChunk = useCallback(
    (kanaOrPinyin: string, mode: Settings["mode"]) => {
      if (mode === "readings" || mode === "kanji") {
        speak(kanaOrPinyin, "ja-JP");
      } else if (mode === "mandarin") {
        speak(kanaOrPinyin, "zh-CN");
      }
    },
    [speak],
  );

  return { speak, speakChunk };
}
