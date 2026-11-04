import { describe, expect, it } from "vitest";
import { demoDataset } from "../data/demo";
import type { FiscalDataset } from "../data/types";
import { obligationTarget, settledKeys } from "../obligations";
import { buildF24Schedule } from "../tax-calculator";

const empty: FiscalDataset = {
  ...demoDataset,
  inpsPayments: [],
  taxPayments: [],
  dismissedKeys: [],
};

describe("obligations", () => {
  it("maps calendar keys to F24 rows", () => {
    expect(obligationTarget("inps:fixed_q4:2025")).toEqual({
      table: "inps_payments", kind: "fixed_q4", competenceYear: 2025, causale: "AF",
    });
    expect(obligationTarget("inps:excess_balance:2025")).toMatchObject({ causale: "AP" });
    expect(obligationTarget("tax:advance_1:2027")).toEqual({
      table: "tax_payments", kind: "substitute_tax_advance_1", competenceYear: 2027, tributeCode: "1790",
    });
    expect(obligationTarget("stamp:q3:2026")).toMatchObject({ kind: "stamp_duty_q3", tributeCode: "2523" });
    expect(obligationTarget("chamber:2026")).toMatchObject({ kind: "chamber_fee", tributeCode: "3850" });
    expect(obligationTarget("inail:2027")).toEqual({
      table: "tax_payments", kind: "inail_premium", competenceYear: 2027, tributeCode: null,
    });
    expect(obligationTarget("inps:hacked:2026")).toBeNull();
    expect(obligationTarget("tax:balance")).toBeNull();
  });

  it("every calendar item, once registered, is recognised as paid", () => {
    const items = [2026, 2027].flatMap((y) =>
      buildF24Schedule({
        calendarYear: y,
        figures: {
          2025: { grossRevenue: 2_000_000, inpsDeducted: 0 },
          2026: { grossRevenue: 4_000_000, inpsDeducted: 300_000 },
        },
        stampDutyByQuarter: { 2025: [0, 0, 0, 400], 2026: [600_000, 0, 200, 200] },
        inail: { lastPremium: 9_726 },
      }),
    );
    expect(items.length).toBeGreaterThan(10);

    const data: FiscalDataset = { ...empty };
    for (const item of items) {
      const t = obligationTarget(item.key);
      expect(t, item.key).not.toBeNull();
      const row = { id: item.key, paidAt: item.dueDate, competenceYear: t!.competenceYear, amount: item.amount, receiptPath: null };
      if (t!.table === "inps_payments") data.inpsPayments = [...data.inpsPayments, { ...row, kind: t!.kind, reference: null }];
      else data.taxPayments = [...data.taxPayments, { ...row, kind: t!.kind, tributeCode: t!.tributeCode }];
    }
    const { paid } = settledKeys(data);
    for (const item of items) expect(paid.has(item.key), item.key).toBe(true);
  });
});
