import type { Cents } from "../money";
import type { Collection, InpsPayment } from "../tax-calculator";
import type { Reminder } from "../tasks";
import type { FiscalProfile } from "../tax-config";

export type InvoiceStatus = "draft" | "issued" | "cancelled";
export type SdiStatus =
  | "not_sent" | "queued" | "sent" | "delivered" | "not_delivered"
  | "rejected" | "accepted" | "refused" | "expired";

export type TaxPaymentKind =
  | "substitute_tax_balance" | "substitute_tax_advance_1" | "substitute_tax_advance_2"
  | "stamp_duty_q1" | "stamp_duty_q2" | "stamp_duty_q3" | "stamp_duty_q4"
  | "chamber_fee" | "inail_premium" | "other";

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
  receiptPath: string | null;
  compensated?: boolean;
}

export interface TaxPaymentRow {
  id: string;
  paidAt: string;
  competenceYear: number;
  kind: TaxPaymentKind;
  tributeCode: string | null;
  amount: Cents;
  receiptPath: string | null;
  compensated?: boolean;
}

export interface ExpenseRow {
  id: string;
  spentAt: string;
  amount: Cents;
  category: string;
  vendor: string | null;
  description: string | null;
}

export interface TaxCredit {
  id: string;
  kind: "irpef" | "substitute_tax" | "inps" | "other";
  referenceYear: number;
  amount: Cents;
  destination: "compensation" | "refund";
  source: string | null;
  notes: string | null;
  uses: { id: string; usedAt: string; amount: Cents; note: string | null }[];
  used: Cents;
  residual: Cents;
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
  /** Calendar keys the owner marked as not due (fiscale.obligation_dismissals). */
  dismissedKeys: string[];
  /** Owner's personal or business reminders (fiscale.reminders). */
  reminders: Reminder[];
  /** Filings and reminders marked as done (fiscale.task_completions). */
  completedTasks: { key: string; completedAt: string; documentId: string | null; note: string | null }[];
  /** Tax credits (e.g. IRPEF from the tax return) and their use in F24 compensation. */
  credits: TaxCredit[];
  /** Archive documents attached to a payment (F24, bank receipt, Agenzia receipt...). */
  paymentDocuments: PaymentDocument[];
}

export interface PaymentDocument {
  id: string;
  title: string;
  path: string;
  /** Temporary proof (e.g. booking of the stamp duty debit): the final receipt is still due. */
  provisional: boolean;
  inpsPaymentId: string | null;
  taxPaymentId: string | null;
}
