# Heart Sutra Memorization App (般若心経)

Mobile-first web app for memorizing the Heart Sutra as chanted in Japanese Zen tradition. Progressive chunk reveal with self-assessed recall.

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

- **Data**: `src/data/heart-sutra.ts` — 262-character rufubon Heart Sutra, 30 sections (title + 28 body + mantra)
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

## Data Sources

- mindisbuddha.org — section structure, characters, pinyin, romaji, kana
- andrew-may.com/zendynamics/heart.htm — character types, English glosses
- chinesetolearn.com — character-by-character pinyin with tone marks

## Design Decisions

- Chunk readings stored explicitly (not derived) because compound readings don't decompose cleanly (e.g. 般若 = hannya)
- TTS passes kana (not romaji) to speech engine for better Japanese pronunciation
- Character types (semantic/phonetic/name) enable future color-coding
- Section 0 = full title (摩訶般若波羅蜜多心經), drillable since it's chanted

## Plan

See `plans/v1-plan.md` for the full implementation plan.
