import { describe, expect, it } from "vitest";
import { monthlyNetAverage } from "../tax-calculator";
import { buildDashboard } from "../data/dashboard";
import { demoDataset } from "../data/demo";
import type { FiscalDataset } from "../data/types";
import { DEFAULT_PROFILE } from "../tax-config";

// Real-life shape: November 2025 start with the 50% reduction, incassi recorded,
// INPS F24s paid but not registered yet.
const data: FiscalDataset = {
  ...demoDataset,
  source: "supabase",
  profile: { ...DEFAULT_PROFILE, activityStartDate: "2025-11-06", inpsReduction50NewEnrollmentActive: true, inpsReduction35Active: true },
  invoices: [],
  collections: [
    { id: "a", invoiceId: "x", collectedAt: "2025-12-20", amount: 231_713 },
    { id: "b", invoiceId: "y", collectedAt: "2026-10-31", amount: 2_495_057 },
  ],
  inpsPayments: [],
  taxPayments: [],
  expenses: [],
  dismissedKeys: [],
};

describe("dashboard model", () => {
  const m = buildDashboard(data, "2026-11-04");
  const byKey = Object.fromEntries(m.schedule.map((i) => [i.key, i]));

  it("deducts the INPS instalments of the year even before their F24 is registered", () => {
    // 372,34 (Q4 2025, paid Feb 2026) + 3 × 566,10 (2026 at 50%)
    expect(m.yearEndOnCurrentRevenue.inpsDeducted).toBe(207_064);
    // (24.950,57 × 67% − 2.070,64) × 5%
    expect(m.yearEndOnCurrentRevenue.substituteTax).toBe(73_231);
    expect(m.yearEndOnCurrentRevenue.inpsDue.excess).toBe(0); // under the 18.808 € minimale
  });

  it("matches the expected 2027 calendar", () => {
    expect(byKey["tax:advance_2:2026"]).toMatchObject({ dueDate: "2026-11-30", amount: 7_762 }); // single advance on 77,62 €
    expect(byKey["tax:balance:2026"]).toMatchObject({ dueDate: "2027-06-30", amount: 73_231 - 7_762 });
    expect(byKey["tax:advance_1:2027"]?.amount).toBe(36_616);
    expect(byKey["inps:fixed_q1:2027"]).toMatchObject({ dueDate: "2027-05-17", amount: 56_610 }); // 16/5/2027 is a Sunday
  });

  it("still asks to register the past instalments, INAIL included", () => {
    expect(m.overdue.map((i) => i.key)).toEqual(
      expect.arrayContaining(["inps:fixed_q4:2025", "inps:fixed_q1:2026", "inps:fixed_q2:2026", "inail:2026"]),
    );
    expect(byKey["inail:2026"]).toMatchObject({ unknownAmount: true });
  });

  it("scales the available compensation credit from what to keep aside", () => {
    const credit = {
      id: "c1", kind: "irpef" as const, referenceYear: 2025, amount: 99_900, destination: "compensation" as const,
      source: null, notes: null, uses: [], used: 15_600, residual: 84_300,
    };
    const withCredit = buildDashboard({ ...data, credits: [credit] }, "2026-11-04");
    expect(withCredit.availableCredit).toBe(84_300);
    expect(withCredit.reserveAfterCredit).toBe(Math.max(0, withCredit.reserve.cashOutUntilHorizon - 84_300));
    const refund = buildDashboard({ ...data, credits: [{ ...credit, destination: "refund" as const }] }, "2026-11-04");
    expect(refund.availableCredit).toBe(0);
    expect(refund.reserveAfterCredit).toBe(refund.reserve.cashOutUntilHorizon);
  });

  it("averages the monthly net on what was invoiced, not on what was collected", () => {
    expect(m.monthlyNet).toEqual(
      monthlyNetAverage({ ytdRevenue: m.invoicedYtd, asOf: m.asOf, inpsDeducted: m.yearEndOnCurrentRevenue.inpsDeducted, profile: data.profile }),
    );
  });

  it("keeps aside next year's advances too, since they are due anyway", () => {
    const advance = m.reserve.upcoming.find((i) => i.key === "tax:advance_1:2027" || i.key === "inps:fixed_q1:2027");
    expect(advance).toBeDefined();
    expect(m.reserveAfterCredit).toBe(m.reserve.cashOutUntilHorizon - m.availableCredit);
    expect(m.nextYearShare).toBeGreaterThanOrEqual(advance!.amount);
  });

  it("estimates next INAIL with the last premium paid", () => {
    const withInail = buildDashboard(
      {
        ...data,
        taxPayments: [
          { id: "i", paidAt: "2026-02-16", competenceYear: 2026, kind: "inail_premium", tributeCode: null, amount: 9_726, receiptPath: null },
        ],
      },
      "2026-11-04",
    );
    expect(withInail.overdue.some((i) => i.key === "inail:2026")).toBe(false);
    expect(withInail.schedule.find((i) => i.key === "inail:2027")).toMatchObject({ amount: 9_726, dueDate: "2027-02-16" });
    expect(withInail.reserve.upcoming.some((i) => i.key === "inail:2027")).toBe(true);
  });

  it("takes the INAIL premium of the year off what is left, not off the taxes", () => {
    const withInail = buildDashboard(
      {
        ...data,
        taxPayments: [
          { id: "i", paidAt: "2026-02-16", competenceYear: 2026, kind: "inail_premium", tributeCode: null, amount: 58_534, receiptPath: null },
        ],
      },
      "2026-11-04",
    );
    expect(withInail.inail).toEqual({ amount: 58_534, estimate: false });
    expect(withInail.yearEndOnCurrentRevenue.substituteTax).toBe(m.yearEndOnCurrentRevenue.substituteTax);
    expect(withInail.net).toBe(m.yearEndOnCurrentRevenue.netAccrual - 58_534);
    expect(withInail.monthlyNet!.monthly).toBeLessThan(m.monthlyNet!.monthly);
    // No premium paid yet in the start year: nothing to take off.
    expect(m.inail.amount).toBe(0);
    expect(m.net).toBe(m.yearEndOnCurrentRevenue.netAccrual);
  });
});
