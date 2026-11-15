/**
 * Esporta le slide di un carosello come PNG 1080×1350.
 *
 *   node scripts/carosello.mjs dentista
 *
 * Usa la composizione "Carosello-<nome>" (un frame = una slide) e scrive
 * out/caroselli/<nome>/slide-N.png.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const radice = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nome = process.argv[2];
if (!nome) {
  console.error("Uso: node scripts/carosello.mjs <nome>");
  process.exit(1);
}
const serveUrl = await bundle({ entryPoint: path.join(radice, "src", "index.ts"), publicDir: path.join(radice, "public") });
const composition = await selectComposition({ serveUrl, id: `Carosello-${nome}`, inputProps: {} });
const cartella = path.join(radice, "out", "caroselli", nome);
fs.mkdirSync(cartella, { recursive: true });
for (let i = 0; i < composition.durationInFrames; i++) {
  const file = path.join(cartella, `slide-${i + 1}.png`);
  await renderStill({ composition, serveUrl, frame: i, output: file, inputProps: {} });
  console.log(`out/caroselli/${nome}/slide-${i + 1}.png`);
}
