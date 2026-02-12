# Task: Add custom stroke data for missing kanji and regenerate ref-patterns

Read `CLAUDE.md` and `plans/writing-mode.md` for full project context.

## What this is

The app has a writing mode where users draw kanji and a recognition engine (KanjiCanvas) checks their strokes. The recognition data (`public/vendor/kanjicanvas/ref-patterns.js`) is generated from KanjiVG SVG stroke data (~6,700 characters). Some characters in the sutras aren't in KanjiVG and need custom SVGs.

## What to do

1. **Identify missing characters.** Check `README.md` for known missing characters. You can also run this to extract all unique kanji from a sutra:
   ```bash
   node -e 'const d=require("./src/data/SUTRA.json"); const cs=new Set(); for(const s of Object.values(d)){if(!s||!s.characters)continue; for(const c of s.characters){if(!/[\u3040-\u309F\u30A0-\u30FF\uFF00-\uFF9F]/.test(c.char))cs.add(c.char)}} console.log([...cs].join(""))'
   ```

2. **Author SVG stroke data.** For each missing character, create `data/custom-strokes/{hex_codepoint}.svg`. Get the hex codepoint with: `python3 -c "print(f'{ord(\"揭\"):05x}')"`.

   The SVG format matches KanjiVG. Look at an existing file in `data/kanjivg/kanji/` for reference (e.g. `data/kanjivg/kanji/06368.svg` for 捨). Key requirements:
   - `viewBox="0 0 109 109"` — 109x109 coordinate space
   - One `<path d="...">` per stroke, in correct writing order
   - Path data uses SVG bezier commands (`M`, `C`, `S`, `L`, etc.)
   - Strokes must be in the standard Japanese writing order

   The simplest approach for authoring: find a structurally similar character that IS in KanjiVG, copy its SVG, and modify the paths for the target character's structure. Many missing characters share radicals with existing characters — you can compose stroke data from radical components found in other KanjiVG files.

3. **Regenerate ref-patterns.** After adding custom SVGs:
   ```bash
   # Make sure KanjiVG is cloned (one-time)
   [ -d data/kanjivg ] || git clone --depth 1 https://github.com/KanjiVG/kanjivg.git data/kanjivg

   # Regenerate (full rebuild, ~30s)
   npm run generate-patterns

   # Or regenerate only specific characters (faster for testing)
   python3 scripts/generate-ref-patterns.py \
     --kanjivg data/kanjivg/kanji \
     --custom data/custom-strokes \
     --output public/vendor/kanjicanvas/ref-patterns.js \
     --chars 揭
   ```

4. **Test.** Run `npm run dev`, open the app in writing mode, and draw the character to verify recognition works.

## Currently missing

Check `README.md` Bugs section for the current list. As of writing, 揭 (U+63ED) is the only missing character in compiled sutras (Heart Sutra mantra 揭諦揭諦). The `plans/writing-mode.md` file has a full list of characters that will be needed when dharani texts are compiled.
