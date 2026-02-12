# Task: Add custom stroke data for missing kanji and regenerate ref-patterns

Read `CLAUDE.md` and `plans/writing-mode.md` for full project context.

## What this is

The app has a writing mode where users draw kanji and a recognition engine (KanjiCanvas) checks their strokes. The recognition data (`public/vendor/kanjicanvas/ref-patterns.js`) is generated from KanjiVG SVG stroke data (~6,700 characters). Some characters in the sutras aren't in KanjiVG and need custom SVGs.

## What to do

1. **Identify missing characters.** Check `README.md` for known missing characters. You can also run this to extract all unique kanji from a sutra:
   ```bash
   node -e 'const d=require("./src/data/SUTRA.json"); const cs=new Set(); for(const s of Object.values(d)){if(!s||!s.characters)continue; for(const c of s.characters){if(!/[\u3040-\u309F\u30A0-\u30FF\uFF00-\uFF9F]/.test(c.char))cs.add(c.char)}} console.log([...cs].join(""))'
   ```

2. **Verify character decomposition from data (not LLM knowledge).** Before composing an SVG, confirm the character's radical/component structure against the kaikki.org dictionary datasets. The Chinese dataset is much richer for this — query the `etymology_templates` field:
   ```bash
   # Chinese dataset has structured Han compound decomposition
   jq 'select(.word == "揭") | {etymology_text, etymology_templates}' \
     data/kaikki.org-dictionary-Chinese.jsonl -c

   # Japanese dataset may also have some info
   jq 'select(.word == "揭")' data/kaikki.org-dictionary-Japanese.jsonl -c
   ```
   The Chinese entry's `etymology_text` gives the decomposition explicitly (e.g. "Phono-semantic compound: semantic 扌 + phonetic 曷") and `etymology_templates` has it in structured form (`Han compound` with `c1`=semantic, `c2`=phonetic). **Do not trust LLM knowledge of character structure** — always verify against the dataset first.

3. **Author SVG stroke data.** For each missing character, create `data/custom-strokes/{hex_codepoint}.svg`. Get the hex codepoint with: `python3 -c "print(f'{ord(\"揭\"):05x}')"`.

   The SVG format matches KanjiVG. Look at an existing file in `data/kanjivg/kanji/` for reference (e.g. `data/kanjivg/kanji/06368.svg` for 捨). Key requirements:
   - `viewBox="0 0 109 109"` — 109x109 coordinate space
   - One `<path d="...">` per stroke, in correct writing order
   - Path data uses SVG bezier commands (`M`, `C`, `S`, `L`, etc.)
   - Strokes must be in the standard Japanese writing order

   The composition approach: find KanjiVG characters that **already use the same component in the same position** (left-right, top-bottom, etc.) so the paths are already scaled and positioned correctly. Don't take a standalone character and try to shrink it — take the component from a character where it's already "squished" into the right role. For example, for 揭 = 扌+ 曷:
   - 扌 from 捨 (06368.svg, strokes 1-3) — already sized for left side of a left-right character
   - 曷 from 竭 (07aed.svg, strokes 6-14) — already sized for right side of a left-right character
   - Both source characters have similar left-right proportions, so the paths combine without coordinate adjustment

   **SVG format notes:**
   - Strip the `kvg:` namespace attributes (e.g. `kvg:element`, `kvg:position`) and the DOCTYPE block — browsers can't render SVGs with undeclared namespace prefixes. The pattern generator only reads `<path d="...">` data anyway.
   - Include stroke number `<text>` elements (copy positions from source files) so the user can verify stroke order visually.
   - Keep `<!-- comments -->` noting which source file each group of strokes came from.

   **This requires visual verification — ask the user to eyeball the result.** Open the SVG in a browser to confirm it looks correct before regenerating patterns. Claude cannot see images and should never commit an SVG without the user confirming it renders correctly.

4. **Regenerate ref-patterns.** After adding custom SVGs:
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

5. **Test.** Run `npm run dev`, open the app in writing mode, and draw the character to verify recognition works.

## Currently missing

Check `README.md` Bugs section for the current list. As of writing, 揭 (U+63ED) is the only missing character in compiled sutras (Heart Sutra mantra 揭諦揭諦). The `plans/writing-mode.md` file has a full list of characters that will be needed when dharani texts are compiled.
