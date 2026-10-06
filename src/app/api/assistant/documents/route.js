import { z } from "zod";
import { AssistantError, errorResponse, requireOwner } from "@/lib/assistant/auth";
import { ASSISTANT_BUCKET } from "@/lib/assistant/constants";
import { listDocuments } from "@/lib/assistant/documents";

export async function GET() {
  try {
    const { supabase } = await requireOwner();
    const { data, error } = await listDocuments(supabase);
    if (error) throw new AssistantError(`Lettura documenti: ${error.message}`, 500);
    return Response.json({ ok: true, documents: data });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Elimina un documento (?id=) oppure tutti i documenti di un corso (?course=).
 * Prima i file, poi le righe (i chunk cadono a cascata). Se un file è già sparito si prosegue.
 */
export async function DELETE(request) {
  try {
    const { supabase } = await requireOwner();

    const params = new URL(request.url).searchParams;
    const course = params.get("course");

    let query = supabase.from("assistant_documents").select("id, file_path");
    if (course !== null) {
      const parsed = z.string().trim().min(1).max(100).safeParse(course);
      if (!parsed.success) throw new AssistantError("Nome corso non valido", 422);
      query = query.eq("course", parsed.data);
    } else {
      const parsed = z.string().uuid().safeParse(params.get("id"));
      if (!parsed.success) throw new AssistantError("ID documento non valido", 422);
      query = query.eq("id", parsed.data);
    }

    const { data: documents, error: readError } = await query;
    if (readError) throw new AssistantError(`Lettura documenti: ${readError.message}`, 500);
    if (!documents?.length) throw new AssistantError(course !== null ? "Corso non trovato" : "Documento non trovato", 404);

    await supabase.storage.from(ASSISTANT_BUCKET).remove(documents.map((document) => document.file_path));
    const { error: deleteError } = await supabase
      .from("assistant_documents")
      .delete()
      .in(
        "id",
        documents.map((document) => document.id),
      );
    if (deleteError) throw new AssistantError(`Eliminazione documenti: ${deleteError.message}`, 500);

    return Response.json({ ok: true, deleted: documents.length });
  } catch (error) {
    return errorResponse(error);
  }
}
