import { embedQuery, toVectorLiteral } from "./embed";
import { FILE_TYPE_LABELS } from "./constants";

// Parole troppo comuni per fare da chiave di ricerca full-text. La configurazione
// 'italian' di Postgres ne scarta già molte: questa lista serve a tenere corta la query.
const STOPWORDS = new Set(
  (
    "come cosa quale quali quando dove perche perché chi che con per tra fra una uno gli del dei nel dal sul " +
    "della delle degli dello dalla dalle dagli nella nelle negli sulla sulle sugli alla alle agli allo " +
    "questo questa questi queste quello quella quelli quelle sono sei hai hanno essere fare faccio fammi " +
    "spiegami spiega dimmi parlami puoi puo può vorrei voglio dammi anche molto piu più solo tutto tutti " +
    "mio mia tuo tua suo sua loro nei dai sui non ogni altro altra altri altre"
  ).split(" "),
);

const RRF_K = 60;
const CANDIDATES = 20;

export function extractTerms(query) {
  const words = query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [];
  const terms = [];
  for (const word of words) {
    if (STOPWORDS.has(word) || terms.includes(word)) continue;
    terms.push(word);
    if (terms.length >= 12) break;
  }
  return terms;
}

// Reciprocal Rank Fusion: combina il ranking vettoriale e quello full-text senza dover
// confrontare punteggi di scale diverse.
function fuse(lists) {
  const scores = new Map();
  const rows = new Map();
  for (const list of lists) {
    list.forEach((row, rank) => {
      scores.set(row.id, (scores.get(row.id) ?? 0) + 1 / (RRF_K + rank + 1));
      if (!rows.has(row.id)) rows.set(row.id, row);
    });
  }
  return [...rows.values()].sort((a, b) => scores.get(b.id) - scores.get(a.id));
}

function formatTimestamp(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// "p.12", "p.12-14", "slide 3", "04:35"
export function locationLabel({ pageStart, pageEnd, tsStart, fileType }) {
  if (pageStart != null) {
    const unit = fileType === "pptx" ? "slide" : "p.";
    const sep = unit === "slide" ? " " : "";
    return pageEnd != null && pageEnd !== pageStart
      ? `${unit}${sep}${pageStart}-${pageEnd}`
      : `${unit}${sep}${pageStart}`;
  }
  if (tsStart != null) return formatTimestamp(tsStart);
  return "";
}

const MAX_SECTION_LABEL = 60;

/**
 * Dove si trova un passaggio nel suo file, in forma breve. Pagina, slide o minuto quando ci sono;
 * per i file senza pagine (Markdown, Word) il titolo della sezione, altrimenti i passaggi di uno
 * stesso file apparirebbero tutti identici. I passaggi "Figura N" sono descrizioni automatiche di
 * grafici e schemi: si segnalano come tali.
 */
export function placeLabel({ pageStart, pageEnd, tsStart, fileType, heading }) {
  const location = locationLabel({ pageStart, pageEnd, tsStart, fileType });
  const isFigure = String(heading ?? "").startsWith("Figura");
  const title = String(heading ?? "").trim();
  const section =
    !location && title && !isFigure
      ? title.length > MAX_SECTION_LABEL
        ? `${title.slice(0, MAX_SECTION_LABEL - 1).trimEnd()}…`
        : title
      : "";
  return [location || section, isFigure ? "figura" : ""].filter(Boolean).join(" · ");
}

async function attachDocuments(supabase, rows) {
  const ids = [...new Set(rows.map((row) => row.document_id))];
  if (!ids.length) return [];

  const { data: documents, error } = await supabase
    .from("assistant_documents")
    .select("id, name, course, file_path, file_type")
    .in("id", ids);
  if (error) throw new Error(`Lettura documenti: ${error.message}`);
  const byId = new Map(documents.map((doc) => [doc.id, doc]));

  return rows
    .filter((row) => byId.has(row.document_id))
    .map((row) => {
      const doc = byId.get(row.document_id);
      const place = placeLabel({
        pageStart: row.page_start,
        pageEnd: row.page_end,
        tsStart: row.ts_start,
        fileType: doc.file_type,
        heading: row.heading,
      });
      return {
        chunkId: row.id,
        documentId: doc.id,
        name: doc.name,
        course: doc.course,
        filePath: doc.file_path,
        fileType: doc.file_type,
        fileTypeLabel: FILE_TYPE_LABELS[doc.file_type] ?? doc.file_type,
        page: row.page_start,
        place,
        heading: row.heading,
        content: row.content,
      };
    });
}

// Applica il tetto di caratteri e numera le fonti: F1, F2, ...
function takeWithinBudget(passages, { limit, charBudget }) {
  const taken = [];
  let used = 0;
  let truncated = false;
  for (const passage of passages) {
    if (taken.length >= limit || used + passage.content.length > charBudget) {
      truncated = true;
      break;
    }
    used += passage.content.length;
    taken.push({ ...passage, n: taken.length + 1 });
  }
  return { passages: taken, truncated };
}

/**
 * Ricerca ibrida (vettori + full-text italiano) con filtri opzionali su corso e documento.
 */
export async function searchPassages({ supabase, query, course, documentId, limit = 8, charBudget = 60000 }) {
  const embedding = await embedQuery(query);
  const terms = extractTerms(query);
  const filters = { p_course: course || null, p_document_id: documentId || null };

  const [vector, fulltext] = await Promise.all([
    supabase.rpc("assistant_search", {
      query_embedding: toVectorLiteral(embedding),
      match_count: CANDIDATES,
      similarity_threshold: 0.2,
      ...filters,
    }),
    terms.length
      ? supabase.rpc("assistant_search_fts", { p_terms: terms, match_count: CANDIDATES, ...filters })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (vector.error) throw new Error(`Ricerca vettoriale: ${vector.error.message}`);
  if (fulltext.error) throw new Error(`Ricerca full-text: ${fulltext.error.message}`);

  const fused = fuse([vector.data ?? [], fulltext.data ?? []]);
  const passages = await attachDocuments(supabase, fused.slice(0, limit * 2));
  return takeWithinBudget(passages, { limit, charBudget });
}

/**
 * Per riassunti e quiz su un documento scelto: i chunk in ordine, non i più simili.
 */
export async function loadDocumentPassages({ supabase, documentId, pageFrom, pageTo, charBudget = 60000 }) {
  let query = supabase
    .from("assistant_chunks")
    .select("id, document_id, content, page_start, page_end, ts_start, heading, chunk_index")
    .eq("document_id", documentId)
    // Le figure vengono salvate dopo il testo: si ordina per pagina così ognuna finisce accanto alla sua slide.
    .order("page_start", { ascending: true, nullsFirst: false })
    .order("chunk_index", { ascending: true })
    .limit(600);
  if (pageFrom != null) query = query.gte("page_end", pageFrom);
  if (pageTo != null) query = query.lte("page_start", pageTo);

  const { data, error } = await query;
  if (error) throw new Error(`Lettura chunk: ${error.message}`);

  const passages = await attachDocuments(supabase, data ?? []);
  return takeWithinBudget(passages, { limit: 200, charBudget });
}

export function formatContext(passages) {
  return passages
    .map((p) => {
      const where = [p.course, p.name, p.place].filter(Boolean).join(" · ");
      return `[F${p.n} · ${where}]\n${p.content}`;
    })
    .join("\n\n");
}

// Elenco dei materiali di un corso: utile al piano di ripasso e ai riassunti generali.
export async function listCourseDocuments({ supabase, course }) {
  let query = supabase
    .from("assistant_documents")
    .select("id, name, course, file_type, file_size, page_count")
    .eq("status", "ready")
    .order("course", { ascending: true })
    .order("name", { ascending: true })
    .limit(200);
  if (course) query = query.eq("course", course);
  const { data, error } = await query;
  if (error) throw new Error(`Elenco documenti: ${error.message}`);
  return data ?? [];
}
