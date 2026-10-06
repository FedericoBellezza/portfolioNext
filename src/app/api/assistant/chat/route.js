import { z } from "zod";
import { AssistantError, errorResponse, requireOwner } from "@/lib/assistant/auth";
import { MAX_MESSAGE_CHARS } from "@/lib/assistant/constants";
import { generate } from "@/lib/assistant/generate";
import { DEFAULT_COUNTS, MAX_COUNTS, buildPrompts } from "@/lib/assistant/prompt";
import { listCourseDocuments, loadDocumentPassages, searchPassages } from "@/lib/assistant/retrieve";

// Se il tuo piano Vercel lo permette puoi alzarlo (e ASSISTANT_TIMEOUT_MS di conseguenza):
// quiz e riassunti lunghi possono richiedere più di un minuto.
export const maxDuration = 60;

// Il workflow n8n rifiuta system + prompt oltre 85000 caratteri.
const TOTAL_CHAR_BUDGET = 80000;

const MODE_SETTINGS = {
  ask: { limit: 8, contextChars: 40000 },
  summary: { limit: 14, contextChars: 52000 },
  quiz: { limit: 14, contextChars: 52000 },
  flashcards: { limit: 14, contextChars: 52000 },
  plan: { limit: 14, contextChars: 42000 },
};

const BodySchema = z.object({
  message: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
  mode: z.enum(["ask", "summary", "quiz", "flashcards", "plan"]).default("ask"),
  course: z.string().trim().max(100).nullish(),
  documentId: z.string().uuid().nullish(),
  pageFrom: z.number().int().min(1).nullish(),
  pageTo: z.number().int().min(1).nullish(),
  count: z.number().int().min(1).max(20).nullish(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .max(30)
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
    const { supabase } = await requireOwner();

    const parsed = BodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AssistantError(`Richiesta non valida: ${issue?.path.join(".") || "body"} ${issue?.message ?? ""}`, 422);
    }
    const { message, mode, course, documentId, pageFrom, pageTo, history } = parsed.data;
    const settings = MODE_SETTINGS[mode];
    const count = Math.min(parsed.data.count ?? DEFAULT_COUNTS[mode] ?? 0, MAX_COUNTS[mode] ?? 20);

    // Riassunti, quiz e flashcard su un documento scelto leggono il documento in ordine;
    // negli altri casi si cercano i passaggi più pertinenti alla richiesta.
    let found;
    if (documentId && mode !== "ask") {
      found = await loadDocumentPassages({
        supabase,
        documentId,
        pageFrom,
        pageTo,
        charBudget: settings.contextChars,
      });
    } else {
      found = await searchPassages({
        supabase,
        query: mode === "plan" ? `${message} ${course ?? ""}`.trim() : retrievalQuery(message, history),
        course,
        documentId,
        limit: settings.limit,
        charBudget: settings.contextChars,
      });
    }

    // L'elenco dei materiali è sempre completo (tutti i corsi) anche se la ricerca è filtrata:
    // senza, il modello scambia i pochi estratti recuperati per l'intero archivio.
    const documents = await listCourseDocuments({ supabase });
    const scope = {
      course: course || null,
      documentName: documentId ? documents.find((doc) => doc.id === documentId)?.name : null,
    };

    // Se con storia e elenco materiali si supera il tetto si tolgono i passaggi meno rilevanti.
    let passages = found.passages;
    let truncated = found.truncated;
    let built = buildPrompts({ mode, message, history, passages, documents, scope, count, truncated });
    while (built.system.length + built.prompt.length > TOTAL_CHAR_BUDGET && passages.length > 1) {
      passages = passages.slice(0, -1);
      truncated = true;
      built = buildPrompts({ mode, message, history, passages, documents, scope, count, truncated });
    }

    const result = await generate({ system: built.system, prompt: built.prompt, signal: request.signal });

    console.log("[assistant] chat", {
      mode,
      passages: passages.length,
      model: result.model,
      durationMs: result.durationMs,
      costUsd: result.costUsd,
    });

    return Response.json({
      ok: true,
      text: result.text,
      truncated,
      sources: passages.map((p) => ({
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
