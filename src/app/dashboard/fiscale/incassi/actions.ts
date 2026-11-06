"use server";

import { revalidatePath } from "next/cache";
import { requireFiscaleUser } from "@/lib/fiscale/auth";
import { fiscaleDb } from "@/lib/fiscale/data/load";

export type BulkState = { ok: boolean; message: string; errors?: Record<string, string> } | null;

const UUID = /^[0-9a-f-]{36}$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const todayRome = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const parseEuro = (raw: string) => Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);

/** Registers the collections of all ticked invoices in one go. */
export async function registerCollectionsAction(_prev: BulkState, formData: FormData): Promise<BulkState> {
  try {
    await requireFiscaleUser();
  } catch {
    return { ok: false, message: "Non autorizzato." };
  }
  const db = await fiscaleDb();
  const ids = formData.getAll("selected").map(String).filter((id) => UUID.test(id));
  if (ids.length === 0) return { ok: false, message: "Spunta almeno una fattura incassata." };

  const { data: invoices } = await db
    .from("invoices")
    .select("id, number, fiscal_year, issue_date, total_amount, status, invoice_payments(amount)")
    .in("id", ids);

  const today = todayRome();
  const errors: Record<string, string> = {};
  const rows: { invoice_id: string; collected_at: string; amount: number; method: string }[] = [];

  for (const inv of invoices ?? []) {
    const id = String(inv.id);
    const date = String(formData.get(`date-${id}`) ?? "");
    const amount = parseEuro(String(formData.get(`amount-${id}`) ?? "").trim());
    const paid = ((inv.invoice_payments as { amount: string }[] | null) ?? []).reduce((s, p) => s + Number(p.amount), 0);
    const remaining = Number(inv.total_amount) - paid;

    if (inv.status !== "issued") errors[id] = "Fattura non emessa.";
    else if (!ISO.test(date)) errors[id] = "Data mancante.";
    else if (date > today) errors[id] = "Data futura.";
    else if (inv.issue_date && date < String(inv.issue_date)) errors[id] = "Prima della data fattura.";
    else if (!Number.isFinite(amount) || amount <= 0) errors[id] = "Importo non valido.";
    else if (amount > remaining + 0.005) errors[id] = `Massimo ${remaining.toFixed(2).replace(".", ",")} €.`;
    else rows.push({ invoice_id: id, collected_at: date, amount: Math.round(amount * 100) / 100, method: "bonifico" });
  }

  // All or nothing: fix the highlighted rows and resubmit.
  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "Alcune righe hanno dati da correggere: nessun incasso salvato.", errors };
  }

  const { error } = await db.from("invoice_payments").insert(rows);
  if (error) {
    console.error("[fiscale] bulk collections:", error.message);
    return { ok: false, message: "Salvataggio non riuscito." };
  }
  revalidatePath("/dashboard/fiscale", "layout");
  return { ok: true, message: rows.length === 1 ? "1 incasso registrato." : `${rows.length} incassi registrati.` };
}
