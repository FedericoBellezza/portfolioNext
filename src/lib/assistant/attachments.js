import {
  ASSISTANT_BUCKET,
  ATTACHMENT_FOLDER,
  MAX_ATTACHMENTS_TOTAL_CHARS,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_CHARS,
  isAcceptedFile,
} from "./constants";
import { AssistantError } from "./auth";
import { ExtractionError, extractDocument } from "./extract";

function formatTimestamp(seconds) {
  const m = Math.floor(seconds / 60);
  const s = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${m}:${s}`;
}

function unitsToText(units) {
  return units
    .map((unit) => {
      if (unit.page) return `[pagina ${unit.page}] ${unit.text}`;
      if (unit.ts != null) return `[${formatTimestamp(unit.ts)}] ${unit.text}`;
      return unit.heading ? `## ${unit.heading}\n${unit.text}` : unit.text;
    })
    .join("\n\n");
}

function isOwnAttachmentPath(path, userId) {
  return path.startsWith(`${userId}/${ATTACHMENT_FOLDER}/`) && !path.includes("..");
}

async function readAttachment({ supabase, userId, path, name }) {
  if (!isOwnAttachmentPath(path, userId)) {
    throw new AssistantError(`Allegato "${name}": percorso non valido`, 400);
  }
  if (!isAcceptedFile(name)) throw new AssistantError(`Allegato "${name}": tipo di file non supportato`, 415);

  const { data: blob, error } = await supabase.storage.from(ASSISTANT_BUCKET).download(path);
  if (error || !blob) throw new AssistantError(`Allegato "${name}": file non trovato`, 404);
  if (blob.size > MAX_ATTACHMENT_BYTES) {
    throw new AssistantError(`Allegato "${name}": file troppo grande (massimo 10 MB)`, 413);
  }

  let extracted;
  try {
    extracted = await extractDocument({ buffer: Buffer.from(await blob.arrayBuffer()), fileName: name });
  } catch (cause) {
    const reason = cause instanceof ExtractionError ? cause.message : "lettura non riuscita";
    if (!(cause instanceof ExtractionError)) console.error("[assistant] allegato:", cause);
    throw new AssistantError(`Allegato "${name}": ${reason}`, 422);
  }

  const text = unitsToText(extracted.units);
  if (!text.trim()) throw new AssistantError(`Allegato "${name}": nessun testo estratto`, 422);
  return { name, text };
}

/**
 * Legge gli allegati temporanei dallo Storage, ne estrae il testo e li cancella (anche in caso di errore).
 * Il testo di ogni file è limitato; se il totale supera il tetto, ogni file cede la sua parte.
 * @returns {Promise<Array<{ name: string, text: string, truncated: boolean }>>}
 */
export async function loadAttachments({ supabase, userId, attachments }) {
  if (!attachments.length) return [];

  try {
    const read = await Promise.all(attachments.map((item) => readAttachment({ supabase, userId, ...item })));

    const perFile = Math.min(MAX_ATTACHMENT_CHARS, Math.floor(MAX_ATTACHMENTS_TOTAL_CHARS / read.length));
    return read.map((item) => ({
      name: item.name,
      text: item.text.slice(0, perFile),
      truncated: item.text.length > perFile,
    }));
  } finally {
    const owned = attachments.map((item) => item.path).filter((path) => isOwnAttachmentPath(path, userId));
    const { error } = await supabase.storage.from(ASSISTANT_BUCKET).remove(owned);
    if (error) console.warn("[assistant] pulizia allegati non riuscita:", error.message);
  }
}
