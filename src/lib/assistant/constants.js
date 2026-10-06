// Costanti condivise tra client e server: non importare nulla di server-only qui dentro.

export const ASSISTANT_BUCKET = "assistant-files";

// Limite del piano Storage free di Supabase.
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

// Un PDF scansionato viene trascritto con la vision di OpenAI in una sola chiamata:
// oltre questo numero di pagine l'output non ci sta e il documento viene rifiutato.
export const MAX_OCR_PAGES = 20;

export const ACCEPTED_EXTENSIONS = [
  "pdf",
  "pptx",
  "docx",
  "txt",
  "md",
  "srt",
  "vtt",
  "png",
  "jpg",
  "jpeg",
  "webp",
];

export const FILE_TYPE_LABELS = {
  pdf: "PDF",
  pptx: "Slide",
  docx: "Word",
  txt: "Testo",
  md: "Markdown",
  srt: "Sottotitoli",
  vtt: "Sottotitoli",
  png: "Immagine",
  jpg: "Immagine",
  jpeg: "Immagine",
  webp: "Immagine",
};

export const MODES = [
  { id: "ask", label: "Domanda", hint: "Risponde dai tuoi materiali, con le fonti" },
  { id: "summary", label: "Riassunto", hint: "Riassunto strutturato di un argomento o di un documento" },
  { id: "quiz", label: "Quiz", hint: "Domande d'esame con soluzioni commentate" },
  { id: "flashcards", label: "Flashcard", hint: "Schede domanda/risposta da importare in Anki" },
  { id: "plan", label: "Piano di ripasso", hint: "Piano di studio basato sui materiali caricati" },
];

export const MAX_MESSAGE_CHARS = 4000;

export const DOCUMENT_COLUMNS =
  "id, course, name, file_path, file_type, file_size, page_count, status, error_msg, created_at";

// Colonne aggiunte dalla migrazione 0002 (analisi delle figure).
export const DOCUMENT_VISUAL_COLUMNS = "visual_status, visual_total, visual_done, visual_error";

// Analisi delle figure: un modello vision descrive grafici e schemi che il testo estratto non contiene.
// Le pagine con meno parole di così sono "da slide" e potrebbero contenere una figura.
export const VISUAL_MAX_WORDS = 150;
// Tetto per documento: oltre, si analizzano prima le pagine con immagini incorporate.
export const MAX_VISUAL_ITEMS = 150;
// Elementi analizzati per richiesta (resta sotto il limite di 60 secondi della route).
export const VISUAL_BATCH_SIZE = 8;
// Le immagini incorporate nei PPTX più piccole sono icone e decorazioni, le più grandi pesano troppo.
export const MIN_FIGURE_BYTES = 10 * 1024;
export const MAX_FIGURE_BYTES = 8 * 1024 * 1024;
// Un'immagine usata in così tante slide è un logo o uno sfondo, non una figura.
export const MAX_FIGURE_REUSE = 2;

export function getExtension(fileName) {
  const match = /\.([A-Za-z0-9]+)$/.exec(String(fileName ?? ""));
  return match ? match[1].toLowerCase() : "";
}

export function isAcceptedFile(fileName) {
  return ACCEPTED_EXTENSIONS.includes(getExtension(fileName));
}

// Le chiavi di Supabase Storage non accettano accenti e simboli: il nome originale
// resta nella colonna "name", qui serve solo una chiave sicura.
export function sanitizeFileName(fileName) {
  const ext = getExtension(fileName);
  const base = String(fileName ?? "file")
    .replace(/\.[A-Za-z0-9]+$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return `${base || "file"}${ext ? `.${ext}` : ""}`;
}

export function formatBytes(bytes) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
