/**
 * Regime Forfettario tax engine — pure, deterministic, no I/O.
 *
 * Cash basis (principio di cassa): revenue counts in the year it is collected,
 * INPS contributions are deductible in the year they are paid (comma 64).
 *
 *   Reddito imponibile lordo = Ricavi incassati × coefficiente (67%)
 *   Reddito imponibile netto = lordo − contributi INPS versati nell'anno
 *   Imposta sostitutiva      = netto × 5% (start-up) / 15%
 *
 * INPS Artigiani is computed on the gross taxable income (before the INPS
 * deduction), as reported in quadro RR from LM34.
 */

import { applyRate, roundCents, sumCents, type Cents } from "./money";
import {
  ADVANCE_THRESHOLDS,
  CHAMBER_OF_COMMERCE_FEE,
  DEFAULT_PROFILE,
  FORFETTARIO,
  getInpsParams,
  STAMP_DUTY,
  type FiscalProfile,
  type InpsArtigianiParams,
} from "./tax-config";

// ---------------------------------------------------------------------------
// Input types (mirror the DB rows, already converted to cents)
// ---------------------------------------------------------------------------

/** One cash collection on an invoice (row of `invoice_payments`). */
export interface Collection {
  collectedAt: string; // ISO date
  amount: Cents;
  invoiceId?: string;
}

export type InpsPaymentKind =
  | "fixed_q1"
  | "fixed_q2"
  | "fixed_q3"
  | "fixed_q4"
  | "excess_balance"
  | "excess_advance_1"
  | "excess_advance_2"
  | "other";

/** One INPS F24 payment (row of `inps_payments`). */
export interface InpsPayment {
  paidAt: string; // ISO date — decides the deductibility year
  amount: Cents;
  competenceYear: number;
  kind: InpsPaymentKind;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

export const yearOf = (iso: string): number => Number(iso.slice(0, 4));
const monthOf = (iso: string): number => Number(iso.slice(5, 7));

function startOf(profile: FiscalProfile) {
  return { year: yearOf(profile.activityStartDate), month: monthOf(profile.activityStartDate) };
}

/** Months since activity start (0 = start month). Negative = before start. */
function monthsFromStart(year: number, month: number, profile: FiscalProfile): number {
  const s = startOf(profile);
  return (year - s.year) * 12 + (month - s.month);
}

// ---------------------------------------------------------------------------
// Substitute tax rate
// ---------------------------------------------------------------------------

export function isStartupRateYear(year: number, profile: FiscalProfile = DEFAULT_PROFILE): boolean {
  const startYear = startOf(profile).year;
  return year >= startYear && year < startYear + profile.startupYears;
}

export function substituteTaxRate(year: number, profile: FiscalProfile = DEFAULT_PROFILE): number {
  return isStartupRateYear(year, profile) ? profile.startupTaxRate : profile.standardTaxRate;
}

// ---------------------------------------------------------------------------
// INPS Gestione Artigiani
// ---------------------------------------------------------------------------

/**
 * Contribution reduction for a given month (0, 0.35 or 0.5). Returns null when
 * the activity was not active in that month.
 * The 50% new-enrollment reduction wins for its 36 months; after that the 35%
 * forfettari reduction applies if requested (they cannot be combined).
 */
export function inpsReductionForMonth(
  year: number,
  month: number,
  profile: FiscalProfile = DEFAULT_PROFILE,
): number | null {
  const m = monthsFromStart(year, month, profile);
  if (m < 0) return null;
  const enrolledIn2025 = startOf(profile).year === 2025;
  if (profile.inpsReduction50NewEnrollmentActive && enrolledIn2025 && m < 36) return 0.5;
  if (profile.inpsReduction35Active) return 0.35;
  return 0;
}

export interface InpsDue {
  year: number;
  activeMonths: number;
  /** Reduction per month, Jan..Dec (null = not active). */
  reductionByMonth: (number | null)[];
  /** Minimale pro-rated on active months. */
  proratedMinimumIncome: Cents;
  /** Fixed quarterly instalments Q1..Q4 (due 16/5, 20/8, 16/11, 16/2 next year). */
  fixedQuarterly: [Cents, Cents, Cents, Cents];
  fixedTotal: Cents;
  /** Contribution on income above the minimale (paid with the tax return). */
  excess: Cents;
  total: Cents;
  params: InpsArtigianiParams;
  warnings: string[];
}

function inpsWarnings(profile: FiscalProfile, params: InpsArtigianiParams): string[] {
  const warnings: string[] = [];
  if (!params.verified) warnings.push(`Parametri INPS ${params.year} non verificati: ${params.source}.`);
  if (profile.inpsReduction50NewEnrollmentActive && startOf(profile).year !== 2025) {
    warnings.push("Riduzione 50% ignorata: spetta solo a chi si è iscritto per la prima volta nel 2025.");
  }
  if (profile.inpsReduction35Active && profile.inpsReduction50NewEnrollmentActive) {
    warnings.push("Riduzioni 35% e 50% non cumulabili: applico il 50% per 36 mesi, poi il 35%.");
  }
  return warnings;
}

/** Excess contribution on `taxableGross`, given months active and reductions. */
function excessContribution(
  taxableGross: Cents,
  params: InpsArtigianiParams,
  reductions: number[],
): { excess: Cents; proratedMinimumIncome: Cents } {
  const months = reductions.length;
  if (months === 0) return { excess: 0, proratedMinimumIncome: 0 };
  const proratedMin = (params.minimumIncome * months) / 12;
  const base = Math.min(Math.max(taxableGross, 0), params.maximumIncome);

  const firstBracket = Math.max(0, Math.min(base, params.bracketThreshold) - proratedMin) * params.rate;
  const secondBracket =
    Math.max(0, base - Math.max(params.bracketThreshold, proratedMin)) * params.rateAboveBracket;

  // Reductions vary by month only around the 36-month boundary: use the average.
  const avgReduction = reductions.reduce((a, b) => a + b, 0) / months;
  return {
    excess: roundCents((firstBracket + secondBracket) * (1 - avgReduction)),
    proratedMinimumIncome: roundCents(proratedMin),
  };
}

export function computeInpsDue(
  year: number,
  taxableGross: Cents,
  profile: FiscalProfile = DEFAULT_PROFILE,
  params: InpsArtigianiParams = getInpsParams(year),
): InpsDue {
  const reductionByMonth = Array.from({ length: 12 }, (_, i) => inpsReductionForMonth(year, i + 1, profile));
  const activeReductions = reductionByMonth.filter((r): r is number => r !== null);

  const monthlyIvs = (params.minimumIncome * params.rate) / 12;
  const fixedQuarterly = [0, 1, 2, 3].map((q) => {
    let quarter = 0;
    for (let m = q * 3; m < q * 3 + 3; m++) {
      const r = reductionByMonth[m];
      if (r === null) continue;
      quarter += monthlyIvs * (1 - r) + params.maternityMonthly; // maternità is never reduced
    }
    return roundCents(quarter);
  }) as [Cents, Cents, Cents, Cents];

  const { excess, proratedMinimumIncome } = excessContribution(taxableGross, params, activeReductions);
  const fixedTotal = sumCents(fixedQuarterly);

  return {
    year,
    activeMonths: activeReductions.length,
    reductionByMonth,
    proratedMinimumIncome,
    fixedQuarterly,
    fixedTotal,
    excess,
    total: fixedTotal + excess,
    params,
    warnings: inpsWarnings(profile, params),
  };
}

// ---------------------------------------------------------------------------
// Annual tax computation
// ---------------------------------------------------------------------------

export type RevenueLimitStatus = "ok" | "warning" | "exceeded" | "hard_exceeded";

export interface TaxYearInput {
  year: number;
  /** Ricavi incassati nell'anno (cassa). */
  grossRevenue: Cents;
  /** Contributi INPS versati nell'anno (deducibili). */
  inpsDeducted: Cents;
  profile?: FiscalProfile;
}

export interface TaxYearResult {
  year: number;
  grossRevenue: Cents;
  coefficient: number;
  taxableGross: Cents;
  inpsDeducted: Cents;
  taxableNet: Cents;
  /** INPS paid above the taxable income: deductible from other income, not here. */
  unusedInpsDeduction: Cents;
  taxRate: number;
  isStartupRate: boolean;
  substituteTax: Cents;
  /** INPS owed for this year's income (fixed + excess), regardless of when paid. */
  inpsDue: InpsDue;
  /** Lordo − INPS versati − imposta (pure cash view). */
  netCash: Cents;
  /** Lordo − INPS di competenza − imposta (what this year's work really leaves you). */
  netAccrual: Cents;
  /** (INPS di competenza + imposta) / lordo. */
  effectiveBurdenRate: number;
  revenueLimit: {
    limit: Cents;
    remaining: Cents;
    ratio: number;
    status: RevenueLimitStatus;
  };
  warnings: string[];
}

function revenueLimitStatus(gross: Cents): TaxYearResult["revenueLimit"] {
  const limit = FORFETTARIO.revenueLimit;
  const ratio = gross / limit;
  let status: RevenueLimitStatus = "ok";
  if (gross > FORFETTARIO.revenueHardLimit) status = "hard_exceeded";
  else if (gross > limit) status = "exceeded";
  else if (ratio >= 0.8) status = "warning";
  return { limit, remaining: Math.max(0, limit - gross), ratio, status };
}

export function computeTaxYear(input: TaxYearInput): TaxYearResult {
  const profile = input.profile ?? DEFAULT_PROFILE;
  const { year, grossRevenue, inpsDeducted } = input;

  const coefficient = profile.profitabilityCoefficient;
  const taxableGross = applyRate(grossRevenue, coefficient);
  const taxableNet = Math.max(0, taxableGross - inpsDeducted);
  const unusedInpsDeduction = Math.max(0, inpsDeducted - taxableGross);
  const taxRate = substituteTaxRate(year, profile);
  const substituteTax = applyRate(taxableNet, taxRate);
  const inpsDue = computeInpsDue(year, taxableGross, profile);

  const revenueLimit = revenueLimitStatus(grossRevenue);
  const warnings = [...inpsDue.warnings];
  if (revenueLimit.status === "warning") warnings.push("Oltre l'80% della soglia di 85.000 € di ricavi.");
  if (revenueLimit.status === "exceeded")
    warnings.push("Soglia di 85.000 € superata: uscita dal forfettario dall'anno successivo.");
  if (revenueLimit.status === "hard_exceeded")
    warnings.push("Ricavi oltre 100.000 €: uscita immediata dal regime, IVA dalla fattura che supera la soglia.");
  if (unusedInpsDeduction > 0)
    warnings.push("Contributi versati superiori al reddito: l'eccedenza è deducibile dal reddito complessivo.");

  const burden = inpsDue.total + substituteTax;
  return {
    year,
    grossRevenue,
    coefficient,
    taxableGross,
    inpsDeducted,
    taxableNet,
    unusedInpsDeduction,
    taxRate,
    isStartupRate: isStartupRateYear(year, profile),
    substituteTax,
    inpsDue,
    netCash: grossRevenue - inpsDeducted - substituteTax,
    netAccrual: grossRevenue - burden,
    effectiveBurdenRate: grossRevenue > 0 ? burden / grossRevenue : 0,
    revenueLimit,
    warnings,
  };
}

/** Same as computeTaxYear, starting from raw collections and INPS payments. */
export function computeTaxYearFromLedger(args: {
  year: number;
  collections: Collection[];
  inpsPayments: InpsPayment[];
  profile?: FiscalProfile;
}): TaxYearResult {
  const inYear = (iso: string) => yearOf(iso) === args.year;
  return computeTaxYear({
    year: args.year,
    grossRevenue: sumCents(args.collections.filter((c) => inYear(c.collectedAt)).map((c) => c.amount)),
    inpsDeducted: sumCents(args.inpsPayments.filter((p) => inYear(p.paidAt)).map((p) => p.amount)),
    profile: args.profile,
  });
}

/**
 * Linear year-end projection of revenue from the YTD figure, over the days the
 * activity is actually open in that year. Returns the YTD value in the first 30 days.
 */
export function projectYearRevenue(
  ytdRevenue: Cents,
  asOf: string,
  profile: FiscalProfile = DEFAULT_PROFILE,
): Cents {
  const year = yearOf(asOf);
  const day = (iso: string) => Date.UTC(yearOf(iso), monthOf(iso) - 1, Number(iso.slice(8, 10)));
  const yearStart = Math.max(Date.UTC(year, 0, 1), day(profile.activityStartDate));
  const yearEnd = Date.UTC(year, 11, 31);
  const elapsed = (day(asOf) - yearStart) / 86_400_000 + 1;
  const total = (yearEnd - yearStart) / 86_400_000 + 1;
  if (elapsed < 30 || total <= 0) return ytdRevenue;
  return roundCents((ytdRevenue * total) / elapsed);
}

// ---------------------------------------------------------------------------
// Advances (acconti) — metodo storico
// ---------------------------------------------------------------------------

export interface Advances {
  first: Cents; // June
  second: Cents; // November
  total: Cents;
}

const NO_ADVANCES: Advances = { first: 0, second: 0, total: 0 };

/** Imposta sostitutiva advances for `year`, based on the prior-year tax (100%). */
export function computeTaxAdvances(
  year: number,
  priorYearTax: Cents,
  profile: FiscalProfile = DEFAULT_PROFILE,
): Advances {
  if (year <= startOf(profile).year) return NO_ADVANCES; // no advances in the start year
  if (priorYearTax <= ADVANCE_THRESHOLDS.none) return NO_ADVANCES;
  if (priorYearTax <= ADVANCE_THRESHOLDS.singleInstalment) {
    return { first: 0, second: priorYearTax, total: priorYearTax };
  }
  const first = applyRate(priorYearTax, profile.advanceSplit[0]);
  return { first, second: priorYearTax - first, total: priorYearTax };
}

/**
 * INPS excess advances for `year`: the excess the prior-year income would
 * produce against the current year's full minimale and rates, split 50/50.
 */
export function computeInpsExcessAdvances(
  year: number,
  priorYearTaxableGross: Cents,
  profile: FiscalProfile = DEFAULT_PROFILE,
): Advances {
  if (year <= startOf(profile).year) return NO_ADVANCES;
  const params = getInpsParams(year);
  const reductions = Array.from({ length: 12 }, (_, i) => inpsReductionForMonth(year, i + 1, profile) ?? 0);
  const { excess } = excessContribution(priorYearTaxableGross, params, reductions);
  const first = applyRate(excess, 0.5);
  return { first, second: excess - first, total: excess };
}

// ---------------------------------------------------------------------------
// F24 schedule simulator
// ---------------------------------------------------------------------------

export type F24Category = "inps_fixed" | "inps_excess" | "substitute_tax" | "stamp_duty" | "chamber_fee";

export interface F24Item {
  /** Stable id, e.g. "tax:balance:2025". Used to match recorded payments. */
  key: string;
  dueDate: string;
  category: F24Category;
  label: string;
  /** Codice tributo (Erario) or causale (INPS). */
  code: string;
  competenceYear: number;
  amount: Cents;
  /** When a balance is negative: credit you can offset (compensazione). */
  credit?: Cents;
  /** True when it depends on a year that is not closed yet. */
  estimate: boolean;
  note?: string;
}

export interface YearFigures {
  grossRevenue: Cents;
  inpsDeducted: Cents;
}

export interface F24ScheduleInput {
  calendarYear: number;
  /** Figures for calendarYear − 2, − 1 and the current one (missing = 0). */
  figures: Record<number, YearFigures>;
  /** Stamp duty on issued invoices, by year, per quarter of issue date. */
  stampDutyByQuarter?: Record<number, [Cents, Cents, Cents, Cents]>;
  /** Years whose figures are still provisional (default: calendarYear and later). */
  provisionalFrom?: number;
  profile?: FiscalProfile;
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** Easter Sunday (Anonymous Gregorian algorithm). */
function easter(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function isItalianHoliday(date: Date): boolean {
  const md = `${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  const fixed = ["01-01", "01-06", "04-25", "05-01", "06-02", "08-15", "11-01", "12-08", "12-25", "12-26"];
  if (fixed.includes(md)) return true;
  const easterMonday = easter(date.getUTCFullYear());
  easterMonday.setUTCDate(easterMonday.getUTCDate() + 1);
  return date.getTime() === easterMonday.getTime();
}

/** Deadlines falling on a weekend or holiday move to the next working day. */
export function shiftToBusinessDay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6 || isItalianHoliday(d)) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toISOString().slice(0, 10);
}

const lastDayOfFeb = (y: number) => (new Date(Date.UTC(y, 2, 0)).getUTCDate());

export function buildF24Schedule(input: F24ScheduleInput): F24Item[] {
  const profile = input.profile ?? DEFAULT_PROFILE;
  const C = input.calendarYear;
  const startYear = startOf(profile).year;
  const provisionalFrom = input.provisionalFrom ?? C;
  const isEstimate = (y: number) => y >= provisionalFrom;

  const yearResult = (y: number): TaxYearResult | null => {
    if (y < startYear) return null;
    const f = input.figures[y] ?? { grossRevenue: 0, inpsDeducted: 0 };
    return computeTaxYear({ year: y, ...f, profile });
  };
  const taxOf = (y: number) => yearResult(y)?.substituteTax ?? 0;
  const taxableOf = (y: number) => yearResult(y)?.taxableGross ?? 0;

  const items: F24Item[] = [];
  const push = (item: Omit<F24Item, "dueDate"> & { date: string }) => {
    const { date, ...rest } = item;
    const dueDate = shiftToBusinessDay(date);
    items.push({ ...rest, dueDate, note: dueDate !== date ? `Scadenza originaria ${date}` : rest.note });
  };

  // --- INPS fixed instalments -------------------------------------------
  const prev = yearResult(C - 1);
  const curr = yearResult(C);
  if (prev && prev.inpsDue.fixedQuarterly[3] > 0) {
    push({
      key: `inps:fixed_q4:${C - 1}`, date: iso(C, 2, 16), category: "inps_fixed",
      label: `INPS fissi 4ª rata ${C - 1}`, code: "AF", competenceYear: C - 1,
      amount: prev.inpsDue.fixedQuarterly[3], estimate: false,
    });
  }
  if (curr) {
    const fixedDates: [number, number][] = [[5, 16], [8, 20], [11, 16]];
    fixedDates.forEach(([m, d], q) => {
      const amount = curr.inpsDue.fixedQuarterly[q];
      if (amount <= 0) return;
      push({
        key: `inps:fixed_q${q + 1}:${C}`, date: iso(C, m, d), category: "inps_fixed",
        label: `INPS fissi ${q + 1}ª rata ${C}`, code: "AF", competenceYear: C,
        amount, estimate: !curr.inpsDue.params.verified,
      });
    });
  }

  // --- 30 June: balances for C−1 and first advances for C ---------------
  if (prev) {
    const taxAdvPrev = computeTaxAdvances(C - 1, taxOf(C - 2), profile);
    const balance = prev.substituteTax - taxAdvPrev.total;
    push({
      key: `tax:balance:${C - 1}`, date: iso(C, 6, 30), category: "substitute_tax",
      label: `Imposta sostitutiva saldo ${C - 1}`, code: "1792", competenceYear: C - 1,
      amount: Math.max(0, balance), credit: balance < 0 ? -balance : undefined,
      estimate: isEstimate(C - 1), note: "Prorogabile al 31/7 con maggiorazione 0,40%",
    });

    const inpsAdvPrev = computeInpsExcessAdvances(C - 1, taxableOf(C - 2), profile);
    const inpsBalance = prev.inpsDue.excess - inpsAdvPrev.total;
    if (prev.inpsDue.excess > 0 || inpsAdvPrev.total > 0) {
      push({
        key: `inps:excess_balance:${C - 1}`, date: iso(C, 6, 30), category: "inps_excess",
        label: `INPS eccedenza saldo ${C - 1}`, code: "AP", competenceYear: C - 1,
        amount: Math.max(0, inpsBalance), credit: inpsBalance < 0 ? -inpsBalance : undefined,
        estimate: isEstimate(C - 1),
      });
    }
  }

  if (curr) {
    const taxAdv = computeTaxAdvances(C, taxOf(C - 1), profile);
    const inpsAdv = computeInpsExcessAdvances(C, taxableOf(C - 1), profile);
    const advEstimate = isEstimate(C - 1);
    if (taxAdv.first > 0) push({
      key: `tax:advance_1:${C}`, date: iso(C, 6, 30), category: "substitute_tax",
      label: `Imposta sostitutiva 1° acconto ${C}`, code: "1790", competenceYear: C,
      amount: taxAdv.first, estimate: advEstimate,
    });
    if (inpsAdv.first > 0) push({
      key: `inps:excess_advance_1:${C}`, date: iso(C, 6, 30), category: "inps_excess",
      label: `INPS eccedenza 1° acconto ${C}`, code: "AP", competenceYear: C,
      amount: inpsAdv.first, estimate: advEstimate,
    });
    if (C > startYear) push({
      key: `chamber:${C}`, date: iso(C, 6, 30), category: "chamber_fee",
      label: `Diritto camerale ${C}`, code: "3850", competenceYear: C,
      amount: CHAMBER_OF_COMMERCE_FEE, estimate: true, note: "Importo indicativo, varia per provincia",
    });
    if (taxAdv.second > 0) push({
      key: `tax:advance_2:${C}`, date: iso(C, 11, 30), category: "substitute_tax",
      label: `Imposta sostitutiva ${taxAdv.first > 0 ? "2° acconto" : "acconto unico"} ${C}`,
      code: "1791", competenceYear: C, amount: taxAdv.second, estimate: advEstimate,
    });
    if (inpsAdv.second > 0) push({
      key: `inps:excess_advance_2:${C}`, date: iso(C, 11, 30), category: "inps_excess",
      label: `INPS eccedenza 2° acconto ${C}`, code: "AP", competenceYear: C,
      amount: inpsAdv.second, estimate: advEstimate,
    });
  }

  // --- Stamp duty on e-invoices -------------------------------------------
  const stamps = input.stampDutyByQuarter ?? {};
  const prevStamps = stamps[C - 1];
  if (prevStamps && prevStamps[3] > 0) {
    push({
      key: `stamp:q4:${C - 1}`, date: iso(C, 2, lastDayOfFeb(C)), category: "stamp_duty",
      label: `Bollo fatture 4° trimestre ${C - 1}`, code: "2524", competenceYear: C - 1,
      amount: prevStamps[3], estimate: false,
    });
  }
  const [q1, q2, q3] = stamps[C] ?? [0, 0, 0, 0];
  const limit = STAMP_DUTY.deferralThreshold;
  const stampItem = (q: number, date: string, amount: Cents, label: string) =>
    push({
      key: `stamp:q${q}:${C}`, date, category: "stamp_duty", label, code: `252${q}`,
      competenceYear: C, amount, estimate: isEstimate(C),
    });
  if (q1 >= limit) stampItem(1, iso(C, 5, 31), q1, `Bollo fatture 1° trimestre ${C}`);
  const q1Deferred = q1 < limit ? q1 : 0;
  if (q1Deferred + q2 >= limit) {
    stampItem(2, iso(C, 9, 30), q1Deferred + q2, `Bollo fatture ${q1Deferred ? "1°+2°" : "2°"} trimestre ${C}`);
  }
  const deferredToNov = q1Deferred + q2 < limit ? q1Deferred + q2 : 0;
  if (deferredToNov + q3 > 0) {
    stampItem(3, iso(C, 11, 30), deferredToNov + q3,
      `Bollo fatture ${deferredToNov ? "1°-3°" : "3°"} trimestre ${C}`);
  }

  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.key.localeCompare(b.key));
}

// ---------------------------------------------------------------------------
// Savings reserve: how much to keep aside today
// ---------------------------------------------------------------------------

export interface SavingsReserve {
  asOf: string;
  horizon: string;
  /** Upcoming payments for income/activity of this year or earlier. */
  matured: Cents;
  /** Everything due until the horizon, incl. next year's first advances. */
  cashOutUntilHorizon: Cents;
  upcoming: F24Item[];
}

/**
 * Sums the not-yet-paid F24 items between `asOf` and 30 June of next year.
 * Pass the schedules of the current and next calendar year, built with the
 * current year's figures (YTD or projected).
 */
export function computeSavingsReserve(args: {
  asOf: string;
  items: F24Item[];
  paidKeys?: ReadonlySet<string>;
}): SavingsReserve {
  const year = yearOf(args.asOf);
  const horizon = `${year + 1}-07-31`; // covers the 30/6 deadline even when shifted
  const upcoming = args.items.filter(
    (i) => i.dueDate >= args.asOf && i.dueDate <= horizon && !args.paidKeys?.has(i.key),
  );
  return {
    asOf: args.asOf,
    horizon,
    matured: sumCents(upcoming.filter((i) => i.competenceYear <= year).map((i) => i.amount)),
    cashOutUntilHorizon: sumCents(upcoming.map((i) => i.amount)),
    upcoming,
  };
}

// ---------------------------------------------------------------------------
// Per-invoice estimate (marginal): what each euro invoiced leaves in your pocket
// ---------------------------------------------------------------------------

export interface InvoiceNetEstimate {
  taxableIncome: Cents;
  inps: Cents;
  substituteTax: Cents;
  net: Cents;
  netRate: number;
}

/**
 * Marginal estimate, assuming the INPS minimale is already covered and the
 * contribution is deducted in the same year (steady state).
 */
export function estimateInvoiceNet(
  amount: Cents,
  date: string,
  profile: FiscalProfile = DEFAULT_PROFILE,
): InvoiceNetEstimate {
  const year = yearOf(date);
  const params = getInpsParams(year);
  const reduction = inpsReductionForMonth(year, monthOf(date), profile) ?? 0;
  const taxableIncome = applyRate(amount, profile.profitabilityCoefficient);
  const inps = applyRate(taxableIncome, params.rate * (1 - reduction));
  const substituteTax = applyRate(taxableIncome - inps, substituteTaxRate(year, profile));
  const net = amount - inps - substituteTax;
  return { taxableIncome, inps, substituteTax, net, netRate: amount > 0 ? net / amount : 0 };
}
