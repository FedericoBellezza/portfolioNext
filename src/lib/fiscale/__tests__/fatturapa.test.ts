import { describe, expect, it } from "vitest";
import { buildFatturaPaXml, fatturaPaFilename, FatturaPaError, progressivoAttempt, progressivoInvio, xmlText, type XmlCustomer } from "../fatturapa";
import { FORFETTARIO_CLAUSE } from "../tax-config";

const supplier = {
  firstName: "Federico",
  lastName: "Bellezza",
  vatNumber: "13339900014",
  taxCode: "BLLFRC01D21L219B",
  address: "Via Cochetto",
  streetNumber: null,
  postalCode: "10070",
  city: "Coassolo Torinese",
  province: "TO",
  iban: "IT85H0367401600000544291811",
};

const customer: XmlCustomer = {
  kind: "company",
  companyName: "Studio Rossi & Figli Srl",
  firstName: null,
  lastName: null,
  vatNumber: "01234567890",
  vatCountry: "IT",
  taxCode: null,
  sdiCode: "M5UXCR1",
  pec: null,
  address: "Via Roma",
  streetNumber: "1",
  postalCode: "10100",
  city: "Torino",
  province: "TO",
  country: "IT",
};

const invoice = {
  documentType: "TD01",
  number: "1",
  issueDate: "2026-11-04",
  dueDate: "2026-12-04",
  stampDuty: 200,
  total: 100_200,
  clause: FORFETTARIO_CLAUSE,
  notes: null,
  lines: [
    { description: "Sviluppo “app” — sprint 1", quantity: 10, unitPrice: 50, lineTotal: 50_000, vatNature: "N2.2" },
    { description: "Setup", quantity: 1, unitPrice: 500, lineTotal: 50_000, vatNature: "N2.2" },
    { description: "Rivalsa imposta di bollo", quantity: 1, unitPrice: 2, lineTotal: 200, vatNature: "N1" },
  ],
};

/** Minimal well-formedness check: every opened tag is closed in order. */
function balanced(xml: string): boolean {
  const stack: string[] = [];
  for (const m of xml.replace(/<\?xml[^>]*\?>/, "").matchAll(/<(\/?)([\w:]+)[^>]*?(\/?)>/g)) {
    const [, close, name, self] = m;
    if (self) continue;
    if (close) {
      if (stack.pop() !== name) return false;
    } else stack.push(name);
  }
  return stack.length === 0;
}

describe("FatturaPA XML", () => {
  const xml = buildFatturaPaXml({ supplier, customer, invoice, progressivo: progressivoInvio(2026, 1) });

  it("is well formed and uses the FPR12 namespace", () => {
    expect(balanced(xml)).toBe(true);
    expect(xml).toContain('versione="FPR12"');
    expect(xml).toContain("<FormatoTrasmissione>FPR12</FormatoTrasmissione>");
  });

  it("contains the forfettario essentials", () => {
    expect(xml).toContain("<RegimeFiscale>RF19</RegimeFiscale>");
    expect(xml).toContain("<DatiBollo><BolloVirtuale>SI</BolloVirtuale><ImportoBollo>2.00</ImportoBollo></DatiBollo>");
    expect(xml).toContain("<ImportoTotaleDocumento>1002.00</ImportoTotaleDocumento>");
    expect(xml).not.toContain("DatiRitenuta");
    expect(xml.match(/<Causale>/g)!.length).toBeGreaterThan(1); // clause split in ≤200-char chunks
    for (const c of xml.matchAll(/<Causale>(.*?)<\/Causale>/g)) expect(c[1].length).toBeLessThanOrEqual(200);
  });

  it("formats lines and one summary per VAT nature", () => {
    expect(xml).toContain("<Quantita>10.00</Quantita><PrezzoUnitario>50.00</PrezzoUnitario><PrezzoTotale>500.00</PrezzoTotale>");
    expect(xml).toContain("<Natura>N2.2</Natura><ImponibileImporto>1000.00</ImponibileImporto>");
    expect(xml).toContain("<Natura>N1</Natura><ImponibileImporto>2.00</ImponibileImporto>");
    expect(xml).toContain("<IBAN>IT85H0367401600000544291811</IBAN>");
  });

  it("escapes and cleans text", () => {
    expect(xml).toContain("Studio Rossi &amp; Figli Srl");
    expect(xml).toContain('Sviluppo &quot;app&quot; - sprint 1');
    expect(xmlText("Prezzo 10€ 🚀")).toBe("Prezzo 10EUR");
  });

  it("sends to PEC only when the code is 0000000", () => {
    const pec = buildFatturaPaXml({
      supplier,
      customer: { ...customer, sdiCode: "0000000", pec: "rossi@pec.it" },
      invoice,
      progressivo: "00001",
    });
    expect(pec).toContain("<CodiceDestinatario>0000000</CodiceDestinatario><PECDestinatario>rossi@pec.it</PECDestinatario>");
  });

  it("handles private and foreign customers", () => {
    const priv = buildFatturaPaXml({
      supplier,
      customer: { ...customer, kind: "individual", companyName: null, firstName: "Mario", lastName: "Bianchi", vatNumber: null, taxCode: "BLLFRC01D21L219B", sdiCode: "0000000" },
      invoice,
      progressivo: "00001",
    });
    expect(priv).toContain("<CodiceFiscale>BLLFRC01D21L219B</CodiceFiscale><Anagrafica><Nome>Mario</Nome><Cognome>Bianchi</Cognome></Anagrafica>");
    const foreign = buildFatturaPaXml({
      supplier,
      customer: { ...customer, kind: "foreign", vatNumber: "123456789", vatCountry: "DE", sdiCode: "XXXXXXX", country: "DE", province: null, postalCode: "10115", city: "Berlin" },
      invoice,
      progressivo: "00001",
    });
    expect(foreign).toContain("<IdPaese>DE</IdPaese><IdCodice>123456789</IdCodice>");
    expect(foreign).toContain("<CAP>00000</CAP><Comune>Berlin</Comune><Nazione>DE</Nazione>");
  });

  it("refuses PA invoices for now", () => {
    expect(() => buildFatturaPaXml({ supplier, customer: { ...customer, kind: "public_administration", sdiCode: "ABC123" }, invoice, progressivo: "00001" })).toThrow(FatturaPaError);
  });

  it("builds a unique 5-char progressive and the SdI file name", () => {
    expect(progressivoInvio(2026, 1)).toMatch(/^[0-9A-Z]{5}$/);
    expect(progressivoInvio(2026, 1)).not.toBe(progressivoInvio(2027, 1));
    expect(progressivoInvio(2026, 9999, 9)).toMatch(/^[0-9A-Z]{5}$/);
    expect(progressivoInvio(2099, 9999, 9)).toMatch(/^[0-9A-Z]{5}$/);
    expect(progressivoInvio(2026, 1, 1)).not.toBe(progressivoInvio(2026, 1, 0));
    expect(progressivoAttempt(progressivoInvio(2026, 42, 3))).toBe(3);
    expect(fatturaPaFilename("13339900014", "5K9X1")).toBe("IT13339900014_5K9X1.xml");
  });
});
