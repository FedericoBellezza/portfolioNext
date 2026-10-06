import { AssistantError } from "./auth";

// Unico punto in cui il testo viene generato. Oggi: webhook n8n -> SSH -> `claude -p` sul server
// (abbonamento, nessuna API Anthropic). Per passare ad altro basta riscrivere questa funzione:
// riceve { system, prompt } e restituisce { text, model, costUsd, durationMs }.

// Sotto il maxDuration delle route, così l'errore è nostro e pulito invece di un timeout della piattaforma.
const DEFAULT_TIMEOUT_MS = 55000;

export async function generate({ system, prompt, signal }) {
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
      body: JSON.stringify({ system, prompt }),
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
