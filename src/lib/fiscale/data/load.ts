import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toCents } from "../money";
import { DEFAULT_PROFILE, type FiscalProfile } from "../tax-config";
import { demoDataset } from "./demo";
import type { FiscalDataset, InvoiceRow } from "./types";

type Row = Record<string, unknown>;
const str = (v: unknown) => (v == null ? null : String(v));

/** Tables live in the `fiscale` schema (exposed in Settings → Data API). */
export async function fiscaleDb() {
  const supabase = await createClient();
  return supabase.schema("fiscale");
}

function profileFromRow(row: Row): FiscalProfile {
  return {
    ...DEFAULT_PROFILE,
    activityStartDate: String(row.activity_start_date),
    atecoCode: String(row.ateco_code),
    profitabilityCoefficient: Number(row.profitability_coefficient),
    startupTaxRate: Number(row.startup_tax_rate),
    standardTaxRate: Number(row.standard_tax_rate),
    startupYears: Number(row.startup_years),
    inpsReduction35Active: Boolean(row.inps_reduction_35_active),
    inpsReduction50NewEnrollmentActive: Boolean(row.inps_reduction_50_new_enrollment_active),
    chargeStampDutyToClient: Boolean(row.charge_stamp_duty_to_client),
  };
}

/**
 * Loads the signed-in user's fiscal data. Until a row exists in
 * `fiscale.fiscal_profiles` the dashboard shows demo data (like the Trader page).
 */
export async function loadDataset(): Promise<FiscalDataset> {
  const db = await fiscaleDb();
  const profile = await db.from("fiscal_profiles").select("*").maybeSingle();
  if (profile.error) throw new Error(`Supabase (fiscale): ${profile.error.message}`);
  if (!profile.data) return demoDataset;

  const [clients, invoices, payments, inps, taxes, expenses, dismissals, reminders, completions, credits, creditUses, payDocs] = await Promise.all([
    db.from("clients").select("*").is("archived_at", null).order("company_name"),
    db
      .from("invoices")
      .select("*, clients(company_name, first_name, last_name)")
      .order("issue_date", { ascending: false, nullsFirst: true }),
    db.from("invoice_payments").select("*").order("collected_at"),
    db.from("inps_payments").select("*").order("paid_at"),
    db.from("tax_payments").select("*").order("paid_at"),
    db.from("expenses").select("*").order("spent_at"),
    db.from("obligation_dismissals").select("obligation_key"),
    db.from("reminders").select("*").is("archived_at", null).order("first_due"),
    db.from("task_completions").select("task_key, completed_at, document_id, note"),
    db.from("tax_credits").select("*").order("reference_year", { ascending: false }),
    db.from("tax_credit_uses").select("id, credit_id, used_at, amount, note").order("used_at"),
    db
      .from("documents")
      .select("id, title, file_path, provisional, inps_payment_id, tax_payment_id")
      .or("inps_payment_id.not.is.null,tax_payment_id.not.is.null")
      .order("created_at"),
  ]);
  const failed = [clients, invoices, payments, inps, taxes, expenses, dismissals, reminders, completions, credits, creditUses, payDocs].find((r) => r.error);
  if (failed?.error) throw new Error(`Supabase (fiscale): ${failed.error.message}`);

  const collections = (payments.data ?? []).map((p: Row) => ({
    id: String(p.id),
    invoiceId: String(p.invoice_id),
    collectedAt: String(p.collected_at),
    amount: toCents(p.amount as string),
  }));

  const clientName = (c: Row | null) =>
    c ? String(c.company_name ?? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()) : "—";

  const invoiceRows: InvoiceRow[] = (invoices.data ?? []).map((i: Row) => {
    const mine = collections.filter((c) => c.invoiceId === i.id);
    return {
      id: String(i.id),
      number: i.number as number | null,
      fiscalYear: i.fiscal_year as number | null,
      issueDate: str(i.issue_date),
      dueDate: str(i.due_date),
      clientId: String(i.client_id),
      clientName: clientName(i.clients as Row | null),
      status: i.status as InvoiceRow["status"],
      sdiStatus: i.sdi_status as InvoiceRow["sdiStatus"],
      taxableAmount: toCents(i.taxable_amount as string),
      stampDuty: toCents(i.stamp_duty_amount as string),
      total: toCents(i.total_amount as string),
      collected: mine.reduce((s, c) => s + c.amount, 0),
      lastCollectedAt: mine.at(-1)?.collectedAt ?? null,
    };
  });

  const p = profile.data as Row;
  return {
    source: "supabase",
    owner: { name: `${p.first_name} ${p.last_name}`, vatNumber: String(p.vat_number) },
    profile: profileFromRow(p),
    clients: (clients.data ?? []).map((c: Row) => ({
      id: String(c.id),
      name: clientName(c),
      vatNumber: str(c.vat_number),
      taxCode: str(c.tax_code),
      sdiCode: String(c.sdi_code),
      pec: str(c.pec),
      city: String(c.city),
    })),
    invoices: invoiceRows,
    collections,
    inpsPayments: (inps.data ?? []).map((r: Row) => ({
      id: String(r.id),
      paidAt: String(r.paid_at),
      competenceYear: Number(r.competence_year),
      kind: r.kind as FiscalDataset["inpsPayments"][number]["kind"],
      amount: toCents(r.amount as string),
      reference: str(r.f24_reference),
      receiptPath: str(r.receipt_path),
      compensated: String(r.notes ?? "").startsWith("Pagato in compensazione"),
    })),
    taxPayments: (taxes.data ?? []).map((r: Row) => ({
      id: String(r.id),
      paidAt: String(r.paid_at),
      competenceYear: Number(r.competence_year),
      kind: r.kind as FiscalDataset["taxPayments"][number]["kind"],
      tributeCode: str(r.tribute_code),
      amount: toCents(r.amount as string),
      receiptPath: str(r.receipt_path),
      compensated: String(r.notes ?? "").startsWith("Pagato in compensazione"),
    })),
    expenses: (expenses.data ?? []).map((r: Row) => ({
      id: String(r.id),
      spentAt: String(r.spent_at),
      amount: toCents(r.amount as string),
      category: String(r.category),
      vendor: str(r.vendor),
      description: str(r.description),
    })),
    dismissedKeys: (dismissals.data ?? []).map((d: Row) => String(d.obligation_key)),
    reminders: (reminders.data ?? []).map((r: Row) => ({
      id: String(r.id),
      title: String(r.title),
      scope: r.scope === "business" ? "business" : "personal",
      firstDue: String(r.first_due),
      recurrence: (["once", "monthly", "yearly"].includes(String(r.recurrence)) ? r.recurrence : "yearly") as "once" | "monthly" | "yearly",
      amount: r.amount == null ? null : toCents(r.amount as string),
      notes: str(r.notes),
    })),
    credits: (credits.data ?? []).map((c: Row) => {
      const uses = (creditUses.data ?? [])
        .filter((u: Row) => u.credit_id === c.id)
        .map((u: Row) => ({ id: String(u.id), usedAt: String(u.used_at), amount: toCents(u.amount as string), note: str(u.note) }));
      const amount = toCents(c.amount as string);
      const used = uses.reduce((s, u) => s + u.amount, 0);
      return {
        id: String(c.id),
        kind: (["irpef", "substitute_tax", "inps", "other"].includes(String(c.kind)) ? c.kind : "other") as "irpef" | "substitute_tax" | "inps" | "other",
        referenceYear: Number(c.reference_year),
        amount,
        destination: c.destination === "refund" ? "refund" : "compensation",
        source: str(c.source),
        notes: str(c.notes),
        uses,
        used,
        residual: amount - used,
      };
    }),
    completedTasks: (completions.data ?? []).map((c: Row) => ({
      key: String(c.task_key),
      completedAt: String(c.completed_at),
      documentId: str(c.document_id),
      note: str(c.note),
    })),
    paymentDocuments: (payDocs.data ?? []).map((d: Row) => ({
      id: String(d.id),
      title: String(d.title),
      path: String(d.file_path),
      provisional: Boolean(d.provisional),
      inpsPaymentId: str(d.inps_payment_id),
      taxPaymentId: str(d.tax_payment_id),
    })),
  };
}
