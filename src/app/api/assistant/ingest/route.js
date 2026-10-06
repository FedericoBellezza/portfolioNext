import { z } from "zod";
import { AssistantError, errorResponse, requireOwner } from "@/lib/assistant/auth";
import { buildChunks, embeddingInput } from "@/lib/assistant/chunk";
import { ASSISTANT_BUCKET, MAX_FILE_BYTES, getExtension, isAcceptedFile } from "@/lib/assistant/constants";
import { embedTexts, toVectorLiteral } from "@/lib/assistant/embed";
import { ExtractionError, extractDocument } from "@/lib/assistant/extract";

// L'ingestione è sincrona: estrazione, embedding in batch e salvataggio nella stessa richiesta.
// Per PDF molto lunghi alza il limite se il tuo piano lo consente.
export const maxDuration = 60;

const INSERT_BATCH = 40;

const BodySchema = z.object({
  path: z.string().min(1).max(300),
  name: z.string().trim().min(1).max(200),
  course: z.string().trim().min(1).max(100),
});

export async function POST(request) {
  let supabase;
  let documentId = null;

  try {
    const owner = await requireOwner();
    supabase = owner.supabase;

    const parsed = BodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new AssistantError("Richiesta non valida", 422);
    const { path, name, course } = parsed.data;

    // Il file deve stare nella cartella dell'utente: altrimenti la policy di Storage lo negherebbe,
    // ma meglio rifiutare subito e con un messaggio chiaro.
    if (!path.startsWith(`${owner.user.id}/`) || path.includes("..")) {
      throw new AssistantError("Percorso del file non valido", 400);
    }
    if (!isAcceptedFile(name)) throw new AssistantError("Tipo di file non supportato", 415);

    const { data: document, error: insertError } = await supabase
      .from("assistant_documents")
      .insert({ course, name, file_path: path, file_type: getExtension(name), status: "processing" })
      .select("id")
      .single();
    if (insertError) throw new AssistantError(`Registrazione documento: ${insertError.message}`, 500);
    documentId = document.id;

    const { data: blob, error: downloadError } = await supabase.storage.from(ASSISTANT_BUCKET).download(path);
    if (downloadError || !blob) throw new ExtractionError("File non trovato nello Storage");
    if (blob.size > MAX_FILE_BYTES) throw new ExtractionError("File troppo grande (massimo 50 MB)");

    const buffer = Buffer.from(await blob.arrayBuffer());
    const extracted = await extractDocument({ buffer, fileName: name });
    const chunks = buildChunks(extracted.units, extracted.kind);
    // Slide fatte solo di immagini: niente testo, ma le figure si possono ancora analizzare.
    if (!chunks.length && !extracted.visualPlan) throw new ExtractionError("Nessun testo estratto dal file");

    const embeddings = await embedTexts(chunks.map((chunk) => embeddingInput(chunk, { course, name })));

    const rows = chunks.map((chunk, index) => ({
      document_id: documentId,
      course,
      content: chunk.content,
      embedding: toVectorLiteral(embeddings[index]),
      chunk_index: chunk.chunk_index,
      page_start: chunk.page_start,
      page_end: chunk.page_end,
      ts_start: chunk.ts_start,
      heading: chunk.heading,
    }));
    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      const { error } = await supabase.from("assistant_chunks").insert(rows.slice(i, i + INSERT_BATCH));
      if (error) throw new Error(`Salvataggio chunk: ${error.message}`);
    }

    await supabase
      .from("assistant_documents")
      .update({ status: "ready", page_count: extracted.pageCount, file_size: blob.size })
      .eq("id", documentId);

    // Piano di analisi delle figure, in un aggiornamento a parte: se la migrazione 0002 non è
    // stata applicata (colonne mancanti) il documento resta comunque pronto e usabile.
    let visualItems = 0;
    const plan = extracted.visualPlan;
    if (plan?.items?.length) {
      const { error } = await supabase
        .from("assistant_documents")
        .update({ visual_plan: plan, visual_total: plan.items.length, visual_done: 0, visual_status: "pending" })
        .eq("id", documentId);
      if (error) console.warn("[assistant] figure non pianificate (migrazione 0002 applicata?):", error.message);
      else visualItems = plan.items.length;
    }

    return Response.json({ ok: true, documentId, chunks: rows.length, visualItems });
  } catch (error) {
    // Documento già registrato: lo si lascia visibile con lo stato "error" e il motivo.
    if (supabase && documentId) {
      const message = error instanceof Error ? error.message : String(error);
      await supabase.from("assistant_chunks").delete().eq("document_id", documentId);
      await supabase
        .from("assistant_documents")
        .update({ status: "error", error_msg: message.slice(0, 300) })
        .eq("id", documentId);
      const status = error instanceof AssistantError ? error.status : 422;
      return Response.json({ ok: false, documentId, error: message }, { status });
    }
    return errorResponse(error);
  }
}
