// Chunking per "unità": ogni unità è una pagina/slide, un paragrafo di una sezione
// oppure una finestra temporale di sottotitoli. Le unità vengono accorpate fino a
// una dimensione obiettivo, mantenendo pagina, timestamp e titolo di sezione.

const PROFILES = {
  // Slide e PDF: pagine corte, citazioni precise (p.12 o p.12-14).
  paged: { target: 220, max: 420, overlap: 40 },
  // Word, Markdown, testo.
  text: { target: 350, max: 600, overlap: 60 },
  // Trascrizioni: le finestre sono già ~75 secondi di parlato.
  timed: { target: 320, max: 520, overlap: 0 },
};

// Dentro lo stesso blocco un cambio di titolo spezza il chunk solo se ha già un po' di corpo.
const MIN_WORDS_BEFORE_HEADING_SPLIT = 60;

export function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

export function splitLongText(text, max, overlap) {
  const words = text.split(/\s+/).filter(Boolean);
  const pieces = [];
  const step = Math.max(1, max - overlap);
  for (let i = 0; i < words.length; i += step) {
    pieces.push(words.slice(i, i + max).join(" "));
    if (i + max >= words.length) break;
  }
  return pieces;
}

/**
 * @param {Array<{ text: string, page?: number, ts?: number, heading?: string }>} units
 * @param {"paged" | "text" | "timed"} kind
 */
export function buildChunks(units, kind) {
  const { target, max, overlap } = PROFILES[kind] ?? PROFILES.text;
  const chunks = [];
  let current = null;

  const flush = () => {
    if (current && current.words > 0) {
      chunks.push({
        content: current.parts.join("\n\n"),
        page_start: current.pageStart,
        page_end: current.pageEnd,
        ts_start: current.ts,
        heading: current.heading,
      });
    }
    current = null;
  };

  for (const unit of units) {
    const words = countWords(unit.text);
    if (!words) continue;

    if (words > max) {
      flush();
      for (const piece of splitLongText(unit.text, max, overlap)) {
        chunks.push({
          content: piece,
          page_start: unit.page ?? null,
          page_end: unit.page ?? null,
          ts_start: unit.ts ?? null,
          heading: unit.heading ?? null,
        });
      }
      continue;
    }

    if (current) {
      const headingChanged =
        unit.heading &&
        current.heading &&
        unit.heading !== current.heading &&
        current.words >= MIN_WORDS_BEFORE_HEADING_SPLIT;
      if (current.words >= target || current.words + words > max || headingChanged) flush();
    }

    if (!current) {
      current = {
        parts: [],
        words: 0,
        pageStart: unit.page ?? null,
        pageEnd: unit.page ?? null,
        ts: unit.ts ?? null,
        heading: unit.heading ?? null,
      };
    }

    current.parts.push(unit.text);
    current.words += words;
    if (unit.page != null) current.pageEnd = unit.page;
    if (!current.heading && unit.heading) current.heading = unit.heading;
  }
  flush();

  return chunks.map((chunk, index) => ({ ...chunk, chunk_index: index }));
}

// Il testo che finisce nell'embedding porta con sé corso, file e sezione: aiuta il recupero
// quando la domanda cita il nome del corso o dell'argomento.
export function embeddingInput(chunk, { course, name }) {
  const header = [course, name, chunk.heading].filter(Boolean).join(" · ");
  return `[${header}]\n${chunk.content}`.slice(0, 7000);
}
