interface ChunkResult {
  chunkIndex: number;
  gotIt: boolean;
}

interface Props {
  sectionId: number;
  results: ChunkResult[];
  onContinue: () => void;
  onHome: () => void;
}

export function SectionSummary({ sectionId, results, onContinue, onHome }: Props) {
  const correct = results.filter((r) => r.gotIt).length;
  const total = results.length;
  const allClean = correct === total;

  return (
    <div className="summary">
      <h2>{allClean ? "Clean pass!" : "Keep practicing"}</h2>
      <div className="summary-stats">
        <div>Section {sectionId}</div>
        <div>
          {correct} / {total} chunks correct
        </div>
        {allClean && <div>Moving to next section</div>}
      </div>
      <div className="summary-actions">
        <button className="btn-primary" onClick={onContinue}>
          Continue
        </button>
        <button className="btn-ghost" onClick={onHome}>
          Back to Home
        </button>
      </div>
    </div>
  );
}
