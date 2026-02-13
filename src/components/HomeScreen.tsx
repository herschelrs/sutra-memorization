import { useEffect, useState } from "react";
import type { Section } from "../data/schema";

interface DrillProgress {
  frontier: number;
}

interface Props {
  titleJa: string;
  titleEn: string;
  sections: Section[];
  progress: DrillProgress;
  totalSections: number;
  onStart: (sectionIndex?: number) => void;
  onBack: () => void;
  onOpenSettings: () => void;
}

function SectionList({ sections, onStart }: { sections: Section[]; onStart: (index: number) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="section-list">
      <button className="section-list-toggle" onClick={() => setOpen(!open)}>
        <span>Sections</span>
        <span className="section-list-arrow" style={{ transform: open ? "rotate(90deg)" : undefined }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="7,4 13,10 7,16" /></svg>
        </span>
      </button>
      {open && (
        <div className="section-list-items">
          {sections.map((section, index) => (
            <button key={section.id} className="section-list-item" onClick={() => onStart(index)}>
              <span className="section-list-id">{section.id}</span>
              <span className="section-list-kanji">
                {section.chunks.map((chunk, ci) => {
                  const chars = section.characters.slice(chunk.start, chunk.end).map((c) => c.char).join("");
                  return <ruby key={ci}>{chars}<rp>(</rp><rt>{chunk.ja}</rt><rp>)</rp></ruby>;
                })}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function HomeScreen({ titleJa, titleEn, sections, progress, totalSections, onStart, onBack, onOpenSettings }: Props) {
  const pct = Math.round((progress.frontier / (totalSections - 1)) * 100);
  const frontierSectionId = sections[progress.frontier]?.id ?? progress.frontier;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        onStart(progress.frontier > 0 ? progress.frontier : undefined);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onStart, progress.frontier]);

  return (
    <div className="home">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button className="btn-ghost" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13,4 7,10 13,16" /></svg>
        </button>
        <button className="btn-ghost" onClick={onOpenSettings}>
          <span className="material-symbols-outlined">settings</span>
        </button>
      </div>

      <h1 className="home-title">{titleJa}</h1>
      <p className="home-subtitle">{titleEn} Memorization</p>

      <div className="home-actions">
        <button className="btn-primary" onClick={() => onStart()}>
          {progress.frontier > 0 ? "Practice from Start" : "Begin Practice"}
        </button>
        {progress.frontier > 0 && (
          <>
            <button className="btn-secondary" onClick={() => onStart(progress.frontier)}>
              Continue from Section {frontierSectionId}
            </button>
            <p className="home-progress">
              Progress: section {frontierSectionId} of {sections[sections.length - 1].id} &middot; {pct}%
            </p>
          </>
        )}
      </div>

      <SectionList sections={sections} onStart={onStart} />
    </div>
  );
}
