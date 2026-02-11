# Sutra Memorization App (お経)

Mobile-first web app for memorizing Sino-Japanese sutras as chanted in the Zen tradition. Progressive chunk reveal with self-assessed recall. Currently supports the Heart Sutra (般若心経); additional sutras to follow.

## Tech Stack

- React 19 + TypeScript + Vite
- Plain CSS (mobile-first)
- localStorage for persistence
- Web Speech API for TTS
- Static deployment (no backend)

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

## Architecture

- **Data**: `src/data/` — one JSON + TS wrapper per sutra. See `heart-sutra.json` / `heart-sutra.ts` for the pattern.
- **Types**: `src/types.ts` — Character, Chunk, Section, StudyMode, DrillState, Settings
- **Hooks**: `src/hooks/` — useDrill (drill queue + advancement), useSettings (localStorage), useTTS (Web Speech API)
- **Components**: `src/components/` — HomeScreen, StudySession, ChunkDisplay, ActionButtons, SettingsPanel, SectionSummary, ProgressBar
- **Styles**: `src/styles.css` — global styles, CJK serif fonts, off-white/dark text palette

## Study Modes

| Mode | Shows Initially | Reveal Shows | TTS |
|------|----------------|--------------|-----|
| Readings (primary) | Nothing | Kanji + romaji/kana | ja-JP |
| Kanji Recognition | Kanji | Reading below | ja-JP |
| Mandarin Readings | Nothing | Kanji + pinyin | zh-CN |
| English Glosses | Kanji | Per-character glosses | Off |
| Line Translation | Full section kanji | English translation | Off |

## Drill Algorithm

Queue pattern: `[current, previous, 2-back, current]`. Advance if final pass is clean (all "Got It"). No SRS — naive user-controlled progression.

## Sutra Data

Each sutra lives in `src/data/` as a JSON file + TS wrapper (Zod validation + `expandChunks()`). The JSON schema and full compilation process are documented in `plans/data-compilation.md`.

### Key principles

- **Chanting tradition > dictionary.** The authoritative standard for readings is the Zen chanting tradition, not generic dictionary on'yomi. Buddhist chanting uses go-on (呉音) readings which often differ from standard on'yomi.
- **Sparse chunks.** Only compound chunks with non-obvious readings are stored in JSON. Single-character chunks are generated at runtime by `expandChunks()`.
- **Cross-reference everything.** No single source is reliable. Every field should be verified against at least two independent sources.
- **Don't trust LLM knowledge for readings.** Use LLMs for fetching/parsing/cross-referencing, not as a source of truth for obscure Buddhist Japanese.

### Data sources

- `data/kaikki.org-dictionary-Japanese.jsonl` — Wiktionary extract (kaikki.org) for verifying on'yomi and compound readings. Gitignored (large file). Query with: `jq 'select(.word == "X")' data/kaikki.org-dictionary-Japanese.jsonl -c`
- `data/kaikki.org-dictionary-Chinese.jsonl` — Wiktionary extract (kaikki.org) for verifying pinyin readings. Gitignored (large file). Query with: `jq 'select(.word == "X")' data/kaikki.org-dictionary-Chinese.jsonl -c`
- **rinnou.net** (臨黄ネット) — Official Rinzai/Obaku network. Has sutra texts with furigana readings (e.g. [懺悔文](https://rinnou.net/story/1684/)). Good Tier 2 source for Rinzai-lineage readings.
- **tenborin.org** (Sangha Tenborin) — Zen temple site with romaji chanting guides.
- See `plans/data-compilation.md` for the full list of web sources and cross-referencing strategy.

## Design Decisions

- Chunk readings stored explicitly (not derived) because compound readings don't decompose cleanly (e.g. 般若 = hannya)
- TTS passes kana (not romaji) to speech engine for better Japanese pronunciation
- Character types (semantic/phonetic/name) enable future color-coding
- Section 0 = full title (if present), drillable since it's chanted. Sutras without a title section start at id 1.

## Issues

- [ ] Compile remaining sutras from Daishuin West sutra book
  - [x] HANNYA SHINGYO 般若心経 — Heart Sutra
  - [x] SHI KU SEI GAN 四弘誓願 — Four Great Vows
  - [x] ZAN GE MON 懺悔文 — Verse of Repentance
  - [ ] SAN KI KAI 三帰戒 — Three Refuges / Precepts
  - [ ] SHO SAI SHU 消災呪 — Disaster-Preventing Dharani
  - [ ] DAI HI SHU 大悲呪 — Great Compassion Dharani
  - [ ] SHA RI RAI 舎利礼 — Homage to the Relics
  - [ ] DAI SE GA KI 大施餓鬼 — ambiguous, ceremony/sequence not a single text
  - [ ] BU CHIN SON SHIN DO RO NI 仏頂尊勝陀羅尼 — Ushnisha Vijaya Dharani
  - [ ] DAI E ZENJI HOTSU GAN MON 大慧禅師発願文 — Daie Zenji's Vow
  - [ ] KOZEN DAITO KOKUSHI YUIKAI 興禅大燈国師遺誡 — Daito Kokushi's Admonition
  - [ ] HAKU IN ZENJI ZAZEN WASAN 白隠禅師坐禅和讃 — Hakuin's Song of Zazen
  - [ ] TEI DAI DEN PO BUSSO MYO GO 定大伝法仏祖名号 — ambiguous, lineage name list
  - [ ] KAN NON GYO 観音経 — Kannon Sutra, long text
  - [ ] BREAKFAST SUTRAS — ambiguous, composite meal chant sequence
  - [ ] LUNCH SUTRAS — ambiguous, composite meal chant sequence

## Plans

- `plans/v1-plan.md` — App implementation plan
- `plans/data-compilation.md` — Sutra data compilation guide (schema, sources, process)
