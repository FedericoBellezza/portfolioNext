"use server";

import { revalidatePath } from "next/cache";
import { requireFiscaleUser } from "@/lib/fiscale/auth";
import { snapshotOf } from "@/lib/fiscale/data/invoice-xml";
import { fiscaleDb } from "@/lib/fiscale/data/load";
import { extractXml, ImportError, parseFatturaPa, type ParsedInvoice } from "@/lib/fiscale/fatturapa-import";
import { toEuro } from "@/lib/fiscale/money";

export type ImportResult = { file: string; ok: boolean; message: string; invoiceId?: string };
export type ImportState = { results: ImportResult[] } | { error: string } | null;

type Db = Awaited<ReturnType<typeof fiscaleDb>>;
type Row = Record<string, unknown>;

const MAX_FILES = 50;
const MAX_BYTES = 1024 * 1024;
const alnum = (v: string | null) => (v && /^[A-Za-z0-9]{1,28}$/.test(v) ? v : null);

/** Existing client with the same P.IVA or codice fiscale, otherwise a new one from the XML. */
async function findOrCreateClient(db: Db, p: ParsedInvoice): Promise<Row> {
  const c = p.customer;
  const vat = alnum(c.vatNumber);
  const cf = alnum(c.taxCode);
  if (vat) {
    const { data } = await db.from("clients").select("*").eq("vat_number", vat).limit(1).maybeSingle();
    if (data) return data as Row;
  }
  if (cf) {
    const { data } = await db.from("clients").select("*").eq("tax_code", cf).limit(1).maybeSingle();
    if (data) return data as Row;
  }
  const { data, error } = await db
    .from("clients")
    .insert({
      kind: c.kind,
      company_name: c.companyName,
      first_name: c.firstName,
      last_name: c.lastName,
      vat_number: vat,
      vat_country: c.vatCountry,
      tax_code: cf,
      sdi_code: c.sdiCode,
      pec: c.pec,
      address: c.address,
      street_number: c.streetNumber,
      postal_code: c.country === "IT" ? c.postalCode : c.postalCode || "00000",
      city: c.city,
      province: c.province,
      country: c.country,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new ImportError(
      "Non riesco a creare il cliente dai dati del file (es. manca la provincia o il CAP). Crealo a mano in Clienti con la stessa P.IVA e riprova.",
    );
  }
  return data as Row;
}

async function importOne(db: Db, file: File, ownVat: string): Promise<ImportResult> {
  const name = file.name.slice(0, 120);
  const xml = extractXml(new Uint8Array(await file.arrayBuffer()));
  const p = parseFatturaPa(xml);
  if (p.supplierVat !== ownVat) {
    throw new ImportError(`Il fornitore della fattura (P.IVA ${p.supplierVat}) non sei tu: è una fattura ricevuta?`);
  }

  const existing = await db
    .from("invoices")
    .select("id")
    .eq("fiscal_year", p.fiscalYear)
    .eq("number", p.number)
    .maybeSingle();
  if (existing.data) {
    return { file: name, ok: false, message: `Fattura ${p.number}/${p.fiscalYear} già presente.`, invoiceId: String(existing.data.id) };
  }

  const client = await findOrCreateClient(db, p);

  const draft = await db
    .from("invoices")
    .insert({
      client_id: client.id,
      document_type: p.documentType,
      issue_date: p.issueDate,
      due_date: p.dueDate,
      taxable_amount: toEuro(p.taxable),
      stamp_duty_amount: toEuro(p.stampDuty),
      stamp_duty_charged: p.stampCharged,
      total_amount: toEuro(p.total),
      forfettario_clause: p.clause,
    })
    .select("id")
    .single();
  if (draft.error || !draft.data) throw new ImportError("Salvataggio della fattura non riuscito.");
  const id = String(draft.data.id);

  const undo = async (message: string): Promise<never> => {
    await db.from("invoices").delete().eq("id", id).eq("status", "draft");
    throw new ImportError(message);
  };

  const items = await db.from("invoice_items").insert(
    p.lines.map((l, i) => ({
      invoice_id: id,
      position: i + 1,
      description: l.description.slice(0, 1000) || "-",
      quantity: l.quantity > 0 ? l.quantity : 1,
      unit_price: l.unitPrice,
      line_total: toEuro(l.lineTotal),
      vat_nature: l.vatNature.slice(0, 4),
      is_stamp_duty_recharge: l.isStampRecharge,
    })),
  );
  if (items.error) await undo("Salvataggio delle righe non riuscito.");

  // Recorded as issued with its original number, already delivered by SdI: never sent again.
  const issued = await db
    .from("invoices")
    .update({
      status: "issued",
      fiscal_year: p.fiscalYear,
      number: p.number,
      issued_at: new Date().toISOString(),
      client_snapshot: snapshotOf(client),
      xml_payload: xml,
      sdi_filename: name.replace(/[^\w.-]/g, "_"),
      sdi_status: "delivered",
      sdi_provider: "import",
      sdi_updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (issued.error) await undo(issued.error.code === "23505" ? `Numero ${p.number}/${p.fiscalYear} già usato.` : "Registrazione non riuscita.");

  // New invoices must continue after the highest imported number of that year.
  const seq = await db.from("invoice_sequences").select("last_number").eq("fiscal_year", p.fiscalYear).maybeSingle();
  if (!seq.data || Number(seq.data.last_number) < p.number) {
    const { error } = await db
      .from("invoice_sequences")
      .upsert({ user_id: client.user_id, fiscal_year: p.fiscalYear, last_number: p.number });
    if (error) console.error("[fiscale] import sequence:", error.message);
  }

  return { file: name, ok: true, message: `Fattura ${p.number}/${p.fiscalYear} · ${p.issueDate}`, invoiceId: id };
}

export async function importInvoicesAction(_prev: ImportState, formData: FormData): Promise<ImportState> {
  try {
    await requireFiscaleUser();
  } catch {
    return { error: "Non autorizzato." };
  }
  const db = await fiscaleDb();
  const { data: profile } = await db.from("fiscal_profiles").select("vat_number").maybeSingle();
  if (!profile) return { error: "Crea prima il profilo fiscale." };

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Seleziona almeno un file XML." };
  if (files.length > MAX_FILES) return { error: `Al massimo ${MAX_FILES} file per volta.` };

  // Sequential on purpose: two files of the same new client must not create it twice.
  const results: ImportResult[] = [];
  for (const file of files) {
    if (file.size > MAX_BYTES) {
      results.push({ file: file.name, ok: false, message: "File troppo grande (max 1 MB)." });
      continue;
    }
    try {
      results.push(await importOne(db, file, String(profile.vat_number)));
    } catch (e) {
      if (!(e instanceof ImportError)) console.error("[fiscale] import:", e instanceof Error ? e.message : e);
      results.push({ file: file.name, ok: false, message: e instanceof ImportError ? e.message : "Errore imprevisto." });
    }
  }

  revalidatePath("/dashboard/fiscale", "layout");
  return { results };
}
