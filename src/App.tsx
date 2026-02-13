import { useState, useCallback, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { sutras, type SutraInfo } from "./data";
import { useDrill, loadProgress, loadWritingProgress, saveWritingProgress } from "./hooks/useDrill";
import { useSettings } from "./hooks/useSettings";
import { useTTS } from "./hooks/useTTS";
import { HomeScreen } from "./components/HomeScreen";
import { StudySession } from "./components/StudySession";
import { SettingsPanel } from "./components/SettingsPanel";
import "./styles.css";

function SutraSelect({ onSelect }: { onSelect: (sutra: SutraInfo) => void }) {
  return (
    <div className="home">
      <h1 className="home-title">お經</h1>
      <p className="home-subtitle">Sutra Memorization</p>

      <div className="sutra-list">
        {sutras.map((s) => {
          const progress = loadProgress(s.id);
          const pct = s.sections.length > 1
            ? Math.round((progress.frontier / (s.sections.length - 1)) * 100)
            : 0;
          return (
            <button key={s.id} className="sutra-card" onClick={() => onSelect(s)}>
              <span className="sutra-card-ja">{s.titleJa}</span>
              <span className="sutra-card-en">{s.titleEn}</span>
              {progress.frontier > 0 && (
                <span className="sutra-card-progress">{pct}%</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SutraDrill({ sutra, onBack }: { sutra: SutraInfo; onBack: () => void }) {
  const { settings, setSettings } = useSettings();
  const drill = useDrill(sutra.sections, sutra.id);
  const { speakChunk } = useTTS(settings);
  const [showSettings, setShowSettings] = useState(false);
  const [writingRetryKey, setWritingRetryKey] = useState(0);
  const [writingPhase, setWritingPhase] = useState<"practice" | "test">("practice");
  const [writingCompleted, setWritingCompleted] = useState<Set<number>>(
    () => new Set(loadWritingProgress(sutra.id)),
  );

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
      if (settings.mode === "writing") {
        if (writingPhase === "practice") {
          // Practice: always loop the section
          setWritingRetryKey((k) => k + 1);
          return;
        }
        if (!gotIt) {
          // Test mode miss: redo the section immediately
          setWritingRetryKey((k) => k + 1);
          return;
        }
        // Test mode success: mark section complete, advance linearly
        const sectionIdx = drill.run!.sectionId;
        const next = new Set(writingCompleted);
        next.add(sectionIdx);
        setWritingCompleted(next);
        saveWritingProgress(sutra.id, [...next]);

        // Find next incomplete section
        for (let i = sectionIdx + 1; i < sutra.sections.length; i++) {
          if (!next.has(i)) {
            drill.startDrill(i);
            return;
          }
        }
        // All done
        drill.goHome();
        return;
      }
      drill.assess(gotIt);
    },
    [drill, settings.mode, writingPhase, writingCompleted, sutra.id, sutra.sections.length],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showSettings) return;
      if (!drill.run) return;
      if (settings.mode === "writing") return;

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
          titleJa={sutra.titleJa}
          titleEn={sutra.titleEn}
          sections={sutra.sections}
          progress={drill.progress}
          writingCompleted={writingCompleted}
          totalSections={drill.totalSections}
          onStart={drill.startDrill}
          onBack={onBack}
          onOpenSettings={() => setShowSettings(true)}
        />
        {showSettings && (
          <SettingsPanel
            settings={settings}
            onUpdate={setSettings}
            onReset={() => { drill.resetProgress(); setWritingCompleted(new Set()); saveWritingProgress(sutra.id, []); }}
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
        sections={sutra.sections}
        section={drill.currentSection}
        previousSections={drill.previousSections}
        run={drill.run}
        recovery={drill.recovery}
        rewindKey={drill.rewindKey}
        rewindType={drill.rewindType}
        writingRetryKey={writingRetryKey}
        writingPhase={writingPhase}
        onWritingPhaseChange={setWritingPhase}
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

export default function App() {
  const [selectedSutraId, setSelectedSutraId] = useState<string | null>(null);

  const sutra = selectedSutraId
    ? sutras.find((s) => s.id === selectedSutraId) ?? null
    : null;

  if (!sutra) {
    return <SutraSelect onSelect={(s) => setSelectedSutraId(s.id)} />;
  }

  return (
    <SutraDrill
      key={sutra.id}
      sutra={sutra}
      onBack={() => setSelectedSutraId(null)}
    />
  );
}

createRoot(document.getElementById("root")!).render(<App />);
