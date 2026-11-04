"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/fiscale/auth";
import { fiscaleDb } from "@/lib/fiscale/data/load";
import { toCents, toEuro } from "@/lib/fiscale/money";

export type CreditState = { ok: boolean; message: string } | null;

const parseEuro = (raw: string) => Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);
const refresh = () => revalidatePath("/dashboard/fiscale", "layout");

export async function createCreditAction(_prev: CreditState, formData: FormData): Promise<CreditState> {
  try {
    await requireOwner();
  } catch {
    return { ok: false, message: "Non autorizzato." };
  }
  const kind = String(formData.get("kind") ?? "irpef");
  const year = Number(formData.get("referenceYear"));
  const amount = parseEuro(String(formData.get("amount") ?? "").trim());
  const destination = formData.get("destination") === "refund" ? "refund" : "compensation";
  const source = String(formData.get("source") ?? "").trim().slice(0, 200) || null;
  if (!["irpef", "substitute_tax", "inps", "other"].includes(kind)) return { ok: false, message: "Tipo non valido." };
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { ok: false, message: "Anno non valido." };
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return { ok: false, message: "Importo non valido." };

  const db = await fiscaleDb();
  const { error } = await db
    .from("tax_credits")
    .insert({ kind, reference_year: year, amount: toEuro(toCents(amount)), destination, source });
  if (error) {
    console.error("[fiscale] create credit:", error.message);
    return { ok: false, message: "Salvataggio non riuscito." };
  }
  refresh();
  return { ok: true, message: "Credito registrato." };
}

/** Corrects the amount of a credit (e.g. after checking it with the accountant). */
export async function updateCreditAmountAction(_prev: CreditState, formData: FormData): Promise<CreditState> {
  try {
    await requireOwner();
  } catch {
    return { ok: false, message: "Non autorizzato." };
  }
  const id = String(formData.get("id") ?? "");
  const amount = parseEuro(String(formData.get("amount") ?? "").trim());
  if (!/^[0-9a-f-]{36}$/.test(id)) return { ok: false, message: "Credito non valido." };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, message: "Importo non valido." };

  const db = await fiscaleDb();
  const { data: uses } = await db.from("tax_credit_uses").select("amount").eq("credit_id", id);
  const used = (uses ?? []).reduce((s, u) => s + Number(u.amount), 0);
  if (amount + 0.005 < used) {
    return { ok: false, message: `Ne hai già usati ${used.toFixed(2).replace(".", ",")} €: l'importo non può essere inferiore.` };
  }
  const { error } = await db.from("tax_credits").update({ amount: toEuro(toCents(amount)), notes: null }).eq("id", id);
  if (error) return { ok: false, message: "Salvataggio non riuscito." };
  refresh();
  return { ok: true, message: "Importo aggiornato." };
}

export async function deleteCreditAction(formData: FormData): Promise<void> {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  const db = await fiscaleDb();
  await db.from("tax_credits").delete().eq("id", id);
  refresh();
}
