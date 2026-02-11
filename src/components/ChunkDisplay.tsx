import type { Chunk, Section } from "../data/heart-sutra";
import type { Settings } from "../types";

interface Props {
  section: Section;
  chunk: Chunk;
  revealed: boolean;
  settings: Settings;
}

export function ChunkDisplay({ section, chunk, revealed, settings }: Props) {
  const chars = section.characters.slice(chunk.start, chunk.end);
  const kanji = chars
    .map((c) =>
      settings.kanjiForm === "simplified" && c.simplified
        ? c.simplified
        : c.char,
    )
    .join("");

  const mode = settings.mode;

  // What to show before reveal
  if (!revealed) {
    if (mode === "kanji" || mode === "glosses" || mode === "translation") {
      return (
        <div className="chunk">
          <div className="chunk-kanji">{kanji}</div>
        </div>
      );
    }
    // readings + mandarin: show nothing (user recalls from memory)
    return null;
  }

  // Revealed content — per-character ruby
  function charReading(c: typeof chars[number]): string {
    if (mode === "mandarin") return c.pinyin;
    if (mode === "glosses") return c.gloss ?? "";
    return settings.script === "kana" ? c.kana : c.on;
  }

  return (
    <div className="chunk">
      <div className="chunk-kanji">
        {chars.map((c, i) => {
          const face = settings.kanjiForm === "simplified" && c.simplified ? c.simplified : c.char;
          const reading = charReading(c);
          const gloss = settings.showGlosses && (mode === "readings" || mode === "mandarin") ? c.gloss : null;
          if (gloss) {
            return (
              <span key={i} className="glossed">
                <ruby>{face}<rt>{reading}</rt></ruby>
                <span className="gloss-under">{gloss}</span>
              </span>
            );
          }
          return <ruby key={i}>{face}<rt>{reading}</rt></ruby>;
        })}
      </div>
    </div>
  );
}
