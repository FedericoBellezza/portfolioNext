import type { Cents } from "../money";
import type { Collection, InpsPayment } from "../tax-calculator";
import type { FiscalProfile } from "../tax-config";

export type InvoiceStatus = "draft" | "issued" | "cancelled";
export type SdiStatus =
  | "not_sent" | "queued" | "sent" | "delivered" | "not_delivered"
  | "rejected" | "accepted" | "refused" | "expired";

export type TaxPaymentKind =
  | "substitute_tax_balance" | "substitute_tax_advance_1" | "substitute_tax_advance_2"
  | "stamp_duty_q1" | "stamp_duty_q2" | "stamp_duty_q3" | "stamp_duty_q4"
  | "chamber_fee" | "other";

export interface ClientRow {
  id: string;
  name: string;
  vatNumber: string | null;
  taxCode: string | null;
  sdiCode: string;
  pec: string | null;
  city: string;
}

export interface InvoiceRow {
  id: string;
  number: number | null;
  fiscalYear: number | null;
  issueDate: string | null;
  dueDate: string | null;
  clientId: string;
  clientName: string;
  status: InvoiceStatus;
  sdiStatus: SdiStatus;
  taxableAmount: Cents;
  stampDuty: Cents;
  total: Cents;
  collected: Cents;
  lastCollectedAt: string | null;
}

export interface CollectionRow extends Collection {
  id: string;
  invoiceId: string;
}

export interface InpsPaymentRow extends InpsPayment {
  id: string;
  reference: string | null;
}

export interface TaxPaymentRow {
  id: string;
  paidAt: string;
  competenceYear: number;
  kind: TaxPaymentKind;
  tributeCode: string | null;
  amount: Cents;
}

export interface ExpenseRow {
  id: string;
  spentAt: string;
  amount: Cents;
  category: string;
  vendor: string | null;
  description: string | null;
}

export interface FiscalDataset {
  source: "demo" | "supabase";
  owner: { name: string; vatNumber: string };
  profile: FiscalProfile;
  clients: ClientRow[];
  invoices: InvoiceRow[];
  collections: CollectionRow[];
  inpsPayments: InpsPaymentRow[];
  taxPayments: TaxPaymentRow[];
  expenses: ExpenseRow[];
}
