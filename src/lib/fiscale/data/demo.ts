import { toCents } from "../money";
import { DEFAULT_PROFILE } from "../tax-config";
import type { ClientRow, CollectionRow, FiscalDataset, InvoiceRow } from "./types";

/**
 * Demo ledger for a November 2025 start: two invoices in 2025 (one collected
 * in January 2026, to show the cash principle), then one invoice a month.
 */

const clients: ClientRow[] = [
  { id: "c1", name: "Studio Rossi Srl", vatNumber: "01234567890", taxCode: null, sdiCode: "M5UXCR1", pec: null, city: "Milano" },
  { id: "c2", name: "Nexa Digital SpA", vatNumber: "09876543210", taxCode: null, sdiCode: "KRRH6B9", pec: null, city: "Torino" },
  { id: "c3", name: "Officina Web Snc", vatNumber: "04567891230", taxCode: null, sdiCode: "0000000", pec: "officinaweb@pec.it", city: "Bologna" },
];

// [year, number, issueDate, clientId, taxable €, collectedAt | null]
const raw: [number, number, string, string, number, string | null][] = [
  [2025, 1, "2025-11-28", "c1", 2_400, "2025-12-15"],
  [2025, 2, "2025-12-19", "c2", 1_800, "2026-01-20"],
  [2026, 1, "2026-01-30", "c1", 3_200, "2026-02-25"],
  [2026, 2, "2026-02-27", "c2", 3_600, "2026-03-27"],
  [2026, 3, "2026-03-31", "c1", 3_200, "2026-04-28"],
  [2026, 4, "2026-04-30", "c3", 2_750, "2026-05-29"],
  [2026, 5, "2026-05-29", "c2", 4_200, "2026-06-26"],
  [2026, 6, "2026-06-30", "c1", 3_200, "2026-07-30"],
  [2026, 7, "2026-07-31", "c2", 3_900, "2026-08-28"],
  [2026, 8, "2026-08-31", "c3", 1_500, "2026-09-25"],
  [2026, 9, "2026-09-30", "c2", 4_500, "2026-10-28"],
  [2026, 10, "2026-10-30", "c1", 3_600, null],
];

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const invoices: InvoiceRow[] = raw.map(([year, number, issueDate, clientId, taxable, collectedAt]) => {
  const total = toCents(taxable) + 200;
  return {
    id: `i-${year}-${number}`,
    number,
    fiscalYear: year,
    issueDate,
    dueDate: addDays(issueDate, 30),
    clientId,
    clientName: clients.find((c) => c.id === clientId)!.name,
    status: "issued",
    sdiStatus: "delivered",
    taxableAmount: toCents(taxable),
    stampDuty: 200,
    total,
    collected: collectedAt ? total : 0,
    lastCollectedAt: collectedAt,
  };
});

invoices.push({
  id: "i-draft-1", number: null, fiscalYear: null, issueDate: null, dueDate: null,
  clientId: "c2", clientName: "Nexa Digital SpA", status: "draft", sdiStatus: "not_sent",
  taxableAmount: toCents(4_000), stampDuty: 200, total: toCents(4_002), collected: 0, lastCollectedAt: null,
});

const collections: CollectionRow[] = invoices
  .filter((i) => i.lastCollectedAt)
  .map((i) => ({ id: `p-${i.id}`, invoiceId: i.id, collectedAt: i.lastCollectedAt!, amount: i.collected }));

export const demoDataset: FiscalDataset = {
  source: "demo",
  owner: { name: "Mario Bianchi", vatNumber: "12345678901" },
  profile: DEFAULT_PROFILE,
  clients,
  invoices,
  collections,
  inpsPayments: [
    { id: "n1", paidAt: "2026-02-16", competenceYear: 2025, kind: "fixed_q4", amount: toCents(743.44), reference: null, receiptPath: null },
    { id: "n2", paidAt: "2026-05-18", competenceYear: 2026, kind: "fixed_q1", amount: toCents(1_130.34), reference: null, receiptPath: null },
    { id: "n3", paidAt: "2026-08-20", competenceYear: 2026, kind: "fixed_q2", amount: toCents(1_130.34), reference: null, receiptPath: null },
  ],
  taxPayments: [
    { id: "t1", paidAt: "2026-03-02", competenceYear: 2025, kind: "stamp_duty_q4", tributeCode: "2524", amount: 400, receiptPath: null },
    { id: "t2", paidAt: "2026-06-30", competenceYear: 2025, kind: "substitute_tax_balance", tributeCode: "1792", amount: toCents(80.47), receiptPath: null },
    { id: "t3", paidAt: "2026-06-30", competenceYear: 2026, kind: "chamber_fee", tributeCode: "3850", amount: toCents(53), receiptPath: null },
  ],
  expenses: [
    { id: "e1", spentAt: "2026-01-10", amount: toCents(240), category: "software", vendor: "JetBrains", description: "All Products Pack" },
    { id: "e2", spentAt: "2026-02-03", amount: toCents(1_899), category: "hardware", vendor: "Apple", description: "MacBook Pro" },
    { id: "e3", spentAt: "2026-03-01", amount: toCents(60), category: "hosting", vendor: "Vercel", description: "Pro plan Q1" },
    { id: "e4", spentAt: "2026-06-15", amount: toCents(150), category: "accountant", vendor: "CAF", description: "Modello Redditi 2026" },
    { id: "e5", spentAt: "2026-09-20", amount: toCents(320), category: "training", vendor: "Conferenza", description: "Biglietto + viaggio" },
  ],
  dismissedKeys: [],
};
