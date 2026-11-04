/**
 * FatturaPA XML (formato FPR12, B2B/B2C) for a forfettario invoice.
 * Pure function of data frozen at issue time: same input, same file.
 *
 * Forfettario specifics: RegimeFiscale RF19, lines with Natura N2.2 and 0% VAT,
 * virtual stamp duty in DatiBollo, legal clause in Causale, no withholding.
 */

import { toFixed2, type Cents } from "./money";

export interface XmlSupplier {
  firstName: string;
  lastName: string;
  vatNumber: string;
  taxCode: string;
  address: string;
  streetNumber: string | null;
  postalCode: string;
  city: string;
  province: string;
  iban: string | null;
}

export interface XmlCustomer {
  kind: "company" | "individual" | "public_administration" | "foreign";
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  vatNumber: string | null;
  vatCountry: string;
  taxCode: string | null;
  sdiCode: string;
  pec: string | null;
  address: string;
  streetNumber: string | null;
  postalCode: string;
  city: string;
  province: string | null;
  country: string;
}

export interface XmlLine {
  description: string;
  quantity: number;
  unitPrice: number; // euro, up to 4 decimals
  lineTotal: Cents;
  vatNature: string;
}

export interface XmlInvoice {
  documentType: string; // TD01
  number: string;
  issueDate: string;
  dueDate: string | null;
  stampDuty: Cents; // 0 or 200
  total: Cents;
  clause: string;
  notes: string | null;
  lines: XmlLine[];
}

export class FatturaPaError extends Error {}

/** Normative references printed in DatiRiepilogo (max 100 chars). */
const RIFERIMENTO: Record<string, string> = {
  "N2.2": "Operazione non soggetta a IVA ai sensi dell'art. 1, commi 54-89, L. 190/2014",
  N1: "Escluse ex art. 15 DPR 633/72 (rivalsa imposta di bollo)",
};

/**
 * FatturaPA accepts Basic Latin and Latin-1 only: map common typographic
 * characters and drop the rest, then escape XML entities.
 */
export function xmlText(value: string, max?: number): string {
  let s = value
    .normalize("NFC")
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/€/g, "EUR")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^ -~ -ÿ]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (max && s.length > max) s = s.slice(0, max);
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** Quantity / unit price: at least 2 and at most 8 decimals. */
function decimal(n: number): string {
  const fixed = n.toFixed(8).replace(/0+$/, "");
  const [int, dec = ""] = fixed.split(".");
  return `${int}.${dec.padEnd(2, "0")}`;
}

/** Splits long text into chunks for repeatable fields (e.g. Causale, max 200). */
function chunks(text: string, size: number): string[] {
  const words = text.split(" ");
  const out: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > size) {
      if (current) out.push(current);
      current = w.slice(0, size);
    } else current = (current + " " + w).trim();
  }
  if (current) out.push(current);
  return out;
}

/**
 * ProgressivoInvio: max 5 alphanumeric chars, unique per sender. Encodes year,
 * invoice number (max 9999/year) and attempt (0-9): a file rejected by SdI is
 * re-sent with the same number but must have a new file name.
 */
export function progressivoInvio(fiscalYear: number, number: number, attempt = 0): string {
  if (number < 1 || number > 9999 || attempt < 0 || attempt > 9) throw new FatturaPaError("Progressivo fuori range.");
  return (((fiscalYear % 100) * 10_000 + number) * 10 + attempt).toString(36).toUpperCase().padStart(5, "0");
}

/** Attempt encoded in a progressivo (inverse of progressivoInvio). */
export function progressivoAttempt(progressivo: string): number {
  return parseInt(progressivo, 36) % 10;
}

/** File name required by SdI: IT{codice fiscale or P.IVA}_{progressivo}.xml */
export function fatturaPaFilename(supplierVat: string, progressivo: string): string {
  return `IT${supplierVat}_${progressivo}.xml`;
}

const tag = (name: string, value: string | null | undefined) =>
  value === null || value === undefined || value === "" ? "" : `<${name}>${value}</${name}>`;

function sede(a: { address: string; streetNumber: string | null; postalCode: string; city: string; province: string | null; country: string }) {
  const italian = a.country === "IT";
  return (
    "<Sede>" +
    tag("Indirizzo", xmlText(a.address, 60)) +
    tag("NumeroCivico", a.streetNumber ? xmlText(a.streetNumber, 8) : null) +
    // Foreign addresses: CAP must still be 5 digits, 00000 by convention.
    tag("CAP", italian ? a.postalCode : "00000") +
    tag("Comune", xmlText(a.city, 60)) +
    tag("Provincia", italian && a.province ? a.province : null) +
    tag("Nazione", a.country) +
    "</Sede>"
  );
}

export function buildFatturaPaXml(args: {
  supplier: XmlSupplier;
  customer: XmlCustomer;
  invoice: XmlInvoice;
  progressivo: string;
}): string {
  const { supplier: s, customer: c, invoice: inv, progressivo } = args;

  if (c.kind === "public_administration") {
    throw new FatturaPaError("Le fatture alla PA (FPA12) richiedono la firma digitale: non ancora supportate.");
  }
  if (c.kind === "foreign" && !c.vatNumber) {
    throw new FatturaPaError("Per un cliente estero serve il numero di partita IVA (VAT number).");
  }
  if (!c.vatNumber && !c.taxCode) throw new FatturaPaError("Il cliente non ha né P.IVA né codice fiscale.");
  if (inv.lines.length === 0) throw new FatturaPaError("La fattura non ha righe.");
  for (const field of ["vatNumber", "taxCode", "address", "postalCode", "city", "province"] as const) {
    if (!s[field]) throw new FatturaPaError(`Profilo fiscale incompleto: manca ${field}.`);
  }

  const pecOnly = c.sdiCode === "0000000" && c.pec;
  const customerName =
    c.companyName
      ? tag("Denominazione", xmlText(c.companyName, 80))
      : tag("Nome", xmlText(c.firstName ?? "", 60)) + tag("Cognome", xmlText(c.lastName ?? "", 60));

  const header =
    "<FatturaElettronicaHeader>" +
    "<DatiTrasmissione>" +
    `<IdTrasmittente><IdPaese>IT</IdPaese><IdCodice>${s.taxCode}</IdCodice></IdTrasmittente>` +
    tag("ProgressivoInvio", progressivo) +
    "<FormatoTrasmissione>FPR12</FormatoTrasmissione>" +
    tag("CodiceDestinatario", c.sdiCode) +
    (pecOnly ? tag("PECDestinatario", xmlText(c.pec!, 256)) : "") +
    "</DatiTrasmissione>" +
    "<CedentePrestatore><DatiAnagrafici>" +
    `<IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>${s.vatNumber}</IdCodice></IdFiscaleIVA>` +
    tag("CodiceFiscale", s.taxCode) +
    `<Anagrafica>${tag("Nome", xmlText(s.firstName, 60))}${tag("Cognome", xmlText(s.lastName, 60))}</Anagrafica>` +
    "<RegimeFiscale>RF19</RegimeFiscale>" +
    "</DatiAnagrafici>" +
    sede({ ...s, country: "IT" }) +
    "</CedentePrestatore>" +
    "<CessionarioCommittente><DatiAnagrafici>" +
    (c.vatNumber
      ? `<IdFiscaleIVA><IdPaese>${c.vatCountry}</IdPaese><IdCodice>${xmlText(c.vatNumber, 28)}</IdCodice></IdFiscaleIVA>`
      : "") +
    (c.taxCode && c.country === "IT" ? tag("CodiceFiscale", c.taxCode) : "") +
    `<Anagrafica>${customerName}</Anagrafica>` +
    "</DatiAnagrafici>" +
    sede(c) +
    "</CessionarioCommittente>" +
    "</FatturaElettronicaHeader>";

  const causali = chunks(xmlText(inv.clause), 200).concat(inv.notes ? chunks(xmlText(inv.notes), 200) : []);

  const generali =
    "<DatiGenerali><DatiGeneraliDocumento>" +
    tag("TipoDocumento", inv.documentType) +
    "<Divisa>EUR</Divisa>" +
    tag("Data", inv.issueDate) +
    tag("Numero", xmlText(inv.number, 20)) +
    (inv.stampDuty > 0
      ? `<DatiBollo><BolloVirtuale>SI</BolloVirtuale><ImportoBollo>${toFixed2(inv.stampDuty)}</ImportoBollo></DatiBollo>`
      : "") +
    tag("ImportoTotaleDocumento", toFixed2(inv.total)) +
    causali.map((t) => tag("Causale", t)).join("") +
    "</DatiGeneraliDocumento></DatiGenerali>";

  const linee = inv.lines
    .map(
      (l, i) =>
        "<DettaglioLinee>" +
        tag("NumeroLinea", String(i + 1)) +
        tag("Descrizione", xmlText(l.description, 1000)) +
        tag("Quantita", decimal(l.quantity)) +
        tag("PrezzoUnitario", decimal(l.unitPrice)) +
        tag("PrezzoTotale", toFixed2(l.lineTotal)) +
        "<AliquotaIVA>0.00</AliquotaIVA>" +
        tag("Natura", l.vatNature) +
        "</DettaglioLinee>",
    )
    .join("");

  const byNature = new Map<string, Cents>();
  for (const l of inv.lines) byNature.set(l.vatNature, (byNature.get(l.vatNature) ?? 0) + l.lineTotal);
  const riepilogo = [...byNature.entries()]
    .map(
      ([nature, amount]) =>
        "<DatiRiepilogo>" +
        "<AliquotaIVA>0.00</AliquotaIVA>" +
        tag("Natura", nature) +
        tag("ImponibileImporto", toFixed2(amount)) +
        "<Imposta>0.00</Imposta>" +
        tag("RiferimentoNormativo", xmlText(RIFERIMENTO[nature] ?? "Operazione non soggetta a IVA", 100)) +
        "</DatiRiepilogo>",
    )
    .join("");

  const pagamento =
    "<DatiPagamento><CondizioniPagamento>TP02</CondizioniPagamento><DettaglioPagamento>" +
    "<ModalitaPagamento>MP05</ModalitaPagamento>" +
    tag("DataScadenzaPagamento", inv.dueDate) +
    tag("ImportoPagamento", toFixed2(inv.total)) +
    tag("IBAN", s.iban) +
    "</DettaglioPagamento></DatiPagamento>";

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<p:FatturaElettronica versione="FPR12" ' +
    'xmlns:ds="http://www.w3.org/2000/09/xmldsig#" ' +
    'xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" ' +
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
    'xsi:schemaLocation="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.xsd">' +
    header +
    `<FatturaElettronicaBody>${generali}<DatiBeniServizi>${linee}${riepilogo}</DatiBeniServizi>${pagamento}</FatturaElettronicaBody>` +
    "</p:FatturaElettronica>\n"
  );
}
