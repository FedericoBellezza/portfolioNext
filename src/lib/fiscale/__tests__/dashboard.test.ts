import { describe, expect, it } from "vitest";
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

  it("still asks to register the past instalments", () => {
    expect(m.overdue.map((i) => i.key)).toEqual(
      expect.arrayContaining(["inps:fixed_q4:2025", "inps:fixed_q1:2026", "inps:fixed_q2:2026"]),
    );
  });
});
