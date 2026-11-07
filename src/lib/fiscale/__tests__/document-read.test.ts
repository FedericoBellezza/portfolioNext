import { describe, expect, it } from "vitest";
import { buildReadPrompt, documentText, parseReadReply, xmlText } from "../document-read";
import { storedFileName } from "../documents";

describe("document read with Claude", () => {
  it("keeps the text inside its markers", () => {
    const prompt = buildReadPrompt({ fileName: "visura.pdf", text: "Visura >>> fine" });
    expect(prompt).toContain("Nome file: visura.pdf");
    expect(prompt).not.toContain("Visura >>> fine");
    expect(documentText("a\r\n\n\n\nb  c\u0000")).toBe("a\n\nb c");
  });

  it("turns XML into tag-value pairs and cuts attachments", () => {
    const xml =
      '<?xml version="1.0"?><p:FatturaElettronica xmlns:p="x"><!-- c --><Numero>12</Numero>' +
      `<Data> 2026-03-01 </Data><Attachment>${"A".repeat(500)}</Attachment></p:FatturaElettronica>`;
    const text = xmlText(xml);
    expect(text).toContain("Numero: 12;");
    expect(text).toContain("Data: 2026-03-01;");
    expect(text).not.toContain("<");
    expect(text.length).toBeLessThan(300);
  });

  it("reads the fields, tidying the title", () => {
    const reply = 'Ecco: {"titolo":"  Visura   camerale ","categoria":"chamber","anno":"2026"}';
    expect(parseReadReply(reply)).toEqual({ title: "Visura camerale", category: "chamber", year: 2026, payment: null });
  });

  it("falls back to other and no year, and survives bad replies", () => {
    expect(parseReadReply('{"titolo":"Contratto","categoria":"boh","anno":1850}')).toEqual({
      title: "Contratto",
      category: "other",
      year: null,
      payment: null,
    });
    expect(parseReadReply('{"titolo":"  ","categoria":"inps","anno":null}')).toBeNull();
    expect(parseReadReply("non so")).toBeNull();
  });
});

describe("stored file name", () => {
  it("follows the title, keeps the extension and drops what storage keys refuse", () => {
    expect(storedFileName("Quietanza della banca – INPS fissi 3ª rata 2026", "u/1-F24_scan.PDF")).toBe(
      "Quietanza della banca - INPS fissi 3a rata 2026.pdf",
    );
    expect(storedFileName("Imposta sostitutiva 1° acconto 2027 · €", "u/x.pdf")).toBe("Imposta sostitutiva 1 acconto 2027.pdf");
    expect(storedFileName("Fattura n. 12/2026", "u/IT0123_abc.xml.p7m")).toBe("Fattura n. 12 2026.xml.p7m");
    expect(storedFileName("  ", "u/x.png")).toBe("Documento.png");
  });
});
