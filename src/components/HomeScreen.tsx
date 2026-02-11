interface DrillProgress {
  currentSectionIndex: number;
  sectionResults: Record<number, { attempts: number; lastClean: boolean }>;
}

interface Props {
  progress: DrillProgress;
  totalSections: number;
  onStart: (sectionIndex?: number) => void;
  onOpenSettings: () => void;
}

export function HomeScreen({ progress, totalSections, onStart, onOpenSettings }: Props) {
  const pct = Math.round((progress.currentSectionIndex / (totalSections - 1)) * 100);

  return (
    <div className="home">
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn-ghost" onClick={onOpenSettings}>
          &#9881;
        </button>
      </div>

      <h1 className="home-title">般若心經</h1>
      <p className="home-subtitle">Heart Sutra Memorization</p>

      <div className="home-actions">
        <button className="btn-primary" onClick={() => onStart()}>
          {progress.currentSectionIndex > 0 ? "Continue Practice" : "Begin Practice"}
        </button>
        {progress.currentSectionIndex > 0 && (
          <p className="home-progress">
            Section {progress.currentSectionIndex} of {totalSections - 1} &middot; {pct}%
          </p>
        )}
      </div>
    </div>
  );
}
