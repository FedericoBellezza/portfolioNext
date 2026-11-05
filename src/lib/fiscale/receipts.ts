import type { Cents } from "./money";
import type { FiscalDataset } from "./data/types";

/** A file attached to a payment: an archive document, or the older single receipt. */
export interface PaymentFile {
  /** Document id; null for the older single receipt (`receipt_path`). */
  id: string | null;
  title: string;
  path: string;
  bucket: "fiscale-docs" | "fiscale-f24";
  provisional: boolean;
}

/** One recorded payment (INPS or Erario/other), as shown in the history. */
export interface PaymentEntry {
  table: "inps" | "tax";
  id: string;
  date: string;
  kind: string;
  competenceYear: number;
  amount: Cents;
  files: PaymentFile[];
  /** Marked as paid in F24 compensation (also when the credit used is not recorded). */
  compensated: boolean;
  /** Recorded credit used for this payment; the rest was debited to the bank. */
  creditUsed: Cents;
}

type Source = Pick<FiscalDataset, "inpsPayments" | "taxPayments" | "paymentDocuments"> & Partial<Pick<FiscalDataset, "credits">>;

function creditOf(data: Source, table: "inps" | "tax", id: string): Cents {
  let used = 0;
  for (const c of data.credits ?? []) {
    for (const u of c.uses) if ((table === "inps" ? u.inpsPaymentId : u.taxPaymentId) === id) used += u.amount;
  }
  return used;
}

/** How a payment was settled: all by credit, part credit and part bank, or bank only. */
export function settlement(e: Pick<PaymentEntry, "amount" | "creditUsed" | "compensated">): {
  mode: "credit" | "mixed" | "bank" | "compensated";
  credit: Cents;
  bank: Cents;
} {
  if (e.creditUsed <= 0) return { mode: e.compensated ? "compensated" : "bank", credit: 0, bank: e.compensated ? 0 : e.amount };
  const credit = Math.min(e.creditUsed, e.amount);
  const bank = e.amount - credit;
  return { mode: bank > 0 ? "mixed" : "credit", credit, bank };
}

function filesOf(data: Source, table: "inps" | "tax", id: string, legacy: string | null): PaymentFile[] {
  const docs = data.paymentDocuments
    .filter((d) => (table === "inps" ? d.inpsPaymentId : d.taxPaymentId) === id)
    .map((d) => ({ id: d.id, title: d.title, path: d.path, bucket: "fiscale-docs" as const, provisional: d.provisional }));
  return legacy ? [{ id: null, title: "Ricevuta", path: legacy, bucket: "fiscale-f24" as const, provisional: false }, ...docs] : docs;
}

export function paymentEntries(data: Source): PaymentEntry[] {
  return [
    ...data.inpsPayments.map((p) => ({
      table: "inps" as const,
      id: p.id,
      date: p.paidAt,
      kind: p.kind,
      competenceYear: p.competenceYear,
      amount: p.amount,
      files: filesOf(data, "inps", p.id, p.receiptPath),
      compensated: Boolean(p.compensated),
      creditUsed: creditOf(data, "inps", p.id),
    })),
    ...data.taxPayments.map((p) => ({
      table: "tax" as const,
      id: p.id,
      date: p.paidAt,
      kind: p.kind,
      competenceYear: p.competenceYear,
      amount: p.amount,
      files: filesOf(data, "tax", p.id, p.receiptPath),
      compensated: Boolean(p.compensated),
      creditUsed: creditOf(data, "tax", p.id),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

/** True when the payment has at least one file that is the final proof of payment. */
export const hasFinalReceipt = (e: PaymentEntry) => e.files.some((f) => !f.provisional);

/**
 * Payments already made (date reached) with no final receipt: no file at all, or
 * only provisional ones (e.g. the booking of the stamp duty debit). Scheduled
 * ones (date in the future) are left out: their receipt does not exist yet.
 */
export function missingReceipts(entries: PaymentEntry[], asOf: string): PaymentEntry[] {
  return entries.filter((e) => !hasFinalReceipt(e) && e.date <= asOf);
}

/** Title for an uploaded file: its name without extension, tidied up. */
export function fileTitle(name: string): string {
  const base = name.replace(/\.[a-z0-9]{2,4}$/i, "").replace(/[_\s]+/g, " ").trim();
  return (base || "Documento").slice(0, 200);
}
