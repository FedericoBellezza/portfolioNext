/**
 * Voce + tempi dei sottotitoli per un reel.
 *
 *   npm run voce -- <id> [--voce=marin] [--forza]
 *
 * Legge copioni/<id>.json e per ogni scena:
 *   1. genera la voce con OpenAI TTS (un mp3 per scena, così la durata della
 *      scena segue la voce);
 *   2. la trascrive con Whisper per avere il tempo di ogni parola;
 *   3. scrive public/reel/<id>/reel.json, che la composizione Remotion legge.
 * Gli mp3 già generati per lo stesso testo e la stessa voce vengono riusati;
 * i file di versioni precedenti della scena vengono cancellati.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import OpenAI from "openai";

const radice = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(radice, ".env"), quiet: true });
dotenv.config({ path: path.join(radice, "..", ".env"), quiet: true });

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
const opzione = (nome) => args.find((a) => a.startsWith(`--${nome}=`))?.split("=")[1];
const forza = args.includes("--forza");
if (!id) {
  console.error("Uso: npm run voce -- <id> [--voce=marin] [--forza]");
  process.exit(1);
}

const VOCE = opzione("voce") ?? process.env.STUDIO_VOCE ?? "marin";
const ISTRUZIONI =
  process.env.STUDIO_ISTRUZIONI_VOCE ??
  "Parla in italiano, con accento neutro. Tono caldo e sicuro, come un consulente che spiega una cosa utile a un imprenditore. Ritmo vivace ma chiaro, pause brevi tra le frasi. Niente enfasi da pubblicità.";
// I reel vanno veloci: 1.1 toglie qualche secondo senza far sembrare la voce accelerata.
const VELOCITA = Number(opzione("velocita") ?? process.env.STUDIO_VELOCITA ?? 1.1);
const PAUSA = 0.35; // secondi di respiro dopo ogni scena
const CODA_FINALE = 1.2; // la CTA resta a schermo un po' di più

const copione = JSON.parse(fs.readFileSync(path.join(radice, "copioni", `${id}.json`), "utf8"));
const cartella = path.join(radice, "public", "reel", id);
fs.mkdirSync(cartella, { recursive: true });

const openai = new OpenAI();

const normalizza = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]/g, "");

/**
 * Mostra le parole del copione (con punteggiatura e maiuscole) usando i tempi
 * di Whisper. Le due liste non coincidono sempre ("l'ha" → "l'" + "ha",
 * "10:30" → "10.30"), quindi l'allineamento avviene sui caratteri: ogni parola
 * del copione prende i tempi delle parole Whisper che coprono gli stessi
 * caratteri, in proporzione.
 */
function allinea(testo, paroleWhisper, durataAudio) {
  const parole = testo.split(/\s+/).filter(Boolean);
  if (!paroleWhisper.length) {
    const passo = durataAudio / parole.length;
    return parole.map((p, i) => ({ testo: p, inizio: i * passo, fine: (i + 1) * passo }));
  }
  const intervalliW = [];
  let lw = 0;
  for (const w of paroleWhisper) {
    const n = Math.max(1, normalizza(w.word).length);
    intervalliW.push([lw, lw + n]);
    lw += n;
  }
  const lunghezze = parole.map((p) => normalizza(p).length);
  const ls = Math.max(1, lunghezze.reduce((a, b) => a + b, 0));
  const scala = lw / ls;
  const cerca = (pos) => {
    const i = intervalliW.findIndex(([a, b]) => pos >= a && pos < b);
    return i === -1 ? intervalliW.length - 1 : i;
  };

  let c = 0;
  let ultimoInizio = 0;
  return parole.map((p, i) => {
    const n = lunghezze[i];
    const iA = cerca(c * scala);
    const iB = cerca(Math.max(c, c + n - 1) * scala);
    c += n;
    // Gli inizi non tornano mai indietro, anche se due parole cadono sulla stessa parola Whisper.
    const inizio = Math.max(ultimoInizio, paroleWhisper[iA].start);
    const fine = Math.max(inizio + 0.05, paroleWhisper[iB].end);
    ultimoInizio = inizio;
    return { testo: p, inizio: Number(inizio.toFixed(3)), fine: Number(fine.toFixed(3)) };
  });
}

const scene = [];
for (const [i, scena] of copione.scene.entries()) {
  const firma = createHash("sha1")
    .update(`${VOCE}|${VELOCITA}|${ISTRUZIONI}|${scena.voce}`)
    .digest("hex")
    .slice(0, 10);
  const nome = `scena-${i + 1}-${firma}.mp3`;
  const file = path.join(cartella, nome);
  const cache = path.join(cartella, `scena-${i + 1}-${firma}.json`);

  if (forza || !fs.existsSync(file)) {
    process.stdout.write(`Scena ${i + 1}: voce... `);
    const audio = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: VOCE,
      input: scena.voce,
      instructions: ISTRUZIONI,
      speed: VELOCITA,
      response_format: "mp3",
    });
    fs.writeFileSync(file, Buffer.from(await audio.arrayBuffer()));
    fs.rmSync(cache, { force: true });
  } else {
    process.stdout.write(`Scena ${i + 1}: voce in cache... `);
  }

  let trascrizione;
  if (fs.existsSync(cache)) {
    trascrizione = JSON.parse(fs.readFileSync(cache, "utf8"));
    console.log("tempi in cache");
  } else {
    process.stdout.write("tempi... ");
    trascrizione = await openai.audio.transcriptions.create({
      file: fs.createReadStream(file),
      model: "whisper-1",
      language: "it",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });
    fs.writeFileSync(cache, JSON.stringify({ duration: trascrizione.duration, words: trascrizione.words }));
    console.log("ok");
  }

  const ultima = i === copione.scene.length - 1;
  scene.push({
    ...scena,
    audio: `reel/${id}/${nome}`,
    parole: allinea(scena.voce, trascrizione.words ?? [], trascrizione.duration),
    durata: Number((trascrizione.duration + (ultima ? CODA_FINALE : PAUSA)).toFixed(2)),
  });
}

// Via gli audio di versioni precedenti del copione.
const usati = new Set(scene.flatMap((s) => [path.basename(s.audio), path.basename(s.audio).replace(/\.mp3$/, ".json")]));
for (const f of fs.readdirSync(cartella)) {
  if (f.startsWith("scena-") && !usati.has(f)) fs.rmSync(path.join(cartella, f));
}

const reel = { ...copione, id, scene };
fs.writeFileSync(path.join(cartella, "reel.json"), JSON.stringify(reel, null, 2));
const totale = scene.reduce((t, s) => t + s.durata, 0);
console.log(`\n${id}: ${scene.length} scene, ${totale.toFixed(1)} s, voce "${VOCE}" → public/reel/${id}/reel.json`);
if (totale > 45) console.warn("Attenzione: più di 45 secondi, accorcia il copione.");
