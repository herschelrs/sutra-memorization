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

## Development

```bash
npm install
npm run dev      # Start dev server
npm run build    # Production build
```

## Roadmap

- [ ] View/review data for a given sutra (to check readings, chunking, etc)
- [ ] Complete sutra list from Daishu-in West (see CLAUDE.md)
- [ ] Kanji handwriting mode
- [ ] Further texts?
  - [ ] Besides sutras, eg. Thousand character classic?
