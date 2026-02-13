# お經 — Sutra Memorization

> This entire app was vibe coded. This README was written by Claude.

Mobile-first web app for memorizing Sino-Japanese sutras as chanted in the Zen tradition. Progressive chunk reveal with self-assessed recall.

Currently supports:
- **般若心經** Heart Sutra
- **四弘誓願** Four Great Vows

## Usage

Select a sutra, then work through sections one at a time. Each section shows a recall prompt — tap to reveal the reading, then self-assess. The drill loops back over recent sections to reinforce memory before advancing.

## Data

Each sutra lives in `src/data/` as a JSON file with per-character readings (Japanese on'yomi, kana, Mandarin pinyin, English glosses) and chunk-level compound readings for drilling. Only compounds whose reading diverges from concatenation of character-level readings (gemination, rendaku, fixed transliterations) are stored — single-character chunks are generated at runtime.

The Heart Sutra data was compiled by having an LLM cross-reference multiple web sources, then iteratively auditing and fixing errors. Readings reflect the **Zen chanting tradition** (go-on / 呉音), not generic dictionary on'yomi. Sources included:

- **Zen chanting cards** (IZAUK, All Beings Zen Sangha, temple sites) — authoritative for readings
- **mindisbuddha.org** — structural backbone: section divisions, characters, multi-language readings
- **andrew-may.com/zendynamics/** — character type classification, English glosses
- **chinesetolearn.com** — character-by-character pinyin with tone marks
- **kaikki.org Wiktionary extract** — on'yomi verification

See `plans/data-compilation.md` for the full schema and compilation process for adding new sutras.

## Handwriting Recognition

Writing mode uses [KanjiCanvas](https://github.com/asdfjkl/kanjicanvas) for stroke recognition, with reference patterns generated from [KanjiVG](https://github.com/KanjiVG/kanjivg) (CC BY-SA 3.0, Ulrich Apel). The vendored KanjiCanvas engine lives in `public/vendor/kanjicanvas/`; the `ref-patterns.js` file it needs is generated from SVG stroke data.

To regenerate reference patterns (e.g. after adding custom strokes or updating KanjiVG):

```bash
# One-time: clone KanjiVG into data/ (gitignored)
git clone --depth 1 https://github.com/KanjiVG/kanjivg.git data/kanjivg

# Generate ref-patterns.js (~6,700 characters, ~30s)
npm run generate-patterns

# Or generate only specific characters
python3 scripts/generate-ref-patterns.py \
  --kanjivg data/kanjivg/kanji \
  --custom data/custom-strokes \
  --output public/vendor/kanjicanvas/ref-patterns.js \
  --chars 菩薩涅槃
```

The pipeline (`scripts/generate-ref-patterns.py`) parses SVG paths into Bezier curves, samples dense polylines, scales from KanjiVG's 109x109 coordinate space to 256x256, applies moment normalization matching KanjiCanvas's internal algorithm, then resamples at 20px intervals for feature extraction. Stdlib-only Python 3, no pip dependencies.

Custom stroke overrides go in `data/custom-strokes/` as `{hex-codepoint}.svg` files (same format as KanjiVG). These take priority over KanjiVG when both exist for the same character.

## Development

```bash
npm install
npm run dev      # Start dev server
npm run build    # Production build
```

## Bugs

- [ ] need option to disable glosses in the line being tested


## Roadmap

- [ ] View/review data for a given sutra (to check readings, chunking, etc)
- [ ] react router (so browser back works etc)
- [ ] pwa
- [ ] Complete sutra list from Daishu-in West (see CLAUDE.md)
- [ ] Kanji handwriting mode
  - [x] Writing mode: 揭 (U+63ED) missing from ref-patterns — used in Heart Sutra mantra (揭諦揭諦). Not in KanjiVG; needs custom SVG in `data/custom-strokes/`
- [ ] Redesign home screen: surface modes/features more prominently; writing mode should be its own top-level mode, not a setting
- [ ] Further texts?
  - [ ] Besides sutras, eg. Thousand character classic?
