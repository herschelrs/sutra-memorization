import { useState, useCallback, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { sections } from "./data/heart-sutra";
import { useDrill } from "./hooks/useDrill";
import { useSettings } from "./hooks/useSettings";
import { useTTS } from "./hooks/useTTS";
import { HomeScreen } from "./components/HomeScreen";
import { StudySession } from "./components/StudySession";
import { SettingsPanel } from "./components/SettingsPanel";
import "./styles.css";

export default function App() {
  const { settings, setSettings } = useSettings();
  const drill = useDrill(sections);
  const { speakChunk } = useTTS(settings);
  const [showSettings, setShowSettings] = useState(false);

  const handleReveal = useCallback(() => {
    drill.reveal();
    if (drill.run && drill.currentSection && settings.ttsEnabled) {
      const text = drill.currentSection.chunks
        .map((c) => settings.mode === "mandarin" ? c.zh : c.jaKana)
        .join(" ");
      speakChunk(text, settings.mode);
    }
  }, [drill, settings, speakChunk]);

  const handleAssess = useCallback(
    (gotIt: boolean) => {
      drill.assess(gotIt);
    },
    [drill],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showSettings) return;
      if (!drill.run) return;

      if (e.key === " ") {
        e.preventDefault();
        if (!drill.run.revealed) {
          handleReveal();
        } else {
          handleAssess(true);
        }
      } else if (e.key === "2" && drill.run.revealed) {
        handleAssess(true);
      } else if (e.key === "1" && drill.run.revealed) {
        handleAssess(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [drill, showSettings, handleReveal, handleAssess]);

  // No active drill — show home
  if (!drill.run) {
    return (
      <>
        <HomeScreen
          progress={drill.progress}
          totalSections={drill.totalSections}
          onStart={drill.startDrill}
          onOpenSettings={() => setShowSettings(true)}
        />
        {showSettings && (
          <SettingsPanel
            settings={settings}
            onUpdate={setSettings}
            onReset={drill.resetProgress}
            onClose={() => setShowSettings(false)}
          />
        )}
      </>
    );
  }

  // Active drill
  return (
    <>
      <StudySession
        section={drill.currentSection}
        previousSections={drill.previousSections}
        run={drill.run}
        recovery={drill.recovery}
        rewindKey={drill.rewindKey}
        rewindType={drill.rewindType}
        settings={settings}
        totalSections={drill.totalSections}
        onReveal={handleReveal}
        onAssess={handleAssess}
        onHome={drill.goHome}
        onOpenSettings={() => setShowSettings(true)}
      />
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdate={setSettings}
          onReset={drill.resetProgress}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
