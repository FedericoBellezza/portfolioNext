/**
 * Bridge between the simulated F24 calendar (item keys like "inps:fixed_q4:2025")
 * and the payments recorded in the DB (inps_payments / tax_payments rows).
 */

import type { FiscalDataset, TaxPaymentKind } from "./data/types";
import type { InpsPaymentKind } from "./tax-calculator";

export type ObligationTarget =
  | { table: "inps_payments"; kind: InpsPaymentKind; competenceYear: number; causale: "AF" | "AP" }
  | { table: "tax_payments"; kind: TaxPaymentKind; competenceYear: number; tributeCode: string | null };

const INPS_KINDS: readonly InpsPaymentKind[] = [
  "fixed_q1", "fixed_q2", "fixed_q3", "fixed_q4",
  "excess_balance", "excess_advance_1", "excess_advance_2",
];

const TAX_BY_KEY: Record<string, { kind: TaxPaymentKind; code: string | null }> = {
  "tax:balance": { kind: "substitute_tax_balance", code: "1792" },
  "tax:advance_1": { kind: "substitute_tax_advance_1", code: "1790" },
  "tax:advance_2": { kind: "substitute_tax_advance_2", code: "1791" },
  "stamp:q1": { kind: "stamp_duty_q1", code: "2521" },
  "stamp:q2": { kind: "stamp_duty_q2", code: "2522" },
  "stamp:q3": { kind: "stamp_duty_q3", code: "2523" },
  "stamp:q4": { kind: "stamp_duty_q4", code: "2524" },
  chamber: { kind: "chamber_fee", code: "3850" },
  inail: { kind: "inail_premium", code: null }, // sezione INAIL dell'F24, senza codice tributo
};

/** Which row to write when the owner registers the F24 for a calendar item. */
export function obligationTarget(key: string): ObligationTarget | null {
  const m = /^(.+):(\d{4})$/.exec(key);
  if (!m) return null;
  const [, prefix, yearStr] = m;
  const competenceYear = Number(yearStr);

  if (prefix.startsWith("inps:")) {
    const kind = prefix.slice(5) as InpsPaymentKind;
    if (!INPS_KINDS.includes(kind)) return null;
    return { table: "inps_payments", kind, competenceYear, causale: kind.startsWith("fixed") ? "AF" : "AP" };
  }
  const tax = TAX_BY_KEY[prefix];
  return tax ? { table: "tax_payments", kind: tax.kind, competenceYear, tributeCode: tax.code } : null;
}

const TAX_KIND_TO_PREFIX = Object.fromEntries(
  Object.entries(TAX_BY_KEY).map(([prefix, { kind }]) => [kind, prefix]),
) as Partial<Record<TaxPaymentKind, string>>;

/** Calendar keys already covered by a recorded payment or marked as not due. */
export function settledKeys(data: FiscalDataset) {
  const paid = new Set<string>();
  for (const p of data.inpsPayments) paid.add(`inps:${p.kind}:${p.competenceYear}`);
  for (const p of data.taxPayments) {
    const prefix = TAX_KIND_TO_PREFIX[p.kind];
    if (prefix) paid.add(`${prefix}:${p.competenceYear}`);
  }
  return { paid, dismissed: new Set(data.dismissedKeys) };
}
