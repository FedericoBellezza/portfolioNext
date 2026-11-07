/**
 * From the lines of a paid F24 (read by Claude when a file is uploaded to
 * Documenti) to the calendar items they settle, e.g. 1792 anno 2025 →
 * "tax:balance:2025", AF 04/2026-06/2026 → "inps:fixed_q2:2026". Plain rules,
 * no AI: a line that does not fit one is reported and left to the owner.
 */

import { toCents, type Cents } from "./money";
import { CHECK_KINDS } from "./receipts";

export type F24Section = "erario" | "inps" | "inail" | "locali" | "altro";

/** One filled line of an F24, as Claude read it. */
export interface F24Row {
  section: F24Section;
  /** Codice tributo (erario, locali), causale (INPS: AF, AP…) or "INAIL". */
  code: string;
  /** Anno di riferimento (erario, locali). */
  year: number | null;
  /** INPS only: "MM/AAAA-MM/AAAA". */
  period: string | null;
  /** "Rateazione" field, e.g. "0103" = 1st of 3 installments. */
  installment: string | null;
  debit: number;
  credit: number;
}

/** A payment file as Claude read it: kind (see CHECK_KINDS), date and lines. */
export interface DocumentPayment {
  kind: string;
  date: string | null;
  rows: F24Row[];
}

export interface MatchedObligation {
  /** Calendar key, e.g. "inps:fixed_q2:2026". */
  key: string;
  amount: Cents;
  codes: string[];
}

export interface F24Match {
  obligations: MatchedObligation[];
  /** Lines with an amount due that settle no calendar item. */
  unmatched: { code: string; reason: string }[];
  /** The file proves the payment was made (quietanza, F24 versato, attestazione). */
  final: boolean;
  date: string | null;
  /** All paid with credits (saldo 0). */
  compensated: boolean;
}

const ERARIO: Record<string, string> = {
  "1792": "tax:balance",
  "1790": "tax:advance_1",
  "1791": "tax:advance_2",
  "2521": "stamp:q1",
  "2522": "stamp:q2",
  "2523": "stamp:q3",
  "2524": "stamp:q4",
  "3850": "chamber",
};

/** "0103" → 3 installments; "0101", empty or other content (region, month) → 1. */
function installments(field: string | null): number {
  const m = /^(\d{2})(\d{2})$/.exec((field ?? "").replace(/\D/g, ""));
  return m ? Number(m[2]) : 1;
}

/** Start of an INPS period: "04/2026-06/2026" or "042026 062026" → { month: 4, year: 2026 }. */
function periodStart(period: string | null): { month: number; year: number } | null {
  const m = /(\d{2})\s*\/?\s*(\d{4})/.exec(period ?? "");
  if (!m) return null;
  const month = Number(m[1]);
  const year = Number(m[2]);
  return month >= 1 && month <= 12 && year >= 2000 && year <= 2100 ? { month, year } : null;
}

function rowKey(row: F24Row, date: string | null): { key: string } | { reason: string } {
  const code = row.code.trim().toUpperCase();

  if (row.section === "inail" || code === "INAIL") {
    if (!date) return { reason: "data del versamento non letta" };
    const month = Number(date.slice(5, 7));
    // Autoliquidazione of February; installments of May, August, November are not tracked.
    return month <= 3 ? { key: `inail:${date.slice(0, 4)}` } : { reason: "rata INAIL successiva alla prima" };
  }

  if (row.section === "inps" || code === "AF" || code === "AP") {
    if (code === "CF" || code === "CP") return { reason: "Gestione Commercianti non gestita" };
    if (code !== "AF" && code !== "AP") return { reason: "causale INPS non gestita" };
    const start = periodStart(row.period);
    if (!start) return { reason: "periodo di riferimento non letto" };
    if (code === "AF") return { key: `inps:fixed_q${Math.ceil(start.month / 3)}:${start.year}` };
    // AP: the year of the period is the income year; paid the year after = saldo.
    if (!date) return { reason: "data del versamento non letta" };
    const paidYear = Number(date.slice(0, 4));
    if (paidYear > start.year) return { key: `inps:excess_balance:${start.year}` };
    if (paidYear < start.year) return { reason: "periodo successivo alla data del versamento" };
    return { key: `inps:${Number(date.slice(5, 7)) <= 9 ? "excess_advance_1" : "excess_advance_2"}:${start.year}` };
  }

  const prefix = ERARIO[code];
  if (!prefix) return { reason: "codice non gestito" };
  if (!row.year) return { reason: "anno di riferimento non letto" };
  if (installments(row.installment) > 1) return { reason: "pagato a rate: registralo a mano" };
  return { key: `${prefix}:${row.year}` };
}

export function matchF24(p: DocumentPayment): F24Match {
  const byKey = new Map<string, MatchedObligation>();
  const unmatched: F24Match["unmatched"] = [];
  let debit = 0;
  let credit = 0;

  for (const row of p.rows) {
    const d = row.debit > 0 ? toCents(row.debit) : 0;
    const c = row.credit > 0 ? toCents(row.credit) : 0;
    debit += d;
    credit += c;
    // A line with only a credit is money used to pay, not an amount due.
    if (d === 0) continue;
    const hit = rowKey(row, p.date);
    if ("reason" in hit) {
      unmatched.push({ code: row.code, reason: hit.reason });
      continue;
    }
    const prev = byKey.get(hit.key);
    if (prev) {
      prev.amount += d;
      if (!prev.codes.includes(row.code)) prev.codes.push(row.code);
    } else {
      byKey.set(hit.key, { key: hit.key, amount: d, codes: [row.code] });
    }
  }

  return {
    obligations: [...byKey.values()],
    unmatched,
    final: CHECK_KINDS[p.kind]?.final ?? false,
    date: p.date,
    compensated: credit > 0 && debit - credit <= 0,
  };
}
