import path from "node:path";
import JSZip from "jszip";
import mammoth from "mammoth";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { MAX_OCR_PAGES, getExtension } from "./constants";

// Ogni estrattore restituisce { kind, pageCount, units }:
//  - kind: "paged" (PDF, slide), "text" (Word, Markdown, testo), "timed" (sottotitoli)
//  - units: [{ text, page?, ts?, heading? }] nell'ordine del documento

const MIN_PAGE_CHARS = 30;
const SUBTITLE_WINDOW_SECONDS = 75;
const VISION_MODEL = "gpt-4o-mini";

export class ExtractionError extends Error {}

export async function extractDocument({ buffer, fileName }) {
  const ext = getExtension(fileName);
  switch (ext) {
    case "pdf":
      return extractPdf(buffer);
    case "pptx":
      return extractPptx(buffer);
    case "docx":
      return extractDocx(buffer);
    case "txt":
    case "md":
      return extractPlainText(buffer);
    case "srt":
    case "vtt":
      return extractSubtitles(buffer);
    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
      return extractImage(buffer, ext);
    default:
      throw new ExtractionError(`Tipo di file non supportato: .${ext || "?"}`);
  }
}

// ---------------------------------------------------------------------------
// Utilità
// ---------------------------------------------------------------------------

function normalizeText(text) {
  return String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeXmlEntities(text) {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

async function extractPdf(buffer) {
  // Il worker va importato prima di pdf-parse (richiesto in ambiente serverless).
  await import("pdf-parse/worker");
  const { PDFParse } = await import("pdf-parse");

  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  let result;
  try {
    result = await parser.getText();
  } finally {
    await parser.destroy();
  }

  const pages = result.pages.map((page) => ({ page: page.num, text: normalizeText(page.text) }));
  const withText = pages.filter((page) => page.text.length >= MIN_PAGE_CHARS);

  // Se meno di un terzo delle pagine ha testo il PDF è (quasi) tutto scansionato.
  const looksScanned = withText.length < Math.max(1, Math.ceil(pages.length * 0.3));
  if (looksScanned) {
    return ocrPdf(buffer, pages.length);
  }

  return {
    kind: "paged",
    pageCount: pages.length,
    units: withText.map((page) => ({ text: page.text, page: page.page })),
  };
}

async function ocrPdf(buffer, pageCount) {
  if (pageCount > MAX_OCR_PAGES) {
    throw new ExtractionError(
      `PDF scansionato di ${pageCount} pagine: l'OCR automatico arriva a ${MAX_OCR_PAGES}. Usa un OCR esterno e ricarica il file.`,
    );
  }

  const { text } = await generateText({
    model: openai(VISION_MODEL),
    temperature: 0,
    maxOutputTokens: 16000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Trascrivi fedelmente il testo di ogni pagina di questo PDF scansionato. " +
              "Prima di ogni pagina scrivi su una riga sola: === PAGINA N === (N = numero di pagina). " +
              "Se una pagina contiene schemi, grafici o formule, descrivili in una riga tra parentesi quadre. " +
              "Non aggiungere commenti tuoi.",
          },
          { type: "file", data: buffer, mediaType: "application/pdf", filename: "documento.pdf" },
        ],
      },
    ],
  });

  const units = [];
  const parts = text.split(/^=== PAGINA (\d+) ===\s*$/m);
  // parts = [prefisso, "1", testo1, "2", testo2, ...]
  for (let i = 1; i < parts.length; i += 2) {
    const body = normalizeText(parts[i + 1]);
    if (body.length >= MIN_PAGE_CHARS) units.push({ text: body, page: Number(parts[i]) });
  }
  if (!units.length) {
    throw new ExtractionError("OCR senza testo riconoscibile: il PDF potrebbe essere vuoto o illeggibile");
  }
  return { kind: "paged", pageCount, units };
}

// ---------------------------------------------------------------------------
// PPTX: ogni slide è una "pagina", note del relatore comprese
// ---------------------------------------------------------------------------

function parseRelationships(xml) {
  const rels = [];
  for (const tag of xml.match(/<Relationship\b[^>]*>/g) ?? []) {
    const id = /\bId="([^"]*)"/.exec(tag)?.[1];
    const target = /\bTarget="([^"]*)"/.exec(tag)?.[1];
    const type = /\bType="([^"]*)"/.exec(tag)?.[1] ?? "";
    if (id && target) rels.push({ id, target, type });
  }
  return rels;
}

function resolveZipPath(baseDir, target) {
  if (target.startsWith("/")) return target.slice(1);
  return path.posix.normalize(path.posix.join(baseDir, target));
}

function textFromDrawingXml(xml) {
  const lines = [];
  for (const paragraph of xml.split("</a:p>")) {
    const runs = paragraph.match(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g) ?? [];
    const line = runs
      .map((run) => decodeXmlEntities(run.replace(/<[^>]+>/g, "")))
      .join("")
      .trim();
    if (line) lines.push(line);
  }
  return lines.join("\n");
}

async function extractPptx(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const readText = async (zipPath) => {
    const file = zip.file(zipPath);
    return file ? file.async("string") : null;
  };

  // L'ordine delle slide è definito in presentation.xml, non dai nomi dei file.
  let slidePaths = [];
  const presentation = await readText("ppt/presentation.xml");
  const presentationRels = await readText("ppt/_rels/presentation.xml.rels");
  if (presentation && presentationRels) {
    const byId = new Map(parseRelationships(presentationRels).map((rel) => [rel.id, rel.target]));
    slidePaths = (presentation.match(/<p:sldId\b[^>]*>/g) ?? [])
      .map((tag) => /\br:id="([^"]+)"/.exec(tag)?.[1])
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((target) => resolveZipPath("ppt", target));
  }
  if (!slidePaths.length) {
    slidePaths = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => Number(/(\d+)\.xml$/.exec(a)[1]) - Number(/(\d+)\.xml$/.exec(b)[1]));
  }
  if (!slidePaths.length) throw new ExtractionError("Nessuna slide trovata nel file PPTX");

  const units = [];
  for (let i = 0; i < slidePaths.length; i++) {
    const slidePath = slidePaths[i];
    const slideXml = await readText(slidePath);
    if (!slideXml) continue;

    let notes = "";
    const relsXml = await readText(
      `${path.posix.dirname(slidePath)}/_rels/${path.posix.basename(slidePath)}.rels`,
    );
    if (relsXml) {
      const notesRel = parseRelationships(relsXml).find((rel) => rel.type.endsWith("/notesSlide"));
      if (notesRel) {
        const notesXml = await readText(resolveZipPath(path.posix.dirname(slidePath), notesRel.target));
        if (notesXml) notes = textFromDrawingXml(notesXml);
      }
    }

    const body = textFromDrawingXml(slideXml);
    const text = normalizeText([body, notes && `Note del relatore: ${notes}`].filter(Boolean).join("\n"));
    if (text.length >= MIN_PAGE_CHARS) units.push({ text, page: i + 1 });
  }

  if (!units.length) throw new ExtractionError("Le slide non contengono testo (solo immagini?)");
  return { kind: "paged", pageCount: slidePaths.length, units };
}

// ---------------------------------------------------------------------------
// DOCX, TXT, MD
// ---------------------------------------------------------------------------

async function extractDocx(buffer) {
  let markdown;
  try {
    markdown = (await mammoth.convertToMarkdown({ buffer })).value;
  } catch {
    markdown = (await mammoth.extractRawText({ buffer })).value;
  }
  // mammoth protegge i caratteri speciali con una barra: rumore inutile per la ricerca.
  const text = normalizeText(markdown.replace(/\\([\\`*_{}[\]()#+\-.!])/g, "$1"));
  if (!text) throw new ExtractionError("Il documento Word è vuoto");
  return { kind: "text", pageCount: null, units: splitSections(text) };
}

function extractPlainText(buffer) {
  const text = normalizeText(buffer.toString("utf8").replace(/^﻿/, ""));
  if (!text) throw new ExtractionError("Il file è vuoto");
  return { kind: "text", pageCount: null, units: splitSections(text) };
}

// I titoli markdown aprono una nuova sezione; ogni paragrafo diventa un'unità con il suo titolo.
function splitSections(text) {
  const units = [];
  let heading = null;
  let buffer = [];

  const flush = () => {
    const body = buffer.join("\n").trim();
    buffer = [];
    if (!body) return;
    for (const paragraph of body.split(/\n{2,}/)) {
      const clean = paragraph.trim();
      if (clean) units.push({ text: clean, heading });
    }
  };

  for (const line of text.split("\n")) {
    const match = /^#{1,6}\s+(.+?)\s*#*$/.exec(line);
    if (match) {
      flush();
      heading = match[1].trim();
    } else {
      buffer.push(line);
    }
  }
  flush();
  return units;
}

// ---------------------------------------------------------------------------
// SRT / VTT
// ---------------------------------------------------------------------------

const CUE_TIME = /(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{1,3})\s*-->/;

function extractSubtitles(buffer) {
  const raw = buffer.toString("utf8").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const cues = [];

  for (const block of raw.split(/\n{2,}/)) {
    const lines = block.split("\n");
    const timeIndex = lines.findIndex((line) => CUE_TIME.test(line));
    if (timeIndex === -1) continue;
    const [, h, m, s] = CUE_TIME.exec(lines[timeIndex]);
    const start = Number(h ?? 0) * 3600 + Number(m) * 60 + Number(s);
    const text = lines
      .slice(timeIndex + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/\{\\an?\d+\}/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text) cues.push({ start, text });
  }
  if (!cues.length) throw new ExtractionError("Nessun sottotitolo riconosciuto nel file");

  // Raggruppa le battute in finestre da ~75 secondi: ogni finestra ricorda il proprio inizio.
  const units = [];
  let windowStart = cues[0].start;
  let parts = [];
  for (const cue of cues) {
    if (parts.length && cue.start - windowStart >= SUBTITLE_WINDOW_SECONDS) {
      units.push({ text: parts.join(" "), ts: windowStart });
      parts = [];
      windowStart = cue.start;
    }
    parts.push(cue.text);
  }
  if (parts.length) units.push({ text: parts.join(" "), ts: windowStart });

  return { kind: "timed", pageCount: null, units };
}

// ---------------------------------------------------------------------------
// Immagini (slide fotografate, appunti, schemi)
// ---------------------------------------------------------------------------

async function extractImage(buffer, ext) {
  const mediaType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const { text } = await generateText({
    model: openai(VISION_MODEL),
    temperature: 0,
    maxOutputTokens: 4000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Trascrivi fedelmente il testo visibile in questa immagine (slide, appunti o lavagna). " +
              "Se ci sono schemi, grafici o formule, descrivili brevemente tra parentesi quadre. " +
              "Rispondi solo con la trascrizione, senza commenti.",
          },
          { type: "image", image: buffer, mediaType },
        ],
      },
    ],
  });

  const clean = normalizeText(text);
  if (clean.length < MIN_PAGE_CHARS) {
    throw new ExtractionError("Nessun testo riconoscibile nell'immagine");
  }
  return { kind: "text", pageCount: 1, units: splitSections(clean) };
}
