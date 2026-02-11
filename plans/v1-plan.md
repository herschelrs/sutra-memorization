# Heart Sutra Memorization App - Implementation Plan

## Context

Build a mobile-first web app for memorizing the Heart Sutra (般若心経 / Hannya Shingyō) as chanted in the Japanese Zen tradition. The app progressively reveals chunks of text for self-assessed recall -- not a spaced repetition system, but a structured drilling tool. Prototype quality: no backend, no user accounts, static deployment.

## Tech Stack

**React + TypeScript + Vite**

- React 19 + TypeScript for readable, maintainable component code
- Vite for fast dev server + build (outputs static files)
- Plain CSS (no Tailwind -- small enough app that it's not worth it)
- Data baked into a TypeScript module (`data/heart-sutra.ts`)
- `localStorage` for settings and drill progress
- Web Speech API for Japanese/Mandarin TTS
- Deployable as static build to GitHub Pages / Netlify

## File Structure

```
sutras/
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Top-level routing between screens
│   ├── components/
│   │   ├── HomeScreen.tsx          # Title, begin practice, section selector
│   │   ├── StudySession.tsx        # Core progressive reveal UI
│   │   ├── ChunkDisplay.tsx        # Single chunk: kanji + reading display
│   │   ├── ActionButtons.tsx       # Reveal / Got It / Missed It
│   │   ├── SettingsPanel.tsx       # Overlay with toggles
│   │   ├── SectionSummary.tsx      # End-of-section results
│   │   └── ProgressBar.tsx         # Visual progress indicator
│   ├── data/
│   │   └── heart-sutra.ts          # Heart Sutra data (~800-1200 lines)
│   ├── hooks/
│   │   ├── useDrill.ts             # Drill queue + advancement logic
│   │   ├── useSettings.ts          # localStorage-backed settings
│   │   └── useTTS.ts               # Web Speech API wrapper
│   ├── types.ts                    # Shared TypeScript interfaces
│   └── styles.css                  # Global styles, CJK fonts, mobile-first
├── index.html                      # Vite entry HTML
├── vite.config.ts
├── tsconfig.json
├── package.json
├── CLAUDE.md                       # Project docs + issue tracker
├── plans/
│   └── v1-plan.md                  # Detailed design doc
└── .gitignore
```

## TypeScript Types

```ts
type CharacterType = "semantic" | "phonetic" | "name";

interface Character {
  char: string;              // Traditional/kyūjitai form
  charSimplified: string | null;  // Shinjitai (null if same)
  type: CharacterType;
  ja: { on: string; kana: string };
  zh: { pinyin: string };
  gloss: string | null;      // null for phonetic transliterations
}

interface Chunk {
  start: number;             // Index into section's characters array
  end: number;
  ja: string;                // Romaji reading for this chunk
  jaKana: string;            // Kana reading
  zh: string;                // Pinyin reading
}

interface Section {
  id: number;                // 0 = title, 1-28 = body, 29 = mantra
  characters: Character[];
  chunks: Chunk[];
  translation: string;
  sanskrit?: string;         // Only on mantra section
}

type StudyMode = "readings" | "kanji" | "mandarin" | "glosses" | "translation";

interface DrillState {
  currentSectionIndex: number;
  sectionResults: Record<number, { attempts: number; lastClean: boolean }>;
  mode: StudyMode;
}

interface Settings {
  script: "romaji" | "kana";
  kanjiForm: "traditional" | "simplified";
  ttsEnabled: boolean;
  mode: StudyMode;
}
```

## Data Schema

The Heart Sutra is the Japanese rufubon version (262 characters, 28 sections + mantra), sourced primarily from mindisbuddha.org's multi-language edition, cross-referenced with andrew-may.com (character type classification, English glosses) and chinesetolearn.com (pinyin).

The full title (摩訶般若波羅蜜多心經 / Maka Hannya Haramita Shingyō) is included as **Section 0** and is drillable, since it's part of the chanted text in Zen practice.

English translations for line-by-line mode: compile our own short, literal glosses per line, prioritizing 1:1 mapping to the Chinese over literary quality. Can swap in a published translation later.

Chunk-level readings stored explicitly (not derived) because some compound readings don't decompose cleanly (e.g., 般若 = hannya).

The mantra section has an additional `sanskrit` field: `"gate gate pāragate pārasaṃgate bodhi svāhā"`. Character glosses are null for phonetic transliterations.

Character types enable future color-coding: `semantic` (normal), `phonetic` (Sanskrit sound, e.g. 般若), `name` (proper noun, e.g. 舍利子).

## UI Design

### Screens (React state, no router needed)

1. **HomeScreen** - Title, "Begin Practice" button, section selector, settings gear
2. **StudySession** - Progressive reveal area, action buttons
3. **SettingsPanel** - Overlay with toggles

### Study Session Layout (mobile)
```
+----------------------------------+
| < Section 3/28            [gear] |
+----------------------------------+
|                                  |
|          觀自在菩薩              |  32-40px kanji
|    kan ji zai bo satsu           |  20-24px reading
|                                  |
|          行深般若                |  (next revealed chunk)
|    gyō jin han nya               |
|                                  |
|          · · · ·                 |  (unrevealed)
+----------------------------------+
|        [ Reveal Next ]           |  large touch target
|    [ Missed ]    [ Got It ]      |
+----------------------------------+
```

### Aesthetics
- Off-white background (`#faf8f5`), dark text (`#2c2c2c`)
- CJK serif font: `"Noto Serif CJK JP", "Hiragino Mincho Pro", serif`
- Romaji/pinyin: clean sans-serif
- Subtle, calm -- appropriate for the subject matter
- Min touch target: 48x48px
- Gentle fade-in on reveal

## Study Modes

| Mode | Shows Initially | Reveal Shows | TTS |
|------|----------------|--------------|-----|
| **Readings** (primary) | Nothing | Kanji + romaji/kana | ja-JP |
| **Kanji Recognition** | Kanji | Reading below | ja-JP |
| **Mandarin Readings** | Nothing | Kanji + pinyin | zh-CN |
| **English Glosses** | Kanji | Per-character glosses | Off |
| **Line Translation** | Full section kanji | English translation | Off |

All modes use chunk-level progression except Line Translation which is section-level.

## Drill Algorithm

Naive, user-controlled. No SRS.

**Session queue construction:**
1. Add current section
2. If last attempt had misses, add current section again
3. Add previous section (review)
4. Add 2-back section (review), if applicable
5. Add current section once more (final check)

Pattern: `[current, previous, 2-back, current]`

**Advancement:** If all chunks in the current section are "Got It" on the final pass, advance to the next section. Otherwise, rebuild queue and re-drill.

**User controls:** Jump to any section from home screen. "Review all" mode queues sections 1 through current. "Full recitation" mode: all sections, no assessment, just reveal-and-go.

**State persisted to localStorage:**
```ts
{ currentSectionIndex: 3, sectionResults: { 1: { attempts: 5, lastClean: true }, ... }, mode: "readings" }
```

## TTS Integration (`useTTS` hook)

- Wraps `SpeechSynthesis` API in a React hook
- Fires on chunk reveal in Readings / Kanji Recognition / Mandarin modes
- Passes **kana** (not romaji) to the speech engine for Japanese -- better pronunciation
- Rate: `0.85` (slightly slower for clarity)
- Voice selection: prefer "Google" or "Premium" voices, fall back to first available
- Toggle in settings, graceful degradation if no voice available
- Called directly from click/tap handler (satisfies iOS user-gesture requirement)

## Data Compilation Plan

**Sources cross-referenced:**

| Source | Provides |
|--------|----------|
| mindisbuddha.org | 28-section structure, characters, pinyin, romaji, kana |
| andrew-may.com/zendynamics/heart.htm | Character type classification (phonetic/name/semantic), English glosses |
| chinesetolearn.com | Character-by-character pinyin with tone marks |
| Asian Art Museum PDF | Romaji + English side-by-side |

**Process:** Fetch mindisbuddha.org as structural backbone. Cross-reference other sources for types and glosses. Define chunks manually (2-6 chars at natural reading boundaries). Add chunk-level readings. Identify ~10-15 shinjitai variants. Validate total = 262 characters.

## Implementation Phases

### Phase 1: Project Setup + Data
- `npm create vite` with React + TS template
- Compile `src/data/heart-sutra.ts` (biggest single task)
- Define `src/types.ts`
- Verify: project builds, data imports correctly

### Phase 2: Core Study Flow
- Build `StudySession`, `ChunkDisplay`, `ActionButtons` components
- Build `useDrill` hook (single-section flow first)
- Progressive reveal UI for Readings mode
- Verify: can drill through one section

### Phase 3: Drill Logic + Persistence
- Extend `useDrill` with queue construction + advancement
- Build `useSettings` hook (localStorage persistence)
- Build `HomeScreen` with section selector
- Verify: multi-section drilling with repetition

### Phase 4: TTS + Settings
- Build `useTTS` hook
- Build `SettingsPanel` component (mode, display toggles, TTS)
- Wire TTS into reveal flow
- Verify: TTS speaks on reveal, settings persist

### Phase 5: Remaining Modes
- Kanji Recognition, Mandarin, English Glosses, Line Translation
- Verify: each mode works correctly

### Phase 6: Polish + Deploy
- CSS transitions, typography refinement
- Mobile testing
- CLAUDE.md, .gitignore, deploy to GitHub Pages

## Verification

1. `npm run dev` → app loads in browser
2. Tap "Begin Practice" → enters Readings mode at section 0 (title)
3. Tap "Reveal" → first chunk kanji + romaji appear, TTS speaks (if enabled)
4. Tap "Got It" / "Missed It" → assessment recorded, next reveal available
5. Complete a section → summary shown, drill advances or repeats
6. Toggle settings → display changes (romaji↔kana, old↔new kanji)
7. Switch modes → different content shown/hidden per the mode table above
8. Refresh browser → drill progress restored from localStorage
9. Test on mobile (Chrome Android, Safari iOS) → touch targets work, text readable
10. `npm run build` → static output in `dist/`, deployable anywhere
