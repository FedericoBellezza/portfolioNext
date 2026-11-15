/**
 * Stessa frase letta da più voci OpenAI, per scegliere quella della pagina.
 *
 *   node scripts/campioni-voce.mjs [marin cedar ash ...]
 *
 * I file finiscono in out/campioni-voce/<voce>.mp3.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import OpenAI from "openai";

const radice = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(radice, ".env"), quiet: true });
dotenv.config({ path: path.join(radice, "..", ".env"), quiet: true });

const voci = process.argv.slice(2).length ? process.argv.slice(2) : ["marin", "cedar", "ash", "coral"];
const frase =
  "Se hai uno studio, quante volte al giorno rispondi a mano alla stessa domanda su WhatsApp? Con un'automazione, un assistente legge la tua agenda, propone gli orari liberi e fissa l'appuntamento.";
const istruzioni =
  "Parla in italiano, con accento neutro. Tono caldo e sicuro, come un consulente che spiega una cosa utile a un imprenditore. Ritmo vivace ma chiaro, pause brevi tra le frasi. Niente enfasi da pubblicità.";

const cartella = path.join(radice, "out", "campioni-voce");
fs.mkdirSync(cartella, { recursive: true });
const openai = new OpenAI();
for (const voce of voci) {
  const audio = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: voce,
    input: frase,
    instructions: istruzioni,
    response_format: "mp3",
  });
  fs.writeFileSync(path.join(cartella, `${voce}.mp3`), Buffer.from(await audio.arrayBuffer()));
  console.log(`out/campioni-voce/${voce}.mp3`);
}
