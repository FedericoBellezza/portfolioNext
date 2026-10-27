// Markdown -> PDF nel browser. Copre quello che il modello scrive: titoli, paragrafi, elenchi, citazioni,
// blocchi di codice, tabelle, **grassetto**, *corsivo* e `codice`. Client-only: jsPDF si carica al momento del download.
//
// I font standard di PDF hanno la codifica WinAnsi: le lettere accentate italiane vanno bene, i simboli fuori
// da quell'insieme (frecce, disuguaglianze, greco) si convertono in ASCII o si tolgono (vedi `sanitize`).

const MARGIN = 56;
const BODY_SIZE = 11;
const LEADING = 1.4;
const TEXT_COLOR = [33, 33, 33];
const MUTED_COLOR = [110, 110, 110];
const CODE_COLOR = [150, 60, 40];
const CODE_BG = [245, 242, 239];
const RULE_COLOR = [210, 205, 200];
const HEADING_SIZES = { 1: 20, 2: 16, 3: 13, 4: 11.5, 5: 11, 6: 11 };

const SYMBOLS = {
  "→": "->",
  "←": "<-",
  "↔": "<->",
  "⇒": "=>",
  "≤": "<=",
  "≥": ">=",
  "≠": "!=",
  "≈": "~",
  "−": "-",
  "∞": "inf",
  "✓": "v",
  "✔": "v",
  "✗": "x",
  "✘": "x",
  " ": " ",
  " ": " ",
  " ": " ",
};

// Oltre Latin-1 e Latin Extended-A restano solo la punteggiatura tipografica e l'euro, che WinAnsi contiene.
const KEPT_OUTSIDE_LATIN = new Set([..."–—‘’‚“”„•…€™†‡‰‹›"]);

function sanitize(text) {
  let out = "";
  for (const char of String(text ?? "").replace(/\t/g, "    ")) {
    if (SYMBOLS[char] !== undefined) out += SYMBOLS[char];
    else if (char.charCodeAt(0) <= 0x017f || KEPT_OUTSIDE_LATIN.has(char)) out += char;
  }
  return out;
}

// --- Inline -----------------------------------------------------------------------------------------------

function parseInline(text) {
  const plain = text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1 ($2)");
  const tokens = [];
  const pattern = /(\*\*\*[^*\n]+\*\*\*|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|(?<![A-Za-z0-9])_[^_\n]+_(?![A-Za-z0-9])|`[^`\n]+`)/g;
  let last = 0;
  for (const match of plain.matchAll(pattern)) {
    if (match.index > last) tokens.push({ text: plain.slice(last, match.index) });
    const raw = match[0];
    if (raw.startsWith("`")) tokens.push({ text: raw.slice(1, -1), code: true });
    else if (raw.startsWith("***")) tokens.push({ text: raw.slice(3, -3), bold: true, italic: true });
    else if (raw.startsWith("**") || raw.startsWith("__")) tokens.push({ text: raw.slice(2, -2), bold: true });
    else tokens.push({ text: raw.slice(1, -1), italic: true });
    last = match.index + raw.length;
  }
  if (last < plain.length) tokens.push({ text: plain.slice(last) });
  return tokens.map((token) => ({ ...token, text: sanitize(token.text) }));
}

function stripInline(text) {
  return parseInline(text)
    .map((token) => token.text)
    .join("");
}

// --- Scrittura --------------------------------------------------------------------------------------------

class Writer {
  constructor(doc) {
    this.doc = doc;
    this.width = doc.internal.pageSize.getWidth();
    this.height = doc.internal.pageSize.getHeight();
    this.y = MARGIN;
  }

  get right() {
    return this.width - MARGIN;
  }

  ensure(height) {
    if (this.y + height > this.height - MARGIN) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }
}

function setFont(doc, { bold, italic, code }, size) {
  if (code) doc.setFont("courier", "normal");
  else doc.setFont("helvetica", bold && italic ? "bolditalic" : bold ? "bold" : italic ? "italic" : "normal");
  doc.setFontSize(code ? size - 1 : size);
}

// Impagina i frammenti parola per parola: lo stile può cambiare a metà riga e la riga va a capo dove serve.
function flow(w, tokens, { x0, size = BODY_SIZE, bold = false, color = TEXT_COLOR }) {
  const { doc } = w;
  const lineHeight = size * LEADING;
  const maxWidth = w.right - x0;
  let x = x0;
  let pendingSpace = false;

  w.ensure(lineHeight);

  function newLine() {
    x = x0;
    pendingSpace = false;
    w.y += lineHeight;
    w.ensure(lineHeight);
  }

  for (const token of tokens) {
    const style = { bold: bold || token.bold, italic: token.italic, code: token.code };
    doc.setTextColor(...(token.code ? CODE_COLOR : color));
    for (const piece of token.text.split(/(\s+)/)) {
      if (!piece) continue;
      setFont(doc, style, size);
      if (/^\s+$/.test(piece)) {
        pendingSpace = x > x0;
        continue;
      }
      const spaceWidth = pendingSpace ? doc.getTextWidth(" ") : 0;
      let width = doc.getTextWidth(piece);
      if (x > x0 && x + spaceWidth + width > w.right) {
        newLine();
        setFont(doc, style, size);
      } else {
        x += spaceWidth;
      }
      pendingSpace = false;

      if (width > maxWidth) {
        // Una parola più larga della riga (URL, identificatore) si spezza.
        for (const chunk of doc.splitTextToSize(piece, maxWidth)) {
          if (x > x0) newLine();
          setFont(doc, style, size);
          doc.text(chunk, x, w.y + size);
          width = doc.getTextWidth(chunk);
          x += width;
        }
      } else {
        doc.text(piece, x, w.y + size);
        x += width;
      }
    }
  }
  w.y += lineHeight;
}

function paragraph(w, text, options = {}) {
  flow(w, parseInline(text), { x0: MARGIN + (options.indent ?? 0), ...options });
}

function heading(w, level, text) {
  const size = HEADING_SIZES[level] ?? BODY_SIZE;
  w.y += level <= 2 ? 10 : 6;
  // Un titolo non resta solo in fondo alla pagina.
  w.ensure(size * LEADING * 2.5);
  paragraph(w, text, { size, bold: true });
  if (level === 1) {
    w.doc.setDrawColor(...RULE_COLOR);
    w.doc.line(MARGIN, w.y - 2, w.right, w.y - 2);
    w.y += 6;
  }
  w.y += 2;
}

function listItem(w, { depth, marker, text }) {
  const { doc } = w;
  const x0 = MARGIN + 14 + depth * 16;
  const lineHeight = BODY_SIZE * LEADING;
  w.ensure(lineHeight);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(BODY_SIZE);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(marker, x0 - 4, w.y + BODY_SIZE, { align: "right" });
  paragraph(w, text, { indent: x0 - MARGIN });
  w.y += 1;
}

function quote(w, lines) {
  const startPage = w.doc.getCurrentPageInfo().pageNumber;
  const startY = w.y;
  paragraph(w, lines.join(" "), { indent: 14, color: MUTED_COLOR });
  // La barra laterale segue il testo solo se non è andato a capo di pagina.
  if (w.doc.getCurrentPageInfo().pageNumber === startPage) {
    w.doc.setDrawColor(...RULE_COLOR);
    w.doc.setLineWidth(2);
    w.doc.line(MARGIN + 3, startY + 1, MARGIN + 3, w.y - 3);
    w.doc.setLineWidth(0.2);
  }
  w.y += 2;
}

function codeBlock(w, lines) {
  const { doc } = w;
  const size = 9;
  const lineHeight = size * 1.35;
  const padding = 6;
  const innerWidth = w.right - MARGIN - padding * 2;

  doc.setFont("courier", "normal");
  doc.setFontSize(size);
  const wrapped = lines.flatMap((line) => doc.splitTextToSize(sanitize(line) || " ", innerWidth));

  w.y += 2;
  for (const line of wrapped) {
    w.ensure(lineHeight);
    doc.setFillColor(...CODE_BG);
    doc.rect(MARGIN, w.y, w.right - MARGIN, lineHeight, "F");
    doc.setFont("courier", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...TEXT_COLOR);
    doc.text(line, MARGIN + padding, w.y + size);
    w.y += lineHeight;
  }
  w.y += 8;
}

function table(w, rows) {
  const { doc } = w;
  const size = 9.5;
  const lineHeight = size * 1.3;
  const padding = 4;
  const columns = Math.max(...rows.map((row) => row.length));
  const cells = rows.map((row) => Array.from({ length: columns }, (_, index) => stripInline(row[index] ?? "")));

  // Le colonne con più testo hanno più spazio, con un minimo perché nessuna si riduca a una striscia.
  const weights = Array.from({ length: columns }, (_, index) =>
    Math.min(Math.max(...cells.map((row) => row[index].length), 8), 40),
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const widths = weights.map((weight) => ((w.right - MARGIN) * weight) / total);

  w.y += 2;
  cells.forEach((row, rowIndex) => {
    const header = rowIndex === 0;
    doc.setFont("helvetica", header ? "bold" : "normal");
    doc.setFontSize(size);
    const wrapped = row.map((cell, index) => doc.splitTextToSize(cell, widths[index] - padding * 2));
    const height = Math.max(...wrapped.map((lines) => lines.length)) * lineHeight + padding * 2;

    w.ensure(height);
    let x = MARGIN;
    wrapped.forEach((lines, index) => {
      doc.setDrawColor(...RULE_COLOR);
      if (header) {
        doc.setFillColor(...CODE_BG);
        doc.rect(x, w.y, widths[index], height, "FD");
      } else {
        doc.rect(x, w.y, widths[index], height, "S");
      }
      doc.setFont("helvetica", header ? "bold" : "normal");
      doc.setFontSize(size);
      doc.setTextColor(...TEXT_COLOR);
      doc.text(lines, x + padding, w.y + padding + size * 0.85, { lineHeightFactor: 1.3 });
      x += widths[index];
    });
    w.y += height;
  });
  w.y += 8;
}

function rule(w) {
  w.ensure(16);
  w.y += 6;
  w.doc.setDrawColor(...RULE_COLOR);
  w.doc.line(MARGIN, w.y, w.right, w.y);
  w.y += 10;
}

// --- Markdown a blocchi -----------------------------------------------------------------------------------

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function startsBlock(line, next) {
  return (
    FENCE.test(line) ||
    HEADING.test(line) ||
    RULE.test(line) ||
    LIST_ITEM.test(line) ||
    QUOTE.test(line) ||
    (line.includes("|") && next !== undefined && TABLE_SEPARATOR.test(next))
  );
}

function render(w, markdown) {
  const lines = String(markdown).replace(/\r\n?/g, "\n").split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (FENCE.test(line)) {
      const code = [];
      i += 1;
      while (i < lines.length && !FENCE.test(lines[i])) code.push(lines[i++]);
      i += 1;
      codeBlock(w, code);
      continue;
    }

    const headingMatch = HEADING.exec(line);
    if (headingMatch) {
      heading(w, headingMatch[1].length, headingMatch[2]);
      i += 1;
      continue;
    }

    if (RULE.test(line)) {
      rule(w);
      i += 1;
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length && TABLE_SEPARATOR.test(lines[i + 1])) {
      const rows = [splitRow(line)];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) rows.push(splitRow(lines[i++]));
      table(w, rows);
      continue;
    }

    if (QUOTE.test(line)) {
      const quoted = [];
      while (i < lines.length && QUOTE.test(lines[i])) quoted.push(QUOTE.exec(lines[i++])[1]);
      quote(w, quoted);
      w.y += 4;
      continue;
    }

    if (LIST_ITEM.test(line)) {
      while (i < lines.length && LIST_ITEM.test(lines[i])) {
        const [, indent, marker, text] = LIST_ITEM.exec(lines[i]);
        i += 1;
        // Le righe rientrate che seguono continuano la voce.
        let full = text;
        while (i < lines.length && lines[i].trim() && /^\s+\S/.test(lines[i]) && !LIST_ITEM.test(lines[i])) {
          full += ` ${lines[i++].trim()}`;
        }
        listItem(w, {
          depth: Math.min(Math.floor(indent.replace(/\t/g, "  ").length / 2), 3),
          marker: /^\d/.test(marker) ? marker : "•",
          text: full,
        });
      }
      w.y += 4;
      continue;
    }

    const paragraphLines = [];
    while (i < lines.length && lines[i].trim() && (paragraphLines.length === 0 || !startsBlock(lines[i], lines[i + 1]))) {
      paragraphLines.push(lines[i++].trim());
    }
    paragraph(w, paragraphLines.join(" "));
    w.y += 5;
  }
}

function addPageNumbers(doc, w) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(`${page} / ${pages}`, w.right, w.height - 28, { align: "right" });
  }
}

/**
 * @param {string} markdown
 * @param {{ title?: string }} [options]
 * @returns {Promise<import("jspdf").jsPDF>}
 */
export async function buildPdf(markdown, { title } = {}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  if (title) doc.setProperties({ title });
  const writer = new Writer(doc);
  render(writer, markdown);
  addPageNumbers(doc, writer);
  return doc;
}
