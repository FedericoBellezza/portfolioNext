import { z } from "zod";
import { AssistantError, errorResponse, requireOwner } from "@/lib/assistant/auth";
import { ASSISTANT_BUCKET } from "@/lib/assistant/constants";
import { runVisualBatch } from "@/lib/assistant/visuals";

// Ogni richiesta analizza un lotto di pagine/immagini; il browser la ripete fino a "done".
export const maxDuration = 60;

const BodySchema = z.object({ documentId: z.string().uuid() });

export async function POST(request) {
  let supabase;
  let documentId = null;

  try {
    const owner = await requireOwner();
    supabase = owner.supabase;

    const parsed = BodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new AssistantError("Richiesta non valida", 422);
    documentId = parsed.data.documentId;

    const { data: document, error: readError } = await supabase
      .from("assistant_documents")
      .select("id, course, name, file_path, status, visual_status, visual_plan, visual_done")
      .eq("id", documentId)
      .maybeSingle();
    if (readError) {
      // Colonne mancanti: la migrazione 0002 non è stata applicata.
      throw new AssistantError(`Analisi figure non disponibile (migrazione 0002 da applicare?): ${readError.message}`, 409);
    }
    if (!document) throw new AssistantError("Documento non trovato", 404);
    if (document.status !== "ready") throw new AssistantError("Il documento non è ancora pronto", 409);

    const total = document.visual_plan?.items?.length ?? 0;
    if (!total || document.visual_status === "done") {
      return Response.json({ ok: true, done: total, total, status: "done", added: 0 });
    }

    await supabase.from("assistant_documents").update({ visual_status: "processing" }).eq("id", documentId);

    const { data: blob, error: downloadError } = await supabase.storage.from(ASSISTANT_BUCKET).download(document.file_path);
    if (downloadError || !blob) throw new AssistantError("File non trovato nello Storage", 404);

    const result = await runVisualBatch({ supabase, document, buffer: Buffer.from(await blob.arrayBuffer()) });
    return Response.json({
      ok: true,
      ...result,
      status: result.done >= result.total ? "done" : "pending",
    });
  } catch (error) {
    // Il documento resta utilizzabile: si segnala l'errore (anche quelli di OpenAI, che chi usa
    // la pagina deve poter leggere) e si potrà riprendere dal punto raggiunto.
    const failure =
      error instanceof AssistantError
        ? error
        : new AssistantError(`Analisi figure non riuscita: ${error instanceof Error ? error.message : error}`, 502);
    if (supabase && documentId) {
      await supabase
        .from("assistant_documents")
        .update({ visual_status: "error", visual_error: failure.message.slice(0, 300) })
        .eq("id", documentId);
    }
    return errorResponse(failure);
  }
}
