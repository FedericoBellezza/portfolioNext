// Report testuale da incollare in una conversazione di sviluppo: chat, filtri attivi e
// documenti caricati. Solo logica client-safe: non importare nulla di server-only qui dentro.
import { FILE_TYPE_LABELS, MODES, formatBytes } from "./constants";

const STATUS_LABELS = {
  pending: "in attesa",
  processing: "in elaborazione",
  ready: "pronto",
  error: "errore",
};

function modeLabel(modeId) {
  return MODES.find((item) => item.id === modeId)?.label ?? modeId;
}

function formatDocuments(documents) {
  if (!documents.length) return "(nessun documento caricato)";

  const byCourse = new Map();
  for (const doc of documents) {
    if (!byCourse.has(doc.course)) byCourse.set(doc.course, []);
    byCourse.get(doc.course).push(doc);
  }

  return [...byCourse.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([course, docs]) => {
      const lines = docs.map((doc) => {
        const details = [
          FILE_TYPE_LABELS[doc.file_type] ?? doc.file_type,
          doc.page_count ? `${doc.page_count} pag.` : null,
          formatBytes(doc.file_size) || null,
          `stato: ${STATUS_LABELS[doc.status] ?? doc.status}`,
        ].filter(Boolean);
        const error = doc.status === "error" && doc.error_msg ? ` — ${doc.error_msg}` : "";
        return `- ${doc.name} (${details.join(", ")})${error}`;
      });
      return `Corso "${course}":\n${lines.join("\n")}`;
    })
    .join("\n\n");
}

function formatSource(source) {
  const where = [source.course, source.name, source.place].filter(Boolean).join(" · ");
  return `F${source.n} ${where}`;
}

function formatMessage(message) {
  if (message.role === "user") return `### Utente\n${message.content}`;

  const label = message.error ? "Assistente [ERRORE]" : `Assistente (${modeLabel(message.mode)})`;
  const parts = [`### ${label}`, message.content];
  if (message.truncated) parts.push("(estratti limitati per dimensione)");
  if (message.sources?.length) {
    parts.push(`Passaggi dati al modello:\n${message.sources.map((source) => `- ${formatSource(source)}`).join("\n")}`);
  } else if (!message.error) {
    parts.push("Passaggi dati al modello: nessuno");
  }
  return parts.join("\n\n");
}

/**
 * @param {object} input
 * @param {Array} input.messages    messaggi della chat così come li tiene AssistantClient
 * @param {Array} input.documents   tutti i documenti dell'utente (anche non pronti)
 * @param {object} input.filters    { mode, course, documentName, pageFrom, pageTo, count }
 */
export function buildBugReport({ messages, documents, filters }) {
  const when = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });

  const activeFilters = [
    `Modalità: ${modeLabel(filters.mode)}`,
    `Corso: ${filters.course || "tutti i corsi"}`,
    `Documento: ${filters.documentName || "tutti i documenti"}`,
    filters.pageFrom || filters.pageTo ? `Pagine: ${filters.pageFrom || "…"}-${filters.pageTo || "…"}` : null,
    filters.count ? `Quantità: ${filters.count}` : null,
  ].filter(Boolean);

  const chat = messages.length ? messages.map(formatMessage).join("\n\n") : "(nessun messaggio)";

  return [
    "# Bug report — Assistente di studio",
    `Data: ${when}`,
    "Problema: (descrivi cosa non va)",
    `## Filtri attivi\n${activeFilters.join("\n")}`,
    `## Documenti caricati\n${formatDocuments(documents)}`,
    `## Chat\n${chat}`,
  ].join("\n\n");
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Contesto non sicuro o permesso negato: ripiego su un textarea temporaneo.
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      document.body.removeChild(area);
    }
  }
}
