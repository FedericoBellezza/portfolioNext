/**
 * Invoice totals for a forfettario invoice: no VAT, no withholding,
 * virtual stamp duty above 77,47 €.
 */

import { roundCents, sumCents, type Cents } from "./money";
import { estimateInvoiceNet, type InvoiceNetEstimate } from "./tax-calculator";
import {
  DEFAULT_PROFILE,
  FORFETTARIO,
  FORFETTARIO_CLAUSE,
  STAMP_DUTY,
  STAMP_DUTY_CLAUSE,
  type FiscalProfile,
} from "./tax-config";

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unitPrice: Cents;
}

export interface InvoiceLine extends InvoiceLineInput {
  lineTotal: Cents;
  vatNature: string;
}

export interface InvoiceTotals {
  lines: InvoiceLine[];
  /** Sum of service lines: the amount the stamp threshold applies to. */
  taxableAmount: Cents;
  stampDutyRequired: boolean;
  stampDuty: Cents;
  /** True when the 2 € is added to what the client pays. */
  stampDutyCharged: boolean;
  /** Totale documento (ImportoTotaleDocumento in FatturaPA). */
  totalDocument: Cents;
  /** Amount you expect to collect. */
  amountDue: Cents;
  notes: string[];
  /** Marginal estimate of INPS + tax on this invoice once collected. */
  estimate: InvoiceNetEstimate;
}

export function requiresStampDuty(taxableAmount: Cents): boolean {
  return taxableAmount > STAMP_DUTY.threshold;
}

export function computeLineTotal(quantity: number, unitPrice: Cents): Cents {
  return roundCents(quantity * unitPrice);
}

export function computeInvoiceTotals(
  lines: InvoiceLineInput[],
  options: { issueDate: string; profile?: FiscalProfile },
): InvoiceTotals {
  const profile = options.profile ?? DEFAULT_PROFILE;
  const computed: InvoiceLine[] = lines.map((l) => ({
    ...l,
    lineTotal: computeLineTotal(l.quantity, l.unitPrice),
    vatNature: FORFETTARIO.vatNature,
  }));

  const taxableAmount = sumCents(computed.map((l) => l.lineTotal));
  const stampDutyRequired = requiresStampDuty(taxableAmount);
  const stampDuty = stampDutyRequired ? STAMP_DUTY.amount : 0;
  const stampDutyCharged = stampDutyRequired && profile.chargeStampDutyToClient;
  const totalDocument = taxableAmount + (stampDutyCharged ? stampDuty : 0);

  const notes = [FORFETTARIO_CLAUSE];
  if (stampDutyRequired) notes.push(STAMP_DUTY_CLAUSE);

  // A recharged stamp is part of the revenue, so it is part of the estimate too.
  const estimate = estimateInvoiceNet(totalDocument, options.issueDate, profile);
  if (stampDutyRequired) {
    // The 2 € paid to the State via F24 is a cost of yours either way.
    estimate.net -= stampDuty;
    estimate.netRate = totalDocument > 0 ? estimate.net / totalDocument : 0;
  }

  return {
    lines: computed,
    taxableAmount,
    stampDutyRequired,
    stampDuty,
    stampDutyCharged,
    totalDocument,
    amountDue: totalDocument,
    notes,
    estimate,
  };
}
