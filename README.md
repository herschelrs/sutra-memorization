# Sutra Memorization App (お經)

Mobile-first web app for memorizing Sino-Japanese sutras as chanted in the Zen tradition. Progressive chunk reveal with self-assessed recall.

## Supported Sutras

- **Heart Sutra** (般若心経 / Hannya Shingyō) — 272 characters, 36 sections

## Data

Each sutra's data lives in `src/data/` as a JSON file with per-character readings (Japanese on'yomi, kana, Mandarin pinyin, English glosses) and chunk-level compound readings for drilling. See `plans/data-compilation.md` for the full schema and compilation process.

### Reading Priority

Readings reflect the **Zen chanting tradition**, which uses go-on (呉音) readings and sometimes differs from standard dictionary on'yomi. For example:

- 五蘊 = ごうん (go un) in chanting, vs ごおん (go on) in some dictionaries
- 菩提 = ぼじ (boji) in the Heart Sutra mantra, vs ぼだい (bodai) elsewhere
- 究竟 = くぎょう (kugyō) in chanting, vs くきょう (kukyō) in dictionaries

Character-level `on`/`kana` fields store whichever reading is actually used in the chanting context.

### Chunk Design

Only compound chunks whose reading diverges from concatenation of character-level readings are stored in JSON. Single-character chunks are generated at runtime. This keeps the data files auditable — you only need to verify the compounds.

Examples of compounds that need explicit chunks:
- 般若 = はんにゃ (hannya) — fixed Sanskrit transliteration
- 波羅蜜多 = はらみった (haramitta) — gemination
- 一切 = いっさい (issai) — gemination
- 心經 = しんぎょう (shingyō) — rendaku

### Sources

- **Zen chanting cards** (IZAUK, All Beings Zen Sangha, temple websites) — authoritative for readings
- **mindisbuddha.org** — structural backbone: section divisions, characters, multi-language readings
- **andrew-may.com/zendynamics/** — character type classification, English glosses
- **chinesetolearn.com** — character-by-character pinyin with tone marks
- **kaikki.org Wiktionary extract** — on'yomi verification (gitignored, not in repo)
