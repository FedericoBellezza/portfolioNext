/**
 * Money helpers. All fiscal math runs on integer euro cents so results are
 * deterministic (no floating point drift). Convert at the edges only:
 * DB numeric(12,2) <-> cents, cents -> formatted string for the UI.
 */

export type Cents = number;

/** Round half away from zero, the convention used on F24 and invoices. */
export function roundCents(value: number): Cents {
  return Math.sign(value) * Math.round(Math.abs(value) + Number.EPSILON);
}

/** 12.34 (euro) -> 1234 (cents). Accepts numbers or numeric strings from Postgres. */
export function toCents(euro: number | string): Cents {
  const n = typeof euro === "string" ? Number(euro) : euro;
  if (!Number.isFinite(n)) throw new Error(`Invalid amount: ${euro}`);
  return roundCents(n * 100);
}

/** 1234 (cents) -> 12.34 (euro), for DB writes and XML. */
export function toEuro(cents: Cents): number {
  return cents / 100;
}

/** cents * rate, rounded to the cent. */
export function applyRate(cents: Cents, rate: number): Cents {
  return roundCents(cents * rate);
}

export function sumCents(values: Iterable<Cents>): Cents {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

const eurFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  // it-IT skips the separator on 4-digit amounts ("3785,02"); force it.
  useGrouping: "always",
} as Intl.NumberFormatOptions);

export function formatEUR(cents: Cents): string {
  return eurFormatter.format(cents / 100);
}

/** "1234.50" fixed two decimals, as required by FatturaPA amounts. */
export function toFixed2(cents: Cents): string {
  return (cents / 100).toFixed(2);
}
