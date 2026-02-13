import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { createHash } from 'crypto'

function refPatternsHash(): string {
  const content = readFileSync('public/vendor/kanjicanvas/ref-patterns.js');
  return createHash('sha256').update(content).digest('hex').slice(0, 12);
}

// https://vite.dev/config/
export default defineConfig({
  base: '/sutra-memorization/',
  plugins: [react()],
  server: { host: true },
  define: {
    __REF_PATTERNS_HASH__: JSON.stringify(refPatternsHash()),
  },
})
