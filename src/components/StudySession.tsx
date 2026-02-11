import type { Section, Character } from "../data/heart-sutra";
import type { Settings } from "../types";
import type { Recovery } from "../hooks/useDrill";
import { ActionButtons } from "./ActionButtons";
import { ProgressBar } from "./ProgressBar";

interface Run {
  sectionId: number;
  revealed: boolean;
}

interface Props {
  section: Section;
  previousSections: Section[];
  run: Run;
  recovery: Recovery | null;
  rewindKey: number;
  rewindType: "fail" | "success";
  settings: Settings;
  totalSections: number;
  onReveal: () => void;
  onAssess: (gotIt: boolean) => void;
  onHome: () => void;
  onOpenSettings: () => void;
}

function charFace(c: Character, settings: Settings): string {
  return settings.kanjiForm === "simplified" && c.simplified
    ? c.simplified
    : c.char;
}

function chunkReading(chunk: Section["chunks"][number], chars: Character[], settings: Settings): string {
  const mode = settings.mode;
  if (mode === "mandarin") return chunk.zh;
  if (mode === "glosses") return chars.map((c) => c.gloss ?? "~").join(" ");
  return settings.script === "kana" ? chunk.jaKana : chunk.ja;
}

function SectionRuby({ section, settings, className }: { section: Section; settings: Settings; className?: string }) {
  const glossActive = settings.showGlosses && (settings.mode === "readings" || settings.mode === "mandarin");
  const cls = (className ?? "section-line") + (glossActive ? " has-glosses" : "");
  return (
    <div className={glossActive ? "section-glossed-wrap" : undefined}>
      <div className={cls}>
        {section.chunks.map((chunk, ci) => {
          const chars = section.characters.slice(chunk.start, chunk.end);
          const kanji = chars.map((c) => charFace(c, settings)).join("");
          if (glossActive) {
            const gloss = chars.map((c) => c.gloss).filter(Boolean).join(" ");
            return (
              <span key={ci} className="chunk-group glossed">
                <ruby>{kanji}<rt>{chunkReading(chunk, chars, settings)}</rt></ruby>
                {gloss && <span className="gloss-under">{gloss}</span>}
              </span>
            );
          }
          return (
            <ruby key={ci} className="chunk-group">
              {kanji}<rt>{chunkReading(chunk, chars, settings)}</rt>
            </ruby>
          );
        })}
      </div>
      {glossActive && <div className="section-translation">{section.translation}</div>}
    </div>
  );
}


export function StudySession({
  section,
  previousSections,
  run,
  recovery,
  rewindKey,
  rewindType,
  settings,
  totalSections,
  onReveal,
  onAssess,
  onHome,
  onOpenSettings,
}: Props) {
  const mode = settings.mode;

  return (
    <div className="study-session">
      <div className="header">
        <button className="btn-ghost" onClick={onHome}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13,4 7,10 13,16" /></svg>
        </button>
        <span className="header-title">
          Section {section.id}
        </span>
        <button className="btn-ghost" onClick={onOpenSettings}>
          &#9881;
        </button>
      </div>
      <ProgressBar current={section.id} total={totalSections - 1} />
      {recovery && (() => {
        const done = recovery.passesTotal - recovery.passesLeft;
        return (
          <div className="recovery-wrap">
            <div className="recovery-dots">
              {Array.from({ length: recovery.passesTotal }, (_, i) => (
                <span key={i} className={i < done ? "pass-dot done" : "pass-dot"}/>
              ))}
            </div>
            <div className="recovery-label">
              {recovery.passesLeft} more through section {recovery.target} to continue
            </div>
          </div>
        );
      })()}
      <div className={rewindKey > 0 ? `chunks-area rewind rewind-${rewindType}` : "chunks-area"} key={rewindKey}>
        <div className="context-half">
          {previousSections.length > 0 && (
            <div className="context-lines">
              {previousSections.map((s) => (
                <SectionRuby key={s.id} section={s} settings={settings} className="section-line context" />
              ))}
            </div>
          )}
        </div>
        <div className="current-half">
          {!run.revealed && (
            <div className="recall-cue">
              {section.id === 0 ? "[title]" : "• • •"}
            </div>
          )}
          {mode === "translation" ? (
            <div className={"translation-display" + (run.revealed ? "" : " hidden-reserve")}>
              <div className="translation-english">{section.translation}</div>
            </div>
          ) : (
            <SectionRuby section={section} settings={settings} className={run.revealed ? "section-line" : "section-line hidden-reserve"} />
          )}
        </div>
      </div>
      <ActionButtons
        revealed={run.revealed}
        onReveal={onReveal}
        onGotIt={() => onAssess(true)}
        onMissed={() => onAssess(false)}
      />
    </div>
  );
}
