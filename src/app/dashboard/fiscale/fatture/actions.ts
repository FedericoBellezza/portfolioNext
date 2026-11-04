"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOwner } from "@/lib/fiscale/auth";
import { fiscaleDb } from "@/lib/fiscale/data/load";
import { computeInvoiceTotals } from "@/lib/fiscale/invoice-math";
import { toCents, toEuro } from "@/lib/fiscale/money";
import { DEFAULT_PROFILE, FORFETTARIO_CLAUSE } from "@/lib/fiscale/tax-config";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const DraftSchema = z.object({
  clientId: z.string().uuid("Seleziona un cliente"),
  issueDate: isoDate,
  dueDate: isoDate,
  notes: z.string().max(2000).optional(),
  lines: z
    .array(
      z.object({
        description: z.string().trim().min(1, "Ogni riga ha bisogno di una descrizione").max(1000),
        quantity: z.number().positive("Quantità non valida"),
        unitPrice: z.number().nonnegative("Prezzo non valido"), // euro
      }),
    )
    .min(1, "Aggiungi almeno una riga"),
});

export type DraftState = { ok: boolean; message: string } | null;

export async function createDraftInvoice(_prev: DraftState, formData: FormData): Promise<DraftState> {
  try {
    await requireOwner();
  } catch {
    return { ok: false, message: "Non autorizzato." };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { ok: false, message: "Dati non validi." };
  }
  const parsed = DraftSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dati non validi." };
  const input = parsed.data;

  const db = await fiscaleDb();
  const { data: profileRow } = await db.from("fiscal_profiles").select("charge_stamp_duty_to_client").maybeSingle();
  if (!profileRow) {
    return { ok: false, message: "Crea prima il tuo profilo fiscale: ora la pagina mostra dati dimostrativi." };
  }
  const profile = { ...DEFAULT_PROFILE, chargeStampDutyToClient: Boolean(profileRow.charge_stamp_duty_to_client) };

  // I totali si ricalcolano sempre sul server.
  const totals = computeInvoiceTotals(
    input.lines.map((l) => ({ ...l, unitPrice: toCents(l.unitPrice) })),
    { issueDate: input.issueDate, profile },
  );

  const { data: invoice, error } = await db
    .from("invoices")
    .insert({
      client_id: input.clientId,
      issue_date: input.issueDate,
      due_date: input.dueDate,
      taxable_amount: toEuro(totals.taxableAmount),
      stamp_duty_amount: toEuro(totals.stampDuty),
      stamp_duty_charged: totals.stampDutyCharged,
      total_amount: toEuro(totals.totalDocument),
      forfettario_clause: FORFETTARIO_CLAUSE,
      notes: input.notes || null,
    })
    .select("id")
    .single();
  if (error || !invoice) {
    console.error("[fiscale] insert invoice:", error?.message);
    return { ok: false, message: "Errore nel salvataggio della fattura." };
  }

  const items = totals.lines.map((l, i) => ({
    invoice_id: invoice.id,
    position: i + 1,
    description: l.description,
    quantity: l.quantity,
    unit_price: toEuro(l.unitPrice),
    line_total: toEuro(l.lineTotal),
    vat_nature: l.vatNature,
    is_stamp_duty_recharge: false,
  }));
  if (totals.stampDutyCharged) {
    items.push({
      invoice_id: invoice.id,
      position: items.length + 1,
      description: "Rivalsa imposta di bollo",
      quantity: 1,
      unit_price: toEuro(totals.stampDuty),
      line_total: toEuro(totals.stampDuty),
      vat_nature: "N1", // escluse art. 15 DPR 633/72: prassi comune, da confermare col commercialista
      is_stamp_duty_recharge: true,
    });
  }
  const { error: itemsError } = await db.from("invoice_items").insert(items);
  if (itemsError) {
    console.error("[fiscale] insert items:", itemsError.message);
    await db.from("invoices").delete().eq("id", invoice.id);
    return { ok: false, message: "Errore nel salvataggio delle righe." };
  }

  redirect(`/dashboard/fiscale/fatture/${invoice.id}`);
}
