import { useState, useCallback, useMemo } from "react";
import type { Section } from "../data/heart-sutra";

interface SectionRun {
  sectionId: number;
  revealed: boolean;
}

interface DrillProgress {
  currentSectionIndex: number;
  sectionResults: Record<number, { attempts: number; lastClean: boolean }>;
}

const STORAGE_KEY = "sutras-drill-progress";

function loadProgress(): DrillProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { currentSectionIndex: 0, sectionResults: {} };
}

function saveProgress(progress: DrillProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function buildQueue(currentIdx: number, sectionResults: DrillProgress["sectionResults"]): number[] {
  const queue: number[] = [currentIdx];
  const lastResult = sectionResults[currentIdx];
  if (lastResult && !lastResult.lastClean) {
    queue.push(currentIdx);
  }
  if (currentIdx > 0) queue.push(currentIdx - 1);
  if (currentIdx > 1) queue.push(currentIdx - 2);
  queue.push(currentIdx);
  return queue;
}

export function useDrill(sections: Section[]) {
  const [progress, setProgress] = useState<DrillProgress>(loadProgress);
  const [queueIndex, setQueueIndex] = useState(0);
  const [run, setRun] = useState<SectionRun | null>(null);

  const queue = useMemo(
    () => buildQueue(progress.currentSectionIndex, progress.sectionResults),
    [progress.currentSectionIndex, progress.sectionResults],
  );

  const currentSection = useMemo(() => {
    if (run) return sections[run.sectionId];
    const sectionId = queue[queueIndex] ?? progress.currentSectionIndex;
    return sections[sectionId];
  }, [run, queue, queueIndex, progress.currentSectionIndex, sections]);

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
      const idx = sectionIndex ?? progress.currentSectionIndex;
      const newProgress = sectionIndex != null
        ? { ...progress, currentSectionIndex: sectionIndex }
        : progress;
      if (sectionIndex != null) {
        setProgress(newProgress);
        saveProgress(newProgress);
      }
      setQueueIndex(0);
      const q = buildQueue(idx, newProgress.sectionResults);
      setRun({ sectionId: q[0], revealed: false });
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

      // Update section results
      const newResults = { ...progress.sectionResults };
      const prev = newResults[run.sectionId];
      newResults[run.sectionId] = {
        attempts: (prev?.attempts ?? 0) + 1,
        lastClean: gotIt,
      };

      const nextQueueIndex = queueIndex + 1;

      if (nextQueueIndex >= queue.length) {
        // End of queue — advance if final pass on current section was clean
        const finalPassClean = gotIt && run.sectionId === progress.currentSectionIndex;
        const nextSectionIndex = finalPassClean
          ? Math.min(progress.currentSectionIndex + 1, sections.length - 1)
          : progress.currentSectionIndex;

        const newProgress: DrillProgress = {
          currentSectionIndex: nextSectionIndex,
          sectionResults: newResults,
        };
        setProgress(newProgress);
        saveProgress(newProgress);

        setQueueIndex(0);
        const newQueue = buildQueue(nextSectionIndex, newResults);
        setRun({ sectionId: newQueue[0], revealed: false });
      } else {
        const newProgress: DrillProgress = { ...progress, sectionResults: newResults };
        setProgress(newProgress);
        saveProgress(newProgress);

        setQueueIndex(nextQueueIndex);
        setRun({ sectionId: queue[nextQueueIndex], revealed: false });
      }
    },
    [run, queueIndex, queue, progress, sections],
  );

  const goHome = useCallback(() => {
    setRun(null);
  }, []);

  const resetProgress = useCallback(() => {
    const fresh: DrillProgress = { currentSectionIndex: 0, sectionResults: {} };
    setProgress(fresh);
    saveProgress(fresh);
    setQueueIndex(0);
    setRun(null);
  }, []);

  const isReview = run ? run.sectionId < progress.currentSectionIndex : false;
  const queuePosition = `${queueIndex + 1}/${queue.length}`;

  return {
    progress,
    currentSection,
    previousSections,
    run,
    isReview,
    queuePosition,
    startDrill,
    reveal,
    assess,
    goHome,
    resetProgress,
    totalSections: sections.length,
  };
}
