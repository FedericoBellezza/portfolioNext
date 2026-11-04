import { describe, expect, it } from "vitest";
import { buildFatturaPaXml } from "../fatturapa";
import { extractXml, ImportError, parseFatturaPa } from "../fatturapa-import";
import { FORFETTARIO_CLAUSE } from "../tax-config";

const supplier = {
  firstName: "Federico", lastName: "Bellezza", vatNumber: "13339900014", taxCode: "BLLFRC01D21L219B",
  address: "Via Cochetto", streetNumber: null, postalCode: "10070", city: "Coassolo Torinese", province: "TO", iban: null,
};
const customer = {
  kind: "company" as const, companyName: "Studio Rossi Srl", firstName: null, lastName: null,
  vatNumber: "01234567890", vatCountry: "IT", taxCode: null, sdiCode: "M5UXCR1", pec: null,
  address: "Via Roma", streetNumber: "1", postalCode: "10100", city: "Torino", province: "TO", country: "IT",
};
const xml = buildFatturaPaXml({
  supplier,
  customer,
  progressivo: "00001",
  invoice: {
    documentType: "TD01", number: "7", issueDate: "2025-12-19", dueDate: "2026-01-18", stampDuty: 200, total: 180_200,
    clause: FORFETTARIO_CLAUSE, notes: null,
    lines: [
      { description: "Sviluppo", quantity: 2.5, unitPrice: 720, lineTotal: 180_000, vatNature: "N2.2" },
      { description: "Rivalsa imposta di bollo", quantity: 1, unitPrice: 2, lineTotal: 200, vatNature: "N1" },
    ],
  },
});

describe("FatturaPA import", () => {
  it("reads back what the generator writes", () => {
    const p = parseFatturaPa(xml);
    expect(p).toMatchObject({
      supplierVat: "13339900014", documentType: "TD01", number: 7, fiscalYear: 2025, issueDate: "2025-12-19",
      dueDate: "2026-01-18", taxable: 180_000, stampDuty: 200, stampCharged: true, total: 180_200,
    });
    expect(p.lines).toHaveLength(2);
    expect(p.lines[0]).toMatchObject({ quantity: 2.5, unitPrice: 720, isStampRecharge: false });
    expect(p.lines[1].isStampRecharge).toBe(true);
    expect(p.customer).toMatchObject({ kind: "company", companyName: "Studio Rossi Srl", vatNumber: "01234567890", sdiCode: "M5UXCR1", province: "TO" });
    expect(p.clause).toContain("commi da 54 a 89");
  });

  it("extracts the invoice number from common formats", () => {
    const withNumber = (n: string) => parseFatturaPa(xml.replace("<Numero>7</Numero>", `<Numero>${n}</Numero>`)).number;
    expect(withNumber("1/2025")).toBe(1);
    expect(withNumber("2025/0003")).toBe(3);
    expect(withNumber("FPR 12/25")).toBe(12);
    expect(withNumber("25")).toBe(25);
    expect(() => withNumber("ABC")).toThrow(ImportError);
  });

  it("handles a private customer and other namespace prefixes", () => {
    const priv = xml
      .replace("<IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>01234567890</IdCodice></IdFiscaleIVA>", "<CodiceFiscale>RSSMRA80A01L219X</CodiceFiscale>")
      .replace("<Denominazione>Studio Rossi Srl</Denominazione>", "<Nome>Mario</Nome><Cognome>Rossi</Cognome>")
      .replace(/p:FatturaElettronica/g, "ns2:FatturaElettronica")
      .replace('xmlns:p=', 'xmlns:ns2=');
    const p = parseFatturaPa(priv);
    expect(p.customer).toMatchObject({ kind: "individual", firstName: "Mario", lastName: "Rossi", taxCode: "RSSMRA80A01L219X", vatNumber: null });
  });

  it("accepts parcelle (TD06) and keeps the type", () => {
    const p = parseFatturaPa(xml.replace("<TipoDocumento>TD01</TipoDocumento>", "<TipoDocumento>TD06</TipoDocumento>"));
    expect(p.documentType).toBe("TD06");
    expect(p.number).toBe(7);
  });

  it("rejects credit notes and non-FatturaPA files for now", () => {
    expect(() => parseFatturaPa(xml.replace("<TipoDocumento>TD01</TipoDocumento>", "<TipoDocumento>TD04</TipoDocumento>"))).toThrow(/TD04/);
    expect(() => parseFatturaPa("<foo/>")).toThrow(ImportError);
  });

  it("extracts XML from BOM-prefixed files and contiguous .p7m envelopes", () => {
    const enc = new TextEncoder();
    const bom = new Uint8Array([0xef, 0xbb, 0xbf, ...enc.encode(xml)]);
    expect(parseFatturaPa(extractXml(bom)).number).toBe(7);
    const p7m = new Uint8Array([0x30, 0x82, 0x10, 0x00, 0x06, 0x09, ...enc.encode(xml), 0xa0, 0x82, 0x01, 0x02, 0x03]);
    expect(parseFatturaPa(extractXml(p7m)).number).toBe(7);
    expect(() => extractXml(enc.encode("ciao"))).toThrow(ImportError);
  });
});
