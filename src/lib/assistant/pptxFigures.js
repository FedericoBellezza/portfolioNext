import { allTexts, decodeXmlEntities } from "./xml";

// Grafici, SmartArt e frecce tra le forme sono dati strutturati dentro il PPTX: si leggono
// direttamente, senza modello vision e quindi senza costi né errori di lettura.

const MAX_POINTS = 60;

const CHART_KINDS = {
  bar: "a barre orizzontali",
  bar3D: "a barre orizzontali",
  line: "a linee",
  line3D: "a linee",
  pie: "a torta",
  pie3D: "a torta",
  ofPie: "a torta",
  doughnut: "ad anello",
  area: "ad area",
  area3D: "ad area",
  scatter: "a dispersione",
  bubble: "a bolle",
  radar: "radar",
  stock: "azionario",
  surface: "di superficie",
};

function values(block) {
  return [...block.matchAll(/<c:v>([\s\S]*?)<\/c:v>/g)].map((m) => decodeXmlEntities(m[1]).trim());
}

// I punti di una serie (<c:pt idx="i"><c:v>…</c:v></c:pt>) dentro il tag indicato.
function points(seriesXml, tag) {
  const block = new RegExp(`<c:${tag}>([\\s\\S]*?)</c:${tag}>`).exec(seriesXml)?.[1];
  if (!block) return [];
  const out = [];
  for (const m of block.matchAll(/<c:pt\s+idx="(\d+)"[^>]*>\s*<c:v>([\s\S]*?)<\/c:v>/g)) {
    out[Number(m[1])] = decodeXmlEntities(m[2]).trim();
  }
  return Array.from(out, (value) => value ?? "");
}

function axisTitle(xml, axisTag) {
  const axis = new RegExp(`<c:${axisTag}>([\\s\\S]*?)</c:${axisTag}>`).exec(xml)?.[1];
  const title = axis && /<c:title>([\s\S]*?)<\/c:title>/.exec(axis)?.[1];
  return title ? allTexts(title).join(" ") : "";
}

/**
 * Descrive un grafico nativo (ppt/charts/chartN.xml): tipo, titolo, assi, serie e valori.
 * @returns {string | null}
 */
export function describeChartXml(xml) {
  const head = xml.split("<c:plotArea")[0];
  const title = allTexts(head).join(" ");

  const kinds = [];
  for (const m of xml.matchAll(/<c:(\w+?)Chart>/g)) {
    if (CHART_KINDS[m[1]] && !kinds.includes(m[1])) kinds.push(m[1]);
  }
  const vertical = /<c:barDir\s+val="col"/.test(xml);
  const kindLabel = kinds
    .map((kind) => (kind === "bar" && vertical ? "a colonne" : CHART_KINDS[kind]))
    .join(" + ");

  const axes = [
    ["asse X", axisTitle(xml, "catAx") || axisTitle(xml, "dateAx")],
    ["asse Y", axisTitle(xml, "valAx")],
  ]
    .filter(([, label]) => label)
    .map(([name, label]) => `${name}: ${label}`);

  const series = [];
  for (const m of xml.matchAll(/<c:ser>([\s\S]*?)<\/c:ser>/g)) {
    const ser = m[1];
    const nameBlock = /<c:tx>([\s\S]*?)<\/c:tx>/.exec(ser)?.[1];
    const name = nameBlock ? values(nameBlock).join(" ") : "";
    const cats = points(ser, "cat");
    const xs = points(ser, "xVal");
    const ys = points(ser, "yVal").length ? points(ser, "yVal") : points(ser, "val");
    if (!ys.length) continue;

    const labels = xs.length ? xs : cats;
    const pairs = ys.slice(0, MAX_POINTS).map((y, i) => `${labels[i] || i + 1} = ${y}`);
    const more = ys.length > MAX_POINTS ? ` … (altri ${ys.length - MAX_POINTS} punti)` : "";
    series.push(`${name ? `Serie «${name}»` : "Serie"}: ${pairs.join("; ")}${more}`);
  }

  if (!title && !series.length) return null;
  const header = [`Grafico${kindLabel ? ` ${kindLabel}` : ""}`, title && `«${title}»`, axes.length && `(${axes.join("; ")})`]
    .filter(Boolean)
    .join(" ");
  return [header + (series.length ? "." : ""), ...series].join("\n");
}

/**
 * Elenca le voci di un SmartArt (ppt/diagrams/dataN.xml).
 * @returns {string | null}
 */
export function describeDiagramDataXml(xml) {
  const texts = allTexts(xml);
  return texts.length >= 2 ? `Diagramma SmartArt, voci: ${texts.join("; ")}` : null;
}

/**
 * Ricostruisce le frecce tra le forme di una slide: connettori con partenza e arrivo agganciati.
 * @returns {string | null}
 */
export function describeConnectors(slideXml) {
  const textById = new Map();
  for (const m of slideXml.matchAll(/<p:sp(?:\s[^>]*)?>([\s\S]*?)<\/p:sp>/g)) {
    const id = /<p:cNvPr\s[^>]*\bid="(\d+)"/.exec(m[1])?.[1];
    const text = allTexts(m[1]).join(" ").trim();
    if (id && text) textById.set(id, text);
  }

  const links = [];
  for (const m of slideXml.matchAll(/<p:cxnSp(?:\s[^>]*)?>([\s\S]*?)<\/p:cxnSp>/g)) {
    const from = /<a:stCxn\s[^>]*\bid="(\d+)"/.exec(m[1])?.[1];
    const to = /<a:endCxn\s[^>]*\bid="(\d+)"/.exec(m[1])?.[1];
    if (!from || !to || !textById.has(from) || !textById.has(to)) continue;

    const arrowAtEnd = /<a:tailEnd\s[^>]*type="(?!none)\w+"/.test(m[1]);
    const arrowAtStart = /<a:headEnd\s[^>]*type="(?!none)\w+"/.test(m[1]);
    const a = textById.get(from);
    const b = textById.get(to);
    if (arrowAtStart && !arrowAtEnd) links.push(`${b} → ${a}`);
    else if (arrowAtStart && arrowAtEnd) links.push(`${a} ↔ ${b}`);
    else links.push(`${a} → ${b}`);
  }
  return links.length ? `Collegamenti tra le forme (frecce): ${links.join("; ")}` : null;
}
