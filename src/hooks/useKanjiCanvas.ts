import { useState, useEffect, useCallback } from "react";

const DB_NAME = "kanjicanvas";
const DB_VERSION = 1;
const STORE_NAME = "data";
const PATTERNS_KEY = "refPatterns";

const BASE = import.meta.env.BASE_URL;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

let loadPromise: Promise<void> | null = null;
let recognizableSet: Set<string> | null = null;
let strokeCountMap: Map<string, number> | null = null;

async function loadAll(): Promise<void> {
  // Load the small engine script
  await loadScript(`${BASE}vendor/kanjicanvas/kanji-canvas.min.js`);

  // Try IndexedDB cache for the large patterns data
  try {
    const db = await openDB();
    const cached = await idbGet(db, PATTERNS_KEY);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      KanjiCanvas.refPatterns = cached;
      buildRecognizableSet();
      return;
    }
  } catch {
    // IndexedDB unavailable — fall through to script load
  }

  // Load patterns from network
  await loadScript(`${BASE}vendor/kanjicanvas/ref-patterns.js`);

  // Cache for next time
  try {
    const db = await openDB();
    await idbPut(db, PATTERNS_KEY, KanjiCanvas.refPatterns);
  } catch {
    // Cache write failed — non-fatal
  }

  buildRecognizableSet();
}

function buildRecognizableSet() {
  recognizableSet = new Set<string>();
  strokeCountMap = new Map<string, number>();
  for (const entry of KanjiCanvas.refPatterns) {
    if (Array.isArray(entry) && typeof entry[0] === "string") {
      recognizableSet.add(entry[0]);
      if (typeof entry[1] === "number") {
        strokeCountMap.set(entry[0], entry[1]);
      }
    }
  }
}

/** Check if a character can be recognized by the loaded patterns. */
export function canRecognize(char: string): boolean {
  return recognizableSet?.has(char) ?? false;
}

/** Get expected stroke count for a character, or null if unknown. */
export function getExpectedStrokes(char: string): number | null {
  return strokeCountMap?.get(char) ?? null;
}

export function useKanjiCanvas(canvasId: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!loadPromise) loadPromise = loadAll();
    loadPromise
      .then(() => {
        KanjiCanvas.init(canvasId);
        setIsLoaded(true);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setIsLoading(false);
      });
  }, [canvasId]);

  const recognize = useCallback((): string[] => {
    if (!isLoaded) return [];
    const raw = KanjiCanvas.recognize(canvasId);
    if (!raw) return [];
    return raw.split(/\s+/).filter(Boolean);
  }, [canvasId, isLoaded]);

  const erase = useCallback(() => {
    if (isLoaded) KanjiCanvas.erase(canvasId);
  }, [canvasId, isLoaded]);

  const deleteLast = useCallback(() => {
    if (isLoaded) KanjiCanvas.deleteLast(canvasId);
  }, [canvasId, isLoaded]);

  const getStrokeCount = useCallback((): number => {
    if (!isLoaded) return 0;
    const pattern = (KanjiCanvas as any)[`recordedPattern_${canvasId}`];
    return Array.isArray(pattern) ? pattern.length : 0;
  }, [canvasId, isLoaded]);

  return { isLoaded, isLoading, error, recognize, erase, deleteLast, getStrokeCount };
}
