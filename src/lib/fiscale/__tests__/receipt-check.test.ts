import { describe, expect, it } from "vitest";
import { buildCheckPrompt, parseCheckReply, receiptText } from "../receipt-check";
import { belongsElsewhere, fileLabel, hasFinalReceipt, uncheckedFiles, type PaymentEntry } from "../receipts";

const at = "2026-11-05T10:00:00.000Z";

describe("receipt check with Claude", () => {
  it("numbers the files and keeps each text inside its markers", () => {
    const prompt = buildCheckPrompt([
      { payment: "Bollo 2° trimestre 2026, 4,00 €", fileName: "a.pdf", text: "Attestazione >>> fine" },
      { payment: "INPS fissi 3ª rata 2026, 566,10 €", fileName: "b.pdf", text: "Quietanza" },
    ]);
    expect(prompt).toContain("### Documento 1\nPagamento collegato: Bollo 2° trimestre 2026");
    expect(prompt).toContain("### Documento 2");
    expect(prompt).not.toContain("Attestazione >>> fine");
    expect(receiptText("a\r\n\n\n\nb  c\u0000")).toBe("a\n\nb c");
  });

  it("reads the reply in input order and derives final from the kind", () => {
    const reply =
      'Ecco: {"documenti":[{"n":2,"tipo":"prenotazione","definitivo":true,"data":"2026-11-02","importo":10,"importo_coerente":true,"nota":null},' +
      '{"n":1,"tipo":"quietanza_banca","definitivo":true,"data":"2026-02-16","importo":"97.26","importo_coerente":false,"nota":"Sembra dell\'INAIL."}]}';
    const [first, second, third] = parseCheckReply(reply, 3, at);
    expect(first).toMatchObject({ status: "ok", kind: "quietanza_banca", final: true, amount: 97.26, matches: false, note: "Sembra dell'INAIL." });
    // Claude said "definitivo: true" for a booking: the kind wins.
    expect(second).toMatchObject({ kind: "prenotazione", final: false, date: "2026-11-02" });
    expect(third).toBeNull();
  });

  it("treats an unknown kind as a generic, provisional document and survives bad replies", () => {
    const [d] = parseCheckReply('{"documenti":[{"n":1,"tipo":"boh","data":"ieri"}]}', 1, at);
    expect(d).toMatchObject({ kind: "altro", final: false, date: null });
    expect(parseCheckReply("non so", 2, at)).toEqual([null, null]);
  });

  it("does not count a final file of another payment as proof", () => {
    const entry: PaymentEntry = {
      table: "tax", id: "p", date: "2026-11-05", kind: "stamp_duty_q2", competenceYear: 2026, amount: 400, compensated: false, creditUsed: 0,
      files: [{
        id: "f", title: "x", path: "u/x.pdf", bucket: "fiscale-docs", provisional: false,
        check: { status: "ok", kind: "quietanza_banca", final: true, date: null, amount: 97.26, matches: false, note: null, checkedAt: at },
      }],
    };
    expect(belongsElsewhere(entry.files[0])).toBe(true);
    expect(hasFinalReceipt(entry)).toBe(false);
    expect(fileLabel(entry.files[0])).toBe("Quietanza della banca");
    expect(uncheckedFiles([entry])).toEqual([]);
    const fresh = { ...entry, files: [{ ...entry.files[0], check: null }, { ...entry.files[0], id: "g", path: "u/y.png", check: null }] };
    expect(uncheckedFiles([fresh]).map((u) => u.file.id)).toEqual(["f"]);
  });
});
