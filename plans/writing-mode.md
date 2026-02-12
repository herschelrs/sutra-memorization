# Writing Mode: Kanji Handwriting Recognition

A study mode where the app shows readings and the user draws each kanji on a canvas. A client-side recognition library checks the drawing against reference stroke patterns. Active recall through motor memory rather than just visual recognition.

## Research and decisions

### Recognition engine: KanjiCanvas

We evaluated several client-side handwriting recognition options:

| Library | Characters | Size | License | Browser? | Notes |
|---------|-----------|------|---------|----------|-------|
| **KanjiCanvas** (asdfjkl) | 2,213 | 6.7MB patterns + 16KB engine | MIT (link-back) | Yes (vanilla JS) | Tolerates wrong stroke order, moment normalization |
| kanjicanvas-reactjs | 2,213 (same data) | 6.1MB bundle | MIT | Yes (React 18 peer dep) | Wraps KanjiCanvas as React component; monolithic CJS bundle prevents code-splitting |
| tecack | 2,127 (fewer than KanjiCanvas) | 23MB dataset | MIT | Yes (TypeScript) | Fork of KanjiCanvas with larger data per char but fewer chars |
| HanziLookupJS | 9,507–10,657 | ~few hundred KB | GPL / LGPL | Yes (JS/WASM) | Chinese stroke order conventions — wrong for Japanese |
| kanjidraw (obfusk) | 6,394 | 1.7MB | AGPL | Partial (Python backend) | KanjiVG-derived, Japanese stroke order, compact format |
| Zinnia | ~3,033 | few MB model | BSD | No (C/C++) | Used by Google Japanese Input; would need WASM port |
| tegaki | varies | varies | GPL | No (Python) | Framework, not self-contained |

**Choice: KanjiCanvas** — MIT license, fully client-side, tolerates stroke order mistakes (important for learners), small engine code. The main limitation is character coverage (joyo kanji only, 2,213 chars), which we address below with KanjiVG pattern generation.

We considered `kanjicanvas-reactjs` (npm wrapper) but rejected it because: React 18 peer dep conflicts with our React 19, and the 6.1MB monolithic CJS bundle can't be code-split for lazy loading. Better to vendor the original two files and control loading ourselves.

### Reference pattern data: KanjiVG + custom generation

KanjiCanvas ships with ~2,213 reference patterns (joyo kanji). This covers most sutra characters but fails on:

1. **Buddhist transliteration characters** — characters used purely for sound when transliterating Sanskrit (菩, 薩, 涅, 槃, 訶, etc.). These are essential to sutra text but outside joyo kanji.
2. **Kyūjitai (traditional forms)** — characters like 經, 觀, 體. KanjiCanvas only has shinjitai. We handle this in the app by accepting shinjitai when `kanjiForm === "simplified"`, but traditional form users hit gaps.

**Coverage analysis against compiled sutras:**

| Source | Unique kanji | Direct match | Via shinjitai | Truly missing |
|--------|-------------|-------------|---------------|---------------|
| Heart Sutra + Four Vows + Repentance | 145 | 108 (74.5%) | +19 (87.6%) | 18 (12.4%) |

The 18 missing characters are mostly Buddhist transliteration: 埵, 揭, 槃, 涅, 耨, 菩, 薩, 藐, 蘊, 訶, 亦, 垢, 竟, 顛, 罣, 懺, 瞋, 礙.

**Coverage analysis against dharani texts** (消災呪, 大悲呪, 仏頂尊勝陀羅尼, 舎利礼):

| Text | Unique kanji | KanjiVG coverage | Missing from KanjiVG |
|------|-------------|-----------------|---------------------|
| 消災呪 | 52 | 43 (82.7%) | 9 |
| 大悲呪 | 89 | 75 (84.3%) | 14 |
| 仏頂尊勝陀羅尼 | 107 | 86 (80.4%) | 21 |
| 舎利礼 | 53 | 53 (100%) | 0 |
| **Aggregate** | **227** | **195 (85.9%)** | **32** |

The 32 characters missing from KanjiVG are overwhelmingly dharani transliteration characters (囉, 哆, 唵, 嚩, etc.) outside JIS X 0208. Two are CJK Extension B (𤚥, 𩕳) which are extremely rare.

Non-dharani texts (舎利礼, and by extension texts like Zazen Wasan, Daito's Admonition) have near-perfect coverage.

**Strategy: Generate custom ref-patterns from KanjiVG + hand-author the remainder.**

- [KanjiVG](https://github.com/KanjiVG/kanjivg) (CC BY-SA 3.0) provides SVG stroke data for ~6,400+ characters (JIS Levels 1+2)
- Convert KanjiVG SVGs → KanjiCanvas ref-pattern format using a build script (see "Pattern generation pipeline" below)
- For the ~32 characters outside KanjiVG, hand-author SVG stroke data and add to a custom supplement directory
- Regenerate ref-patterns.js whenever new characters are needed

### Caching: IndexedDB for the pattern data

The ref-patterns data is ~6.7MB (will grow with more characters). We evaluated caching approaches:

| Approach | Persistence | Complexity |
|----------|------------|------------|
| Browser HTTP cache | Short-lived on GitHub Pages (`max-age=600`); mobile browsers evict aggressively | None |
| Service Worker + Cache API | Reliable | Moderate — adds SW to project |
| **IndexedDB** | Reliable | Low — just IDB get/put in the hook |

**Choice: IndexedDB.** On first use of writing mode, the app loads `kanji-canvas.min.js` (16KB) and `ref-patterns.js` (~6.7MB) via script injection. The parsed pattern array is then stored in IndexedDB using structured clone (handles nested arrays natively). On subsequent visits, patterns load from IndexedDB — no network request for the large file.

## Architecture

### Vendored files

```
public/vendor/kanjicanvas/
  kanji-canvas.min.js    # Recognition engine (~16KB)
  ref-patterns.js        # Reference patterns (generated, ~6.7MB+)
  LICENSE.txt            # MIT license with link-back requirement
```

These are served as static files by Vite and copied to `dist/` on build.

### Pattern generation pipeline

The pattern data is generated from KanjiVG SVG files plus any custom supplements. The pipeline lives in `scripts/` and produces the vendored `ref-patterns.js`.

#### Source data

```
data/kanjivg/            # KanjiVG SVG files (gitignored, cloned from repo)
data/custom-strokes/     # Hand-authored SVGs for characters not in KanjiVG
```

KanjiVG SVG format: each file is named `{unicode_hex}.svg` and contains `<path>` elements with bezier curves (`M`, `C`, `S` commands) in a 109×109 coordinate space, one path per stroke in writing order.

Custom stroke SVGs follow the same format. To add a new character:

1. Create `data/custom-strokes/{unicode_hex}.svg`
2. Draw strokes in correct order as SVG `<path>` elements in a 109×109 viewBox
3. Run the generation script (see below)

#### Conversion process

KanjiCanvas's recognition works on point sequences, not bezier curves. The conversion:

1. **Parse SVG paths** — extract bezier curve commands from each `<path d="...">` element
2. **Sample points** — walk along each bezier curve, sampling points at regular intervals to produce a polyline
3. **Scale coordinates** — map from KanjiVG's 109×109 space to KanjiCanvas's 256×256 space
4. **Moment normalization** — apply the same affine transform KanjiCanvas uses internally (center of mass alignment, variance-based scaling). This is what `read_all.py` in the KanjiCanvas repo does.
5. **Feature extraction** — resample each stroke to points at fixed distance intervals (the `extractFeatures` step with distance=20)
6. **Output** — format as `KanjiCanvas.refPatterns` array entries: `["字", strokeCount, [[[x,y], ...], ...]]`

The KanjiCanvas repo includes `read_all.py` which handles steps 4-6 given XML input. We need to add the SVG→point-sequence conversion (steps 1-3).

#### Generation script

```
scripts/generate-ref-patterns.py
```

Usage:
```bash
# Clone KanjiVG if not already present
git clone https://github.com/KanjiVG/kanjivg.git data/kanjivg

# Generate ref-patterns.js from KanjiVG + custom strokes
python3 scripts/generate-ref-patterns.py \
  --kanjivg data/kanjivg/kanji/ \
  --custom data/custom-strokes/ \
  --output public/vendor/kanjicanvas/ref-patterns.js
```

The script should:
- Process all SVG files from both directories
- Convert bezier paths to point sequences
- Apply moment normalization and feature extraction
- Output the `KanjiCanvas.refPatterns = [...]` JavaScript file
- Report character count and any processing errors

#### Adding characters over time

When compiling a new sutra and finding unrecognizable characters:

1. Check if the character exists in KanjiVG (`data/kanjivg/kanji/{hex}.svg`)
2. If yes: it will be included automatically on next generation
3. If no: create a custom SVG in `data/custom-strokes/{hex}.svg`
   - Use a reference font to trace the strokes
   - One `<path>` per stroke, in correct writing order
   - 109×109 coordinate space to match KanjiVG convention
4. Run `scripts/generate-ref-patterns.py` to regenerate
5. Test recognition in the app

#### Characters requiring custom SVGs (known)

Based on dharani analysis, these 32 characters are not in KanjiVG and will need custom stroke data if/when those sutras are compiled:

**High frequency in dharani (>5 occurrences):**
囉 (U+56C9, 37 occ), 秫 (U+79EB, 13), 哆 (U+54C6, 11), 唎 (U+550E, 11), 誐 (U+8A90, 11), 嚩 (U+56A9, 9), 馱 (U+99B1, 7), 佉 (U+4F49, 5), 吒 (U+5412, 5), 皤 (U+76A4, 5)

**Medium frequency (2-4 occurrences):**
唵 (U+5535, 4), 嚧 (U+56A7, 4), 墀 (U+5880, 4), 姹 (U+59F9, 4), 盋 (U+76CB, 4), 抳 (U+62B3, 3), 柅 (U+67C5, 3), 跢 (U+8DE2, 3), 㗚 (U+35DA, 2), 儞 (U+511E, 2), 呬 (U+546C, 2), 嘇 (U+5607, 2), 埵 (U+57F5, 2), 紇 (U+7D07, 2), 𤚥 (U+246A5, 2), 𩕳 (U+29573, 2)

**Low frequency (1 occurrence):**
咩 (U+54A9), 愣 (U+6123), 曬 (U+66EC), 罽 (U+7F7D), 詵 (U+8A75), 鄔 (U+9114)

Note: 𤚥 and 𩕳 are CJK Extension B characters. They may not render in common fonts and authoring stroke data for them will be challenging. These only appear in 仏頂尊勝陀羅尼.

#### TODO: Audit and fill missing characters in compiled sutras

The generated ref-patterns.js covers 6,700+ characters from KanjiVG, but some characters in already-compiled sutras may still be missing (auto-skipped in writing mode). Need to:

1. Run the app in writing mode against each compiled sutra and note which characters get auto-skipped
2. For characters in KanjiVG but somehow missed: debug the generation pipeline
3. For characters not in KanjiVG: author custom SVGs in `data/custom-strokes/` and regenerate
4. Validate recognition quality for newly added characters

## Writing mode UX

### Per-character drawing flow

Within a section (the drill unit):

1. Show the **chunk reading** (kana or romaji per script setting) with the current character's position highlighted
2. User draws one kanji on a 300×300 canvas
3. Tap **Check** — library returns ranked candidates; auto-check if expected kanji is in the results
4. Show correct kanji + green/red feedback + what was recognized
5. Tap **Next** to advance; canvas clears
6. After all characters: section verdict = all correct → "Got It", any miss → "Missed"

This maps directly onto the existing drill — `useDrill` sees one boolean per section, no algorithm changes needed.

### Handling unrecognizable characters

Characters not in the reference patterns are **auto-passed** — shown briefly with a "not in dataset" indicator, then auto-advance to the next character. This prevents blocking the drill on characters that can't be checked.

The app determines recognizability at runtime from the loaded `KanjiCanvas.refPatterns` array, so as the pattern set grows, previously skipped characters become testable without code changes.

When using `kanjiForm === "simplified"`, the app checks recognition against the shinjitai form (e.g. 経 instead of 經), which expands coverage for kyūjitai-only gaps.

### Layout (mobile-first, within 480px)

- **Reading cue** — chunk reading with current char position indicated
- **Progress dots** — one per character (green ✓ / red ✗ / current ● / skipped ○ / pending ·)
- **Canvas** — 300×300, always white background (ink metaphor, works in dark mode)
- **Feedback area** — recognized candidates + correct answer with color
- **Buttons** — [Undo] [Clear] [Check] when drawing; [Next] after check

### Study mode table (updated)

| Mode | Shows Initially | Reveal Shows | TTS |
|------|----------------|--------------|-----|
| Readings | Nothing | Kanji + romaji/kana | ja-JP |
| Kanji Recognition | Kanji | Reading below | ja-JP |
| Mandarin Readings | Nothing | Kanji + pinyin | zh-CN |
| English Glosses | Kanji | Per-character glosses | Off |
| Line Translation | Full section kanji | English translation | Off |
| **Writing** | **Reading cue** | **Draw → check kanji** | **Off** |

## Implementation

### Files modified

- `src/types.ts` — add `"writing"` to `StudyMode` union
- `src/components/StudySession.tsx` — conditional branch for writing mode (render WritingCanvas instead of chunks-area + ActionButtons)
- `src/components/SettingsPanel.tsx` — add `{ value: "writing", label: "Writing" }` to modes array
- `src/App.tsx` — guard keyboard shortcut handler: early return when `settings.mode === "writing"`
- `src/styles.css` — writing mode styles (`.writing-area`, `.writing-canvas-wrap`, `.writing-feedback`, `.writing-dots`, `.writing-actions`)

### Files created

- `public/vendor/kanjicanvas/kanji-canvas.min.js` — vendored recognition engine
- `public/vendor/kanjicanvas/ref-patterns.js` — vendored reference patterns (initially from upstream; later regenerated from KanjiVG)
- `public/vendor/kanjicanvas/LICENSE.txt` — MIT license text with link-back attribution
- `src/kanjicanvas.d.ts` — ambient type declarations for the `KanjiCanvas` global
- `src/hooks/useKanjiCanvas.ts` — lazy script loading, IndexedDB caching, recognize/erase/undo API
- `src/components/WritingCanvas.tsx` — writing mode UI component

### Future files (pattern generation pipeline)

- `scripts/generate-ref-patterns.py` — KanjiVG SVG → ref-patterns.js converter
- `data/kanjivg/` — cloned KanjiVG repo (gitignored)
- `data/custom-strokes/` — hand-authored SVGs for characters not in KanjiVG

## Attribution

KanjiCanvas is MIT-licensed by Dominik Klein. The license requires that any copyright notice include a hyperlink back to https://github.com/asdfjkl/kanjicanvas. The LICENSE.txt file in the vendor directory satisfies this requirement.

KanjiVG is CC BY-SA 3.0 by Ulrich Apel. When we generate patterns from KanjiVG data, attribution must be maintained. The generated ref-patterns.js should include a comment header noting the KanjiVG source and license.
