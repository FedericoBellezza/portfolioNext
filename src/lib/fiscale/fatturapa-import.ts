/**
 * Reads FatturaPA XML files already sent to SdI (by another service or the AdE
 * portal) so past invoices can be recorded without sending them again.
 */

import { XMLParser } from "fast-xml-parser";
import { toCents, type Cents } from "./money";
import type { XmlCustomer } from "./fatturapa";
import { FORFETTARIO_CLAUSE } from "./tax-config";

export class ImportError extends Error {}

export interface ParsedLine {
  description: string;
  quantity: number;
  unitPrice: number; // euro
  lineTotal: Cents;
  vatNature: string;
  isStampRecharge: boolean;
}

export interface ParsedInvoice {
  supplierVat: string;
  documentType: string;
  numberRaw: string;
  number: number;
  fiscalYear: number;
  issueDate: string;
  dueDate: string | null;
  taxable: Cents;
  stampDuty: Cents;
  stampCharged: boolean;
  total: Cents;
  clause: string;
  lines: ParsedLine[];
  customer: XmlCustomer;
}

/** TD01 fattura, TD06 parcella: for a forfettario they are the same kind of document. */
export const IMPORTABLE_TYPES = ["TD01", "TD06"] as const;

const ARRAYS = new Set(["DettaglioLinee", "DatiRiepilogo", "Causale", "FatturaElettronicaBody", "DettaglioPagamento"]);

const parser = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  parseTagValue: false, // keep "0000123" and amounts as strings
  trimValues: true,
  isArray: (name) => ARRAYS.has(name),
});

type Node = Record<string, unknown>;
const obj = (v: unknown): Node => (v && typeof v === "object" ? (v as Node) : {});
const str = (v: unknown): string | null => (v === undefined || v === null || v === "" ? null : String(v).trim());
const amount = (v: unknown): number => {
  const n = Number(str(v) ?? "0");
  if (!Number.isFinite(n)) throw new ImportError(`Importo non valido: ${String(v)}`);
  return n;
};

/**
 * Turns an uploaded file into XML text: plain XML (with or without BOM) or a
 * signed .p7m, from which the XML is extracted when it is stored contiguously.
 */
export function extractXml(bytes: Uint8Array): string {
  let data = bytes;
  const head = new TextDecoder("latin1").decode(data.slice(0, 64)).trim();
  // Some .p7m files are base64 text instead of binary DER.
  if (/^MI[A-Za-z0-9+/]/.test(head)) {
    try {
      data = Uint8Array.from(atob(new TextDecoder().decode(data).replace(/\s+/g, "")), (c) => c.charCodeAt(0));
    } catch {
      /* not base64 after all */
    }
  }
  const text = new TextDecoder("utf-8").decode(data);
  const start = text.search(/<\?xml|<([\w-]+:)?FatturaElettronica[\s>]/);
  const endMatch = /<\/([\w-]+:)?FatturaElettronica>/g;
  let end = -1;
  for (let m = endMatch.exec(text); m; m = endMatch.exec(text)) end = m.index + m[0].length;
  if (start < 0 || end < 0) throw new ImportError("Il file non contiene una fattura elettronica leggibile.");
  return text.slice(start, end);
}

function digitsOf(numberRaw: string, year: number): number {
  const groups = numberRaw.match(/\d+/g)?.map(Number) ?? [];
  if (groups.length === 0) throw new ImportError(`Numero fattura senza cifre: "${numberRaw}".`);
  // "1/2025", "2025/0003", "FPR 12/25": drop the year part when there is a choice.
  const notYear = groups.filter((g) => g !== year && g !== year % 100);
  const n = (notYear.length > 0 ? notYear : groups).at(-1)!;
  if (n < 1 || n > 9999) throw new ImportError(`Numero fattura fuori intervallo: "${numberRaw}".`);
  return n;
}

function customerOf(header: Node): XmlCustomer {
  const trasm = obj(header.DatiTrasmissione);
  const cc = obj(header.CessionarioCommittente);
  const anag = obj(cc.DatiAnagrafici);
  const idIva = obj(anag.IdFiscaleIVA);
  const name = obj(anag.Anagrafica);
  const sede = obj(cc.Sede);

  const country = str(sede.Nazione) ?? "IT";
  const vatCountry = str(idIva.IdPaese) ?? country;
  const vatNumber = str(idIva.IdCodice);
  const companyName = str(name.Denominazione);
  const firstName = str(name.Nome);
  const lastName = str(name.Cognome);
  const formato = str(trasm.FormatoTrasmissione);

  const kind: XmlCustomer["kind"] =
    formato === "FPA12" ? "public_administration" : country !== "IT" ? "foreign" : vatNumber ? "company" : "individual";

  return {
    kind,
    companyName,
    firstName: companyName ? null : firstName,
    lastName: companyName ? null : lastName,
    vatNumber,
    vatCountry,
    taxCode: str(anag.CodiceFiscale),
    sdiCode: kind === "foreign" ? "XXXXXXX" : (str(trasm.CodiceDestinatario) ?? "0000000").toUpperCase(),
    pec: str(trasm.PECDestinatario),
    address: str(sede.Indirizzo) ?? "",
    streetNumber: str(sede.NumeroCivico),
    postalCode: str(sede.CAP) ?? "",
    city: str(sede.Comune) ?? "",
    province: str(sede.Provincia),
    country,
  };
}

export function parseFatturaPa(xml: string): ParsedInvoice {
  let doc: Node;
  try {
    doc = parser.parse(xml) as Node;
  } catch {
    throw new ImportError("XML non valido.");
  }
  const root = obj(doc.FatturaElettronica);
  const header = obj(root.FatturaElettronicaHeader);
  const bodies = (root.FatturaElettronicaBody as Node[] | undefined) ?? [];
  if (!root.FatturaElettronicaHeader || bodies.length === 0) throw new ImportError("Non è un file FatturaPA.");
  if (bodies.length > 1) throw new ImportError("File con più fatture (lotto): non ancora supportato.");

  const supplier = obj(obj(obj(header.CedentePrestatore).DatiAnagrafici).IdFiscaleIVA);
  const supplierVat = str(supplier.IdCodice);
  if (!supplierVat) throw new ImportError("Partita IVA del fornitore mancante.");

  const body = bodies[0];
  const doc0 = obj(obj(body.DatiGenerali).DatiGeneraliDocumento);
  const documentType = str(doc0.TipoDocumento) ?? "";
  if (!(IMPORTABLE_TYPES as readonly string[]).includes(documentType)) {
    throw new ImportError(
      `Tipo documento ${documentType || "?"} non supportato: si importano fatture (TD01) e parcelle (TD06).`,
    );
  }
  const issueDate = str(doc0.Data);
  if (!issueDate || !/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) throw new ImportError("Data fattura mancante.");
  const fiscalYear = Number(issueDate.slice(0, 4));
  const numberRaw = str(doc0.Numero) ?? "";
  const number = digitsOf(numberRaw, fiscalYear);

  const stampDuty = toCents(amount(obj(doc0.DatiBollo).ImportoBollo));
  const causali = ((doc0.Causale as unknown[]) ?? []).map((c) => str(c)).filter(Boolean) as string[];

  const rawLines = (obj(body.DatiBeniServizi).DettaglioLinee as Node[] | undefined) ?? [];
  if (rawLines.length === 0) throw new ImportError("La fattura non ha righe.");
  const lines: ParsedLine[] = rawLines.map((l) => {
    const description = str(l.Descrizione) ?? "";
    const vatNature = str(l.Natura) ?? "N2.2";
    const lineTotal = toCents(amount(l.PrezzoTotale));
    return {
      description,
      quantity: str(l.Quantita) ? amount(l.Quantita) : 1,
      unitPrice: amount(l.PrezzoUnitario),
      lineTotal,
      vatNature,
      isStampRecharge: /bollo/i.test(description) && lineTotal === stampDuty && stampDuty > 0,
    };
  });

  const taxable = lines.filter((l) => !l.isStampRecharge).reduce((s, l) => s + l.lineTotal, 0);
  const stampCharged = lines.some((l) => l.isStampRecharge);
  const declaredTotal = str(doc0.ImportoTotaleDocumento);
  const total = declaredTotal ? toCents(amount(declaredTotal)) : taxable + (stampCharged ? stampDuty : 0);

  const payment = (obj(body.DatiPagamento).DettaglioPagamento as Node[] | undefined)?.[0];
  const due = payment ? str(payment.DataScadenzaPagamento) : null;

  return {
    supplierVat,
    documentType,
    numberRaw,
    number,
    fiscalYear,
    issueDate,
    dueDate: due && /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null,
    taxable,
    stampDuty,
    stampCharged,
    total,
    clause: causali.join(" ") || FORFETTARIO_CLAUSE,
    lines,
    customer: customerOf(header),
  };
}
