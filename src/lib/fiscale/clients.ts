/**
 * Client (cessionario/committente) validation, aligned with the checks in
 * fiscale.clients and with what FatturaPA needs to deliver the invoice.
 */

import { z } from "zod";

export const CLIENT_KINDS = ["company", "individual", "public_administration", "foreign"] as const;
export type ClientKind = (typeof CLIENT_KINDS)[number];

export const CLIENT_KIND_LABEL: Record<ClientKind, string> = {
  company: "Azienda o professionista con P.IVA",
  individual: "Privato (persona fisica)",
  public_administration: "Pubblica amministrazione",
  foreign: "Cliente estero",
};

/** Italian VAT number: 11 digits with the Luhn-like check digit. */
export function isValidItalianVat(vat: string): boolean {
  if (!/^\d{11}$/.test(vat)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const d = Number(vat[i]);
    if (i % 2 === 0) sum += d;
    else sum += d * 2 > 9 ? d * 2 - 9 : d * 2;
  }
  return (10 - (sum % 10)) % 10 === Number(vat[10]);
}

/** Personal codice fiscale (16 chars, omocodia allowed) or a company one (11 digits). */
export function isValidTaxCode(cf: string): boolean {
  return (
    /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/.test(cf) ||
    isValidItalianVat(cf)
  );
}

const clean = (s: unknown) => (typeof s === "string" ? s.trim() : "");
const upper = (s: unknown) => clean(s).toUpperCase().replace(/\s+/g, "");
const optional = (s: string) => (s === "" ? null : s);

export const ClientSchema = z
  .object({
    kind: z.enum(CLIENT_KINDS),
    companyName: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    vatNumber: z.string(),
    taxCode: z.string(),
    sdiCode: z.string(),
    pec: z.string(),
    address: z.string(),
    streetNumber: z.string(),
    postalCode: z.string(),
    city: z.string(),
    province: z.string(),
    country: z.string(),
    email: z.string(),
    notes: z.string().max(1000),
  })
  .superRefine((c, ctx) => {
    const fail = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    const italian = c.country === "IT";

    if (c.kind === "individual") {
      if (!c.firstName || !c.lastName) fail("firstName", "Nome e cognome sono obbligatori");
    } else if (!c.companyName) fail("companyName", "La denominazione è obbligatoria");

    if (!c.vatNumber && !c.taxCode) fail("vatNumber", "Serve almeno P.IVA o codice fiscale");
    if (c.vatNumber && italian && !isValidItalianVat(c.vatNumber)) fail("vatNumber", "Partita IVA non valida");
    if (c.taxCode && italian && !isValidTaxCode(c.taxCode)) fail("taxCode", "Codice fiscale non valido");
    if (c.kind === "individual" && italian && !c.taxCode) fail("taxCode", "Per un privato serve il codice fiscale");

    if (c.kind === "public_administration" && !/^[A-Z0-9]{6}$/.test(c.sdiCode))
      fail("sdiCode", "Per la PA serve il codice univoco ufficio di 6 caratteri");
    if (c.kind !== "public_administration" && c.kind !== "foreign" && !/^[A-Z0-9]{7}$/.test(c.sdiCode))
      fail("sdiCode", "Il codice destinatario ha 7 caratteri (0000000 se non lo ha)");
    if (c.pec && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.pec)) fail("pec", "PEC non valida");
    if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) fail("email", "Email non valida");

    if (!c.address) fail("address", "L'indirizzo è obbligatorio");
    if (!c.city) fail("city", "Il comune è obbligatorio");
    if (!/^[A-Z]{2}$/.test(c.country)) fail("country", "Nazione: codice di 2 lettere (es. IT, DE)");
    if (italian && !/^\d{5}$/.test(c.postalCode)) fail("postalCode", "CAP di 5 cifre");
    if (italian && !/^[A-Z]{2}$/.test(c.province)) fail("province", "Provincia: sigla di 2 lettere (es. TO)");
    if (!italian && !c.postalCode) fail("postalCode", "Il codice postale è obbligatorio");
  });

export type ClientInput = z.infer<typeof ClientSchema>;

/** Normalises raw form values (trim, uppercase codes, foreign SDI code). */
export function normaliseClientForm(raw: Record<string, unknown>) {
  const kind = (CLIENT_KINDS as readonly string[]).includes(String(raw.kind)) ? (raw.kind as ClientKind) : "company";
  const country = kind === "foreign" ? upper(raw.country) || "" : "IT";
  const sdi = upper(raw.sdiCode);
  return {
    kind,
    companyName: kind === "individual" ? "" : clean(raw.companyName),
    firstName: kind === "individual" ? clean(raw.firstName) : "",
    lastName: kind === "individual" ? clean(raw.lastName) : "",
    vatNumber: upper(raw.vatNumber).replace(/^IT(?=\d{11}$)/, ""),
    taxCode: upper(raw.taxCode),
    // Foreign clients get the conventional XXXXXXX; privates without a code get 0000000.
    sdiCode: kind === "foreign" ? "XXXXXXX" : sdi || (kind === "public_administration" ? "" : "0000000"),
    pec: clean(raw.pec).toLowerCase(),
    address: clean(raw.address),
    streetNumber: clean(raw.streetNumber),
    postalCode: upper(raw.postalCode),
    city: clean(raw.city),
    province: upper(raw.province),
    country,
    email: clean(raw.email).toLowerCase(),
    notes: clean(raw.notes),
  };
}

/** Row for fiscale.clients. */
export function toClientRow(c: ClientInput) {
  return {
    kind: c.kind,
    company_name: optional(c.companyName),
    first_name: optional(c.firstName),
    last_name: optional(c.lastName),
    vat_number: optional(c.vatNumber),
    vat_country: c.country,
    tax_code: optional(c.taxCode),
    sdi_code: c.sdiCode,
    pec: optional(c.pec),
    address: c.address,
    street_number: optional(c.streetNumber),
    postal_code: c.postalCode,
    city: c.city,
    province: optional(c.province),
    country: c.country,
    email: optional(c.email),
    notes: optional(c.notes),
  };
}
