/** Ambient types for vendored KanjiCanvas library (https://github.com/asdfjkl/kanjicanvas) */
interface KanjiCanvasLib {
  refPatterns: unknown[];
  init(canvasId: string): void;
  recognize(canvasId: string): string;
  erase(canvasId: string): void;
  deleteLast(canvasId: string): void;
  redraw(canvasId: string): void;
}

declare var KanjiCanvas: KanjiCanvasLib;
