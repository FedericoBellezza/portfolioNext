import type { Cents } from "./money";
import type { FileCheck, FiscalDataset } from "./data/types";

/** A file attached to a payment: an archive document, or the older single receipt. */
export interface PaymentFile {
  /** Document id; null for the older single receipt (`receipt_path`). */
  id: string | null;
  title: string;
  path: string;
  bucket: "fiscale-docs" | "fiscale-f24";
  provisional: boolean;
  /** What Claude read in the file; null until checked. */
  check: FileCheck | null;
}

const KIND_LABEL: Record<string, string> = {
  fixed_q1: "INPS fissi 1ª rata",
  fixed_q2: "INPS fissi 2ª rata",
  fixed_q3: "INPS fissi 3ª rata",
  fixed_q4: "INPS fissi 4ª rata",
  excess_balance: "INPS eccedenza saldo",
  excess_advance_1: "INPS eccedenza 1° acconto",
  excess_advance_2: "INPS eccedenza 2° acconto",
  substitute_tax_balance: "Imposta sostitutiva saldo",
  substitute_tax_advance_1: "Imposta sostitutiva 1° acconto",
  substitute_tax_advance_2: "Imposta sostitutiva 2° acconto",
  stamp_duty_q1: "Bollo 1° trimestre",
  stamp_duty_q2: "Bollo 2° trimestre",
  stamp_duty_q3: "Bollo 3° trimestre",
  stamp_duty_q4: "Bollo 4° trimestre",
  chamber_fee: "Diritto camerale",
  inail_premium: "Premio INAIL",
  other: "Altro",
};

/** Name of a payment, e.g. "INPS fissi 3ª rata 2026". */
export const paymentLabel = (p: Pick<PaymentEntry, "table" | "kind" | "competenceYear">) =>
  `${p.kind === "other" ? (p.table === "inps" ? "Altri contributi INPS" : "Altro versamento") : (KIND_LABEL[p.kind] ?? p.kind)} ${p.competenceYear}`;

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
    .map((d) => ({ id: d.id, title: d.title, path: d.path, bucket: "fiscale-docs" as const, provisional: d.provisional, check: d.check ?? null }));
  return legacy ? [{ id: null, title: "Ricevuta", path: legacy, bucket: "fiscale-f24" as const, provisional: false, check: null }, ...docs] : docs;
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
export const hasFinalReceipt = (e: PaymentEntry) => e.files.some((f) => !f.provisional && !belongsElsewhere(f));

/** Claude found that the file is about another payment. */
export const belongsElsewhere = (f: Pick<PaymentFile, "check">) => f.check?.status === "ok" && f.check.matches === false;

/**
 * Payments already made (date reached) with no final receipt: no file at all, or
 * only provisional ones (e.g. the booking of the stamp duty debit). Scheduled
 * ones (date in the future) are left out: their receipt does not exist yet.
 */
export function missingReceipts(entries: PaymentEntry[], asOf: string): PaymentEntry[] {
  return entries.filter((e) => !hasFinalReceipt(e) && e.date <= asOf);
}

/**
 * What a payment file is, guessed from its title or file name. Final proof
 * (provisional false): the bank receipt, the Agenzia receipt, the stamp duty
 * payment certificate. Provisional: the F24 form itself, the sending receipt
 * of an F24, the stamp duty booking. Null when the name says nothing.
 */
const FILE_KINDS: { test: RegExp; label: string; provisional: boolean | null }[] = [
  { test: /quietanza[\s_-]*banca/i, label: "Quietanza della banca", provisional: false },
  { test: /quietanza/i, label: "Quietanza", provisional: false },
  { test: /attestazione[\s_-]*(di[\s_-]*)?pagamento/i, label: "Attestazione di pagamento", provisional: false },
  { test: /cassetto[\s_-]*fiscale/i, label: "Ricevuta del Cassetto fiscale", provisional: false },
  { test: /prenotazione/i, label: "Prenotazione", provisional: true },
  { test: /ricevuta[\s_-]*(di[\s_-]*)?invio/i, label: "Ricevuta di invio", provisional: true },
  { test: /modello[\s_-]*f24|(^|[^a-z])f24([^a-z]|$)/i, label: "Modello F24", provisional: true },
  { test: /ricevuta/i, label: "Ricevuta", provisional: null },
];

export function fileKind(title: string): { label: string; provisional: boolean | null } {
  const hit = FILE_KINDS.find((k) => k.test.test(title));
  return hit ? { label: hit.label, provisional: hit.provisional } : { label: "Documento", provisional: null };
}

/**
 * Where a payment stands with its proof: confirmed by a final receipt, waiting
 * for it (only provisional files), missing (date reached, no file), or just
 * scheduled (future date, no file yet).
 */
export type ProofStatus = "confirmed" | "waiting" | "missing" | "scheduled";

export function proofStatus(e: PaymentEntry, asOf: string): ProofStatus {
  if (hasFinalReceipt(e)) return "confirmed";
  if (e.files.length > 0) return "waiting";
  return e.date <= asOf ? "missing" : "scheduled";
}

/** Kinds Claude can tell apart in a payment file (see receipt-check.ts). */
export const CHECK_KINDS: Record<string, { label: string; final: boolean }> = {
  quietanza_banca: { label: "Quietanza della banca", final: true },
  f24_versato: { label: "F24 versato", final: true },
  attestazione_pagamento: { label: "Attestazione di pagamento", final: true },
  prenotazione: { label: "Prenotazione", final: false },
  ricevuta_invio: { label: "Ricevuta di invio", final: false },
  modello_f24: { label: "Modello F24", final: false },
  altro: { label: "Documento", final: false },
};

/** Short name of a file: what Claude read in it, otherwise a guess from its name. */
export function fileLabel(f: Pick<PaymentFile, "title" | "check">): string {
  if (f.check?.status === "ok") return CHECK_KINDS[f.check.kind]?.label ?? "Documento";
  return fileKind(f.title).label;
}

/** PDF files of the archive not yet checked by Claude. */
export function uncheckedFiles(entries: PaymentEntry[]): { entry: PaymentEntry; file: PaymentFile }[] {
  return entries.flatMap((entry) =>
    entry.files.filter((f) => f.id && !f.check && /\.pdf$/i.test(f.path)).map((file) => ({ entry, file })),
  );
}

const ADE = "https://www.agenziaentrate.gov.it/portale/";
const FATTURE_CORRISPETTIVI = "https://ivaservizi.agenziaentrate.gov.it/portale/";
const BANK = "https://www.bancamediolanum.it/";

/** Where to get the final receipt of a payment, with the page to open. */
export function finalReceiptHint(e: Pick<PaymentEntry, "kind" | "amount" | "creditUsed" | "compensated">): {
  text: string;
  links: { label: string; href: string }[];
} {
  const cassetto = { label: "Cassetto fiscale", href: ADE };
  if (e.kind.startsWith("stamp_duty")) {
    return {
      text: "Dopo l'addebito scarica l'attestazione di pagamento: Fatture e Corrispettivi → Fatture elettroniche e altri dati IVA → Pagamento imposta di bollo.",
      links: [{ label: "Fatture e Corrispettivi", href: FATTURE_CORRISPETTIVI }],
    };
  }
  if (settlement(e).bank === 0 && (e.compensated || e.creditUsed > 0)) {
    return {
      text: "Nessun addebito in banca: dalla data del pagamento scarichi l'F24 versato dall'area riservata dell'Agenzia → Cassetto fiscale → Versamenti → F24.",
      links: [cassetto],
    };
  }
  return {
    text: "Dopo l'addebito scarica la quietanza dall'home banking (sezione F24), oppure l'F24 versato dall'area riservata dell'Agenzia → Cassetto fiscale → Versamenti → F24.",
    links: [{ label: "Home banking", href: BANK }, cassetto],
  };
}

/** Title for an uploaded file: its name without extension, tidied up. */
export function fileTitle(name: string): string {
  const base = name.replace(/\.[a-z0-9]{2,4}$/i, "").replace(/[_\s]+/g, " ").trim();
  return (base || "Documento").slice(0, 200);
}
