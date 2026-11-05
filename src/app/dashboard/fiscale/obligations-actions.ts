"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/fiscale/auth";
import { DOCUMENT_BUCKET, DOCUMENT_MAX_BYTES, documentMime } from "@/lib/fiscale/documents";
import { toEuro, toCents } from "@/lib/fiscale/money";
import { obligationTarget } from "@/lib/fiscale/obligations";
import { fileKind, fileTitle } from "@/lib/fiscale/receipts";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { ok: boolean; message: string } | null;

const COMPENSATED_NOTE = "Pagato in compensazione con un credito d'imposta";
const MAX_FILES = 10;

const RegisterSchema = z.object({
  key: z.string().max(64),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data di pagamento non valida"),
  amount: z
    .string()
    // "1.130,34" and "1130,34" (Italian) or "1130.34"
    .transform((s) => Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s))
    .refine((n) => Number.isFinite(n) && n > 0 && n < 1_000_000, "Importo non valido"),
  reference: z.string().max(100).optional(),
});

async function ownerContext() {
  const user = await requireOwner();
  const supabase = await createClient();
  const db = supabase.schema("fiscale");
  const { data: profile } = await db.from("fiscal_profiles").select("user_id").maybeSingle();
  return { user, supabase, db, hasProfile: Boolean(profile) };
}

type OwnerContext = Awaited<ReturnType<typeof ownerContext>>;
type PaymentTable = "inps_payments" | "tax_payments";
type FileMeta = { path: string; mime: string; size: number; name: string };

const linkColumn = (table: PaymentTable) => (table === "inps_payments" ? "inps_payment_id" : "tax_payment_id");

/** Archive rows (category F24) for files already in the private bucket, linked to one payment. */
async function linkFiles(ctx: OwnerContext, table: PaymentTable, paymentId: string, year: number, files: FileMeta[]): Promise<boolean> {
  const { error } = await ctx.db.from("documents").insert(
    files.map((f) => ({
      title: fileTitle(f.name),
      // The F24 form or a booking only shows the payment was ordered.
      provisional: fileKind(f.name).provisional ?? false,
      category: "f24",
      year,
      file_path: f.path,
      mime_type: f.mime,
      size_bytes: f.size,
      [linkColumn(table)]: paymentId,
    })),
  );
  if (error) {
    console.error("[fiscale] link payment files:", error.message);
    await ctx.supabase.storage.from(DOCUMENT_BUCKET).remove(files.map((f) => f.path));
    return false;
  }
  return true;
}

/** Records the F24 paid for a calendar item: amount, date and (optionally) its files. */
export async function registerF24(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let ctx;
  try {
    ctx = await ownerContext();
  } catch {
    return { ok: false, message: "Non autorizzato." };
  }
  if (!ctx.hasProfile) return { ok: false, message: "Modalità demo: crea prima il profilo fiscale." };

  const parsed = RegisterSchema.safeParse({
    key: formData.get("key"),
    paidAt: formData.get("paidAt"),
    amount: formData.get("amount"),
    reference: formData.get("reference") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dati non validi." };
  const { key, paidAt, amount, reference } = parsed.data;
  // F24 "a zero": the tax is paid, but with a credit instead of cash.
  const notes = formData.get("compensated") === "on" ? COMPENSATED_NOTE : null;

  const target = obligationTarget(key);
  if (!target) return { ok: false, message: "Adempimento sconosciuto." };

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
  if (paidAt > today) return { ok: false, message: "La data di pagamento non può essere futura." };

  const uploads = formData.getAll("receipt").filter((f): f is File => f instanceof File && f.size > 0).slice(0, MAX_FILES);
  for (const f of uploads) {
    if (!documentMime(f)) return { ok: false, message: `${f.name}: formati ammessi PDF, JPG, PNG, XML o P7M.` };
  }

  const euro = toEuro(toCents(amount));
  const insert =
    target.table === "inps_payments"
      ? ctx.db.from("inps_payments").insert({
          paid_at: paidAt,
          competence_year: target.competenceYear,
          kind: target.kind,
          amount: euro,
          f24_causale: target.causale,
          f24_reference: reference ?? null,
          notes,
        }).select("id").single()
      : ctx.db.from("tax_payments").insert({
          paid_at: paidAt,
          competence_year: target.competenceYear,
          kind: target.kind,
          tribute_code: target.tributeCode ?? null,
          amount: euro,
          f24_reference: reference ?? null,
          notes,
        }).select("id").single();
  const { data: inserted, error } = await insert;
  if (error || !inserted) {
    if (error?.code === "23505") return { ok: false, message: "Questo adempimento risulta già registrato." };
    console.error("[fiscale] insert F24:", error?.message);
    return { ok: false, message: "Salvataggio non riuscito." };
  }

  // Files go to the archive (category F24), linked to the new payment.
  const stored: FileMeta[] = [];
  for (const f of uploads) {
    const mime = documentMime(f)!;
    if (f.size > DOCUMENT_MAX_BYTES) continue;
    const path = `${ctx.user.id}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]+/g, "_").slice(-80)}`;
    const up = await ctx.supabase.storage.from(DOCUMENT_BUCKET).upload(path, f, { contentType: mime });
    if (up.error) console.error("[fiscale] upload F24 file:", up.error.message);
    else stored.push({ path, mime, size: f.size, name: f.name });
  }
  const filesOk = stored.length === uploads.length && (stored.length === 0 || (await linkFiles(ctx, target.table, inserted.id, target.competenceYear, stored)));
  const filesNote = filesOk ? "" : " Alcuni file non sono stati salvati: caricali da Storico.";

  // Compensation with a recorded credit: the residual of that credit goes down.
  const creditId = String(formData.get("creditId") ?? "");
  if (notes && /^[0-9a-f-]{36}$/.test(creditId)) {
    const raw = String(formData.get("creditAmount") ?? "").trim();
    const used = raw ? Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw) : amount;
    if (Number.isFinite(used) && used > 0) {
      const { error: useError } = await ctx.db.from("tax_credit_uses").insert({
        credit_id: creditId,
        used_at: paidAt,
        amount: toEuro(toCents(used)),
        [linkColumn(target.table)]: inserted.id,
      });
      if (useError) {
        revalidatePath("/dashboard/fiscale", "layout");
        return {
          ok: false,
          message:
            (useError.message.includes("exceeded")
              ? "Pagamento registrato, ma il credito scelto non basta: controlla il residuo in Crediti."
              : "Pagamento registrato, ma l'uso del credito non è stato salvato.") + filesNote,
        };
      }
    }
  }

  revalidatePath("/dashboard/fiscale", "layout");
  return filesOk ? { ok: true, message: "Pagamento registrato." } : { ok: false, message: `Pagamento registrato.${filesNote}` };
}

/** Links files the browser has just uploaded to the archive bucket to a payment already recorded. */
export async function addPaymentFilesAction(input: { table: "inps" | "tax"; id: string; files: FileMeta[] }): Promise<ActionState> {
  let ctx;
  try {
    ctx = await ownerContext();
  } catch {
    return { ok: false, message: "Non autorizzato." };
  }
  if (!ctx.hasProfile) return { ok: false, message: "Modalità demo: crea prima il profilo fiscale." };

  const table: PaymentTable | null = input.table === "inps" ? "inps_payments" : input.table === "tax" ? "tax_payments" : null;
  if (!table || !/^[0-9a-f-]{36}$/.test(input.id)) return { ok: false, message: "Pagamento non valido." };
  const files = input.files.slice(0, MAX_FILES);
  if (files.length === 0) return { ok: false, message: "Scegli almeno un file." };
  for (const f of files) {
    if (!f.path.startsWith(`${ctx.user.id}/`) || f.path.includes("..")) return { ok: false, message: "File non valido." };
    if (!(f.size > 0 && f.size <= DOCUMENT_MAX_BYTES)) return { ok: false, message: `${f.name}: file troppo grande.` };
    if (!documentMime({ name: f.name, type: f.mime })) return { ok: false, message: `${f.name}: formato non ammesso.` };
  }

  // Read through RLS: only the owner's payments are found.
  const { data: row } = await ctx.db.from(table).select("competence_year").eq("id", input.id).maybeSingle();
  if (!row) {
    await ctx.supabase.storage.from(DOCUMENT_BUCKET).remove(files.map((f) => f.path));
    return { ok: false, message: "Pagamento non trovato." };
  }

  const ok = await linkFiles(ctx, table, input.id, Number(row.competence_year), files);
  revalidatePath("/dashboard/fiscale", "layout");
  return ok
    ? { ok: true, message: files.length === 1 ? "File caricato." : `${files.length} file caricati.` }
    : { ok: false, message: "Salvataggio non riuscito." };
}

/** Marks a calendar item as not due (e.g. the estimate does not apply to you). */
export async function dismissObligation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let ctx;
  try {
    ctx = await ownerContext();
  } catch {
    return { ok: false, message: "Non autorizzato." };
  }
  if (!ctx.hasProfile) return { ok: false, message: "Modalità demo: crea prima il profilo fiscale." };

  const key = String(formData.get("key") ?? "");
  if (!obligationTarget(key)) return { ok: false, message: "Adempimento sconosciuto." };
  const reason = String(formData.get("reason") ?? "").slice(0, 300) || null;

  const { error } = await ctx.db.from("obligation_dismissals").upsert({ obligation_key: key, reason });
  if (error) {
    console.error("[fiscale] dismiss:", error.message);
    return { ok: false, message: "Salvataggio non riuscito." };
  }
  revalidatePath("/dashboard/fiscale", "layout");
  return { ok: true, message: "Segnato come non dovuto." };
}
