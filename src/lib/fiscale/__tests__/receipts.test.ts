import { describe, expect, it } from "vitest";
import { missingReceipts, paymentEntries } from "../receipts";

const data = {
  inpsPayments: [
    { id: "a", paidAt: "2026-05-04", competenceYear: 2026, kind: "fixed_q1" as const, amount: 56_610, reference: null, receiptPath: null },
    { id: "b", paidAt: "2026-07-27", competenceYear: 2026, kind: "fixed_q2" as const, amount: 56_610, reference: null, receiptPath: "u/2026/b.pdf" },
  ],
  taxPayments: [
    { id: "c", paidAt: "2026-11-30", competenceYear: 2026, kind: "substitute_tax_advance_2" as const, tributeCode: "1791", amount: 7_800, receiptPath: null, compensated: true },
    { id: "d", paidAt: "2026-07-02", competenceYear: 2025, kind: "substitute_tax_balance" as const, tributeCode: "1792", amount: 7_800, receiptPath: null, compensated: true },
  ],
};

describe("receipts", () => {
  it("lists every payment, newest first, with its table", () => {
    const entries = paymentEntries(data);
    expect(entries.map((e) => `${e.table}:${e.id}`)).toEqual(["tax:c", "inps:b", "tax:d", "inps:a"]);
    expect(entries.find((e) => e.id === "d")?.compensated).toBe(true);
  });

  it("asks for the receipt of payments already made, not of scheduled ones", () => {
    const missing = missingReceipts(paymentEntries(data), "2026-11-05");
    expect(missing.map((e) => e.id)).toEqual(["d", "a"]);
    // On the scheduled date the F24 is executed and its receipt is due too.
    expect(missingReceipts(paymentEntries(data), "2026-11-30").map((e) => e.id)).toEqual(["c", "d", "a"]);
  });
});
