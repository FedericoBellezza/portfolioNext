"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/fiscale/auth";
import { toEuro, toCents } from "@/lib/fiscale/money";
import { obligationTarget } from "@/lib/fiscale/obligations";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { ok: boolean; message: string } | null;

const COMPENSATED_NOTE = "Pagato in compensazione con un credito d'imposta";

const BUCKET = "fiscale-f24";
const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };

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

/** Optional F24 receipt: validated and stored in the private bucket, under the owner's folder. */
async function storeReceipt(
  ctx: OwnerContext,
  file: FormDataEntryValue | null,
  name: string,
): Promise<{ path: string | null } | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return { path: null };
  const ext = EXT[file.type];
  if (!ext) return { error: "La ricevuta deve essere un PDF, JPG o PNG." };
  if (file.size > MAX_BYTES) return { error: "La ricevuta supera i 5 MB." };
  const path = `${ctx.user.id}/${name}-${Date.now()}.${ext}`;
  const upload = await ctx.supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (upload.error) {
    console.error("[fiscale] upload F24:", upload.error.message);
    return { error: "Caricamento della ricevuta non riuscito." };
  }
  return { path };
}

/** Records the F24 paid for a calendar item: amount, date and (optionally) the receipt. */
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

  const stored = await storeReceipt(ctx, formData.get("receipt"), `${target.competenceYear}/${key.replace(/:/g, "_")}`);
  if ("error" in stored) return { ok: false, message: stored.error };
  const path = stored.path;

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
          receipt_path: path,
          notes,
        })
      : ctx.db.from("tax_payments").insert({
          paid_at: paidAt,
          competence_year: target.competenceYear,
          kind: target.kind,
          tribute_code: target.tributeCode ?? null,
          amount: euro,
          f24_reference: reference ?? null,
          receipt_path: path,
          notes,
        });
  const { error } = await insert;
  if (error) {
    if (path) await ctx.supabase.storage.from(BUCKET).remove([path]);
    if (error.code === "23505") return { ok: false, message: "Questo adempimento risulta già registrato." };
    console.error("[fiscale] insert F24:", error.message);
    return { ok: false, message: "Salvataggio non riuscito." };
  }

  revalidatePath("/dashboard/fiscale", "layout");
  return { ok: true, message: "Pagamento registrato." };
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

