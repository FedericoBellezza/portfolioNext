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
