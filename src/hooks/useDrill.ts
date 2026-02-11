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
  const [rewindKey, setRewindKey] = useState(0);
  const [rewindType, setRewindType] = useState<"fail" | "success">("fail");

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
    (startFrom?: number) => {
      const section = startFrom ?? 0;
      setRecovery(null);
      setWindowIndex(0);
      setRun({ sectionId: section, revealed: false });
    },
    [],
  );

  const reveal = useCallback(() => {
    if (!run) return;
    setRun({ ...run, revealed: true });
  }, [run]);

  const assess = useCallback(
    (gotIt: boolean) => {
      if (!run) return;

      if (!recovery) {
        // Normal mode: advance through sections
        if (gotIt) {
          const nextSection = run.sectionId + 1;
          if (nextSection >= sections.length) {
            setRun(null);
            return;
          }
          if (nextSection > progress.frontier) {
            const newProgress = { frontier: nextSection };
            setProgress(newProgress);
            saveProgress(newProgress);
          }
          setRun({ sectionId: nextSection, revealed: false });
        } else {
          // Enter recovery for current section
          const rec: Recovery = { target: run.sectionId, passesLeft: RECOVERY_PASSES, passesTotal: RECOVERY_PASSES };
          setRecovery(rec);
          const win = buildWindow(run.sectionId);
          setWindowIndex(0);
          setRewindType("fail");
          setRewindKey((k) => k + 1);
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
              // Recovery complete, advance past target
              const nextSection = recovery.target + 1;
              if (nextSection >= sections.length) {
                setRecovery(null);
                setRun(null);
                return;
              }
              if (nextSection > progress.frontier) {
                const newProgress = { frontier: nextSection };
                setProgress(newProgress);
                saveProgress(newProgress);
              }
              setRecovery(null);
              setWindowIndex(0);
              setRun({ sectionId: nextSection, revealed: false });
            } else {
              // Another pass needed
              setRecovery({ ...recovery, passesLeft: newPassesLeft });
              setWindowIndex(0);
              setRewindType("success");
              setRewindKey((k) => k + 1);
              setRun({ sectionId: win[0], revealed: false });
            }
          } else {
            // Failed target, reset recovery completely
            setRecovery({ ...recovery, passesLeft: RECOVERY_PASSES });
            setWindowIndex(0);
            setRewindType("fail");
            setRewindKey((k) => k + 1);
            setRun({ sectionId: win[0], revealed: false });
          }
        } else if (gotIt) {
          // Not at target yet, advance through window
          setWindowIndex(nextIdx);
          setRun({ sectionId: win[nextIdx], revealed: false });
        } else {
          // Failed a non-target section — start new recovery for it
          const newTarget = win[windowIndex];
          const rec: Recovery = { target: newTarget, passesLeft: RECOVERY_PASSES, passesTotal: RECOVERY_PASSES };
          setRecovery(rec);
          const newWin = buildWindow(newTarget);
          setWindowIndex(0);
          setRewindType("fail");
          setRewindKey((k) => k + 1);
          setRun({ sectionId: newWin[0], revealed: false });
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
    rewindKey,
    rewindType,
    startDrill,
    reveal,
    assess,
    goHome,
    resetProgress,
    totalSections: sections.length,
  };
}
