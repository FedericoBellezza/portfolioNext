import {
  protectedRoute,
  getAdminClient,
  json,
  fail,
  readJson,
} from '@/lib/leads/server'
import { parseFilters, todayRome } from '@/lib/leads/validation'
import { parseInstagramInput } from '@/lib/leads/instagram'
import { MAX_URLS_PER_REQUEST } from '@/lib/leads/constants'

export const dynamic = 'force-dynamic'

// GET /api/leads?stato=&esito=&tag=&citta=&min=&q=&followup=scaduti&sort=&dir=&offset=&limit=
export const GET = protectedRoute(async (request) => {
  const f = parseFilters(request.nextUrl.searchParams)
  const db = getAdminClient()
  const today = todayRome()

  let query = db.from('leads').select('*', { count: 'exact' })

  if (f.stato) query = query.eq('stato', f.stato)
  if (f.esito) query = query.eq('esito', f.esito)
  if (f.tag) query = query.contains('tag', [f.tag])
  if (f.citta) query = query.ilike('citta', `%${f.citta}%`)
  if (f.min) query = query.gte('punteggio', f.min)
  if (f.followup) query = query.lte('data_followup', today).neq('stato', 'scartato')
  if (f.q) {
    query = query.or(`nome.ilike.%${f.q}%,instagram_handle.ilike.%${f.q}%`)
  }

  query = query
    .order(f.sort, { ascending: f.ascending, nullsFirst: false })
    .order('created_at', { ascending: false })
    .order('id')
    .range(f.offset, f.offset + f.limit - 1)

  const { data, count, error } = await query
  if (error) throw new Error(error.message)

  return json({ leads: data ?? [], total: count ?? 0, today })
})

// POST /api/leads  { input: "url1\nurl2", extra?: { nome, citta, settore, sito_url } }
export const POST = protectedRoute(async (request) => {
  const body = await readJson(request)
  if (!body || typeof body.input !== 'string') return fail(400, 'Richiesta non valida')
  if (body.input.length > 20000) return fail(400, 'Testo troppo lungo')

  const { handles, invalid } = parseInstagramInput(body.input)

  if (handles.length === 0 && invalid.length === 0) {
    return fail(422, 'Incolla almeno un link Instagram o un @handle.')
  }
  if (handles.length > MAX_URLS_PER_REQUEST) {
    return fail(422, `Troppi profili in una volta (max ${MAX_URLS_PER_REQUEST}).`)
  }
  // Solo voci non valide: nessuna scrittura, si restituisce il dettaglio per correggerle.
  if (handles.length === 0) {
    return json({ created: [], existing: [], invalid })
  }

  const db = getAdminClient()

  // Handle già presenti (confronto senza distinguere maiuscole).
  const orFilter = handles.map((h) => `instagram_handle.ilike.${h}`).join(',')
  const { data: found, error: findError } = await db
    .from('leads')
    .select('*')
    .or(orFilter)
  if (findError) throw new Error(findError.message)

  const wanted = new Set(handles)
  const existing = (found ?? []).filter((l) => wanted.has(l.instagram_handle.toLowerCase()))
  const existingHandles = new Set(existing.map((l) => l.instagram_handle.toLowerCase()))

  const toInsert = handles
    .filter((h) => !existingHandles.has(h))
    // Solo l'handle: stato usa il default del database, instagram_url è generata.
    .map((h) => ({ instagram_handle: h }))

  let created = []
  if (toInsert.length) {
    // ignoreDuplicates: se un altro inserimento ci anticipa, il duplicato viene saltato.
    const { data: inserted, error: insError } = await db
      .from('leads')
      .upsert(toInsert, { onConflict: 'instagram_handle', ignoreDuplicates: true })
      .select('*')
    if (insError) throw new Error(insError.message)
    created = inserted ?? []

    // Eventuali handle saltati per concorrenza vanno riportati come esistenti.
    const createdHandles = new Set(created.map((l) => l.instagram_handle))
    const skipped = toInsert.map((r) => r.instagram_handle).filter((h) => !createdHandles.has(h))
    if (skipped.length) {
      const { data: late } = await db.from('leads').select('*').in('instagram_handle', skipped)
      existing.push(...(late ?? []))
    }
  }

  return json({ created, existing, invalid }, created.length ? 201 : 200)
})
