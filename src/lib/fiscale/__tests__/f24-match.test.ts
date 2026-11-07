import { describe, expect, it } from "vitest";
import { parseF24Reply, parseReadReply } from "../document-read";
import { matchF24, type F24Row } from "../f24-match";

const row = (r: Partial<F24Row> & Pick<F24Row, "code">): F24Row => ({
  section: "erario",
  year: null,
  period: null,
  installment: null,
  debit: 0,
  credit: 0,
  ...r,
});

describe("F24 lines to calendar items", () => {
  it("splits the June F24 into saldo, acconti, INPS and diritto camerale", () => {
    const m = matchF24({
      kind: "f24_versato",
      date: "2026-07-20",
      rows: [
        row({ code: "1792", year: 2025, debit: 812.4 }),
        row({ code: "1790", year: 2026, debit: 406.2 }),
        row({ section: "inps", code: "AP", period: "01/2025-12/2025", debit: 120 }),
        row({ section: "inps", code: "AP", period: "01/2026-12/2026", debit: 60 }),
        row({ section: "locali", code: "3850", year: 2026, debit: 53 }),
      ],
    });
    expect(m.obligations).toEqual([
      { key: "tax:balance:2025", amount: 81240, codes: ["1792"] },
      { key: "tax:advance_1:2026", amount: 40620, codes: ["1790"] },
      { key: "inps:excess_balance:2025", amount: 12000, codes: ["AP"] },
      { key: "inps:excess_advance_1:2026", amount: 6000, codes: ["AP"] },
      { key: "chamber:2026", amount: 5300, codes: ["3850"] },
    ]);
    expect(m.unmatched).toEqual([]);
    expect(m.final).toBe(true);
    expect(m.compensated).toBe(false);
  });

  it("finds the INPS quarter from the period, also without slashes", () => {
    const m = matchF24({
      kind: "quietanza_banca",
      date: "2026-02-16",
      rows: [
        row({ section: "inps", code: "AF", period: "10/2025-12/2025", debit: 1100.5 }),
        row({ section: "inps", code: "AF", period: "042026 062026", debit: 1100.5 }),
      ],
    });
    expect(m.obligations.map((o) => o.key)).toEqual(["inps:fixed_q4:2025", "inps:fixed_q2:2026"]);
  });

  it("takes the AF installment from the date when the period is the whole year", () => {
    const af = (date: string, period: string | null) =>
      matchF24({ kind: "f24_versato", date, rows: [row({ section: "inps", code: "AF", period, debit: 741.62 })] }).obligations[0]?.key;
    expect(af("2026-05-18", "01/2026-12/2026")).toBe("inps:fixed_q1:2026");
    expect(af("2026-08-20", "1 2026 12 2026")).toBe("inps:fixed_q2:2026");
    expect(af("2023-11-16", "01/2023-12/2023")).toBe("inps:fixed_q3:2023");
    expect(af("2026-02-16", "01/2025-12/2025")).toBe("inps:fixed_q4:2025");
    // No period read: the year follows from the date too.
    expect(af("2022-02-16", null)).toBe("inps:fixed_q4:2021");
    expect(af("2024-08-20", null)).toBe("inps:fixed_q2:2024");
  });

  it("leaves INPS installment plans to the owner", () => {
    const m = matchF24({
      kind: "f24_versato",
      date: "2024-08-20",
      rows: [
        row({ section: "inps", code: "APR", period: "01/2023-12/2023", debit: 882.25 }),
        row({ section: "inps", code: "API", period: "01/2024-12/2024", debit: 1.59 }),
        row({ section: "inps", code: "AF", period: "01/2024-12/2024", debit: 722.54 }),
      ],
    });
    expect(m.obligations).toEqual([{ key: "inps:fixed_q2:2024", amount: 72254, codes: ["AF"] }]);
    expect(m.unmatched.map((u) => u.reason)).toEqual(["contributi rateizzati: registrali a mano", "contributi rateizzati: registrali a mano"]);
  });

  it("tells the second INPS acconto from the first by the month", () => {
    const m = matchF24({ kind: "f24_versato", date: "2026-11-30", rows: [row({ section: "inps", code: "AP", period: "01/2026-12/2026", debit: 60 })] });
    expect(m.obligations[0].key).toBe("inps:excess_advance_2:2026");
  });

  it("maps stamp duty, the February INAIL and sums lines of the same item", () => {
    const m = matchF24({
      kind: "attestazione_pagamento",
      date: "2026-02-16",
      rows: [
        row({ code: "2524", year: 2025, debit: 4 }),
        row({ code: "2524", year: 2025, debit: 2 }),
        row({ section: "inail", code: "INAIL", debit: 30.12 }),
      ],
    });
    expect(m.obligations).toEqual([
      { key: "stamp:q4:2025", amount: 600, codes: ["2524"] },
      { key: "inail:2026", amount: 3012, codes: ["INAIL"] },
    ]);
  });

  it("leaves out installments, interest, Commercianti and lines it cannot place", () => {
    const m = matchF24({
      kind: "f24_versato",
      date: "2026-08-20",
      rows: [
        row({ code: "1792", year: 2025, installment: "0203", debit: 300 }),
        row({ code: "1668", year: 2025, debit: 1.2 }),
        row({ section: "inps", code: "CF", period: "04/2026-06/2026", debit: 1000 }),
        row({ section: "inps", code: "AP", debit: 1000 }),
        row({ code: "1790", debit: 100 }),
        row({ section: "inail", code: "INAIL", debit: 10 }),
      ],
    });
    expect(m.obligations).toEqual([]);
    expect(m.unmatched.map((u) => u.reason)).toEqual([
      "pagato a rate: registralo a mano",
      "codice non gestito",
      "Gestione Commercianti non gestita",
      "periodo di riferimento non letto",
      "anno di riferimento non letto",
      "rata INAIL successiva alla prima",
    ]);
  });

  it("treats 0101 as a single payment and a saldo-zero F24 as compensated", () => {
    const m = matchF24({
      kind: "f24_versato",
      date: "2026-06-30",
      rows: [row({ code: "1790", year: 2026, installment: "0101", debit: 200 }), row({ code: "1792", year: 2025, credit: 200 })],
    });
    expect(m.obligations).toEqual([{ key: "tax:advance_1:2026", amount: 20000, codes: ["1790"] }]);
    expect(m.unmatched).toEqual([]);
    expect(m.compensated).toBe(true);
  });

  it("knows the F24 form alone does not prove the payment", () => {
    expect(matchF24({ kind: "modello_f24", date: null, rows: [] }).final).toBe(false);
    expect(matchF24({ kind: "boh", date: null, rows: [] }).final).toBe(false);
  });
});

describe("payment lines in Claude's reading", () => {
  it("reads the lines of an F24 and drops the malformed ones", () => {
    const reply =
      "Ecco: " +
      JSON.stringify({
        tipo: "f24_versato",
        data: "2026-06-30",
        righe: [
          { sezione: "erario", codice: 1792, anno: "2025", periodo: null, rateazione: null, debito: "812.40", credito: null },
          { sezione: "INPS!", codice: "af", periodo: "04/2026-06/2026", debito: 1100 },
          { sezione: "erario", codice: "", debito: 5 },
          "riga strana",
        ],
      });
    expect(parseF24Reply(reply)).toEqual({
      kind: "f24_versato",
      date: "2026-06-30",
      rows: [
        { section: "erario", code: "1792", year: 2025, period: null, installment: null, debit: 812.4, credit: 0 },
        { section: "altro", code: "AF", year: null, period: "04/2026-06/2026", installment: null, debit: 1100, credit: 0 },
      ],
    });
  });

  it("leaves the payment to the second reading and survives bad replies", () => {
    expect(parseReadReply('{"titolo":"F24","categoria":"f24","anno":2026}')?.payment).toBeNull();
    expect(parseF24Reply("non so")).toBeNull();
    expect(parseF24Reply('{"tipo":"f24_versato","data":"31/07/2024","righe":"no"}')).toEqual({ kind: "f24_versato", date: null, rows: [] });
  });
});
