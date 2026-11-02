import { json } from '@/lib/server/api'

// Inoltra un comando al webhook n8n "Trader AI - Comandi Dashboard", che lo esegue sul server Hetzner via SSH.
// Lo usano sia /api/trader (primo bot) sia /api/copybot (Copy Bot): stesso webhook, stessa lista bianca in n8n.
// URL e segreto restano solo lato server.
export async function forwardToTraderWebhook(command, logTag) {
  const url = process.env.N8N_TRADER_WEBHOOK_URL
  if (!url) {
    // Le pagine mostrano i dati di esempio finché il webhook non è configurato.
    return json({ ok: false, command, notConfigured: true, error: 'Webhook del trader non configurato (N8N_TRADER_WEBHOOK_URL)' }, 503)
  }

  const headers = { 'Content-Type': 'application/json' }
  if (process.env.N8N_WEBHOOK_SECRET) headers['X-Webhook-Secret'] = process.env.N8N_WEBHOOK_SECRET

  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ command }),
      signal: AbortSignal.timeout(110_000),
      cache: 'no-store',
    })
  } catch (e) {
    const timedOut = e?.name === 'TimeoutError' || e?.name === 'AbortError'
    console.error(`[${logTag}]`, timedOut ? 'timeout' : 'non raggiungibile')
    return json({ ok: false, command, error: timedOut ? 'n8n non ha risposto entro 110 secondi' : 'n8n non è raggiungibile' }, timedOut ? 504 : 502)
  }

  const text = await res.text()
  try {
    return json(JSON.parse(text), res.ok ? 200 : 502)
  } catch {
    console.error(`[${logTag}] risposta non JSON, status`, res.status)
    const error =
      res.status === 401 || res.status === 403
        ? 'n8n ha rifiutato il segreto: controlla N8N_WEBHOOK_SECRET'
        : res.status === 404
          ? 'Webhook n8n non trovato: il workflow "Trader AI - Comandi Dashboard" è attivo?'
          : `n8n ha risposto con errore ${res.status}`
    return json({ ok: false, command, error }, 502)
  }
}
