import { describe, expect, it } from "vitest";
import { AdvisorInputError, advisorSystem, archiveFileName, buildAdvisorPrompt, capFiles, fiscalSnapshot, FILE_CHARS } from "../advisor";
import { buildDashboard } from "../data/dashboard";
import { demoDataset } from "../data/demo";
import type { FiscalDataset } from "../data/types";
import { DEFAULT_PROFILE } from "../tax-config";

// The chamber fee case: paid on 2 July with two final receipts, deadline moved to 20 July.
const data: FiscalDataset = {
  ...demoDataset,
  source: "supabase",
  profile: { ...DEFAULT_PROFILE, activityStartDate: "2025-11-06" },
  taxPayments: [
    { id: "cam", paidAt: "2026-07-02", competenceYear: 2026, kind: "chamber_fee", tributeCode: "3850", amount: 5_300, receiptPath: null },
  ],
  paymentDocuments: [
    {
      id: "d1",
      title: "Diritto camerale 2026 (quietanza banca)",
      path: "u/d1.pdf",
      provisional: false,
      inpsPaymentId: null,
      taxPaymentId: "cam",
      check: { status: "ok", kind: "quietanza_banca", final: true, date: "2026-07-02", amount: 53, matches: true, note: null, checkedAt: "2026-11-05" },
    },
  ],
};
const asOf = "2026-11-06";
// Amounts use a no-break space before "€": plain spaces keep the expectations readable.
const snapshot = fiscalSnapshot({
  data,
  dashboard: buildDashboard(data, asOf),
  archive: [
    { id: "d1", title: "Diritto camerale 2026 (quietanza banca)", category: "f24", year: 2026, file: "01-diritto-camerale-2026-quietanza-banca.pdf" },
    { id: "v1", title: "Visura camerale", category: "chamber", year: 2026, file: "02-visura-camerale.pdf" },
    { id: "old", title: "Vecchia comunicazione", category: "other", year: 2025, file: null },
  ],
  asOf,
}).replace(/ /g, " ");

describe("fiscal snapshot", () => {
  it("shows a payment with its code, proof and what Claude read in the file", () => {
    expect(snapshot).toContain("02/07/2026 · Diritto camerale 2026 · Erario/altro · codice 3850 · 53,00 € · addebitato in banca · prova: confermato da ricevuta definitiva");
    expect(snapshot).toContain(
      'file "Diritto camerale 2026 (quietanza banca)" (01-diritto-camerale-2026-quietanza-banca.pdf): Claude lo ha letto: Quietanza della banca (definitivo), data 02/07/2026, importo 53,00 €',
    );
  });

  it("gives the calendar with the moved deadline and the item paid", () => {
    expect(snapshot).toMatch(/20\/07\/2026 · Diritto camerale 2026 · codice 3850 · competenza 2026 · .* · pagato \(registrato\)/);
    expect(snapshot).toContain("spostata al 20/07/2026");
  });

  it("lists the archive with the file to open, and the title only when there is no file", () => {
    expect(snapshot).toContain("da aprire con Read se servono");
    expect(snapshot).toContain("- 02-visura-camerale.pdf · Camera di commercio e visure · Visura camerale (2026)");
    expect(snapshot).toContain("- Altro · Vecchia comunicazione (2025)");
  });

  it("says the data are real", () => {
    expect(snapshot).toContain("Dati reali registrati");
    expect(snapshot).toContain("Oggi: 06/11/2026.");
  });

  it("warns when the data are the demo ones", () => {
    const demo = fiscalSnapshot({ data: demoDataset, dashboard: buildDashboard(demoDataset, asOf), archive: [], asOf });
    expect(demo).toContain("dati dimostrativi");
  });
});

describe("system prompt", () => {
  it("asks for official sources only when web search is on", () => {
    expect(advisorSystem({ webSearch: true })).toContain("agenziaentrate.gov.it");
    expect(advisorSystem({ webSearch: false })).toContain("La ricerca web è disattivata");
  });

  it("tells Claude about the archive files only when they are there", () => {
    expect(advisorSystem({ webSearch: true, documents: true })).toContain("strumento Read");
    expect(advisorSystem({ webSearch: true })).not.toContain("strumento Read");
  });
});

describe("archive file names", () => {
  it("are numbered, ASCII and keep the extension", () => {
    expect(archiveFileName(6, "Dichiarazione dei redditi 2026 (ricevuta d'invio) – più", "u/x/Dichiarazione.PDF")).toBe(
      "07-dichiarazione-dei-redditi-2026-ricevuta-d-invio-piu.pdf",
    );
    expect(archiveFileName(0, "***", "u/a.png")).toBe("01-documento.png");
    expect(archiveFileName(11, "x".repeat(200), "u/a.pdf")).toHaveLength(3 + 80 + 4);
  });
});

describe("prompt within the webhook limit", () => {
  const system = "S";
  const file = (name: string, n: number) => ({ name, text: "x".repeat(n) });

  it("keeps the newest turns and drops the oldest when the budget is short", () => {
    const history = Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? ("assistant" as const) : ("user" as const), content: `turno ${i} ${"y".repeat(300)}` }));
    const { prompt, turns } = buildAdvisorPrompt({ system, snapshot: "dati", history, message: "domanda", files: [], budget: 1_500 });
    expect(turns).toBeGreaterThan(0);
    expect(turns).toBeLessThan(10);
    expect(prompt).toContain("turno 9");
    expect(prompt).not.toContain("turno 0");
    expect(prompt.length + system.length).toBeLessThanOrEqual(1_500);
    expect(prompt.endsWith("<domanda>\ndomanda\n</domanda>")).toBe(true);
  });

  it("drops the text of older attachments before dropping the turn", () => {
    const history = [
      { role: "user" as const, content: "ecco l'avviso", files: [file("avviso.pdf", 5_000)] },
      { role: "assistant" as const, content: "risposta" },
    ];
    const { prompt, turns } = buildAdvisorPrompt({ system, snapshot: "dati", history, message: "e quindi?", files: [], budget: 2_000 });
    expect(turns).toBe(2);
    expect(prompt).toContain("Allegati già esaminati sopra: avviso.pdf");
  });

  it("refuses a question that does not fit even alone", () => {
    expect(() => buildAdvisorPrompt({ system, snapshot: "dati", history: [], message: "z".repeat(2_000), files: [], budget: 1_000 })).toThrow(AdvisorInputError);
  });

  it("splits the text room among the files of a message", () => {
    expect(capFiles([file("a", FILE_CHARS + 10)])[0].text.length).toBeLessThan(FILE_CHARS + 30);
    const three = capFiles([file("a", 20_000), file("b", 20_000), file("c", 100)]);
    expect(three[0].text).toContain("[… testo troncato]");
    expect(three[2].text).toBe("x".repeat(100));
  });
});
