import { sumCents, type Cents } from "../money";
import {
  buildF24Schedule,
  computeSavingsReserve,
  computeTaxYear,
  projectYearRevenue,
  yearOf,
  type F24Item,
  type SavingsReserve,
  type TaxYearResult,
} from "../tax-calculator";
import type { FiscalDataset, TaxPaymentKind } from "./types";

/** Maps recorded F24 payments to schedule keys, to mark deadlines as paid. */
function paidKeys(data: FiscalDataset): Set<string> {
  const keys = new Set<string>();
  for (const p of data.inpsPayments) keys.add(`inps:${p.kind}:${p.competenceYear}`);
  const taxKey: Partial<Record<TaxPaymentKind, string>> = {
    substitute_tax_balance: "tax:balance",
    substitute_tax_advance_1: "tax:advance_1",
    substitute_tax_advance_2: "tax:advance_2",
    stamp_duty_q1: "stamp:q1",
    stamp_duty_q2: "stamp:q2",
    stamp_duty_q3: "stamp:q3",
    stamp_duty_q4: "stamp:q4",
    chamber_fee: "chamber",
  };
  for (const p of data.taxPayments) {
    const k = taxKey[p.kind];
    if (k) keys.add(`${k}:${p.competenceYear}`);
  }
  return keys;
}

function stampDutyByQuarter(data: FiscalDataset) {
  const out: Record<number, [Cents, Cents, Cents, Cents]> = {};
  for (const i of data.invoices) {
    if (i.status !== "issued" || !i.issueDate || i.stampDuty === 0) continue;
    const y = yearOf(i.issueDate);
    const q = Math.floor((Number(i.issueDate.slice(5, 7)) - 1) / 3);
    out[y] ??= [0, 0, 0, 0];
    out[y][q] += i.stampDuty;
  }
  return out;
}

export interface DashboardModel {
  asOf: string;
  year: number;
  /** Year to date, cash basis. */
  ytd: TaxYearResult;
  /** YTD revenue, INPS deductions including what is still due this year. */
  yearEndOnCurrentRevenue: TaxYearResult;
  /** Linear projection of revenue to 31/12. */
  projected: TaxYearResult;
  schedule: F24Item[];
  reserve: SavingsReserve;
  monthlyRevenue: Cents[];
  outstanding: Cents;
  expensesYtd: Cents;
  paid: Set<string>;
}

export function buildDashboard(data: FiscalDataset, asOf: string): DashboardModel {
  const profile = data.profile;
  const C = yearOf(asOf);
  const paid = paidKeys(data);
  const stamps = stampDutyByQuarter(data);

  const revenueOf = (y: number) =>
    sumCents(data.collections.filter((c) => yearOf(c.collectedAt) === y && c.collectedAt <= asOf).map((c) => c.amount));
  const inpsPaidIn = (y: number) =>
    sumCents(data.inpsPayments.filter((p) => yearOf(p.paidAt) === y && p.paidAt <= asOf).map((p) => p.amount));

  const figures: Record<number, { grossRevenue: Cents; inpsDeducted: Cents }> = {
    [C - 2]: { grossRevenue: revenueOf(C - 2), inpsDeducted: inpsPaidIn(C - 2) },
    [C - 1]: { grossRevenue: revenueOf(C - 1), inpsDeducted: inpsPaidIn(C - 1) },
  };

  const ytdRevenue = revenueOf(C);
  const ytd = computeTaxYear({ year: C, grossRevenue: ytdRevenue, inpsDeducted: inpsPaidIn(C), profile });

  // INPS still to pay this calendar year is deductible this year too.
  const scheduleC = buildF24Schedule({ calendarYear: C, figures, stampDutyByQuarter: stamps, profile });
  const inpsStillDueThisYear = sumCents(
    scheduleC
      .filter((i) => i.category.startsWith("inps") && i.dueDate >= asOf && !paid.has(i.key))
      .map((i) => i.amount),
  );
  const inpsDeductedYearEnd = ytd.inpsDeducted + inpsStillDueThisYear;

  figures[C] = { grossRevenue: ytdRevenue, inpsDeducted: inpsDeductedYearEnd };
  const yearEndOnCurrentRevenue = computeTaxYear({ year: C, ...figures[C], profile });
  const projected = computeTaxYear({
    year: C,
    grossRevenue: projectYearRevenue(ytdRevenue, asOf, profile),
    inpsDeducted: inpsDeductedYearEnd,
    profile,
  });

  const schedule = [
    ...buildF24Schedule({ calendarYear: C, figures, stampDutyByQuarter: stamps, profile }),
    ...buildF24Schedule({ calendarYear: C + 1, figures, stampDutyByQuarter: stamps, profile, provisionalFrom: C }),
  ];
  const reserve = computeSavingsReserve({ asOf, items: schedule, paidKeys: paid });

  const monthlyRevenue = Array.from({ length: 12 }, (_, m) =>
    sumCents(
      data.collections
        .filter((c) => yearOf(c.collectedAt) === C && Number(c.collectedAt.slice(5, 7)) === m + 1)
        .map((c) => c.amount),
    ),
  );

  return {
    asOf,
    year: C,
    ytd,
    yearEndOnCurrentRevenue,
    projected,
    schedule,
    reserve,
    monthlyRevenue,
    outstanding: sumCents(
      data.invoices.filter((i) => i.status === "issued").map((i) => Math.max(0, i.total - i.collected)),
    ),
    expensesYtd: sumCents(data.expenses.filter((e) => yearOf(e.spentAt) === C).map((e) => e.amount)),
    paid,
  };
}

/** Today in Italy, as an ISO date. */
export function todayInRome(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
}
