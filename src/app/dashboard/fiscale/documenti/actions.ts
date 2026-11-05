"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/fiscale/auth";
import { fiscaleDb } from "@/lib/fiscale/data/load";
import { DOCUMENT_BUCKET, DOCUMENT_CATEGORIES, DOCUMENT_MAX_BYTES } from "@/lib/fiscale/documents";
import { createClient } from "@/lib/supabase/server";

export type DocumentState = { ok: boolean; message: string } | null;

/** Saves the metadata of a file the browser has just uploaded to the private bucket. */
export async function registerDocumentAction(input: {
  title: string;
  category: string;
  year: number | null;
  path: string;
  mime: string;
  size: number;
}): Promise<DocumentState> {
  let user;
  try {
    user = await requireOwner();
  } catch {
    return { ok: false, message: "Non autorizzato." };
  }
  const title = input.title.trim().slice(0, 200);
  if (!title) return { ok: false, message: "Dai un titolo al documento." };
  if (!DOCUMENT_CATEGORIES.some((c) => c.id === input.category)) return { ok: false, message: "Categoria non valida." };
  if (input.year !== null && (!Number.isInteger(input.year) || input.year < 2000 || input.year > 2100)) {
    return { ok: false, message: "Anno non valido." };
  }
  if (!input.path.startsWith(`${user.id}/`) || input.path.includes("..")) return { ok: false, message: "File non valido." };
  if (!(input.size > 0 && input.size <= DOCUMENT_MAX_BYTES)) return { ok: false, message: "File troppo grande." };

  const db = await fiscaleDb();
  const { error } = await db.from("documents").insert({
    title,
    category: input.category,
    year: input.year,
    file_path: input.path,
    mime_type: input.mime,
    size_bytes: input.size,
  });
  if (error) {
    console.error("[fiscale] insert document:", error.message);
    const supabase = await createClient();
    await supabase.storage.from(DOCUMENT_BUCKET).remove([input.path]);
    return { ok: false, message: "Salvataggio non riuscito." };
  }
  revalidatePath("/dashboard/fiscale/documenti");
  return { ok: true, message: "Documento caricato." };
}

/** Marks a payment file as provisional (final receipt still due) or as the final one. */
export async function setDocumentProvisionalAction(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  const db = await fiscaleDb();
  const { error } = await db.from("documents").update({ provisional: formData.get("provisional") === "true" }).eq("id", id);
  if (error) console.error("[fiscale] provisional document:", error.message);
  revalidatePath("/dashboard/fiscale", "layout");
}

export async function deleteDocumentAction(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  const db = await fiscaleDb();
  const { data } = await db.from("documents").select("file_path").eq("id", id).maybeSingle();
  if (!data) return;
  const supabase = await createClient();
  await supabase.storage.from(DOCUMENT_BUCKET).remove([String(data.file_path)]);
  const { error } = await db.from("documents").delete().eq("id", id);
  if (error) console.error("[fiscale] delete document:", error.message);
  // Payment files live in the archive too: refresh Scadenze as well.
  revalidatePath("/dashboard/fiscale", "layout");
}
