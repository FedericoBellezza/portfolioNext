/**
 * Render di un reel in MP4 1080x1920.
 *
 *   npm run render -- <id>
 *
 * Richiede public/reel/<id>/reel.json (lo crea "npm run voce -- <id>").
 * Il file finisce in out/<id>.mp4.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const radice = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const id = process.argv[2];
if (!id) {
  console.error("Uso: npm run render -- <id>");
  process.exit(1);
}
if (!fs.existsSync(path.join(radice, "public", "reel", id, "reel.json"))) {
  console.error(`Manca public/reel/${id}/reel.json: lancia prima "npm run voce -- ${id}"`);
  process.exit(1);
}

const inizio = Date.now();
console.log("Preparo il bundle...");
const serveUrl = await bundle({ entryPoint: path.join(radice, "src", "index.ts"), publicDir: path.join(radice, "public") });

const inputProps = { id };
const composition = await selectComposition({ serveUrl, id: "Reel", inputProps });
const uscita = path.join(radice, "out", `${id}.mp4`);
fs.mkdirSync(path.dirname(uscita), { recursive: true });

let ultimo = -1;
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  crf: 20,
  audioBitrate: "192k",
  pixelFormat: "yuv420p",
  outputLocation: uscita,
  inputProps,
  onProgress: ({ progress }) => {
    const p = Math.floor(progress * 10);
    if (p !== ultimo) {
      ultimo = p;
      process.stdout.write(`${p * 10}% `);
    }
  },
});

const mb = fs.statSync(uscita).size / 1024 / 1024;
console.log(
  `\n${id}: ${(composition.durationInFrames / composition.fps).toFixed(1)} s, ${mb.toFixed(1)} MB, ` +
    `render in ${((Date.now() - inizio) / 1000).toFixed(0)} s → out/${id}.mp4`,
);
