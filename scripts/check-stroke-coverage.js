#!/usr/bin/env node
// Checks that all kanji in compiled sutra JSONs have stroke data in ref-patterns.js.
// Both kyujitai (traditional) and shinjitai (simplified) forms must be covered,
// since writing mode uses whichever form the user has selected.
// Exit 1 if any are missing. Wired into `npm run build`.

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// 1. Collect all unique non-kana characters from sutra JSONs (both forms)
const dataDir = join(root, "src", "data");
const jsonFiles = readdirSync(dataDir).filter((f) => f.endsWith(".json"));

const requiredChars = new Set();
for (const file of jsonFiles) {
  const sections = JSON.parse(readFileSync(join(dataDir, file), "utf-8"));
  for (const section of sections) {
    if (!section.characters) continue;
    for (const c of section.characters) {
      if (/[\u3040-\u309F\u30A0-\u30FF\uFF00-\uFF9F]/.test(c.char)) continue;
      requiredChars.add(c.char);
      if (c.simplified) requiredChars.add(c.simplified);
    }
  }
}

// 2. Parse ref-patterns.js to extract covered characters
const refPatternsPath = join(root, "public", "vendor", "kanjicanvas", "ref-patterns.js");
const refContent = readFileSync(refPatternsPath, "utf-8");

const covered = new Set();
const charRegex = /^\["(.)",/gm;
let match;
while ((match = charRegex.exec(refContent)) !== null) {
  covered.add(match[1]);
}

// 3. Find missing characters
const missing = [...requiredChars].filter((ch) => !covered.has(ch)).sort();

if (missing.length > 0) {
  console.error(`Stroke coverage check FAILED — ${missing.length} kanji missing from ref-patterns.js:`);
  for (const ch of missing) {
    const cp = ch.codePointAt(0).toString(16).padStart(5, "0");
    console.error(`  ${ch}  (U+${cp.toUpperCase()})`);
  }
  console.error("\nAdd custom SVGs to data/custom-strokes/ and run: npm run generate-patterns");
  process.exit(1);
} else {
  console.log(`Stroke coverage OK — all ${requiredChars.size} kanji (kyujitai + shinjitai) covered in ref-patterns.js`);
}
