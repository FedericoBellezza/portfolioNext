import "server-only";
import {
  buildFatturaPaXml,
  fatturaPaFilename,
  FatturaPaError,
  progressivoInvio,
  type XmlCustomer,
  type XmlSupplier,
} from "../fatturapa";
import { toCents } from "../money";
import type { fiscaleDb } from "./load";

type Db = Awaited<ReturnType<typeof fiscaleDb>>;
type Row = Record<string, unknown>;
const s = (v: unknown) => (v == null || v === "" ? null : String(v));

export function supplierFromProfile(p: Row): XmlSupplier {
  return {
    firstName: String(p.first_name ?? "").trim(),
    lastName: String(p.last_name ?? "").trim(),
    vatNumber: String(p.vat_number ?? ""),
    taxCode: String(p.tax_code ?? ""),
    address: String(p.address ?? ""),
    streetNumber: s(p.street_number),
    postalCode: String(p.postal_code ?? ""),
    city: String(p.city ?? ""),
    province: String(p.province ?? ""),
    iban: s(p.iban),
  };
}

/** Works both on a clients row and on the jsonb snapshot frozen at issue. */
export function customerFromClient(c: Row): XmlCustomer {
  return {
    kind: String(c.kind) as XmlCustomer["kind"],
    companyName: s(c.company_name),
    firstName: s(c.first_name),
    lastName: s(c.last_name),
    vatNumber: s(c.vat_number),
    vatCountry: String(c.vat_country ?? "IT"),
    taxCode: s(c.tax_code),
    sdiCode: String(c.sdi_code ?? "0000000"),
    pec: s(c.pec),
    address: String(c.address ?? ""),
    streetNumber: s(c.street_number),
    postalCode: String(c.postal_code ?? ""),
    city: String(c.city ?? ""),
    province: s(c.province),
    country: String(c.country ?? "IT"),
  };
}

/** Client row reduced to what is frozen in invoices.client_snapshot. */
export function snapshotOf(client: Row): Row {
  const copy = { ...client };
  delete copy.notes;
  delete copy.user_id;
  return copy;
}

export interface InvoiceXmlInput {
  invoice: Row;
  items: Row[];
  profile: Row;
  client: Row;
  /** Overrides used for the dry run before a number is assigned. */
  number?: number;
  fiscalYear?: number;
  issueDate?: string;
  dueDate?: string | null;
  attempt?: number;
}

export function renderInvoiceXml(input: InvoiceXmlInput) {
  const { invoice, items, profile, client } = input;
  const number = input.number ?? Number(invoice.number);
  const fiscalYear = input.fiscalYear ?? Number(invoice.fiscal_year);
  const issueDate = input.issueDate ?? String(invoice.issue_date);
  if (!number || !fiscalYear || !issueDate) throw new FatturaPaError("Fattura senza numero o data.");

  const supplier = supplierFromProfile(profile);
  const progressivo = progressivoInvio(fiscalYear, number, input.attempt ?? 0);
  const xml = buildFatturaPaXml({
    supplier,
    customer: customerFromClient(client),
    progressivo,
    invoice: {
      documentType: String(invoice.document_type ?? "TD01"),
      number: `${profile.invoice_number_prefix ?? ""}${number}`,
      issueDate,
      dueDate: input.dueDate !== undefined ? input.dueDate : s(invoice.due_date),
      stampDuty: toCents(invoice.stamp_duty_amount as string),
      total: toCents(invoice.total_amount as string),
      clause: String(invoice.forfettario_clause),
      notes: s(invoice.notes),
      lines: items.map((it) => ({
        description: String(it.description),
        quantity: Number(it.quantity),
        unitPrice: Number(it.unit_price),
        lineTotal: toCents(it.line_total as string),
        vatNature: String(it.vat_nature),
      })),
    },
  });
  return { xml, progressivo, filename: fatturaPaFilename(supplier.vatNumber, progressivo) };
}

/** Loads everything needed to render the XML of one invoice. */
export async function loadInvoiceForXml(db: Db, invoiceId: string) {
  const [invoice, items, profile] = await Promise.all([
    db.from("invoices").select("*").eq("id", invoiceId).maybeSingle(),
    db.from("invoice_items").select("*").eq("invoice_id", invoiceId).order("position"),
    db.from("fiscal_profiles").select("*").maybeSingle(),
  ]);
  if (invoice.error || items.error || profile.error) {
    throw new Error(invoice.error?.message ?? items.error?.message ?? profile.error?.message);
  }
  if (!invoice.data) return null;
  const client = await db.from("clients").select("*").eq("id", invoice.data.client_id).maybeSingle();
  if (client.error) throw new Error(client.error.message);
  return {
    invoice: invoice.data as Row,
    items: (items.data ?? []) as Row[],
    profile: (profile.data ?? null) as Row | null,
    currentClient: (client.data ?? null) as Row | null,
  };
}
