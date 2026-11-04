import type { Cents } from "./money";

/**
 * Fiscal parameters for an Italian freelancer in Regime Forfettario
 * (L. 190/2014, commi 54-89) enrolled in INPS Gestione Artigiani.
 *
 * Everything that changes by law or by year lives here, so the calculator
 * itself stays a pure function of (data, profile, yearly params).
 */

// ---------------------------------------------------------------------------
// Profile: who I am fiscally. Persisted in `fiscal_profiles`, defaults below.
// ---------------------------------------------------------------------------

export type InpsScheme = "artigiani";

export interface FiscalProfile {
  /** ISO date. Drives start-up rate window, INPS pro-rating and first-year rules. */
  activityStartDate: string;
  atecoCode: string;
  /** Coefficiente di redditività for the ATECO group (62.x -> 67%). */
  profitabilityCoefficient: number;
  /** Imposta sostitutiva for the start year and the following 4 (comma 65). */
  startupTaxRate: number;
  standardTaxRate: number;
  startupYears: number;
  inpsScheme: InpsScheme;
  /** Riduzione 35% per forfettari (L. 190/2014, c. 77). Must be requested to INPS. */
  inpsReduction35Active: boolean;
  /**
   * Riduzione 50% for 36 months for first enrollment in Artigiani/Commercianti
   * during 2025 (L. 207/2024, c. 186). Not cumulable with the 35% one.
   */
  inpsReduction50NewEnrollmentActive: boolean;
  /** If true the 2.00 € stamp is added to the invoice total (and becomes revenue). */
  chargeStampDutyToClient: boolean;
  /** Split of tax/INPS advances between June and November. */
  advanceSplit: readonly [number, number];
}

export const DEFAULT_PROFILE: FiscalProfile = {
  activityStartDate: "2025-11-01",
  atecoCode: "62.10.00",
  profitabilityCoefficient: 0.67,
  startupTaxRate: 0.05,
  standardTaxRate: 0.15,
  startupYears: 5,
  inpsScheme: "artigiani",
  inpsReduction35Active: false,
  inpsReduction50NewEnrollmentActive: false,
  chargeStampDutyToClient: true,
  // Forfettari pay advances in two equal instalments (art. 58 DL 124/2019).
  advanceSplit: [0.5, 0.5],
};

// ---------------------------------------------------------------------------
// INPS Gestione Artigiani yearly parameters (from the yearly INPS circular).
// ---------------------------------------------------------------------------

export interface InpsArtigianiParams {
  year: number;
  /** Minimale di reddito on which the fixed contribution is computed. */
  minimumIncome: Cents;
  /** IVS rate up to the first bracket (titolari over 21). */
  rate: number;
  /** Income threshold above which `rateAboveBracket` applies. */
  bracketThreshold: Cents;
  rateAboveBracket: number;
  /** Massimale for people with no contributions before 1996. */
  maximumIncome: Cents;
  /** Contributo maternità, per month, never reduced. */
  maternityMonthly: Cents;
  /** False when the numbers are a placeholder waiting for the yearly circular. */
  verified: boolean;
  source: string;
}

export const INPS_ARTIGIANI: Record<number, InpsArtigianiParams> = {
  2025: {
    year: 2025,
    minimumIncome: 1_855_500,
    rate: 0.24,
    bracketThreshold: 5_544_800,
    rateAboveBracket: 0.25,
    maximumIncome: 12_060_700,
    maternityMonthly: 62,
    verified: true,
    source: "Circolare INPS 2025 (minimale 18.555 €, fisso annuo 4.460,64 €)",
  },
  2026: {
    // TODO: replace with the 2026 INPS circular values. Until then the 2025
    // numbers are used and the UI shows a warning.
    year: 2026,
    minimumIncome: 1_855_500,
    rate: 0.24,
    bracketThreshold: 5_544_800,
    rateAboveBracket: 0.25,
    maximumIncome: 12_060_700,
    maternityMonthly: 62,
    verified: false,
    source: "Placeholder: valori 2025, da aggiornare con la circolare INPS 2026",
  },
};

/** Params for a year, falling back to the latest known year (flagged unverified). */
export function getInpsParams(year: number): InpsArtigianiParams {
  const exact = INPS_ARTIGIANI[year];
  if (exact) return exact;
  const years = Object.keys(INPS_ARTIGIANI).map(Number).sort((a, b) => a - b);
  const fallbackYear = [...years].reverse().find((y) => y <= year) ?? years[0];
  return {
    ...INPS_ARTIGIANI[fallbackYear],
    year,
    verified: false,
    source: `Fallback: valori ${fallbackYear}`,
  };
}

// ---------------------------------------------------------------------------
// Fixed legal thresholds.
// ---------------------------------------------------------------------------

export const FORFETTARIO = {
  /** Revenue cap to stay in the regime next year. */
  revenueLimit: 8_500_000,
  /** Above this the regime ends immediately (VAT from the invoice that crosses it). */
  revenueHardLimit: 10_000_000,
  regimeFiscaleCode: "RF19",
  vatNature: "N2.2",
} as const;

export const STAMP_DUTY = {
  /** Required when the non-VAT amount is strictly above 77,47 €. */
  threshold: 7_747,
  amount: 200,
  /** Quarterly F24 payment can be deferred while the cumulative amount stays under 5.000 €. */
  deferralThreshold: 500_000,
} as const;

export const ADVANCE_THRESHOLDS = {
  /** No advance due if the prior-year tax is at or below this. */
  none: 5_165,
  /** Single advance in November if the prior-year tax is at or below this. */
  singleInstalment: 25_752,
} as const;

/** Diritto camerale (sezione speciale + typical 20% maggiorazione). Varies by province. */
export const CHAMBER_OF_COMMERCE_FEE: Cents = 5_300;

export const FORFETTARIO_CLAUSE =
  "Operazione effettuata ai sensi dell'articolo 1, commi da 54 a 89, della Legge n. 190/2014 " +
  "così come modificato dalla Legge n. 208/2015 e dalla Legge n. 145/2018. " +
  "Operazione senza applicazione dell'IVA. Si richiede la non effettuazione della ritenuta " +
  "alla fonte a titolo d'acconto ai sensi dell'art. 1, comma 67, L. n. 190/2014.";

export const STAMP_DUTY_CLAUSE =
  "Imposta di bollo assolta in modo virtuale ai sensi dell'art. 6, comma 2, del D.M. 17/06/2014.";
