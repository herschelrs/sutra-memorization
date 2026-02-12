import { useState, useCallback, useRef, useEffect } from "react";
import type { Section, Character } from "../data/schema";
import type { Settings } from "../types";
import { useKanjiCanvas, canRecognize } from "../hooks/useKanjiCanvas";

const CANVAS_ID = "kanji-draw";

interface Props {
  section: Section;
  settings: Settings;
  onComplete: (gotIt: boolean) => void;
}

type CharStatus = "pending" | "current" | "correct" | "missed" | "skipped";

function charFace(c: Character, settings: Settings): string {
  return settings.kanjiForm === "simplified" && c.simplified
    ? c.simplified
    : c.char;
}

function chunkReadingText(
  chunk: Section["chunks"][number],
  settings: Settings,
): string {
  return settings.script === "kana" ? chunk.jaKana : chunk.ja;
}

/** Find which chunk a character index belongs to, and return a reading cue
 *  with the current character's position highlighted. */
function buildReadingCue(
  section: Section,
  charIndex: number,
  settings: Settings,
): { before: string; current: string; after: string } {
  const chunks = section.chunks;
  const parts: { text: string; containsCurrent: boolean; charStart: number; charEnd: number }[] = [];

  for (const chunk of chunks) {
    const text = chunkReadingText(chunk, settings);
    parts.push({
      text,
      containsCurrent: charIndex >= chunk.start && charIndex < chunk.end,
      charStart: chunk.start,
      charEnd: chunk.end,
    });
  }

  // Find the part containing the current character
  const idx = parts.findIndex((p) => p.containsCurrent);
  if (idx === -1) {
    // Shouldn't happen, but fallback
    const all = parts.map((p) => p.text).join(" ");
    return { before: all, current: "", after: "" };
  }

  const before = parts.slice(0, idx).map((p) => p.text).join(" ");
  const current = parts[idx].text;
  const after = parts.slice(idx + 1).map((p) => p.text).join(" ");

  return {
    before: before ? before + " " : "",
    current,
    after: after ? " " + after : "",
  };
}

export function WritingCanvas({ section, settings, onComplete }: Props) {
  const { isLoading, error, isLoaded, recognize, erase, deleteLast } =
    useKanjiCanvas(CANVAS_ID);

  const chars = section.characters;
  const [charIndex, setCharIndex] = useState(0);
  const [statuses, setStatuses] = useState<CharStatus[]>(() =>
    chars.map((_, i) => (i === 0 ? "current" : "pending")),
  );
  const [checked, setChecked] = useState(false);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState(false);
  const hadMiss = useRef(false);

  // Reset state when section changes
  const sectionIdRef = useRef(section.id);
  useEffect(() => {
    if (sectionIdRef.current !== section.id) {
      sectionIdRef.current = section.id;
      setCharIndex(0);
      setStatuses(chars.map((_, i) => (i === 0 ? "current" : "pending")));
      setChecked(false);
      setCandidates([]);
      setIsCorrect(false);
      hadMiss.current = false;
      if (isLoaded) erase();
    }
  }, [section.id, chars, isLoaded, erase]);

  // Auto-skip characters that can't be recognized
  useEffect(() => {
    if (!isLoaded || checked || charIndex >= chars.length) return;

    const target = charFace(chars[charIndex], settings);
    // Also check simplified form as fallback
    const simplified = chars[charIndex].simplified;
    const recognizable =
      canRecognize(target) ||
      (simplified ? canRecognize(simplified) : false);

    if (!recognizable) {
      // Auto-skip with brief delay so user sees which char was skipped
      const timer = setTimeout(() => {
        setStatuses((prev) => {
          const next = [...prev];
          next[charIndex] = "skipped";
          return next;
        });
        advance(charIndex);
      }, 600);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charIndex, isLoaded, checked]);

  const advance = useCallback(
    (fromIndex: number) => {
      const nextIndex = fromIndex + 1;
      if (nextIndex >= chars.length) {
        // Section complete
        onComplete(!hadMiss.current);
        return;
      }
      setCharIndex(nextIndex);
      setStatuses((prev) => {
        const next = [...prev];
        next[nextIndex] = "current";
        return next;
      });
      setChecked(false);
      setCandidates([]);
      setIsCorrect(false);
      erase();
    },
    [chars.length, erase, onComplete],
  );

  const handleCheck = useCallback(() => {
    if (!isLoaded || checked) return;
    const results = recognize();
    setCandidates(results);

    const target = charFace(chars[charIndex], settings);
    const simplified = chars[charIndex].simplified;
    const correct =
      results.includes(target) ||
      (simplified ? results.includes(simplified) : false);

    setIsCorrect(correct);
    if (!correct) hadMiss.current = true;

    setStatuses((prev) => {
      const next = [...prev];
      next[charIndex] = correct ? "correct" : "missed";
      return next;
    });
    setChecked(true);
  }, [isLoaded, checked, recognize, chars, charIndex, settings]);

  const handleNext = useCallback(() => {
    advance(charIndex);
  }, [advance, charIndex]);

  const handleUndo = useCallback(() => {
    if (isLoaded && !checked) deleteLast();
  }, [isLoaded, checked, deleteLast]);

  const handleClear = useCallback(() => {
    if (isLoaded && !checked) erase();
  }, [isLoaded, checked, erase]);

  if (error) {
    return <div className="writing-area"><p>Failed to load: {error}</p></div>;
  }

  const currentChar = charIndex < chars.length ? chars[charIndex] : null;
  const targetKanji = currentChar ? charFace(currentChar, settings) : "";
  const cue = buildReadingCue(section, charIndex, settings);
  const isSkipping =
    currentChar &&
    !canRecognize(charFace(currentChar, settings)) &&
    !(currentChar.simplified && canRecognize(currentChar.simplified));

  return (
    <div className="writing-area">
      {/* Reading cue */}
      <div className="writing-cue">
        <span className="writing-cue-dim">{cue.before}</span>
        <span className="writing-cue-current">{cue.current}</span>
        <span className="writing-cue-dim">{cue.after}</span>
      </div>

      {/* Progress dots */}
      <div className="writing-dots">
        {statuses.map((s, i) => (
          <span key={i} className={`writing-dot writing-dot-${s}`} />
        ))}
      </div>

      {/* Canvas */}
      <div className="writing-canvas-wrap">
        <canvas
          id={CANVAS_ID}
          width={300}
          height={300}
          className="writing-canvas"
        />
        {isLoading && <div className="writing-canvas-overlay">Loading...</div>}
        {isSkipping && (
          <div className="writing-canvas-overlay">
            <span className="writing-skip-char">{targetKanji}</span>
            <span className="writing-skip-label">Not in dataset</span>
          </div>
        )}
      </div>

      {/* Feedback */}
      {checked && (
        <div className={`writing-feedback ${isCorrect ? "correct" : "missed"}`}>
          <span className="writing-feedback-kanji">{targetKanji}</span>
          {!isCorrect && candidates.length > 0 && (
            <>
              <span className="writing-feedback-label">Recognized:</span>
              <span className="writing-feedback-candidates">
                {candidates.slice(0, 5).join(" ")}
              </span>
            </>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="writing-actions">
        {!checked ? (
          <>
            <button className="btn-ghost writing-btn" onClick={handleUndo} disabled={!isLoaded || isLoading}>
              Undo
            </button>
            <button className="btn-ghost writing-btn" onClick={handleClear} disabled={!isLoaded || isLoading}>
              Clear
            </button>
            <button className="btn-primary writing-btn-check" onClick={handleCheck} disabled={!isLoaded || isLoading}>
              Check
            </button>
          </>
        ) : (
          <button className="btn-primary" onClick={handleNext}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}
