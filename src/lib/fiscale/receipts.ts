import type { Cents } from "./money";
import type { FiscalDataset } from "./data/types";

/** One recorded payment (INPS or Erario/other), as shown in the history. */
export interface PaymentEntry {
  table: "inps" | "tax";
  id: string;
  date: string;
  kind: string;
  competenceYear: number;
  amount: Cents;
  receipt: string | null;
  compensated: boolean;
}

export function paymentEntries(data: Pick<FiscalDataset, "inpsPayments" | "taxPayments">): PaymentEntry[] {
  return [
    ...data.inpsPayments.map((p) => ({
      table: "inps" as const,
      id: p.id,
      date: p.paidAt,
      kind: p.kind,
      competenceYear: p.competenceYear,
      amount: p.amount,
      receipt: p.receiptPath,
      compensated: Boolean(p.compensated),
    })),
    ...data.taxPayments.map((p) => ({
      table: "tax" as const,
      id: p.id,
      date: p.paidAt,
      kind: p.kind,
      competenceYear: p.competenceYear,
      amount: p.amount,
      receipt: p.receiptPath,
      compensated: Boolean(p.compensated),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Payments already made (date reached) with no receipt attached. Scheduled ones
 * (date in the future) are left out: their receipt does not exist yet.
 */
export function missingReceipts(entries: PaymentEntry[], asOf: string): PaymentEntry[] {
  return entries.filter((e) => !e.receipt && e.date <= asOf);
}
