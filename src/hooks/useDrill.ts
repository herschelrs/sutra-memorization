import { useState, useCallback, useMemo } from "react";
import type { Section } from "../data/schema";

interface SectionRun {
  sectionId: number;
  revealed: boolean;
}

export interface Recovery {
  target: number;
  passesLeft: number;
  passesTotal: number;
}

export interface DrillProgress {
  frontier: number;
}

const RECOVERY_PASSES = 3;

function storageKey(sutraKey: string) {
  return `sutras-drill-${sutraKey}`;
}

function writingStorageKey(sutraKey: string) {
  return `sutras-writing-${sutraKey}`;
}

export function loadWritingProgress(sutraKey: string): number[] {
  try {
    const raw = localStorage.getItem(writingStorageKey(sutraKey));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export function saveWritingProgress(sutraKey: string, completed: number[]) {
  localStorage.setItem(writingStorageKey(sutraKey), JSON.stringify(completed));
}

export function loadProgress(sutraKey: string): DrillProgress {
  try {
    const raw = localStorage.getItem(storageKey(sutraKey));
    if (raw) {
      const parsed = JSON.parse(raw);
      if ("currentSectionIndex" in parsed) return { frontier: parsed.currentSectionIndex };
      return parsed;
    }
    // migrate from old shared key (pre-multi-sutra)
    if (sutraKey === "heart-sutra") {
      const old = localStorage.getItem("sutras-drill-progress");
      if (old) {
        const parsed = JSON.parse(old);
        const progress = "currentSectionIndex" in parsed
          ? { frontier: parsed.currentSectionIndex }
          : parsed as DrillProgress;
        localStorage.setItem(storageKey(sutraKey), JSON.stringify(progress));
        localStorage.removeItem("sutras-drill-progress");
        return progress;
      }
    }
  } catch {
    // ignore
  }
  return { frontier: 0 };
}

function saveProgress(sutraKey: string, progress: DrillProgress) {
  localStorage.setItem(storageKey(sutraKey), JSON.stringify(progress));
}

function buildWindow(target: number): number[] {
  const start = Math.max(0, target - 2);
  const win: number[] = [];
  for (let i = start; i <= target; i++) win.push(i);
  return win;
}

export function useDrill(sections: Section[], sutraKey: string) {
  const [progress, setProgress] = useState<DrillProgress>(() => loadProgress(sutraKey));
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
            saveProgress(sutraKey, newProgress);
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
                saveProgress(sutraKey, newProgress);
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
    saveProgress(sutraKey, fresh);
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
