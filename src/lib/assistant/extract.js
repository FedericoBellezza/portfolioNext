import path from "node:path";
import JSZip from "jszip";
import mammoth from "mammoth";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import {
  MAX_FIGURE_BYTES,
  MAX_FIGURE_REUSE,
  MAX_OCR_PAGES,
  MAX_VISUAL_ITEMS,
  MIN_FIGURE_BYTES,
  VISUAL_MAX_WORDS,
  getExtension,
} from "./constants";
import { describeChartXml, describeConnectors, describeDiagramDataXml } from "./pptxFigures";
import { VISION_MODEL } from "./vision";
import { parseRelationships, resolveZipPath, textFromDrawingXml } from "./xml";

// Ogni estrattore restituisce { kind, pageCount, units, visualPlan? }:
//  - kind: "paged" (PDF, slide), "text" (Word, Markdown, testo), "timed" (sottotitoli)
//  - units: [{ text, page?, ts?, heading? }] nell'ordine del documento
//  - visualPlan: figure da far descrivere a un modello vision in un secondo momento
//    ({ v: 1, kind: "pdf", items: [{ page }] } oppure { v: 1, kind: "pptx", items: [{ slide, media }] })

const MIN_PAGE_CHARS = 30;
const SUBTITLE_WINDOW_SECONDS = 75;
const FIGURE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"];

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

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

async function extractPdf(buffer) {
  // Il worker va importato prima di pdf-parse (richiesto in ambiente serverless).
  await import("pdf-parse/worker");
  const { PDFParse } = await import("pdf-parse");

  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  let result;
  let embeddedImagePages = new Set();
  try {
    result = await parser.getText();

    // Pagine con tanto testo ma con un'immagine incorporata (foto, grafico raster): candidate alle figure.
    const longPages = result.pages
      .filter((page) => countWords(page.text) >= VISUAL_MAX_WORDS)
      .map((page) => page.num);
    if (longPages.length) {
      try {
        const images = await parser.getImage({
          partial: longPages,
          imageThreshold: 120,
          imageBuffer: false,
          imageDataUrl: false,
        });
        embeddedImagePages = new Set(images.pages.filter((p) => p.images.length).map((p) => p.pageNumber));
      } catch (error) {
        console.warn("[assistant] rilevamento immagini PDF non riuscito:", error.message);
      }
    }
  } finally {
    await parser.destroy();
  }

  const pages = result.pages.map((page) => ({
    page: page.num,
    text: normalizeText(page.text),
    words: countWords(page.text),
  }));
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
    visualPlan: planPdfFigures(pages, embeddedImagePages),
  };
}

function countWords(text) {
  return String(text ?? "").split(/\s+/).filter(Boolean).length;
}

// Pagine "da slide" (poche parole) e pagine con immagini incorporate: le prime con immagini, poi in ordine.
function planPdfFigures(pages, embeddedImagePages) {
  const candidates = pages.filter((page) => page.words < VISUAL_MAX_WORDS || embeddedImagePages.has(page.page));
  candidates.sort(
    (a, b) => Number(embeddedImagePages.has(b.page)) - Number(embeddedImagePages.has(a.page)) || a.page - b.page,
  );
  const items = candidates
    .slice(0, MAX_VISUAL_ITEMS)
    .map((page) => ({ page: page.page }))
    .sort((a, b) => a.page - b.page);
  return items.length ? { v: 1, kind: "pdf", items } : null;
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

// Un'immagine incorporata è una "figura" da analizzare se non è un'icona (troppo piccola),
// non è enorme e non è uno sfondo o un logo ripetuto su molte slide.
async function planPptxFigures(zip, slideMedia) {
  const usage = new Map();
  for (const { media } of slideMedia) usage.set(media, (usage.get(media) ?? 0) + 1);

  const sizes = new Map();
  const items = [];
  for (const { slide, media } of slideMedia) {
    if (!FIGURE_EXTENSIONS.includes(getExtension(media))) continue;
    if (usage.get(media) > MAX_FIGURE_REUSE) continue;
    if (!sizes.has(media)) {
      const file = zip.file(media);
      sizes.set(media, file ? (await file.async("uint8array")).length : 0);
    }
    const size = sizes.get(media);
    if (size < MIN_FIGURE_BYTES || size > MAX_FIGURE_BYTES) continue;
    items.push({ slide, media });
    if (items.length >= MAX_VISUAL_ITEMS) break;
  }
  return items.length ? { v: 1, kind: "pptx", items } : null;
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
  const slideMedia = [];
  for (let i = 0; i < slidePaths.length; i++) {
    const slidePath = slidePaths[i];
    const slideDir = path.posix.dirname(slidePath);
    const slideXml = await readText(slidePath);
    if (!slideXml) continue;

    let notes = "";
    const figures = [];
    const relsXml = await readText(`${slideDir}/_rels/${path.posix.basename(slidePath)}.rels`);
    for (const rel of relsXml ? parseRelationships(relsXml) : []) {
      const target = resolveZipPath(slideDir, rel.target);
      if (rel.type.endsWith("/notesSlide")) {
        const notesXml = await readText(target);
        if (notesXml) notes = textFromDrawingXml(notesXml);
      } else if (rel.type.endsWith("/chart")) {
        // Grafici nativi: i valori sono nel file, nessun bisogno di "guardarli".
        const description = describeChartXml((await readText(target)) ?? "");
        if (description) figures.push(description);
      } else if (rel.type.endsWith("/diagramData")) {
        const description = describeDiagramDataXml((await readText(target)) ?? "");
        if (description) figures.push(description);
      } else if (rel.type.endsWith("/image")) {
        slideMedia.push({ slide: i + 1, media: target });
      }
    }
    const connectors = describeConnectors(slideXml);
    if (connectors) figures.push(connectors);

    const body = textFromDrawingXml(slideXml);
    const text = normalizeText(
      [body, figures.length && `Figure e diagrammi:\n${figures.join("\n")}`, notes && `Note del relatore: ${notes}`]
        .filter(Boolean)
        .join("\n"),
    );
    if (text.length >= MIN_PAGE_CHARS) units.push({ text, page: i + 1 });
  }

  // Le slide fatte solo di immagini non hanno testo: se ci sono figure da analizzare il file è comunque utile.
  const visualPlan = await planPptxFigures(zip, slideMedia);
  if (!units.length && !visualPlan) {
    throw new ExtractionError("Le slide non contengono testo né immagini analizzabili");
  }
  return { kind: "paged", pageCount: slidePaths.length, units, visualPlan };
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
