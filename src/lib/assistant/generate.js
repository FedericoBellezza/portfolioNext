import { AssistantError } from "./auth";
import { DEFAULT_EFFORT, DEFAULT_MODEL, EFFORTS, MODELS } from "./constants";

// Unico punto in cui il testo viene generato. Oggi: webhook n8n -> SSH -> `claude -p` sul server
// (abbonamento, nessuna API Anthropic). Per passare ad altro basta riscrivere questa funzione:
// riceve { system, prompt, model, effort, webSearch } e restituisce { text, model, costUsd, durationMs }.
// webSearch: true fa usare a Claude la ricerca web (chat fiscale); senza, nessuno strumento.
// files: [{ name, url }] link firmati di Supabase Storage: n8n li scarica in una cartella temporanea
// e Claude li può aprire solo lì (chat fiscale, archivio documenti).

// Sotto il maxDuration delle route (300 s), così l'errore è nostro e pulito invece di un timeout della piattaforma.
const DEFAULT_TIMEOUT_MS = 290000;

const MODEL_IDS = new Set(MODELS.map((item) => item.id));
const EFFORT_IDS = new Set(EFFORTS.map((item) => item.id));

/**
 * @param {{ system: string, prompt: string, model?: string, effort?: string, webSearch?: boolean,
 *   files?: { name: string, url: string }[], signal?: AbortSignal }} args
 */
export async function generate({ system, prompt, model, effort, webSearch = false, files = [], signal }) {
  const url = process.env.N8N_ASSISTANT_URL;
  const secret = process.env.N8N_ASSISTANT_SECRET;
  if (!url || !secret) {
    throw new AssistantError("Generazione non configurata (N8N_ASSISTANT_URL / N8N_ASSISTANT_SECRET)", 500);
  }

  const timeout = AbortSignal.timeout(Number(process.env.ASSISTANT_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Webhook-Secret": secret },
      body: JSON.stringify({
        system,
        prompt,
        model: MODEL_IDS.has(model) ? model : DEFAULT_MODEL,
        effort: EFFORT_IDS.has(effort) ? effort : DEFAULT_EFFORT,
        webSearch: webSearch === true,
        ...(files.length ? { files } : {}),
      }),
      signal: combined,
      cache: "no-store",
    });
  } catch (error) {
    if (timeout.aborted) throw new AssistantError("La generazione ha impiegato troppo tempo", 504);
    if (signal?.aborted) throw new AssistantError("Richiesta annullata", 499);
    throw new AssistantError(`Server di generazione non raggiungibile: ${error.message}`, 502);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok || typeof data.text !== "string") {
    const detail = data?.error ?? `HTTP ${response.status}`;
    throw new AssistantError(`Generazione fallita: ${detail}`, 502);
  }

  return {
    text: data.text,
    model: data.model ?? null,
    costUsd: data.costUsd ?? null,
    durationMs: data.durationMs ?? null,
  };
}
