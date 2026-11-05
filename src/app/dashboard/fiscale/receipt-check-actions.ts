"use server";

import { revalidatePath } from "next/cache";
import { generate } from "@/lib/assistant/generate";
import { requireOwner } from "@/lib/fiscale/auth";
import type { FileCheck } from "@/lib/fiscale/data/types";
import { DOCUMENT_BUCKET } from "@/lib/fiscale/documents";
import { pdfText } from "@/lib/fiscale/file-text";
import { loadDataset } from "@/lib/fiscale/data/load";
import { formatEUR as eurText } from "@/lib/fiscale/money";
import {
  CHECK_BATCH,
  CHECK_EFFORT,
  CHECK_MODEL,
  CHECK_SYSTEM,
  buildCheckPrompt,
  parseCheckReply,
  receiptText,
  type CheckInput,
} from "@/lib/fiscale/receipt-check";
import { CHECK_KINDS, paymentEntries, paymentLabel, settlement, uncheckedFiles, type PaymentEntry } from "@/lib/fiscale/receipts";
import { renameStoredFile } from "@/lib/fiscale/stored-file";
import { createClient } from "@/lib/supabase/server";

export type CheckState = { ok: boolean; checked: number; remaining: number; message: string };

function describePayment(e: PaymentEntry): string {
  const s = settlement(e);
  const how =
    s.mode === "credit" || s.mode === "compensated"
      ? ", pagato compensando un credito"
      : s.mode === "mixed"
        ? `, di cui ${eurText(s.credit)} compensati con un credito`
        : "";
  return `${paymentLabel(e)}, ${eurText(e.amount)}, data ${e.date}${how}`;
}

/**
 * Checks with Claude Code (owner's server, via n8n) the payment PDFs not yet
 * checked, a few per call: kind of file, final or provisional, linked to the
 * right payment. The result also sets the provisional flag, which the owner
 * can still change by hand. Call again while `remaining` > 0.
 */
export async function checkPaymentFilesAction(): Promise<CheckState> {
  try {
    await requireOwner();
  } catch {
    return { ok: false, checked: 0, remaining: 0, message: "Non autorizzato." };
  }
  const supabase = await createClient();
  const db = supabase.schema("fiscale");
  const todo = uncheckedFiles(paymentEntries(await loadDataset()));
  if (todo.length === 0) return { ok: true, checked: 0, remaining: 0, message: "Nessun file da controllare." };

  const batch = todo.slice(0, CHECK_BATCH);
  const now = new Date().toISOString();
  const results = new Map<string, FileCheck>();
  const inputs: { id: string; input: CheckInput }[] = [];

  for (const { entry, file } of batch) {
    const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).download(file.path);
    if (error || !data) {
      results.set(file.id!, { status: "skipped", reason: "File non leggibile", checkedAt: now });
      continue;
    }
    let text = "";
    try {
      text = receiptText(await pdfText(await data.arrayBuffer()));
    } catch (e) {
      console.error("[fiscale] pdf text:", e instanceof Error ? e.message : e);
    }
    // A scan has no text to read: the file keeps the guess from its name.
    if (text.length < 40) {
      results.set(file.id!, { status: "skipped", reason: "PDF senza testo (scansione)", checkedAt: now });
      continue;
    }
    inputs.push({ id: file.id!, input: { payment: describePayment(entry), fileName: file.title, text } });
  }

  if (inputs.length > 0) {
    let reply: string;
    try {
      ({ text: reply } = await generate({
        system: CHECK_SYSTEM,
        prompt: buildCheckPrompt(inputs.map((i) => i.input)),
        model: CHECK_MODEL,
        effort: CHECK_EFFORT,
        signal: undefined,
      }));
    } catch (e) {
      console.error("[fiscale] receipt check:", e instanceof Error ? e.message : e);
      return { ok: false, checked: 0, remaining: todo.length, message: "Claude non risponde: riprova più tardi." };
    }
    parseCheckReply(reply, inputs.length, now).forEach((check, i) => {
      results.set(inputs[i].id, check ?? { status: "skipped", reason: "Risposta di Claude non valida", checkedAt: now });
    });
  }

  const byId = new Map(batch.map((b) => [b.file.id!, b]));
  for (const [id, check] of results) {
    // Once Claude knows what the file is, it takes that name ("Quietanza della
    // banca – INPS fissi 3ª rata 2026"); not when it seems of another payment.
    const named = check.status === "ok" && check.matches !== false;
    const { entry, file } = byId.get(id)!;
    const title = named ? `${CHECK_KINDS[check.kind]?.label ?? "Documento"} – ${paymentLabel(entry)}` : file.title;
    const { error } = await db
      .from("documents")
      .update(check.status === "ok" ? { ai_check: check, provisional: !check.final, title } : { ai_check: check })
      .eq("id", id);
    if (error) {
      console.error("[fiscale] save receipt check:", error.message);
      continue;
    }
    if (named && title !== file.title) {
      await renameStoredFile(supabase, file.path, title, async (path) => {
        const { error: e } = await db.from("documents").update({ file_path: path }).eq("id", id);
        return !e;
      });
    }
  }

  revalidatePath("/dashboard/fiscale", "layout");
  const remaining = todo.length - batch.length;
  return { ok: true, checked: results.size, remaining, message: `${results.size} file controllati.` };
}

/** Clears the check of one file so that Claude reads it again. */
export async function recheckFileAction(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  const supabase = await createClient();
  await supabase.schema("fiscale").from("documents").update({ ai_check: null }).eq("id", id);
  revalidatePath("/dashboard/fiscale", "layout");
}
