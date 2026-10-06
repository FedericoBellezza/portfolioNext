import JSZip from "jszip";
import { embeddingInput } from "./chunk";
import { VISUAL_BATCH_SIZE, getExtension } from "./constants";
import { embedTexts, toVectorLiteral } from "./embed";
import { describeFigures } from "./vision";

// Analisi delle figure in seconda battuta: il testo del documento è già indicizzato e usabile,
// qui si "traducono in testo" i grafici e gli schemi che il testo estratto non contiene.
// Ogni chiamata elabora un lotto (VISUAL_BATCH_SIZE elementi del piano) e il browser la ripete
// finché il documento non è finito: così si resta sotto il limite di tempo delle route e,
// se qualcosa si interrompe, si riprende dal punto in cui si era arrivati.

const INSERT_BATCH = 40;
const MEDIA_TYPES = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp" };

// Le pagine del PDF diventano immagini: servono anche per i grafici vettoriali, che non sono immagini nel file.
async function renderPdfPages(buffer, entries) {
  await import("pdf-parse/worker");
  const { PDFParse } = await import("pdf-parse");

  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const shots = await parser.getScreenshot({
      partial: entries.map((entry) => entry.item.page),
      // 900 px = 2 tessere per il modello (circa 14.000 token a pagina); 1100 px ne costerebbe 37.000
      // senza leggere meglio le etichette.
      desiredWidth: 900,
      imageBuffer: true,
      imageDataUrl: false,
    });
    const byPage = new Map(shots.pages.map((shot) => [shot.pageNumber, shot]));
    return entries
      .filter((entry) => byPage.has(entry.item.page))
      .map((entry) => ({
        ...entry,
        page: entry.item.page,
        data: byPage.get(entry.item.page).data,
        mediaType: "image/png",
        label: `pagina ${entry.item.page}`,
      }));
  } finally {
    await parser.destroy();
  }
}

async function readPptxImages(buffer, entries) {
  const zip = await JSZip.loadAsync(buffer);
  const images = [];
  for (const entry of entries) {
    const file = zip.file(entry.item.media);
    if (!file) continue;
    images.push({
      ...entry,
      page: entry.item.slide,
      data: await file.async("uint8array"),
      mediaType: MEDIA_TYPES[getExtension(entry.item.media)] ?? "image/png",
      label: `slide ${entry.item.slide}`,
    });
  }
  return images;
}

/**
 * Elabora il prossimo lotto del piano di un documento e salva le descrizioni come passaggi indicizzati.
 * @param {{ supabase: any, document: { id: string, course: string, name: string, visual_plan: any, visual_done: number | null }, buffer: Buffer }} args
 * @returns {Promise<{ done: number, total: number, added: number }>}
 */
export async function runVisualBatch({ supabase, document, buffer }) {
  const items = document.visual_plan?.items ?? [];
  const start = document.visual_done ?? 0;
  const entries = items
    .slice(start, start + VISUAL_BATCH_SIZE)
    .map((item, offset) => ({ item, index: start + offset }));
  if (!entries.length) return { done: items.length, total: items.length, added: 0 };

  const images =
    document.visual_plan.kind === "pdf" ? await renderPdfPages(buffer, entries) : await readPptxImages(buffer, entries);

  const descriptions = images.length ? await describeFigures(images) : [];
  const figures = images
    .map((image, i) => ({ image, text: descriptions[i] }))
    .filter((figure) => figure.text)
    .map(({ image, text }) => ({
      page: image.page,
      heading: `Figura ${image.index + 1}`,
      content: `Figura (descrizione automatica): ${text}`,
    }));

  let added = 0;
  if (figures.length) {
    // Ripetere un lotto (dopo un errore) non deve duplicare le figure: ogni voce del piano ha il suo titolo.
    const { error: cleanupError } = await supabase
      .from("assistant_chunks")
      .delete()
      .eq("document_id", document.id)
      .in("heading", entries.map((entry) => `Figura ${entry.index + 1}`));
    if (cleanupError) throw new Error(`Pulizia figure: ${cleanupError.message}`);

    const { data: last } = await supabase
      .from("assistant_chunks")
      .select("chunk_index")
      .eq("document_id", document.id)
      .order("chunk_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    const baseIndex = (last?.chunk_index ?? -1) + 1;

    const embeddings = await embedTexts(
      figures.map((figure) => embeddingInput(figure, { course: document.course, name: document.name })),
    );
    const rows = figures.map((figure, i) => ({
      document_id: document.id,
      course: document.course,
      content: figure.content,
      embedding: toVectorLiteral(embeddings[i]),
      chunk_index: baseIndex + i,
      page_start: figure.page,
      page_end: figure.page,
      ts_start: null,
      heading: figure.heading,
    }));
    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      const { error } = await supabase.from("assistant_chunks").insert(rows.slice(i, i + INSERT_BATCH));
      if (error) throw new Error(`Salvataggio figure: ${error.message}`);
    }
    added = rows.length;
  }

  const done = start + entries.length;
  const { error } = await supabase
    .from("assistant_documents")
    .update({ visual_done: done, visual_status: done >= items.length ? "done" : "pending", visual_error: null })
    .eq("id", document.id);
  if (error) throw new Error(`Aggiornamento avanzamento: ${error.message}`);

  return { done, total: items.length, added };
}
