import { describe, expect, it } from "vitest";
import { ClientSchema, isValidItalianVat, isValidTaxCode, normaliseClientForm } from "../clients";

const base = {
  kind: "company",
  companyName: "Studio Rossi Srl",
  vatNumber: "13339900014",
  sdiCode: "m5uxcr1",
  address: "Via Roma",
  streetNumber: "1",
  postalCode: "10100",
  city: "Torino",
  province: "to",
};

const parse = (raw: Record<string, unknown>) => ClientSchema.safeParse(normaliseClientForm(raw));

describe("client validation", () => {
  it("checks the Italian VAT check digit", () => {
    expect(isValidItalianVat("13339900014")).toBe(true);
    expect(isValidItalianVat("13339900015")).toBe(false);
    expect(isValidItalianVat("1333990001")).toBe(false);
  });

  it("accepts personal and company tax codes", () => {
    expect(isValidTaxCode("BLLFRC01D21L219B")).toBe(true);
    expect(isValidTaxCode("13339900014")).toBe(true);
    expect(isValidTaxCode("BLLFRC01D21L219")).toBe(false);
  });

  it("normalises and accepts a company", () => {
    const r = parse({ ...base, vatNumber: "IT 13339900014" });
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({ vatNumber: "13339900014", sdiCode: "M5UXCR1", province: "TO", country: "IT" });
  });

  it("defaults the SDI code to 0000000 and requires a tax code for privates", () => {
    const r = parse({ ...base, kind: "individual", firstName: "Mario", lastName: "Bianchi", vatNumber: "", sdiCode: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toContain("codice fiscale");
    const ok = parse({ ...base, kind: "individual", firstName: "Mario", lastName: "Bianchi", vatNumber: "", taxCode: "bllfrc01d21l219b", sdiCode: "" });
    expect(ok.success).toBe(true);
    expect(ok.data?.sdiCode).toBe("0000000");
  });

  it("rejects a wrong VAT number and a 6-char code for non-PA", () => {
    expect(parse({ ...base, vatNumber: "12345678901" }).success).toBe(false);
    expect(parse({ ...base, sdiCode: "ABC123" }).success).toBe(false);
    expect(parse({ ...base, kind: "public_administration", sdiCode: "ABC123" }).success).toBe(true);
  });

  it("handles foreign clients", () => {
    const r = parse({ ...base, kind: "foreign", country: "de", vatNumber: "DE123456789", province: "", postalCode: "10115", city: "Berlin" });
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({ country: "DE", sdiCode: "XXXXXXX" });
  });
});
