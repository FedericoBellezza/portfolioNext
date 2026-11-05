import { describe, expect, it } from "vitest";
import { fileKind, fileTitle, finalReceiptHint, missingReceipts, paymentEntries, proofStatus, settlement } from "../receipts";

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

  it("tells what a file is and whether it proves the payment", () => {
    expect(fileKind("2026-10-19 INPS rata 3 - 566,10 (quietanza banca)")).toEqual({ label: "Quietanza della banca", provisional: false });
    expect(fileKind("2026-02-16 Bollo IV trimestre 2025 - 4,00 (attestazione pagamento)").provisional).toBe(false);
    expect(fileKind("Bollo III trimestre 2026 (prenotazione, in corso)")).toEqual({ label: "Prenotazione", provisional: true });
    expect(fileKind("Acconto imposta 2026 (ricevuta invio 02-07-2026)").label).toBe("Ricevuta di invio");
    expect(fileKind("F24_BLLFRC01D21L219B.pdf")).toEqual({ label: "Modello F24", provisional: true });
    expect(fileKind("Quietanza F24 saldo.pdf").label).toBe("Quietanza");
    expect(fileKind("scansione.pdf")).toEqual({ label: "Documento", provisional: null });
  });

  it("gives each payment one proof status", () => {
    const entries = paymentEntries(data);
    const status = (id: string) => proofStatus(entries.find((e) => e.id === id)!, "2026-11-05");
    expect([status("b"), status("a"), status("c")]).toEqual(["confirmed", "missing", "scheduled"]);
    const booking = { id: "doc4", title: "Prenotazione", path: "u/x4.pdf", provisional: true, inpsPaymentId: "a", taxPaymentId: null };
    const withBooking = paymentEntries({ ...data, paymentDocuments: [...data.paymentDocuments, booking] });
    expect(proofStatus(withBooking.find((e) => e.id === "a")!, "2026-11-05")).toBe("waiting");
  });

  it("points to where the final receipt is", () => {
    expect(finalReceiptHint({ kind: "stamp_duty_q2", amount: 400, creditUsed: 0, compensated: false })).toMatch(/attestazione di pagamento/);
    expect(finalReceiptHint({ kind: "substitute_tax_advance_2", amount: 7_800, creditUsed: 7_800, compensated: true })).toMatch(/Nessun addebito/);
    expect(finalReceiptHint({ kind: "fixed_q3", amount: 56_610, creditUsed: 0, compensated: false })).toMatch(/home banking/);
  });

  it("titles a file after its name", () => {
    expect(fileTitle("2026-02-16 INPS dicembre 2025 - 371,72 (quietanza banca).pdf")).toBe("2026-02-16 INPS dicembre 2025 - 371,72 (quietanza banca)");
    expect(fileTitle("F24_BLLFRC01D21L219B.pdf")).toBe("F24 BLLFRC01D21L219B");
    expect(fileTitle(".pdf")).toBe("Documento");
  });
});
