import type { Cents } from "./money";
import type { FiscalDataset } from "./data/types";

/** A file attached to a payment: an archive document, or the older single receipt. */
export interface PaymentFile {
  /** Document id; null for the older single receipt (`receipt_path`). */
  id: string | null;
  title: string;
  path: string;
  bucket: "fiscale-docs" | "fiscale-f24";
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
  compensated: boolean;
}

type Source = Pick<FiscalDataset, "inpsPayments" | "taxPayments" | "paymentDocuments">;

function filesOf(data: Source, table: "inps" | "tax", id: string, legacy: string | null): PaymentFile[] {
  const docs = data.paymentDocuments
    .filter((d) => (table === "inps" ? d.inpsPaymentId : d.taxPaymentId) === id)
    .map((d) => ({ id: d.id, title: d.title, path: d.path, bucket: "fiscale-docs" as const }));
  return legacy ? [{ id: null, title: "Ricevuta", path: legacy, bucket: "fiscale-f24" as const }, ...docs] : docs;
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
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Payments already made (date reached) with no file attached. Scheduled ones
 * (date in the future) are left out: their receipt does not exist yet.
 */
export function missingReceipts(entries: PaymentEntry[], asOf: string): PaymentEntry[] {
  return entries.filter((e) => e.files.length === 0 && e.date <= asOf);
}

/** Title for an uploaded file: its name without extension, tidied up. */
export function fileTitle(name: string): string {
  const base = name.replace(/\.[a-z0-9]{2,4}$/i, "").replace(/[_\s]+/g, " ").trim();
  return (base || "Documento").slice(0, 200);
}
