// SOLO SERVER. Importare questo file esclusivamente da route handler / server component:
// legge SUPABASE_SERVICE_ROLE_KEY, che non deve mai arrivare nel bundle del browser.

import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createSessionClient } from '@/lib/supabase/server'

// Stesso default usato dal middleware per proteggere /dashboard.
const OWNER_EMAIL = () =>
  (process.env.OWNER_EMAIL || 'federico.bellezza.dev@gmail.com').toLowerCase()

class ConfigError extends Error {}

let adminClient

/**
 * Client service-role: bypassa RLS, quindi va usato solo dopo la verifica in protectedRoute().
 * Stesso progetto Supabase del login (NEXT_PUBLIC_SUPABASE_URL): l'URL è pubblico, la chiave no.
 */
export function getAdminClient() {
  if (adminClient) return adminClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new ConfigError('Variabili NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY mancanti')
  adminClient = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  return adminClient
}

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
 */
export function protectedRoute(handler) {
  return async function route(request, ctx) {
    try {
      // Difesa in profondità oltre al cookie SameSite=Lax: le scritture
      // devono arrivare dalla stessa origine ed essere JSON.
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
      console.error('[api/leads]', e instanceof Error ? e.message : 'errore sconosciuto')
      if (e instanceof ConfigError) {
        return fail(500, 'Configurazione del server incompleta')
      }
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
