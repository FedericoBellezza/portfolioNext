import { describe, expect, it } from "vitest";
import { toCents } from "../money";
import { DEFAULT_PROFILE, type FiscalProfile } from "../tax-config";
import {
  buildF24Schedule,
  computeInpsDue,
  computeSavingsReserve,
  computeTaxAdvances,
  computeTaxYear,
  computeTaxYearFromLedger,
  estimateInvoiceNet,
  projectYearRevenue,
  shiftToBusinessDay,
  substituteTaxRate,
} from "../tax-calculator";
import { computeInvoiceTotals, requiresStampDuty } from "../invoice-math";

const profile = (overrides: Partial<FiscalProfile> = {}): FiscalProfile => ({
  ...DEFAULT_PROFILE,
  ...overrides,
});

describe("computeTaxYear", () => {
  it("applies 67% coefficient, deducts INPS paid and taxes at 5%", () => {
    const r = computeTaxYear({ year: 2026, grossRevenue: toCents(50_000), inpsDeducted: toCents(4_460.64) });
    expect(r.taxableGross).toBe(toCents(33_500));
    expect(r.taxableNet).toBe(toCents(29_039.36));
    expect(r.taxRate).toBe(0.05);
    expect(r.substituteTax).toBe(toCents(1_451.97)); // 1451.968
    expect(r.netCash).toBe(toCents(50_000 - 4_460.64 - 1_451.97));
  });

  it("never produces negative taxable income", () => {
    const r = computeTaxYear({ year: 2026, grossRevenue: toCents(3_000), inpsDeducted: toCents(4_460.64) });
    expect(r.taxableNet).toBe(0);
    expect(r.substituteTax).toBe(0);
    expect(r.unusedInpsDeduction).toBe(toCents(4_460.64 - 2_010));
  });

  it("uses the start-up rate for 5 years from the start year", () => {
    expect(substituteTaxRate(2025)).toBe(0.05);
    expect(substituteTaxRate(2029)).toBe(0.05);
    expect(substituteTaxRate(2030)).toBe(0.15);
  });

  it("flags the 85k and 100k revenue limits", () => {
    expect(computeTaxYear({ year: 2026, grossRevenue: toCents(70_000), inpsDeducted: 0 }).revenueLimit.status).toBe("warning");
    expect(computeTaxYear({ year: 2026, grossRevenue: toCents(85_000), inpsDeducted: 0 }).revenueLimit.status).toBe("warning");
    expect(computeTaxYear({ year: 2026, grossRevenue: toCents(85_000.01), inpsDeducted: 0 }).revenueLimit.status).toBe("exceeded");
    expect(computeTaxYear({ year: 2026, grossRevenue: toCents(100_001), inpsDeducted: 0 }).revenueLimit.status).toBe("hard_exceeded");
  });

  it("builds figures from the ledger using cash dates", () => {
    const r = computeTaxYearFromLedger({
      year: 2026,
      collections: [
        { collectedAt: "2025-12-30", amount: toCents(1_000) }, // previous year
        { collectedAt: "2026-01-10", amount: toCents(2_000) },
        { collectedAt: "2026-12-31", amount: toCents(3_000) },
      ],
      inpsPayments: [
        { paidAt: "2026-02-16", amount: toCents(743.44), competenceYear: 2025, kind: "fixed_q4" },
        { paidAt: "2027-02-16", amount: toCents(1_115.16), competenceYear: 2026, kind: "fixed_q4" },
      ],
    });
    expect(r.grossRevenue).toBe(toCents(5_000));
    expect(r.inpsDeducted).toBe(toCents(743.44));
  });
});

describe("computeInpsDue (Artigiani)", () => {
  it("full year 2026 without reductions: 4.521,36 € fixed + 24% excess (circ. INPS 14/2026)", () => {
    const r = computeInpsDue(2026, toCents(33_500));
    expect(r.activeMonths).toBe(12);
    expect(r.params.verified).toBe(true);
    expect(r.fixedQuarterly).toEqual([113_034, 113_034, 113_034, 113_034]);
    expect(r.fixedTotal).toBe(toCents(4_521.36));
    expect(r.excess).toBe(toCents(3_526.08)); // (33.500 − 18.808) × 24%
  });

  it("pro-rates the start year (November start = 2 months, all in Q4)", () => {
    const r = computeInpsDue(2025, toCents(4_020));
    expect(r.activeMonths).toBe(2);
    expect(r.fixedQuarterly).toEqual([0, 0, 0, toCents(743.44)]);
    expect(r.proratedMinimumIncome).toBe(toCents(3_092.5));
    expect(r.excess).toBe(toCents(222.6)); // (4.020 − 3.092,50) × 24%
  });

  it("applies the 25% rate above the first bracket", () => {
    const r = computeInpsDue(2026, toCents(56_950)); // 85k × 67%
    const expected = (56_224 - 18_808) * 0.24 + (56_950 - 56_224) * 0.25;
    expect(r.excess).toBe(toCents(expected));
  });

  it("35% forfettari reduction: maternity is not reduced", () => {
    const r = computeInpsDue(2026, toCents(18_808), profile({ inpsReduction35Active: true }));
    // 3 months × 376,16 × 0,65 + 3 × 0,62 = 735,372 per quarter
    expect(r.fixedQuarterly[0]).toBe(toCents(735.37));
    expect(r.excess).toBe(0);
  });

  it("50% new-enrollment reduction lasts 36 months, then falls back to 35% if active", () => {
    const p = profile({ inpsReduction50NewEnrollmentActive: true, inpsReduction35Active: true });
    expect(computeInpsDue(2026, 0, p).fixedTotal).toBe(toCents(2_264.4)); // 4.513,92 / 2 + 7,44
    const r2028 = computeInpsDue(2028, 0, p);
    expect(r2028.reductionByMonth.slice(0, 10).every((x) => x === 0.5)).toBe(true); // Jan–Oct 2028
    expect(r2028.reductionByMonth[10]).toBe(0.35); // Nov 2028 = month 37
    expect(r2028.warnings.some((w) => w.includes("non cumulabili"))).toBe(true);
  });

  it("ignores the 50% reduction when not enrolled in 2025", () => {
    const p = profile({ activityStartDate: "2026-03-01", inpsReduction50NewEnrollmentActive: true });
    const r = computeInpsDue(2026, 0, p);
    expect(r.reductionByMonth[5]).toBe(0);
    expect(r.warnings.some((w) => w.includes("ignorata"))).toBe(true);
  });
});

describe("advances (acconti, metodo storico)", () => {
  it("no advances in the start year", () => {
    expect(computeTaxAdvances(2025, toCents(5_000)).total).toBe(0);
  });
  it("thresholds: ≤51,65 none, ≤257,52 single November instalment, else 50/50", () => {
    expect(computeTaxAdvances(2026, toCents(51.65)).total).toBe(0);
    expect(computeTaxAdvances(2026, toCents(201))).toEqual({ first: 0, second: toCents(201), total: toCents(201) });
    expect(computeTaxAdvances(2026, toCents(1_000.01))).toEqual({
      first: toCents(500.01), second: toCents(500), total: toCents(1_000.01),
    });
  });
});

describe("deadlines", () => {
  it("keeps 30 June in years without a decree", () => {
    const items = buildF24Schedule({
      calendarYear: 2027,
      figures: { 2026: { grossRevenue: toCents(10_000), inpsDeducted: 0 } },
    });
    expect(items.find((i) => i.key === "tax:balance:2026")?.dueDate).toBe("2027-06-30");
  });

  it("moves weekend and holiday deadlines to the next working day", () => {
    expect(shiftToBusinessDay("2026-05-16")).toBe("2026-05-18"); // Saturday
    expect(shiftToBusinessDay("2026-04-06")).toBe("2026-04-07"); // Easter Monday
    expect(shiftToBusinessDay("2026-06-30")).toBe("2026-06-30"); // Tuesday
  });

  it("builds the 2026 F24 calendar for a November 2025 start", () => {
    const items = buildF24Schedule({
      calendarYear: 2026,
      figures: {
        2025: { grossRevenue: toCents(6_000), inpsDeducted: 0 },
        2026: { grossRevenue: toCents(50_000), inpsDeducted: toCents(743.44 + 3 * 1_130.34) },
      },
      stampDutyByQuarter: { 2025: [0, 0, 0, 400], 2026: [1_000, 1_200, 1_000, 800] },
    });
    const byKey = Object.fromEntries(items.map((i) => [i.key, i]));

    expect(byKey["inps:fixed_q4:2025"]).toMatchObject({ dueDate: "2026-02-16", amount: toCents(743.44) });
    expect(byKey["stamp:q4:2025"]).toMatchObject({ dueDate: "2026-03-02", amount: 400 }); // 28/2 is Saturday
    expect(byKey["inps:fixed_q1:2026"]).toMatchObject({ dueDate: "2026-05-18", amount: 113_034 });
    // 2025 tax: 6.000 × 67% × 5% = 201 €, no advances paid in the start year.
    // 2026: saldo moved from 30/6 to 20/7 by D.L. 89/2026.
    expect(byKey["tax:balance:2025"]).toMatchObject({ dueDate: "2026-07-20", amount: toCents(201), code: "1792" });
    expect(byKey["chamber:2026"]).toMatchObject({ dueDate: "2026-07-20" });
    expect(byKey["inps:excess_balance:2025"]).toMatchObject({ dueDate: "2026-07-20", amount: toCents(222.6) });
    // 201 € ≤ 257,52 → single advance in November, nothing in June
    expect(byKey["tax:advance_1:2026"]).toBeUndefined();
    expect(byKey["tax:advance_2:2026"]).toMatchObject({ dueDate: "2026-11-30", amount: toCents(201), code: "1791" });
    // Stamp duty Q1–Q3 under 5.000 € → all paid on 30/11
    expect(byKey["stamp:q3:2026"]).toMatchObject({ dueDate: "2026-11-30", amount: 3_200 });
    expect(byKey["stamp:q1:2026"]).toBeUndefined();
  });

  it("reserve sums unpaid items until next June and splits out next-year advances", () => {
    const figures = {
      2025: { grossRevenue: toCents(6_000), inpsDeducted: 0 },
      2026: { grossRevenue: toCents(50_000), inpsDeducted: toCents(4_088.92) },
    };
    const items = [
      ...buildF24Schedule({ calendarYear: 2026, figures }),
      ...buildF24Schedule({ calendarYear: 2027, figures, provisionalFrom: 2026 }),
    ];
    const reserve = computeSavingsReserve({ asOf: "2026-11-04", items });
    const keys = reserve.upcoming.map((i) => i.key);
    expect(keys).toContain("inps:fixed_q3:2026");
    expect(keys).toContain("tax:balance:2026");
    expect(keys).toContain("tax:advance_1:2027");
    expect(keys).not.toContain("tax:balance:2025"); // already past
    expect(reserve.cashOutUntilHorizon).toBeGreaterThan(reserve.matured);
  });
});

describe("projection and per-invoice estimate", () => {
  it("projects linearly over the open days of the year", () => {
    // 183 of 365 days elapsed
    expect(projectYearRevenue(toCents(10_000), "2026-07-02")).toBe(1_994_536);
    expect(projectYearRevenue(toCents(500), "2026-01-15")).toBe(toCents(500)); // too early
  });

  it("estimates INPS + tax on a single invoice", () => {
    const e = estimateInvoiceNet(toCents(1_000), "2026-03-01");
    expect(e.taxableIncome).toBe(toCents(670));
    expect(e.inps).toBe(toCents(160.8));
    expect(e.substituteTax).toBe(toCents(25.46)); // (670 − 160,80) × 5%
    expect(e.net).toBe(toCents(813.74));
  });
});

describe("invoice totals", () => {
  it("stamp duty only strictly above 77,47 €", () => {
    expect(requiresStampDuty(toCents(77.47))).toBe(false);
    expect(requiresStampDuty(toCents(77.48))).toBe(true);
  });

  it("sums lines and adds the recharged stamp", () => {
    const t = computeInvoiceTotals(
      [
        { description: "Sviluppo", quantity: 10, unitPrice: toCents(50) },
        { description: "Setup", quantity: 1, unitPrice: toCents(300) },
      ],
      { issueDate: "2026-03-01" },
    );
    expect(t.taxableAmount).toBe(toCents(800));
    expect(t.stampDuty).toBe(200);
    expect(t.totalDocument).toBe(toCents(802));
    expect(t.lines.every((l) => l.vatNature === "N2.2")).toBe(true);
    expect(t.notes[0]).toContain("commi da 54 a 89");
  });

  it("does not charge the stamp when the profile says so", () => {
    const t = computeInvoiceTotals([{ description: "x", quantity: 1, unitPrice: toCents(100) }], {
      issueDate: "2026-03-01",
      profile: profile({ chargeStampDutyToClient: false }),
    });
    expect(t.stampDutyRequired).toBe(true);
    expect(t.totalDocument).toBe(toCents(100));
  });
});
