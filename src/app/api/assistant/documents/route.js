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

export async function DELETE(request) {
  try {
    const { supabase } = await requireOwner();

    const id = new URL(request.url).searchParams.get("id");
    const parsed = z.string().uuid().safeParse(id);
    if (!parsed.success) throw new AssistantError("ID documento non valido", 422);

    const { data: document, error: readError } = await supabase
      .from("assistant_documents")
      .select("id, file_path")
      .eq("id", parsed.data)
      .maybeSingle();
    if (readError) throw new AssistantError(`Lettura documento: ${readError.message}`, 500);
    if (!document) throw new AssistantError("Documento non trovato", 404);

    // Prima il file, poi la riga (i chunk cadono a cascata). Se il file è già sparito si prosegue.
    await supabase.storage.from(ASSISTANT_BUCKET).remove([document.file_path]);
    const { error: deleteError } = await supabase.from("assistant_documents").delete().eq("id", document.id);
    if (deleteError) throw new AssistantError(`Eliminazione documento: ${deleteError.message}`, 500);

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
