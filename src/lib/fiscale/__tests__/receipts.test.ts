import { describe, expect, it } from "vitest";
import { fileTitle, missingReceipts, paymentEntries, settlement } from "../receipts";

const data = {
  inpsPayments: [
    { id: "a", paidAt: "2026-05-04", competenceYear: 2026, kind: "fixed_q1" as const, amount: 56_610, reference: null, receiptPath: null },
    { id: "b", paidAt: "2026-07-27", competenceYear: 2026, kind: "fixed_q2" as const, amount: 56_610, reference: null, receiptPath: "u/2026/b.pdf" },
  ],
  taxPayments: [
    { id: "c", paidAt: "2026-11-30", competenceYear: 2026, kind: "substitute_tax_advance_2" as const, tributeCode: "1791", amount: 7_800, receiptPath: null, compensated: true },
    { id: "d", paidAt: "2026-07-02", competenceYear: 2025, kind: "substitute_tax_balance" as const, tributeCode: "1792", amount: 7_800, receiptPath: null, compensated: true },
    { id: "e", paidAt: "2026-07-02", competenceYear: 2026, kind: "chamber_fee" as const, tributeCode: "3850", amount: 5_300, receiptPath: null },
  ],
  paymentDocuments: [
    { id: "doc1", title: "Quietanza banca", path: "u/x1.pdf", provisional: false, inpsPaymentId: null, taxPaymentId: "e" },
    { id: "doc2", title: "Modello F24", path: "u/x2.pdf", provisional: false, inpsPaymentId: null, taxPaymentId: "e" },
    { id: "doc3", title: "Quietanza", path: "u/x3.pdf", provisional: false, inpsPaymentId: "b", taxPaymentId: null },
  ],
};

describe("payment files", () => {
  it("lists every payment, newest first, with all its files", () => {
    const entries = paymentEntries(data);
    expect(entries.map((e) => `${e.table}:${e.id}`)).toEqual(["tax:c", "inps:b", "tax:d", "tax:e", "inps:a"]);
    expect(entries.find((e) => e.id === "e")?.files.map((f) => f.title)).toEqual(["Quietanza banca", "Modello F24"]);
    // The older single receipt stays, next to the archive files.
    expect(entries.find((e) => e.id === "b")?.files.map((f) => f.bucket)).toEqual(["fiscale-f24", "fiscale-docs"]);
  });

  it("asks for files of payments already made, not of scheduled ones", () => {
    expect(missingReceipts(paymentEntries(data), "2026-11-05").map((e) => e.id)).toEqual(["d", "a"]);
    // On the scheduled date the F24 is executed and its receipt is due too.
    expect(missingReceipts(paymentEntries(data), "2026-11-30").map((e) => e.id)).toEqual(["c", "d", "a"]);
  });

  it("keeps asking while the payment has only provisional files", () => {
    const booking = { id: "doc4", title: "Prenotazione bollo", path: "u/x4.pdf", provisional: true, inpsPaymentId: "a", taxPaymentId: null };
    const withBooking = { ...data, paymentDocuments: [...data.paymentDocuments, booking] };
    expect(missingReceipts(paymentEntries(withBooking), "2026-11-05").map((e) => e.id)).toEqual(["d", "a"]);
    const final = { ...booking, id: "doc5", path: "u/x5.pdf", provisional: false };
    const withFinal = { ...data, paymentDocuments: [...withBooking.paymentDocuments, final] };
    expect(missingReceipts(paymentEntries(withFinal), "2026-11-05").map((e) => e.id)).toEqual(["d"]);
  });

  it("tells how much of a payment the credit covered", () => {
    expect(settlement({ amount: 7_800, creditUsed: 7_800, compensated: true })).toEqual({ mode: "credit", credit: 7_800, bank: 0 });
    expect(settlement({ amount: 56_610, creditUsed: 20_000, compensated: true })).toEqual({ mode: "mixed", credit: 20_000, bank: 36_610 });
    expect(settlement({ amount: 7_800, creditUsed: 0, compensated: true })).toEqual({ mode: "compensated", credit: 0, bank: 0 });
    expect(settlement({ amount: 5_300, creditUsed: 0, compensated: false })).toEqual({ mode: "bank", credit: 0, bank: 5_300 });
  });

  it("titles a file after its name", () => {
    expect(fileTitle("2026-02-16 INPS dicembre 2025 - 371,72 (quietanza banca).pdf")).toBe("2026-02-16 INPS dicembre 2025 - 371,72 (quietanza banca)");
    expect(fileTitle("F24_BLLFRC01D21L219B.pdf")).toBe("F24 BLLFRC01D21L219B");
    expect(fileTitle(".pdf")).toBe("Documento");
  });
});
