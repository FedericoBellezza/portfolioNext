/**
 * Fermo-immagine di un reel, uno per scena (all'80% della scena), per
 * controllare la grafica senza fare il render completo.
 *
 *   node scripts/anteprima.mjs <id>
 *
 * I PNG finiscono in out/anteprime/<id>/scena-N.png.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const radice = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const id = process.argv[2];
if (!id) {
  console.error("Uso: node scripts/anteprima.mjs <id>");
  process.exit(1);
}
const reel = JSON.parse(fs.readFileSync(path.join(radice, "public", "reel", id, "reel.json"), "utf8"));
const serveUrl = await bundle({ entryPoint: path.join(radice, "src", "index.ts"), publicDir: path.join(radice, "public") });
const inputProps = { id };
const composition = await selectComposition({ serveUrl, id: "Reel", inputProps });
const cartella = path.join(radice, "out", "anteprime", id);
fs.mkdirSync(cartella, { recursive: true });

let inizio = 0;
for (const [i, scena] of reel.scene.entries()) {
  const durata = Math.max(2 * composition.fps, Math.round((scena.durata ?? 4) * composition.fps));
  const frame = inizio + Math.round(durata * 0.8);
  const file = path.join(cartella, `scena-${i + 1}.png`);
  await renderStill({ composition, serveUrl, inputProps, frame, output: file });
  console.log(`out/anteprime/${id}/scena-${i + 1}.png (${scena.tipo}, frame ${frame})`);
  inizio += durata;
}
