/**
 * Fiscal profile (fiscale.fiscal_profiles): who the user is on the invoices
 * and the settings the calculator needs. Validation mirrors the checks of the
 * table; one row per user, created and edited from the Profilo page.
 */

import { z } from "zod";
import { isValidItalianVat } from "./clients";

/** Coefficienti di redditività of the forfettario (L. 190/2014, all. 4), by ATECO group. */
export const COEFFICIENTS = [
  { value: 0.4, label: "40% · commercio, alberghi e ristoranti, industrie alimentari" },
  { value: 0.54, label: "54% · commercio ambulante non alimentare" },
  { value: 0.62, label: "62% · altre attività economiche" },
  { value: 0.67, label: "67% · attività professionali, scientifiche, tecniche, informatica, istruzione, sanità" },
  { value: 0.78, label: "78% · intermediari del commercio" },
  { value: 0.86, label: "86% · costruzioni e attività immobiliari" },
] as const;

const PERSONAL_TAX_CODE = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ProfileSchema = z
  .object({
    firstName: z.string(),
    lastName: z.string(),
    vatNumber: z.string(),
    taxCode: z.string(),
    address: z.string(),
    streetNumber: z.string(),
    postalCode: z.string(),
    city: z.string(),
    province: z.string(),
    email: z.string(),
    pec: z.string(),
    iban: z.string(),
    activityStartDate: z.string(),
    atecoCode: z.string(),
    coefficient: z.number(),
    startupRate: z.boolean(),
    inps35: z.boolean(),
    inps50: z.boolean(),
    stampToClient: z.boolean(),
    invoicePrefix: z.string(),
    paymentDays: z.number(),
  })
  .superRefine((p, ctx) => {
    const fail = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (!p.firstName || p.firstName.length > 80) fail("firstName", "Inserisci il nome");
    if (!p.lastName || p.lastName.length > 80) fail("lastName", "Inserisci il cognome");
    if (!isValidItalianVat(p.vatNumber)) fail("vatNumber", "Partita IVA non valida (11 cifre)");
    if (!PERSONAL_TAX_CODE.test(p.taxCode)) fail("taxCode", "Codice fiscale non valido (16 caratteri)");
    if (!p.address) fail("address", "Inserisci l'indirizzo");
    if (!/^\d{5}$/.test(p.postalCode)) fail("postalCode", "CAP di 5 cifre");
    if (!p.city) fail("city", "Inserisci il comune");
    if (!/^[A-Z]{2}$/.test(p.province)) fail("province", "Provincia: sigla di 2 lettere (es. TO)");
    if (p.email && !EMAIL.test(p.email)) fail("email", "Email non valida");
    if (p.pec && !EMAIL.test(p.pec)) fail("pec", "PEC non valida");
    if (p.iban && !/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(p.iban)) fail("iban", "IBAN non valido");
    const start = /^\d{4}-\d{2}-\d{2}$/.test(p.activityStartDate) ? new Date(`${p.activityStartDate}T00:00:00Z`) : null;
    if (!start || Number.isNaN(start.getTime()) || start.getUTCFullYear() < 1980) {
      fail("activityStartDate", "Data di inizio attività non valida");
    }
    if (!/^\d{2}(\.\d{1,2}){0,2}$/.test(p.atecoCode)) fail("atecoCode", "Codice ATECO non valido (es. 62.10.00)");
    if (!COEFFICIENTS.some((c) => c.value === p.coefficient)) fail("coefficient", "Scegli il coefficiente di redditività");
    if (p.invoicePrefix.length > 10) fail("invoicePrefix", "Prefisso di al massimo 10 caratteri");
    if (!Number.isInteger(p.paymentDays) || p.paymentDays < 0 || p.paymentDays > 365) {
      fail("paymentDays", "Giorni di pagamento tra 0 e 365");
    }
  });

export type ProfileInput = z.infer<typeof ProfileSchema>;

const clean = (s: unknown) => (typeof s === "string" ? s.trim() : "");
const upper = (s: unknown) => clean(s).toUpperCase().replace(/\s+/g, "");
const optional = (s: string) => (s === "" ? null : s);
const checked = (v: unknown) => v === "on" || v === "true";

/** Normalises raw form values: trims, uppercases codes, reads checkboxes and numbers. */
export function normaliseProfileForm(raw: Record<string, unknown>): ProfileInput {
  return {
    firstName: clean(raw.firstName),
    lastName: clean(raw.lastName),
    vatNumber: upper(raw.vatNumber).replace(/^IT(?=\d{11}$)/, ""),
    taxCode: upper(raw.taxCode),
    address: clean(raw.address),
    streetNumber: clean(raw.streetNumber),
    postalCode: upper(raw.postalCode),
    city: clean(raw.city),
    province: upper(raw.province),
    email: clean(raw.email).toLowerCase(),
    pec: clean(raw.pec).toLowerCase(),
    iban: upper(raw.iban),
    activityStartDate: clean(raw.activityStartDate),
    atecoCode: clean(raw.atecoCode),
    coefficient: Number(raw.coefficient),
    startupRate: raw.startupRate === "5",
    inps35: checked(raw.inps35),
    inps50: checked(raw.inps50),
    stampToClient: checked(raw.stampToClient),
    invoicePrefix: clean(raw.invoicePrefix),
    paymentDays: Number(clean(raw.paymentDays) || "30"),
  };
}

/** Row for fiscale.fiscal_profiles (user_id is added by the caller). */
export function toProfileRow(p: ProfileInput) {
  return {
    first_name: p.firstName,
    last_name: p.lastName,
    vat_number: p.vatNumber,
    tax_code: p.taxCode,
    address: p.address,
    street_number: optional(p.streetNumber),
    postal_code: p.postalCode,
    city: p.city,
    province: p.province,
    country: "IT",
    email: optional(p.email),
    pec: optional(p.pec),
    iban: optional(p.iban),
    activity_start_date: p.activityStartDate,
    ateco_code: p.atecoCode,
    profitability_coefficient: p.coefficient,
    // 5% for the start year and the 4 after it when entitled (comma 65), otherwise 15% from the start.
    startup_tax_rate: p.startupRate ? 0.05 : 0.15,
    standard_tax_rate: 0.15,
    startup_years: 5,
    inps_scheme: "artigiani",
    inps_reduction_35_active: p.inps35,
    inps_reduction_50_new_enrollment_active: p.inps50,
    charge_stamp_duty_to_client: p.stampToClient,
    invoice_number_prefix: p.invoicePrefix,
    default_payment_terms_days: p.paymentDays,
  };
}

type Row = Record<string, unknown>;
const str = (v: unknown) => (v == null ? "" : String(v));

/** Form values from a saved row; null row = empty form with the usual defaults. */
export function profileFormValues(row: Row | null, email: string | null): ProfileInput {
  if (!row) {
    return {
      firstName: "",
      lastName: "",
      vatNumber: "",
      taxCode: "",
      address: "",
      streetNumber: "",
      postalCode: "",
      city: "",
      province: "",
      email: email ?? "",
      pec: "",
      iban: "",
      activityStartDate: "",
      atecoCode: "",
      coefficient: 0.67,
      startupRate: false,
      inps35: false,
      inps50: false,
      stampToClient: true,
      invoicePrefix: "",
      paymentDays: 30,
    };
  }
  return {
    firstName: str(row.first_name),
    lastName: str(row.last_name),
    vatNumber: str(row.vat_number),
    taxCode: str(row.tax_code),
    address: str(row.address),
    streetNumber: str(row.street_number),
    postalCode: str(row.postal_code),
    city: str(row.city),
    province: str(row.province),
    email: str(row.email),
    pec: str(row.pec),
    iban: str(row.iban),
    activityStartDate: str(row.activity_start_date),
    atecoCode: str(row.ateco_code),
    coefficient: Number(row.profitability_coefficient),
    startupRate: Number(row.startup_tax_rate) < 0.1,
    inps35: Boolean(row.inps_reduction_35_active),
    inps50: Boolean(row.inps_reduction_50_new_enrollment_active),
    stampToClient: Boolean(row.charge_stamp_duty_to_client),
    invoicePrefix: str(row.invoice_number_prefix),
    paymentDays: Number(row.default_payment_terms_days ?? 30),
  };
}
