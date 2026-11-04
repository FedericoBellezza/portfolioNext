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
import { settledKeys } from "../obligations";
import type { FiscalDataset } from "./types";

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
  /** Calendar keys settled: paid or marked as not due. */
  paid: Set<string>;
  dismissed: Set<string>;
  /** Past deadlines with something to pay and nothing recorded yet. */
  overdue: F24Item[];
}

export function buildDashboard(data: FiscalDataset, asOf: string): DashboardModel {
  const profile = data.profile;
  const C = yearOf(asOf);
  const { paid: recorded, dismissed } = settledKeys(data);
  const paid = new Set([...recorded, ...dismissed]);
  const stamps = stampDutyByQuarter(data);

  const revenueOf = (y: number) =>
    sumCents(data.collections.filter((c) => yearOf(c.collectedAt) === y && c.collectedAt <= asOf).map((c) => c.amount));
  const inpsPaidIn = (y: number) =>
    sumCents(data.inpsPayments.filter((p) => yearOf(p.paidAt) === y && p.paidAt <= asOf).map((p) => p.amount));

  const figures: Record<number, { grossRevenue: Cents; inpsDeducted: Cents }> = {
    [C - 2]: { grossRevenue: revenueOf(C - 2), inpsDeducted: inpsPaidIn(C - 2) },
    [C - 1]: { grossRevenue: revenueOf(C - 1), inpsDeducted: inpsPaidIn(C - 1) },
  };

  const lastInail = [...data.taxPayments]
    .filter((p) => p.kind === "inail_premium")
    .sort((a, b) => a.competenceYear - b.competenceYear || a.paidAt.localeCompare(b.paidAt))
    .at(-1);
  const inail = { lastPremium: lastInail?.amount ?? null };

  const ytdRevenue = revenueOf(C);
  const ytd = computeTaxYear({ year: C, grossRevenue: ytdRevenue, inpsDeducted: inpsPaidIn(C), profile });

  // INPS of this calendar year not recorded yet is assumed paid within the year (and so
  // deductible): future instalments, and past ones still waiting for their F24 receipt.
  const scheduleC = buildF24Schedule({ calendarYear: C, figures, stampDutyByQuarter: stamps, profile });
  const inpsNotRecorded = sumCents(
    scheduleC.filter((i) => i.category.startsWith("inps") && !paid.has(i.key)).map((i) => i.amount),
  );
  const inpsDeductedYearEnd = ytd.inpsDeducted + inpsNotRecorded;

  figures[C] = { grossRevenue: ytdRevenue, inpsDeducted: inpsDeductedYearEnd };
  const yearEndOnCurrentRevenue = computeTaxYear({ year: C, ...figures[C], profile });
  const projected = computeTaxYear({
    year: C,
    grossRevenue: projectYearRevenue(ytdRevenue, asOf, profile),
    inpsDeducted: inpsDeductedYearEnd,
    profile,
  });

  const schedule = [
    ...buildF24Schedule({ calendarYear: C, figures, stampDutyByQuarter: stamps, profile, inail }),
    ...buildF24Schedule({ calendarYear: C + 1, figures, stampDutyByQuarter: stamps, profile, inail, provisionalFrom: C }),
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
    dismissed,
    overdue: schedule.filter((i) => i.dueDate < asOf && (i.amount > 0 || i.unknownAmount) && !paid.has(i.key)),
  };
}

/** Today in Italy, as an ISO date. */
export function todayInRome(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
}
