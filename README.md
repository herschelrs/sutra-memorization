# Heart Sutra Memorization App (般若心経)

Mobile-first web app for memorizing the Heart Sutra (般若心経 / Hannya Shingyō) as chanted in the Japanese Zen tradition.

## Data Compilation

The sutra data in `src/data/heart-sutra.json` contains 262 characters across 36 sections (title + 34 body + mantra), with per-character readings (Japanese on'yomi, kana, Mandarin pinyin, English glosses) and chunk-level compound readings for drilling.

### Sources

- **mindisbuddha.org** — Primary structural backbone: 28-section division, characters, multi-language readings
- **andrew-may.com/zendynamics/heart.htm** — Character type classification (semantic/phonetic/name), English glosses, romaji readings
- **chinesetolearn.com** — Character-by-character pinyin with tone marks
- **Zen center chanting cards** (IZAUK, All Beings Zen Sangha, etc.) — Cross-reference for chunk-level chanting readings
- **kaikki.org Wiktionary extract** — Character-level on'yomi verification (gitignored, not in repo)

### Reading Priority

Chunk-level readings reflect the **Zen chanting tradition**, which sometimes differs from standard dictionary on'yomi. For example:

- 五蘊 = ごおん (go on) in chanting, vs ごうん (go un) in dictionaries
- 菩提 = ぼじ (boji) in the mantra, vs ぼだい (bodai) elsewhere

Character-level `on`/`kana` fields store whichever reading is actually used in the chanting context, not necessarily the most common dictionary entry.

### Chunk Design

Readings are stored explicitly at the chunk level (not derived from character readings) because many compounds have readings that don't decompose cleanly:

- 般若 = はんにゃ (hannya), not はん+にゃ
- 波羅蜜多 = はらみった (haramitta), not は+ら+み+た
- 即是 = そくぜ (sokize), contracted in chanting
