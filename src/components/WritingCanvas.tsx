import { useState, useCallback, useRef, useEffect, useLayoutEffect } from "react";
import type { Section, Character } from "../data/schema";
import type { Settings } from "../types";
import { useKanjiCanvas, canRecognize, getExpectedStrokes } from "../hooks/useKanjiCanvas";

const CANVAS_ID = "kanji-draw";

interface Props {
  section: Section;
  settings: Settings;
  phase: "practice" | "test";
  onPhaseChange: (phase: "practice" | "test") => void;
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

export function WritingCanvas({ section, settings, phase, onPhaseChange, onComplete }: Props) {
  const { isLoading, error, isLoaded, recognize, erase, deleteLast, getStrokeCount } =
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
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState(300);

  // Measure the wrap container and set canvas to match exactly
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const size = Math.round(wrap.getBoundingClientRect().width);
    if (size > 0) setCanvasSize(size);
  }, []);

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

  // Auto-check after each stroke: when drawn strokes >= expected, try recognition
  useEffect(() => {
    if (!isLoaded || checked || charIndex >= chars.length) return;

    const canvas = document.getElementById(CANVAS_ID);
    if (!canvas) return;

    const target = charFace(chars[charIndex], settings);
    const simplified = chars[charIndex].simplified;
    const expected =
      getExpectedStrokes(target) ??
      (simplified ? getExpectedStrokes(simplified) : null);

    if (expected === null) return;

    const tryAutoCheck = () => {
      // Small delay to ensure KanjiCanvas has processed the stroke
      setTimeout(() => {
        const drawn = getStrokeCount();
        if (drawn < expected) return;

        const results = recognize();
        const correct =
          results.includes(target) ||
          (simplified ? results.includes(simplified) : false);

        if (correct) {
          setCandidates(results);
          setIsCorrect(true);
          setStatuses((prev) => {
            const next = [...prev];
            next[charIndex] = "correct";
            return next;
          });
          setChecked(true);
          // Auto-advance after brief feedback
          autoAdvanceTimer.current = setTimeout(() => {
            advance(charIndex);
          }, 400);
        }
        // If not correct, do nothing — user can keep drawing or manually Check
      }, 50);
    };

    canvas.addEventListener("mouseup", tryAutoCheck);
    canvas.addEventListener("touchend", tryAutoCheck);
    return () => {
      canvas.removeEventListener("mouseup", tryAutoCheck);
      canvas.removeEventListener("touchend", tryAutoCheck);
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
        autoAdvanceTimer.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charIndex, isLoaded, checked, chars, settings]);

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

  const handleRetry = useCallback(() => {
    setChecked(false);
    setCandidates([]);
    setIsCorrect(false);
    erase();
  }, [erase]);

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
    isLoaded &&
    currentChar &&
    !canRecognize(charFace(currentChar, settings)) &&
    !(currentChar.simplified && canRecognize(currentChar.simplified));

  return (
    <div className="writing-area">
      {/* Phase toggle */}
      <div className="writing-phase-toggle">
        <button
          className={`writing-phase-btn ${phase === "practice" ? "active" : ""}`}
          onClick={() => onPhaseChange("practice")}
        >
          Practice
        </button>
        <button
          className={`writing-phase-btn ${phase === "test" ? "active" : ""}`}
          onClick={() => onPhaseChange("test")}
        >
          Test
        </button>
      </div>

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
      <div ref={wrapRef} className="writing-canvas-wrap">
        <canvas
          ref={canvasRef}
          id={CANVAS_ID}
          width={canvasSize}
          height={canvasSize}
          style={{ width: canvasSize, height: canvasSize }}
          className="writing-canvas"
        />
        {phase === "practice" && !checked && !isSkipping && targetKanji && (
          <div className="writing-canvas-hint">{targetKanji}</div>
        )}
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
          <div key="draw" className="writing-actions-row">
            <button className="btn-ghost writing-btn" onClick={handleUndo} disabled={!isLoaded || isLoading}>
              Undo
            </button>
            <button className="btn-ghost writing-btn" onClick={handleClear} disabled={!isLoaded || isLoading}>
              Clear
            </button>
            <button className="btn-primary writing-btn-check" onClick={handleCheck} disabled={!isLoaded || isLoading}>
              Check
            </button>
          </div>
        ) : isCorrect ? (
          <div key="next" className="writing-actions-row">
            <button className="btn-primary" onClick={handleNext}>
              Next
            </button>
          </div>
        ) : (
          <div key="missed" className="writing-actions-row">
            <button className="btn-ghost writing-btn" onClick={handleRetry}>
              Retry
            </button>
            <button className="btn-primary writing-btn" onClick={handleNext}>
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
