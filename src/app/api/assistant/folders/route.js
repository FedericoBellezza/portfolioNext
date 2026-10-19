import { z } from "zod";
import { AssistantError, errorResponse, requireOwner } from "@/lib/assistant/auth";

const NameSchema = z.string().trim().min(1, "Nome cartella vuoto").max(100);
const CourseSchema = z.string().trim().min(1).max(100);

const MIGRATION_HINT = "Cartelle non disponibili: applica la migrazione 0005_assistant_folders.sql";

/** Crea una cartella dentro un corso. Se esiste già non fa nulla. */
export async function POST(request) {
  try {
    const { supabase } = await requireOwner();

    const parsed = z
      .object({ course: CourseSchema, name: NameSchema })
      .safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new AssistantError(parsed.error.issues[0]?.message ?? "Richiesta non valida", 422);
    const { course, name } = parsed.data;

    const { error } = await supabase
      .from("assistant_folders")
      .upsert({ course, name }, { onConflict: "user_id,course,name", ignoreDuplicates: true });
    if (error) throw new AssistantError(`${MIGRATION_HINT} (${error.message})`, 500);

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Rinomina una cartella: cambia il nome e lo aggiorna su tutti i documenti che la contengono. */
export async function PATCH(request) {
  try {
    const { supabase } = await requireOwner();

    const parsed = z
      .object({ course: CourseSchema, name: NameSchema, newName: NameSchema })
      .safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new AssistantError(parsed.error.issues[0]?.message ?? "Richiesta non valida", 422);
    const { course, name, newName } = parsed.data;
    if (newName === name) return Response.json({ ok: true });

    const { data: clash, error: clashError } = await supabase
      .from("assistant_folders")
      .select("id")
      .eq("course", course)
      .eq("name", newName)
      .maybeSingle();
    if (clashError) throw new AssistantError(`${MIGRATION_HINT} (${clashError.message})`, 500);
    if (clash) throw new AssistantError("Esiste già una cartella con questo nome", 409);

    // Prima la cartella (il vincolo di unicità protegge da doppioni), poi i documenti.
    const { error: renameError } = await supabase
      .from("assistant_folders")
      .update({ name: newName })
      .eq("course", course)
      .eq("name", name);
    if (renameError) throw new AssistantError(`Rinomina cartella: ${renameError.message}`, 500);

    const { error: docsError } = await supabase
      .from("assistant_documents")
      .update({ folder: newName })
      .eq("course", course)
      .eq("folder", name);
    if (docsError) throw new AssistantError(`Aggiornamento documenti: ${docsError.message}`, 500);

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Elimina una cartella (?course=&name=). I documenti non si cancellano: tornano direttamente nel corso.
 */
export async function DELETE(request) {
  try {
    const { supabase } = await requireOwner();

    const params = new URL(request.url).searchParams;
    const parsed = z
      .object({ course: CourseSchema, name: NameSchema })
      .safeParse({ course: params.get("course"), name: params.get("name") });
    if (!parsed.success) throw new AssistantError("Cartella non valida", 422);
    const { course, name } = parsed.data;

    const { error: moveError } = await supabase
      .from("assistant_documents")
      .update({ folder: null })
      .eq("course", course)
      .eq("folder", name);
    if (moveError) throw new AssistantError(`Spostamento documenti: ${moveError.message}`, 500);

    const { error } = await supabase.from("assistant_folders").delete().eq("course", course).eq("name", name);
    if (error) throw new AssistantError(`Eliminazione cartella: ${error.message}`, 500);

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
