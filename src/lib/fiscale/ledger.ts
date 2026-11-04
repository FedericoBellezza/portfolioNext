/**
 * Registro incassi e pagamenti: the yearly ledger handed to the accountant /
 * CAF for Quadro LM. Pure function of the dataset.
 */

import type { FiscalDataset } from "./data/types";
import { sumCents, toFixed2, type Cents } from "./money";
import { computeTaxYearFromLedger, yearOf } from "./tax-calculator";

export interface LedgerRow {
  date: string;
  direction: "incasso" | "pagamento";
  type: string;
  document: string;
  counterparty: string;
  fiscalId: string;
  description: string;
  amount: Cents;
  f24Code: string;
  /** Deductible from forfettario income (only INPS contributions are). */
  deductible: boolean;
}

const INPS_KIND: Record<string, string> = {
  fixed_q1: "1ª rata fissi", fixed_q2: "2ª rata fissi", fixed_q3: "3ª rata fissi", fixed_q4: "4ª rata fissi",
  excess_balance: "saldo eccedenza", excess_advance_1: "1° acconto eccedenza",
  excess_advance_2: "2° acconto eccedenza", other: "altro",
};

const TAX_KIND: Record<string, string> = {
  substitute_tax_balance: "Imposta sostitutiva saldo", substitute_tax_advance_1: "Imposta sostitutiva 1° acconto",
  substitute_tax_advance_2: "Imposta sostitutiva 2° acconto", stamp_duty_q1: "Bollo fatture 1° trim.",
  stamp_duty_q2: "Bollo fatture 2° trim.", stamp_duty_q3: "Bollo fatture 3° trim.", stamp_duty_q4: "Bollo fatture 4° trim.",
  chamber_fee: "Diritto camerale", other: "Altro",
};

export function buildLedger(data: FiscalDataset, year: number): LedgerRow[] {
  const invoices = new Map(data.invoices.map((i) => [i.id, i]));
  const clients = new Map(data.clients.map((c) => [c.id, c]));
  const rows: LedgerRow[] = [];

  for (const c of data.collections) {
    if (yearOf(c.collectedAt) !== year) continue;
    const inv = invoices.get(c.invoiceId);
    const client = inv ? clients.get(inv.clientId) : undefined;
    rows.push({
      date: c.collectedAt,
      direction: "incasso",
      type: "Fattura",
      document: inv?.number ? `${inv.number}/${inv.fiscalYear} del ${inv.issueDate}` : "",
      counterparty: inv?.clientName ?? "",
      fiscalId: client?.vatNumber ?? client?.taxCode ?? "",
      description: "Incasso fattura",
      amount: c.amount,
      f24Code: "",
      deductible: false,
    });
  }
  for (const p of data.inpsPayments) {
    if (yearOf(p.paidAt) !== year) continue;
    rows.push({
      date: p.paidAt, direction: "pagamento", type: "F24 INPS", document: p.reference ?? "",
      counterparty: "INPS", fiscalId: "", description: `Contributi Artigiani ${INPS_KIND[p.kind]} ${p.competenceYear}`,
      amount: p.amount, f24Code: p.kind.startsWith("fixed") ? "AF" : "AP", deductible: true,
    });
  }
  for (const t of data.taxPayments) {
    if (yearOf(t.paidAt) !== year) continue;
    rows.push({
      date: t.paidAt, direction: "pagamento", type: "F24 Erario", document: "",
      counterparty: "Agenzia delle Entrate", fiscalId: "", description: `${TAX_KIND[t.kind] ?? t.kind} ${t.competenceYear}`,
      amount: t.amount, f24Code: t.tributeCode ?? "", deductible: false,
    });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export function ledgerSummary(data: FiscalDataset, year: number) {
  const r = computeTaxYearFromLedger({
    year, collections: data.collections, inpsPayments: data.inpsPayments, profile: data.profile,
  });
  return {
    anno: year,
    ricavi_incassati: toFixed2(r.grossRevenue),
    coefficiente_redditivita: r.coefficient,
    reddito_lordo: toFixed2(r.taxableGross),
    contributi_previdenziali_versati: toFixed2(r.inpsDeducted),
    reddito_netto: toFixed2(r.taxableNet),
    aliquota_imposta_sostitutiva: r.taxRate,
    imposta_sostitutiva: toFixed2(r.substituteTax),
    spese_non_deducibili: toFixed2(sumCents(data.expenses.filter((e) => yearOf(e.spentAt) === year).map((e) => e.amount))),
  };
}

const csvCell = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Semicolon separated, comma decimals, UTF-8 BOM: opens correctly in Italian Excel. */
export function ledgerToCsv(rows: LedgerRow[]): string {
  const header = ["Data", "Tipo movimento", "Tipo", "Documento", "Controparte", "P.IVA/CF", "Descrizione", "Importo", "Codice F24", "Deducibile"];
  const lines = rows.map((r) =>
    [
      r.date, r.direction, r.type, r.document, r.counterparty, r.fiscalId, r.description,
      toFixed2(r.direction === "pagamento" ? -r.amount : r.amount).replace(".", ","),
      r.f24Code, r.deductible ? "sì" : "no",
    ].map((v) => csvCell(String(v))).join(";"),
  );
  return "﻿" + [header.join(";"), ...lines].join("\r\n");
}
