import { useState, useCallback, useMemo } from "react";
import type { Section } from "../data/heart-sutra";

interface SectionRun {
  sectionId: number;
  revealed: boolean;
}

export interface Recovery {
  target: number;
  passesLeft: number;
  passesTotal: number;
}

interface DrillProgress {
  frontier: number;
}

const STORAGE_KEY = "sutras-drill-progress";
const RECOVERY_PASSES = 3;

function loadProgress(): DrillProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // migrate from old format
      if ("currentSectionIndex" in parsed) return { frontier: parsed.currentSectionIndex };
      return parsed;
    }
  } catch {
    // ignore
  }
  return { frontier: 0 };
}

function saveProgress(progress: DrillProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function buildWindow(target: number): number[] {
  const start = Math.max(0, target - 2);
  const win: number[] = [];
  for (let i = start; i <= target; i++) win.push(i);
  return win;
}

export function useDrill(sections: Section[]) {
  const [progress, setProgress] = useState<DrillProgress>(loadProgress);
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const [windowIndex, setWindowIndex] = useState(0);
  const [run, setRun] = useState<SectionRun | null>(null);

  const currentSection = useMemo(() => {
    if (run) return sections[run.sectionId];
    return sections[progress.frontier];
  }, [run, progress.frontier, sections]);

  const previousSections = useMemo(() => {
    if (!run || run.sectionId === 0) return [];
    const count = Math.min(run.sectionId, 4);
    const result: Section[] = [];
    for (let i = run.sectionId - count; i < run.sectionId; i++) {
      result.push(sections[i]);
    }
    return result;
  }, [run, sections]);

  const startDrill = useCallback(
    (sectionIndex?: number) => {
      const frontier = sectionIndex ?? progress.frontier;
      if (sectionIndex != null) {
        const newProgress = { frontier };
        setProgress(newProgress);
        saveProgress(newProgress);
      }
      setRecovery(null);
      setWindowIndex(0);
      setRun({ sectionId: frontier, revealed: false });
    },
    [progress],
  );

  const reveal = useCallback(() => {
    if (!run) return;
    setRun({ ...run, revealed: true });
  }, [run]);

  const assess = useCallback(
    (gotIt: boolean) => {
      if (!run) return;
      const maxSection = sections.length - 1;

      if (!recovery) {
        // Normal mode: just the frontier
        if (gotIt) {
          const newFrontier = Math.min(progress.frontier + 1, maxSection);
          const newProgress = { frontier: newFrontier };
          setProgress(newProgress);
          saveProgress(newProgress);
          setRun({ sectionId: newFrontier, revealed: false });
        } else {
          // Enter recovery
          const rec: Recovery = { target: progress.frontier, passesLeft: RECOVERY_PASSES, passesTotal: RECOVERY_PASSES };
          setRecovery(rec);
          const win = buildWindow(progress.frontier);
          setWindowIndex(0);
          setRun({ sectionId: win[0], revealed: false });
        }
      } else {
        // Recovery mode
        const win = buildWindow(recovery.target);
        const nextIdx = windowIndex + 1;

        if (nextIdx >= win.length) {
          // Just assessed the target section
          if (gotIt) {
            const newPassesLeft = recovery.passesLeft - 1;
            if (newPassesLeft === 0) {
              // Recovery complete, advance
              const newFrontier = Math.min(progress.frontier + 1, maxSection);
              const newProgress = { frontier: newFrontier };
              setProgress(newProgress);
              saveProgress(newProgress);
              setRecovery(null);
              setWindowIndex(0);
              setRun({ sectionId: newFrontier, revealed: false });
            } else {
              // Another pass needed
              setRecovery({ ...recovery, passesLeft: newPassesLeft });
              setWindowIndex(0);
              setRun({ sectionId: win[0], revealed: false });
            }
          } else {
            // Failed target, restart this pass
            setWindowIndex(0);
            setRun({ sectionId: win[0], revealed: false });
          }
        } else {
          // Not at target yet, advance through window
          setWindowIndex(nextIdx);
          setRun({ sectionId: win[nextIdx], revealed: false });
        }
      }
    },
    [run, recovery, windowIndex, progress, sections],
  );

  const goHome = useCallback(() => {
    setRun(null);
    setRecovery(null);
  }, []);

  const resetProgress = useCallback(() => {
    const fresh: DrillProgress = { frontier: 0 };
    setProgress(fresh);
    saveProgress(fresh);
    setRecovery(null);
    setWindowIndex(0);
    setRun(null);
  }, []);

  return {
    progress,
    currentSection,
    previousSections,
    run,
    recovery,
    startDrill,
    reveal,
    assess,
    goHome,
    resetProgress,
    totalSections: sections.length,
  };
}
