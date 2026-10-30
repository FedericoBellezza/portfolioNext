// SOLO SERVER. Helper comuni per i route handler della dashboard privata
// (in origine in lib/leads/server.js, spostati qui quando la sezione lead è stata rimossa).

import { NextResponse } from 'next/server'
import { createClient as createSessionClient } from '@/lib/supabase/server'

// Stesso default usato dal middleware per proteggere /dashboard.
const OWNER_EMAIL = () =>
  (process.env.OWNER_EMAIL || 'federico.bellezza.dev@gmail.com').toLowerCase()

export function json(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export const fail = (status, error) => json({ error }, status)

/**
 * La richiesta arriva dal nostro stesso sito? Si confronta l'host dell'Origin con quello
 * della richiesta (Host / X-Forwarded-Host), non con nextUrl.origin, che dietro proxy o
 * aprendo il sito da 127.0.0.1 / IP di rete può differire da ciò che vede il browser.
 */
function isSameOrigin(request) {
  const site = request.headers.get('sec-fetch-site')
  if (site === 'same-origin' || site === 'none') return true

  const origin = request.headers.get('origin')
  if (!origin) return site == null // niente Origin né Sec-Fetch-Site: client non-browser
  let originHost
  try {
    originHost = new URL(origin).host
  } catch {
    return false
  }
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  return Boolean(host) && originHost === host.split(',')[0].trim()
}

/**
 * Wrapper per i route handler: verifica sessione + owner (401/403), protezione
 * CSRF sulle scritture e risposta 500 generica (niente dettagli interni al client).
 * Il middleware protegge solo le pagine /dashboard, non le /api: serve questo controllo.
 */
export function protectedRoute(handler) {
  return async function route(request, ctx) {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) {
        if (!isSameOrigin(request)) {
          return fail(403, 'Origine non consentita')
        }
        const hasBody = request.method !== 'DELETE'
        if (hasBody && !(request.headers.get('content-type') || '').includes('application/json')) {
          return fail(415, 'Content-Type non supportato')
        }
      }

      const supabase = await createSessionClient()
      const { data, error } = await supabase.auth.getUser()
      if (error || !data?.user) return fail(401, 'Non autenticato')
      if ((data.user.email || '').toLowerCase() !== OWNER_EMAIL()) {
        return fail(403, 'Non autorizzato')
      }

      return await handler(request, ctx)
    } catch (e) {
      // Si logga solo il messaggio: mai request, header o chiavi.
      console.error('[api]', e instanceof Error ? e.message : 'errore sconosciuto')
      return fail(500, 'Errore interno del server')
    }
  }
}

/** Legge il body JSON; null se assente o malformato. */
export async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}
