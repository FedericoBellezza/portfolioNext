import path from "node:path";

// Piccoli helper per leggere i file XML dei documenti Office (PPTX) senza un parser completo.

export function decodeXmlEntities(text) {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function parseRelationships(xml) {
  const rels = [];
  for (const tag of xml.match(/<Relationship\b[^>]*>/g) ?? []) {
    const id = /\bId="([^"]*)"/.exec(tag)?.[1];
    const target = /\bTarget="([^"]*)"/.exec(tag)?.[1];
    const type = /\bType="([^"]*)"/.exec(tag)?.[1] ?? "";
    if (id && target) rels.push({ id, target, type });
  }
  return rels;
}

export function resolveZipPath(baseDir, target) {
  if (target.startsWith("/")) return target.slice(1);
  return path.posix.normalize(path.posix.join(baseDir, target));
}

// Tutti i testi <a:t> nell'ordine in cui compaiono.
export function allTexts(xml) {
  return (xml.match(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g) ?? [])
    .map((run) => decodeXmlEntities(run.replace(/<[^>]+>/g, "")).trim())
    .filter(Boolean);
}

// Un testo per paragrafo (<a:p>), con i frammenti dello stesso paragrafo uniti.
export function textFromDrawingXml(xml) {
  const lines = [];
  for (const paragraph of xml.split("</a:p>")) {
    const line = allTexts(paragraph).join("");
    if (line.trim()) lines.push(line.trim());
  }
  return lines.join("\n");
}
