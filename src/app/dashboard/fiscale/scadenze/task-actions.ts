"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/fiscale/auth";
import { fiscaleDb } from "@/lib/fiscale/data/load";
import { DOCUMENT_BUCKET, DOCUMENT_CATEGORIES, DOCUMENT_MAX_BYTES } from "@/lib/fiscale/documents";
import { toCents, toEuro } from "@/lib/fiscale/money";
import { createClient } from "@/lib/supabase/server";

export type TaskState = { ok: boolean; message: string } | null;

const KEY = /^[a-z0-9_:-]{3,120}$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const todayRome = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

const refresh = () => revalidatePath("/dashboard/fiscale", "layout");

/** Marks a filing or reminder as done, optionally attaching a receipt already uploaded to Documenti. */
export async function completeTaskAction(input: {
  key: string;
  completedAt: string;
  note: string;
  doc: { path: string; mime: string; size: number; title: string; category: string; year: number | null } | null;
}): Promise<TaskState> {
  let user;
  try {
    user = await requireOwner();
  } catch {
    return { ok: false, message: "Non autorizzato." };
  }
  if (!KEY.test(input.key)) return { ok: false, message: "Adempimento non valido." };
  if (!ISO.test(input.completedAt) || input.completedAt > todayRome()) {
    return { ok: false, message: "La data non può essere futura." };
  }
  const db = await fiscaleDb();

  let documentId: string | null = null;
  if (input.doc) {
    const d = input.doc;
    const valid =
      d.path.startsWith(`${user.id}/`) &&
      !d.path.includes("..") &&
      d.size > 0 &&
      d.size <= DOCUMENT_MAX_BYTES &&
      DOCUMENT_CATEGORIES.some((c) => c.id === d.category);
    if (!valid) return { ok: false, message: "Ricevuta non valida." };
    const { data, error } = await db
      .from("documents")
      .insert({ title: d.title.slice(0, 200) || "Ricevuta", category: d.category, year: d.year, file_path: d.path, mime_type: d.mime, size_bytes: d.size })
      .select("id")
      .single();
    if (error || !data) {
      const supabase = await createClient();
      await supabase.storage.from(DOCUMENT_BUCKET).remove([d.path]);
      return { ok: false, message: "Salvataggio della ricevuta non riuscito." };
    }
    documentId = String(data.id);
  }

  const { error } = await db.from("task_completions").upsert({
    task_key: input.key,
    completed_at: input.completedAt,
    document_id: documentId,
    note: input.note.trim().slice(0, 500) || null,
  });
  if (error) {
    console.error("[fiscale] complete task:", error.message);
    return { ok: false, message: "Salvataggio non riuscito." };
  }
  refresh();
  return { ok: true, message: "Segnato come fatto." };
}

export async function undoTaskAction(formData: FormData): Promise<void> {
  await requireOwner();
  const key = String(formData.get("key") ?? "");
  if (!KEY.test(key)) return;
  const db = await fiscaleDb();
  await db.from("task_completions").delete().eq("task_key", key);
  refresh();
}

export async function createReminderAction(_prev: TaskState, formData: FormData): Promise<TaskState> {
  try {
    await requireOwner();
  } catch {
    return { ok: false, message: "Non autorizzato." };
  }
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const scope = formData.get("scope") === "business" ? "business" : "personal";
  const firstDue = String(formData.get("firstDue") ?? "");
  const recurrence = String(formData.get("recurrence") ?? "yearly");
  const rawAmount = String(formData.get("amount") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 1000) || null;

  if (!title) return { ok: false, message: "Dai un nome al promemoria." };
  if (!ISO.test(firstDue)) return { ok: false, message: "Scegli la data della scadenza." };
  if (!["once", "monthly", "yearly"].includes(recurrence)) return { ok: false, message: "Ripetizione non valida." };
  let amount: number | null = null;
  if (rawAmount) {
    const n = Number(rawAmount.includes(",") ? rawAmount.replace(/\./g, "").replace(",", ".") : rawAmount);
    if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return { ok: false, message: "Importo non valido." };
    amount = toEuro(toCents(n));
  }

  const db = await fiscaleDb();
  const { error } = await db.from("reminders").insert({ title, scope, first_due: firstDue, recurrence, amount, notes });
  if (error) {
    console.error("[fiscale] create reminder:", error.message);
    return { ok: false, message: "Salvataggio non riuscito." };
  }
  refresh();
  return { ok: true, message: "Promemoria aggiunto." };
}

export async function archiveReminderAction(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  const db = await fiscaleDb();
  await db.from("reminders").update({ archived_at: new Date().toISOString() }).eq("id", id);
  refresh();
}
