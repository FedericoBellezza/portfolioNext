import { z } from "zod";
import { AssistantError, errorResponse, requireOwner } from "@/lib/assistant/auth";
import { loadAttachments } from "@/lib/assistant/attachments";
import { findNamedDocuments, isCatalogQuestion } from "@/lib/assistant/catalog";
import { MAX_ATTACHMENTS, MAX_MESSAGE_CHARS } from "@/lib/assistant/constants";
import { parseFiles } from "@/lib/assistant/files";
import { generate } from "@/lib/assistant/generate";
import { DEFAULT_COUNTS, MAX_COUNTS, buildPrompts } from "@/lib/assistant/prompt";
import { parseQuiz, quizToText } from "@/lib/assistant/quiz";
import {
  listCourseDocuments,
  loadDocumentsPassages,
  loadNamedPassages,
  mergePassages,
  resolveScopeDocumentIds,
  searchPassages,
} from "@/lib/assistant/retrieve";

// Se il tuo piano Vercel lo permette puoi alzarlo (e ASSISTANT_TIMEOUT_MS di conseguenza):
// quiz e riassunti lunghi possono richiedere più di un minuto.
export const maxDuration = 60;

// Il workflow n8n rifiuta system + prompt oltre 85000 caratteri.
const TOTAL_CHAR_BUDGET = 80000;
// Anche con allegati molto lunghi ai materiali resta almeno questo spazio.
const MIN_CONTEXT_CHARS = 16000;

const MODE_SETTINGS = {
  ask: { limit: 8, contextChars: 40000 },
  summary: { limit: 14, contextChars: 52000 },
  quiz: { limit: 14, contextChars: 52000 },
};

const BodySchema = z.object({
  message: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
  mode: z.enum(["ask", "summary", "quiz"]).default("ask"),
  // Contesto della domanda: corsi, cartelle e documenti, anche mescolati. Tutto vuoto = tutti i materiali.
  courses: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  folders: z
    .array(z.object({ course: z.string().trim().min(1).max(100), name: z.string().trim().min(1).max(100) }))
    .max(60)
    .default([]),
  documentIds: z.array(z.string().uuid()).max(50).default([]),
  count: z.number().int().min(1).max(20).nullish(),
  // Quiz lungo generato a blocchi: quale blocco è questo e quali domande sono già state fatte negli altri.
  quizPart: z
    .object({ index: z.number().int().min(0).max(19), total: z.number().int().min(1).max(20) })
    .refine((part) => part.index < part.total)
    .nullish(),
  exclude: z.array(z.string().trim().min(1).max(200)).max(60).default([]),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .max(30)
    .default([]),
  attachments: z
    .array(z.object({ path: z.string().min(1).max(300), name: z.string().trim().min(1).max(200) }))
    .max(MAX_ATTACHMENTS)
    .default([]),
});

// Una domanda di approfondimento ("e quello di prima?") da sola recupera poco:
// la si accoda all'ultima domanda dell'utente.
function retrievalQuery(message, history) {
  const words = message.split(/\s+/).filter(Boolean).length;
  const previous = [...history].reverse().find((turn) => turn.role === "user");
  return words < 6 && previous ? `${previous.content.slice(0, 500)} ${message}` : message;
}

export async function POST(request) {
  try {
    const { supabase, user } = await requireOwner();

    const parsed = BodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AssistantError(`Richiesta non valida: ${issue?.path.join(".") || "body"} ${issue?.message ?? ""}`, 422);
    }
    const { message, mode, courses, folders, documentIds, history, exclude } = parsed.data;
    const quizPart = mode === "quiz" ? (parsed.data.quizPart ?? null) : null;
    const settings = MODE_SETTINGS[mode];
    const count = Math.min(parsed.data.count ?? DEFAULT_COUNTS[mode] ?? 0, MAX_COUNTS[mode] ?? 20);

    // Il testo degli allegati sta nello stesso tetto della richiesta: i passaggi dei materiali cedono spazio.
    const attachments = await loadAttachments({ supabase, userId: user.id, attachments: parsed.data.attachments });
    const attachmentChars = attachments.reduce((sum, item) => sum + item.text.length, 0);
    const contextChars = Math.max(MIN_CONTEXT_CHARS, settings.contextChars - attachmentChars);

    // Corsi e cartelle diventano l'elenco dei loro documenti pronti; i documenti scelti si aggiungono.
    // Una cartella vuota (o ancora in elaborazione) non è un contesto: meglio dirlo che cercare ovunque.
    const scoped = courses.length > 0 || folders.length > 0;
    const scopedIds = await resolveScopeDocumentIds({ supabase, courses, folders });
    if (scoped && !scopedIds.length && !documentIds.length) {
      throw new AssistantError("I corsi o le cartelle scelti non hanno documenti pronti", 422);
    }
    const searchIds = [...new Set([...scopedIds, ...documentIds])];
    const searchSet = new Set(searchIds);

    // Riassunti e quiz su documenti scelti (senza corsi o cartelle) li leggono in ordine;
    // negli altri casi si cercano i passaggi più pertinenti alla richiesta.
    // Le domande sull'archivio ("ho documenti duplicati?") non servono estratti: senza ricerca il prompt resta
    // piccolo e la risposta arriva ben prima del timeout.
    const catalog = mode === "ask" && !documentIds.length && !attachments.length && isCatalogQuestion(message);

    // L'elenco dei materiali è sempre completo (tutti i corsi) anche se la ricerca è filtrata:
    // senza, il modello scambia i pochi estratti recuperati per l'intero archivio.
    const documents = await listCourseDocuments({ supabase });

    let found;
    if (catalog) {
      found = { passages: [], truncated: false };
    } else if (documentIds.length && !scoped && mode !== "ask") {
      found = await loadDocumentsPassages({
        supabase,
        documentIds,
        charBudget: contextChars,
        part: quizPart,
      });
    } else {
      const query = retrievalQuery(message, history);
      // "La lezione 6" non è una frase che la ricerca per significato associ al file "6 lesson.txt":
      // i documenti nominati per numero si leggono comunque, e la ricerca riempie lo spazio che resta.
      const named = documentIds.length
        ? []
        : findNamedDocuments(message, documents.filter((doc) => !searchIds.length || searchSet.has(doc.id)));
      const [searched, namedFound] = await Promise.all([
        searchPassages({
          supabase,
          query,
          documentIds: searchIds,
          limit: settings.limit,
          charBudget: contextChars,
          part: quizPart,
        }),
        named.length
          ? loadNamedPassages({ supabase, documents: named, query, charBudget: contextChars })
          : Promise.resolve(null),
      ]);
      if (namedFound) {
        const merged = mergePassages([namedFound.passages, searched.passages], {
          limit: settings.limit + namedFound.passages.length,
          charBudget: contextChars,
        });
        found = { passages: merged.passages, truncated: merged.truncated || namedFound.truncated };
      } else {
        found = searched;
      }
    }

    const scope = {
      courses,
      folders,
      documentNames: documents.filter((doc) => documentIds.includes(doc.id)).map((doc) => doc.name),
    };

    // Se con storia e elenco materiali si supera il tetto si tolgono i passaggi meno rilevanti.
    let passages = found.passages;
    let truncated = found.truncated;
    const promptInput = { mode, message, history, documents, scope, count, attachments, catalog, quizPart, exclude };
    let built = buildPrompts({ ...promptInput, passages, truncated });
    while (built.system.length + built.prompt.length > TOTAL_CHAR_BUDGET && passages.length > 1) {
      passages = passages.slice(0, -1);
      truncated = true;
      built = buildPrompts({ ...promptInput, passages, truncated });
    }

    const result = await generate({ system: built.system, prompt: built.prompt, signal: request.signal });

    console.log("[assistant] chat", {
      mode,
      passages: passages.length,
      attachments: attachments.length,
      model: result.model,
      durationMs: result.durationMs,
      costUsd: result.costUsd,
    });

    let text = result.text;
    let files = [];
    let quiz = null;
    let quizSources = null;
    if (mode !== "quiz") {
      ({ text, files } = parseFiles(text));
      // Se il modello ha scritto solo il file, il messaggio non resta vuoto.
      if (files.length && !text) text = files.length === 1 ? "Ecco il file richiesto." : "Ecco i file richiesti.";
    } else {
      const parsed = parseQuiz(text, { validSources: new Set(passages.map((p) => p.n)), max: count });
      if (!parsed.questions.length) {
        throw new AssistantError(
          parsed.note || "Non sono riuscito a generare il quiz in un formato valido: riprova",
          parsed.note ? 422 : 502,
        );
      }
      quiz = { questions: parsed.questions };
      text = quizToText(parsed.questions);
      quizSources = new Set(parsed.questions.map((question) => question.source).filter(Boolean));
    }

    return Response.json({
      ok: true,
      text,
      files,
      quiz,
      truncated,
      // Un quiz mostra solo le fonti citate dalle sue domande.
      sources: passages
        .filter((p) => !quizSources || quizSources.has(p.n))
        .map((p) => ({
          n: p.n,
          documentId: p.documentId,
          name: p.name,
          course: p.course,
          filePath: p.filePath,
          fileType: p.fileType,
          page: p.page,
          place: p.place,
        })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
