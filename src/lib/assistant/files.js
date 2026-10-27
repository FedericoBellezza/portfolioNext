// Quando l'utente chiede un documento da scaricare, il modello ne racchiude il contenuto tra
// <<<FILE: nome.ext>>> e <<<END FILE>>>. Qui lo si estrae dal testo della risposta e lo si normalizza.
// Non importare nulla di server-only: serve a route e test.

export const FILE_FORMATS = ["pdf", "md", "txt"];

const MAX_FILES = 3;
const MAX_FILE_CHARS = 60000;
const MAX_NAME_CHARS = 80;

// La fine può mancare se il modello si è interrotto: in quel caso il blocco arriva fino in fondo.
const FILE_BLOCK = /<<<FILE:[ \t]*([^>\n]*?)[ \t]*>>>[ \t]*\n?([\s\S]*?)(?:\n?[ \t]*<<<END FILE>>>|$)/g;

// I numeri [F#] puntano a estratti della chat: in un file scaricato non significano niente.
function stripCitations(text) {
  return text.replace(/[ \t]*\[F\d+\]/g, "");
}

function normalizeName(rawName, fallbackIndex) {
  const match = /\.([A-Za-z0-9]+)$/.exec(rawName);
  const ext = match ? match[1].toLowerCase() : "";
  const format = FILE_FORMATS.includes(ext) ? ext : "pdf";
  const base = rawName
    .replace(/\.[A-Za-z0-9]+$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, MAX_NAME_CHARS);
  return { name: `${base || `documento-${fallbackIndex + 1}`}.${format}`, format };
}

/**
 * @param {string} text  risposta del modello
 * @returns {{ text: string, files: Array<{ name: string, format: string, content: string }> }}
 *   `text` è la risposta senza i blocchi file (resta il commento del modello attorno ad essi).
 */
export function parseFiles(text) {
  const source = String(text ?? "");
  const files = [];
  const rest = source.replace(FILE_BLOCK, (_, rawName, body) => {
    const content = stripCitations(body).trim().slice(0, MAX_FILE_CHARS);
    if (content && files.length < MAX_FILES) {
      files.push({ ...normalizeName(rawName.trim(), files.length), content });
    }
    return "";
  });

  if (!files.length) return { text: source, files: [] };

  // Due file con lo stesso nome si sovrascriverebbero a vicenda al download.
  const seen = new Map();
  for (const file of files) {
    const count = seen.get(file.name) ?? 0;
    seen.set(file.name, count + 1);
    if (count) file.name = file.name.replace(/(\.[a-z]+)$/, `-${count + 1}$1`);
  }

  return { text: rest.replace(/\n{3,}/g, "\n\n").trim(), files };
}
