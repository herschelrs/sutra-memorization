# Sutra Data Compilation Guide

Instructions for generating structured, per-character, multi-language data files for Sino-Japanese sutras chanted in the Zen tradition. The Heart Sutra (`src/data/heart-sutra.json`) was the first; this describes the general process for any sutra.

## The schema

Each sutra is a JSON array of sections. A section is a chantable line or phrase — the natural breathing/phrasing unit in the chanted text.

```jsonc
{
  "id": 1,                    // sequential; 0 = title (if present), body starts at 1
  "translation": "...",       // short literal English translation of the line
  "sanskrit": "...",          // optional; only for dhāraṇī / mantra sections
  "characters": [
    {
      "char": "般",           // traditional/kyūjitai form (1 CJK character)
      "simplified": "...",    // shinjitai form, ONLY if different from char; omit otherwise
      "type": "p",            // "s" = semantic, "p" = phonetic (Sanskrit transliteration), "n" = proper name
      "on": "han",            // on'yomi romaji as used in Zen chanting context
      "kana": "はん",          // kana form of the same reading
      "pinyin": "bō",         // Mandarin pinyin with tone marks
      "gloss": null            // short English gloss, or null for phonetic/name characters
    }
  ],
  "chunks": [
    // ONLY compounds whose reading differs from concatenation of character-level readings.
    // Single-character chunks are auto-generated at runtime by expandChunks() in the TS wrapper.
    {
      "start": 2, "end": 4,   // index range into the section's characters array [start, end)
      "ja": "hannya",          // compound romaji
      "jaKana": "はんにゃ",     // compound kana
      "zh": "bō rě"           // compound pinyin (space-separated per character)
    }
  ]
}
```

### Character type classification

- **`"s"` (semantic):** Characters carrying meaning in Chinese. These get English glosses. The vast majority of characters in most sutras. Examples: 心 (heart), 空 (empty), 不 (not), 無 (without).
- **`"p"` (phonetic):** Characters used purely for sound, transliterating Sanskrit/Pali terms. These get `"gloss": null`. Often appear in clusters. Examples: 般若 (prajñā), 波羅蜜多 (pāramitā), 陀羅尼 (dhāraṇī).
- **`"n"` (name):** Proper nouns — transliterations of Sanskrit names of buddhas, bodhisattvas, places. Also `"gloss": null`. Examples: 舍利子 (Śāriputra), 觀自在 (Avalokiteśvara), 阿彌陀 (Amitābha).

The same character can have different types across sutras or even within a sutra if used in different contexts (e.g. 菩 is `"p"` in 菩薩 = bodhisattva but could be `"n"` if part of a specific bodhisattva's name depending on context). Use the function of the character *in its specific position*.

### Sparse chunk design

The JSON only stores **compound chunks** — multi-character groups whose chanted reading cannot be derived by concatenating the individual characters' `on`/`kana`/`pinyin` fields. At runtime, `expandChunks()` fills all gaps with single-character chunks.

A chunk is needed when any of these apply:
- **Gemination:** 一切 → issai (いっさい), not ichi + sai
- **Rendaku (sequential voicing):** 心經 → shingyō, not shin + kyō
- **Fixed compound reading:** 般若 → hannya (はんにゃ), a set transliteration
- **Non-obvious contraction:** 波羅蜜多 → haramitta (はらみった)

A chunk is NOT needed when the reading is straightforward concatenation: 不生 = fu + shō, 無色 = mu + shiki, etc.

### Shinjitai (simplified) variants

Only populate the `"simplified"` field when the traditional (kyūjitai) form differs from the modern (shinjitai) form. Common pairs across sutras:

| Kyūjitai | Shinjitai | Notes |
|----------|-----------|-------|
| 經 | 経 | sutra |
| 觀 | 観 | contemplate |
| 佛 | 仏 | Buddha |
| 說 | 説 | speak/preach |
| 實 | 実 | real |
| 聲 | 声 | sound/voice |
| 盡 | 尽 | exhaust |
| 淨 | 浄 | pure |
| 增 | 増 | increase |
| 禮 | 礼 | bow/ritual |
| 靈 | 霊 | spirit |
| 願 | 願 | (same) — no variant needed |

Not exhaustive. For each sutra, check every character against a kyūjitai↔shinjitai table.

## Sources and cross-referencing strategy

No single source is reliable on its own. The process is: get a structural backbone from one source, then cross-reference every field against independent sources.

### Source tiers

**Tier 1 — Structural backbone (section divisions + character sequence):**

For any given sutra, look for a web page or document that lays out the full traditional Chinese text with section/line divisions. Good general sources:
- **mindisbuddha.org** — Has multi-language breakdowns for several common sutras (Heart Sutra, Diamond Sutra, etc.). Provides characters, romaji, kana, pinyin.
- **Sacred text repositories** (e.g. CBETA, SAT Daizōkyō) — Canonical Chinese Buddhist texts. Good for the authoritative character sequence but no Japanese readings.
- **Zen center chanting books** — Many Zen centers publish their chanting books online (Sōtō Zen, Rinzai, SFZC, etc.). These give the actual line divisions as chanted.
- Perhaps soto shu, I believe there's also a rinzai org that has some .jp with chanting books etc

The goal: get the full character sequence, confirm the text variant (e.g. rufubon vs. ryakubon for the Heart Sutra), and establish section boundaries.

**Tier 2 — Japanese readings (on'yomi in chanting context):**

- **Zen chanting cards / sheets** — Search for "[sutra name] chanting card" or "お経 読み方". IZAUK, All Beings Zen Sangha, various temple websites publish these with furigana or romaji.
- **Temple websites with furigana** — Engaku-ji, Eiheiji, and other major temples sometimes publish sutras with furigana.
- **andrew-may.com/zendynamics/** — Has detailed breakdowns for the Heart Sutra specifically; may cover others.

The goal: character-level on'yomi and kana *as actually chanted*, not dictionary defaults.

**Tier 3 — Mandarin pinyin:**

- **chinesetolearn.com** — Character-by-character pinyin with tone marks for Buddhist texts.
- **MDBG dictionary** (mdbg.net) — Reliable single-character pinyin lookup.
- **Pleco** or other Chinese dictionary apps.

The goal: correct pinyin with tone diacritics for every character.

**Tier 4 — Verification / edge cases:**

- **kaikki.org Wiktionary extract** (`data/kaikki.org-dictionary-Japanese.jsonl`, gitignored) — Query with `jq 'select(.word == "X")' data/kaikki.org-dictionary-Japanese.jsonl -c`. Good for checking on'yomi of individual characters and known compound readings.
- **Jim Breen's WWWJDIC / EDRDG** — Japanese dictionary with Buddhist terminology.
- **Digital Dictionary of Buddhism** (buddhism-dict.net) — Specialist resource for Sino-Japanese Buddhist terms.

### What to cross-reference and why

| Field | Primary source | Cross-reference against | Why |
|-------|---------------|------------------------|-----|
| Character sequence | CBETA / chanting book | Temple furigana edition | Text variants exist; confirm you have the right one |
| Section divisions | Chanting book / web source | Second chanting source | Different traditions break lines differently |
| `on` / `kana` | Chanting card with furigana | Second chanting source + Wiktionary | Chanting readings often diverge from dictionary |
| `pinyin` | chinesetolearn.com | MDBG | Tone marks are easy to get wrong |
| `type` | Knowledge of Sanskrit Buddhist terms | Cross-ref with glosses | Phonetic chars have null glosses; must be consistent |
| `gloss` | Buddhist dictionary / andrew-may | Digital Dict of Buddhism | Keep glosses short and literal |
| `translation` | Published English translation | Your own literal reading | Prioritize literal over literary |
| Compound chunks | Chanting audio/cards | Wiktionary compound entries | Gemination and rendaku must be empirically verified |

## Step-by-step process for a new sutra

### 1. Choose the text variant

Sino-Japanese sutras often exist in multiple recensions. Identify which variant is chanted in the target tradition. For example, the Heart Sutra has a 262-character rufubon (full) and a shorter ryakubon. The Enmei Jukku Kannon Gyō is always the same 42 characters. Pin this down before starting.

### 2. Get the character sequence and section divisions

Fetch a structural source. Parse or manually extract:
- The complete sequence of traditional Chinese characters
- Where the line/section breaks fall

Output a skeleton JSON with section IDs, character arrays (just `char` fields), and empty chunks.

**Validate:** Count the total characters. Compare against known character counts for this sutra if available.

### 3. Add Japanese readings (on'yomi + kana)

For each character, determine the on'yomi *as used in Zen chanting*. This is the hardest step because:
- Many characters have multiple on'yomi (呉音 go-on, 漢音 kan-on, 唐音 tō-on). Buddhist chanting predominantly uses **go-on** (呉音), the oldest stratum of Sino-Japanese readings.
- Some characters have specialized Buddhist readings that aren't their most common on'yomi (e.g. 行 = gyō not kō, 深 = jin not shin, 蘊 = un not on).
- Some readings are specific to the chanting tradition and won't appear in general dictionaries.

**Process:**
1. Start with a chanting card / furigana source as baseline.
2. For each character, verify the reading makes sense as go-on. If unsure, check the Wiktionary extract.
3. If two chanting sources disagree, investigate further. Look for audio recordings of the chant.
4. Store both romaji (`on`) and kana (`kana`) — they must correspond to each other.

**Common go-on patterns to watch for:**
- Voiced initials: 行 = gyō (not kō), 竟 = gyō (not kyō)
- ン before vowels: 深 = jin (not shin in Buddhist context)
- Short vs long vowels: 蘊 = un (not oun/ōn)

### 4. Add Mandarin pinyin

For each character, add the Mandarin reading with tone marks. Cross-reference against a pinyin-specific source. Pay attention to:
- Characters with multiple Mandarin readings (pick the one used in this Buddhist context)
- Correct tone diacritics (first tone ā, second á, third ǎ, fourth à)

### 5. Classify character types and add glosses

Go through each character and assign `"s"`, `"p"`, or `"n"`. Add English glosses for semantic characters.

**How to identify phonetic sequences:** If a cluster of characters transliterates a Sanskrit/Pali term and the characters' *Chinese meanings* are irrelevant (e.g. 般若 literally means "sort of / like" in Chinese but here it's just a phonetic rendering of prajñā), mark them all as `"p"` with null glosses.

Recurring phonetic terms across many sutras:
- 般若 (prajñā), 波羅蜜多 (pāramitā), 菩薩 (bodhisattva), 菩提 (bodhi)
- 涅槃 (nirvāṇa), 陀羅尼 (dhāraṇī), 三昧 (samādhi)
- 阿耨多羅三藐三菩提 (anuttara-samyak-saṃbodhi)
- 南無 (namo), 娑婆 (sahā), 修多羅 (sūtra)

Recurring names:
- 觀自在 / 觀世音 (Avalokiteśvara), 舍利子 (Śāriputra), 文殊 (Mañjuśrī)
- 阿彌陀 (Amitābha), 釋迦牟尼 (Śākyamuni), 藥師 (Bhaiṣajyaguru)

**Glosses** should be short (1-3 words), literal, and consistent. If the same character appears multiple times, use the same gloss unless the meaning genuinely differs in context.

### 6. Identify compound chunks

Go through each section and find multi-character compounds whose chanting reading diverges from simple concatenation of character readings.

**Systematic approach:**
1. For each section, concatenate all character-level `on` fields with spaces.
2. Compare against the known chanted reading of the full line.
3. Where they don't match, identify the compound and create a chunk.

**Common sources of divergence:**
- **Rendaku:** Second element voices (k→g, t→d, s→z, h→b). E.g. 心經 shin+kyō → shingyō, 三世 san+se → sanze.
- **Gemination:** いち+さい → いっさい (一切), みつ+た → みった (蜜多 in compound).
- **Fixed transliteration compounds:** 般若 = hannya, not han+nya as separate morphemes.
- **Irregular:** Some compounds just have to be looked up.

### 7. Add shinjitai variants

Check every character against a kyūjitai→shinjitai table. Only add `"simplified"` where the forms differ.

### 8. Add English translations

One short, literal English translation per section. Prioritize 1:1 correspondence with the Chinese over literary quality. For dhāraṇī/mantra sections, add a `"sanskrit"` field with the romanized Sanskrit.

### 9. Validate

- [ ] Total character count matches the known length of this sutra
- [ ] Section IDs are sequential starting from 0
- [ ] Every character has all required fields (char, type, on, kana, pinyin, gloss-or-null)
- [ ] No single-character chunks in the JSON (those are auto-generated)
- [ ] Every stored chunk's reading actually differs from concatenation of its characters' readings
- [ ] Chunk start/end ranges are valid indices into their section's characters array
- [ ] Zod schema validation passes when loaded through the TS wrapper
- [ ] Spot-check at least 10 characters' readings against a chanting source
- [ ] Spot-check all pinyin tone marks against a dictionary

## Lessons learned from the Heart Sutra

The Heart Sutra data was compiled by having an LLM cross-reference multiple web sources, then iteratively auditing and fixing errors. Here's what went wrong and what we'd do differently.

**Every source had errors.** mindisbuddha.org had some wrong readings. andrew-may.com had slightly different section divisions. The LLM's "knowledge" of Buddhist on'yomi was sometimes wrong. No shortcut around cross-referencing.

**Chanting tradition ≠ dictionary.** Several readings were initially wrong because the data was populated with standard dictionary on'yomi rather than the go-on / chanting-specific readings. The fix commit (`4b3fe12`) corrected five such errors: 菩提 bodai→boji (in mantra), 罣礙 keige→kege, 究竟 kukyō→kugyō, 等等 tōtō→tōdō, 即是 sokize→soku ze.

**LLMs hallucinate readings.** Do not trust an LLM's built-in "knowledge" of obscure Buddhist Japanese. Always verify against a concrete source. Use LLMs for fetching/parsing/cross-referencing, not as a source of truth.

**Rendaku is empirical.** Whether a compound voices its second element cannot be predicted from rules. It must be verified against chanting sources case by case.

**The sparse-chunk refactor was a huge win.** The original Heart Sutra data stored every character as an explicit chunk (~430 lines of redundant data). Removing obligatory single-character chunks and generating them at runtime cut the file by a third and made auditing far easier — you only need to check the compounds.

**Pinyin tone marks require a dedicated pass.** It's easy to get sloppy when your primary source omits tones or marks them inconsistently.

## The TypeScript wrapper

Each sutra's JSON is imported through a TS module that:
1. Validates the JSON against a Zod schema
2. Runs `expandChunks()` to fill gaps between compound chunks with single-character chunks
3. Exports a typed `Section[]` array

See `src/data/heart-sutra.ts` for the pattern. New sutras should follow the same structure.
