import type { Settings, StudyMode } from "../types";

interface Props {
  settings: Settings;
  onUpdate: (update: Partial<Settings>) => void;
  onReset: () => void;
  onClose: () => void;
}

const modes: { value: StudyMode; label: string }[] = [
  { value: "readings", label: "Readings" },
  { value: "kanji", label: "Kanji" },
  { value: "mandarin", label: "Mandarin" },
  { value: "glosses", label: "Glosses" },
  { value: "translation", label: "Translation" },
];

export function SettingsPanel({ settings, onUpdate, onReset, onClose }: Props) {
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <h2>
          Settings
          <button className="btn-ghost" onClick={onClose}>
            &times;
          </button>
        </h2>

        <div className="setting-group">
          <label>Study Mode</label>
          <div className="setting-options">
            {modes.map((m) => (
              <button
                key={m.value}
                className={`setting-option ${settings.mode === m.value ? "active" : ""}`}
                onClick={() => onUpdate({ mode: m.value })}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group">
          <label>Japanese Script</label>
          <div className="setting-options">
            <button
              className={`setting-option ${settings.script === "romaji" ? "active" : ""}`}
              onClick={() => onUpdate({ script: "romaji" })}
            >
              Romaji
            </button>
            <button
              className={`setting-option ${settings.script === "kana" ? "active" : ""}`}
              onClick={() => onUpdate({ script: "kana" })}
            >
              Kana
            </button>
          </div>
        </div>

        <div className="setting-group">
          <label>Kanji Form</label>
          <div className="setting-options">
            <button
              className={`setting-option ${settings.kanjiForm === "traditional" ? "active" : ""}`}
              onClick={() => onUpdate({ kanjiForm: "traditional" })}
            >
              Traditional
            </button>
            <button
              className={`setting-option ${settings.kanjiForm === "simplified" ? "active" : ""}`}
              onClick={() => onUpdate({ kanjiForm: "simplified" })}
            >
              Shinjitai
            </button>
          </div>
        </div>

        <div className="setting-toggle">
          <span>Text-to-Speech</span>
          <button
            className={`toggle ${settings.ttsEnabled ? "on" : ""}`}
            onClick={() => onUpdate({ ttsEnabled: !settings.ttsEnabled })}
          />
        </div>

        <div style={{ marginTop: 24 }}>
          <button className="btn-ghost" style={{ color: "var(--danger)" }} onClick={() => { onReset(); onClose(); }}>
            Reset progress
          </button>
        </div>
      </div>
    </div>
  );
}
