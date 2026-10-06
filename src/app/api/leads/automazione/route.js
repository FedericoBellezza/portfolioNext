import { protectedRoute, getAdminClient, json, fail } from '@/lib/leads/server'

export const dynamic = 'force-dynamic'

const TIMEOUT_MS = 10000
const COOLDOWN_MS = 10000

// Anti-doppio-click: vale per singola istanza del server, basta a non martellare n8n.
let lastTrigger = 0

// POST /api/leads/automazione
// Chiama il webhook n8n (URL e segreto solo in variabili d'ambiente lato server).
// Il workflow risponde subito (nodo Webhook su "Immediately"): qui si conferma solo l'avvio.
export const POST = protectedRoute(async () => {
  const url = process.env.N8N_LEADS_WEBHOOK_URL
  if (!url) return fail(500, 'Webhook dell’automazione non configurato (N8N_LEADS_WEBHOOK_URL)')

  let target
  try {
    target = new URL(url)
    if (!['http:', 'https:'].includes(target.protocol)) throw new Error()
  } catch {
    return fail(500, 'N8N_LEADS_WEBHOOK_URL non è un URL valido')
  }

  const now = Date.now()
  if (now - lastTrigger < COOLDOWN_MS) {
    return fail(429, 'Automazione appena avviata: attendi qualche secondo')
  }
  lastTrigger = now

  // Info utile al workflow: quanti lead aspettano l'analisi (lui legge comunque da Supabase).
  const { count } = await getAdminClient()
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('stato', 'nuovo')

  const headers = { 'Content-Type': 'application/json' }
  if (process.env.N8N_WEBHOOK_SECRET) {
    headers['X-Webhook-Secret'] = process.env.N8N_WEBHOOK_SECRET
  }

  let res
  try {
    res = await fetch(target, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event: 'leads.analyze',
        source: 'dashboard',
        triggered_at: new Date().toISOString(),
        pending: count ?? null,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    })
  } catch (e) {
    lastTrigger = 0 // l'avvio non è andato a buon fine: si può riprovare subito
    const timedOut = e?.name === 'TimeoutError' || e?.name === 'AbortError'
    console.error('[api/leads/automazione]', timedOut ? 'timeout' : 'non raggiungibile')
    return fail(timedOut ? 504 : 502, timedOut
      ? 'n8n non ha risposto in tempo'
      : 'n8n non è raggiungibile')
  }

  if (!res.ok) {
    lastTrigger = 0
    console.error('[api/leads/automazione] n8n status', res.status)
    return fail(
      502,
      res.status === 404
        ? 'Webhook n8n non trovato: il workflow è attivo? (i webhook “test” funzionano una sola volta)'
        : `n8n ha risposto con errore ${res.status}`
    )
  }

  return json({ ok: true, pending: count ?? null }, 202)
})
