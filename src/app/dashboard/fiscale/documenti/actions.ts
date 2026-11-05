"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/fiscale/auth";
import { fiscaleDb } from "@/lib/fiscale/data/load";
import { generate } from "@/lib/assistant/generate";
import {
  MIN_TEXT_CHARS,
  READ_EFFORT,
  READ_MODEL,
  READ_SYSTEM,
  buildReadPrompt,
  documentText,
  parseReadReply,
  xmlText,
  type DocumentFields,
} from "@/lib/fiscale/document-read";
import { DOCUMENT_BUCKET, DOCUMENT_CATEGORIES, DOCUMENT_MAX_BYTES } from "@/lib/fiscale/documents";
import { extractXml } from "@/lib/fiscale/fatturapa-import";
import { pdfText } from "@/lib/fiscale/file-text";
import { renameStoredFile } from "@/lib/fiscale/stored-file";
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
  const supabase = await createClient();
  const { data, error } = await db
    .from("documents")
    .insert({
      title,
      category: input.category,
      year: input.year,
      file_path: input.path,
      mime_type: input.mime,
      size_bytes: input.size,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[fiscale] insert document:", error?.message);
    await supabase.storage.from(DOCUMENT_BUCKET).remove([input.path]);
    return { ok: false, message: "Salvataggio non riuscito." };
  }
  // The file takes the name of its title (it was uploaded with the original name).
  await renameStoredFile(supabase, input.path, title, async (path) => {
    const { error: e } = await db.from("documents").update({ file_path: path }).eq("id", data.id);
    return !e;
  });
  revalidatePath("/dashboard/fiscale/documenti");
  return { ok: true, message: "Documento caricato." };
}

export type ReadState = { ok: true; fields: DocumentFields } | { ok: false; message: string };

/**
 * Has Claude Code read a file the browser has just uploaded and propose title,
 * category and year for the form. Only files with a text layer: PDFs, XML and
 * signed .p7m; scans and photos are left to the owner.
 */
export async function readDocumentAction(input: { path: string; name: string }): Promise<ReadState> {
  let user;
  try {
    user = await requireOwner();
  } catch {
    return { ok: false, message: "Non autorizzato." };
  }
  if (!input.path.startsWith(`${user.id}/`) || input.path.includes("..")) return { ok: false, message: "File non valido." };

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).download(input.path);
  if (error || !data) return { ok: false, message: "Claude non riesce ad aprire il file." };

  const name = input.name.toLowerCase();
  let text = "";
  try {
    if (name.endsWith(".pdf")) text = await pdfText(await data.arrayBuffer());
    else if (name.endsWith(".xml") || name.endsWith(".p7m")) text = xmlText(extractXml(new Uint8Array(await data.arrayBuffer())));
  } catch (e) {
    console.error("[fiscale] document text:", e instanceof Error ? e.message : e);
  }
  text = documentText(text);
  if (text.length < MIN_TEXT_CHARS) {
    return { ok: false, message: "Claude legge solo PDF con testo e file XML: per scansioni e foto compila i campi a mano." };
  }

  let reply: string;
  try {
    ({ text: reply } = await generate({
      system: READ_SYSTEM,
      prompt: buildReadPrompt({ fileName: input.name, text }),
      model: READ_MODEL,
      effort: READ_EFFORT,
      signal: undefined,
    }));
  } catch (e) {
    console.error("[fiscale] document read:", e instanceof Error ? e.message : e);
    return { ok: false, message: "Claude non risponde: compila i campi a mano." };
  }
  const fields = parseReadReply(reply);
  return fields ? { ok: true, fields } : { ok: false, message: "Risposta di Claude non valida: compila i campi a mano." };
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
