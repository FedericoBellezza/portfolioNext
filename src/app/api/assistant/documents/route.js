import { z } from "zod";
import { AssistantError, errorResponse, requireOwner } from "@/lib/assistant/auth";
import { ASSISTANT_BUCKET } from "@/lib/assistant/constants";
import { listDocuments, listFolders } from "@/lib/assistant/documents";

export async function GET() {
  try {
    const { supabase } = await requireOwner();
    const { data, error } = await listDocuments(supabase);
    if (error) throw new AssistantError(`Lettura documenti: ${error.message}`, 500);
    const folders = await listFolders(supabase);
    return Response.json({ ok: true, documents: data, folders: folders.data });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Sposta uno o più documenti in una cartella (folder: nome) o fuori da ogni cartella (folder: null).
 * I documenti devono essere tutti dello stesso corso, che è anche il corso della cartella.
 */
export async function PATCH(request) {
  try {
    const { supabase } = await requireOwner();

    const parsed = z
      .object({
        ids: z.array(z.string().uuid()).min(1).max(200),
        folder: z.string().trim().min(1).max(100).nullable(),
      })
      .safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new AssistantError("Richiesta non valida", 422);
    const { ids, folder } = parsed.data;

    const { data: documents, error: readError } = await supabase
      .from("assistant_documents")
      .select("id, course")
      .in("id", ids);
    if (readError) throw new AssistantError(`Lettura documenti: ${readError.message}`, 500);
    if (!documents?.length) throw new AssistantError("Documenti non trovati", 404);

    const courses = new Set(documents.map((document) => document.course));
    if (courses.size > 1) throw new AssistantError("I documenti devono appartenere allo stesso corso", 422);

    if (folder) {
      const { data: existing, error: folderError } = await supabase
        .from("assistant_folders")
        .select("id")
        .eq("course", documents[0].course)
        .eq("name", folder)
        .maybeSingle();
      if (folderError) throw new AssistantError(`Lettura cartelle: ${folderError.message}`, 500);
      if (!existing) throw new AssistantError("Cartella non trovata in questo corso", 404);
    }

    const { error } = await supabase
      .from("assistant_documents")
      .update({ folder })
      .in(
        "id",
        documents.map((document) => document.id),
      );
    if (error) throw new AssistantError(`Spostamento documenti: ${error.message}`, 500);

    return Response.json({ ok: true, moved: documents.length });
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

    // Le cartelle di un corso eliminato non hanno più senso. Senza la migrazione 0005 la tabella
    // non esiste: l'errore si ignora.
    if (course !== null) await supabase.from("assistant_folders").delete().eq("course", course.trim());

    return Response.json({ ok: true, deleted: documents.length });
  } catch (error) {
    return errorResponse(error);
  }
}
