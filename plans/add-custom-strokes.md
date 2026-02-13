# Task: Add custom stroke data for missing kanji and regenerate ref-patterns

Read `CLAUDE.md` and `plans/writing-mode.md` for full project context.

## What this is

The app has a writing mode where users draw kanji and a recognition engine (KanjiCanvas) checks their strokes. The recognition data (`public/vendor/kanjicanvas/ref-patterns.js`) is generated from KanjiVG SVG stroke data (~6,700 characters). Some characters in the sutras aren't in KanjiVG and need custom SVGs.

## What to do

1. **Identify missing characters.** Check `README.md` for known missing characters. You can also run this to extract all unique kanji from a sutra:
   ```bash
   node -e 'const d=require("./src/data/SUTRA.json"); const cs=new Set(); for(const s of Object.values(d)){if(!s||!s.characters)continue; for(const c of s.characters){if(!/[\u3040-\u309F\u30A0-\u30FF\uFF00-\uFF9F]/.test(c.char))cs.add(c.char)}} console.log([...cs].join(""))'
   ```

2. **Verify character decomposition from data (not LLM knowledge).** Before composing an SVG, confirm the character's radical/component structure against the kaikki.org dictionary datasets. The **Chinese** dataset is the authoritative source for decomposition — use it over the Japanese dataset or shinjitai analysis. Kyujitai forms are the original Chinese characters; shinjitai simplifications may have changed the component structure (e.g. 曾→曽 in 增→増). Always decompose from the kyujitai form's own etymology, not by diff from the shinjitai. Query the `etymology_templates` field:
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

   **KanjiVG stroke order is authoritative.** KanjiVG's stroke order occasionally differs from other references (e.g. Wiktionary). For example, KanjiVG has 虍 strokes 3-4 as ㇒ then ㇖, while Wiktionary's 虍 entry shows ㇖ then ㇒. Always defer to KanjiVG's order — the recognition engine's ref-patterns are all generated from KanjiVG, so using a different stroke order for custom characters would cause inconsistent recognition behavior against all other characters sharing the same radical.

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

## Kyujitai vs shinjitai

The build requires stroke data for **both** kyujitai and shinjitai forms of every sutra character (`npm run check-strokes`). Three categories:

1. **Stroke-identical pairs** (e.g. 說/説, 虛/虚): Same components, same stroke sequence. The kyujitai SVG can reuse the shinjitai's paths — the difference is purely a Unicode/glyph variant. The recognizer will match either way.

2. **Structurally different pairs** (e.g. 增/増): The kyujitai has a different component (曾 vs 曽) with different stroke count/sequence. These need genuinely different SVGs composed from the kyujitai's own components.

3. **Kyujitai-only characters** (e.g. 揭): No shinjitai equivalent — just needs a standard custom SVG.

When composing kyujitai SVGs, always decompose from the Chinese dataset etymology (which describes the original/traditional form), not by diffing against the shinjitai.

### 曾 vs 曽 top stroke ambiguity

The top two strokes of 曾 (traditional) vary by regional convention:
- **Kangxi / Japanese kyujitai / Korean**: 八 (outward-spreading), per Wiktionary: "When used in Korea or as a Japanese kyūjitai character, the upper component is 八 instead of 丷, which is also the historical form found in the Kangxi dictionary."
- **Modern Chinese**: 丷 (inward-converging, same as shinjitai 曽)

We use 八 for the kyujitai custom stroke SVG (增, U+589E) since it's the historical/Kangxi form and this is a Japanese kyujitai context. However, most modern fonts (including the user's system font) may render 曾 with 丷. The recognizer is tolerant enough that either form should be accepted in practice.

## Currently missing

Check `README.md` Bugs section for the current list. The `plans/writing-mode.md` file has a full list of characters that will be needed when dharani texts are compiled.
