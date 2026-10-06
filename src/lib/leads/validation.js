// Validazione lato server di filtri e payload. Solo i campi in EDITABLE sono scrivibili.

import {
  STATI,
  ESITI,
  CANALI,
  TAGS,
  SORT_FIELDS,
  PAGE_SIZE,
} from './constants'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v)

function isValidDate(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

function toIsoTimestamp(v) {
  if (typeof v !== 'string' || !v.trim()) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  const year = d.getUTCFullYear()
  if (year < 2000 || year > 2100) return null
  return d.toISOString()
}

/** Data odierna (YYYY-MM-DD) nel fuso di Roma: Ã¨ il riferimento per i follow-up. */
export function todayRome() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date())
}

// ---------- filtri della lista ----------

/** Ripulisce il testo di ricerca dai caratteri che rompono la sintassi di .or() di PostgREST. */
function cleanSearch(s) {
  return String(s ?? '')
    .replace(/^@/, '')
    .replace(/[^\p{L}\p{N} ._-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
}

/** @param {URLSearchParams} sp */
export function parseFilters(sp) {
  const stato = sp.get('stato')
  const esito = sp.get('esito')
  const tag = sp.get('tag')
  const sort = sp.get('sort')
  const dir = sp.get('dir')
  const min = Number.parseInt(sp.get('min') ?? '', 10)
  const offset = Number.parseInt(sp.get('offset') ?? '', 10)
  const limit = Number.parseInt(sp.get('limit') ?? '', 10)

  return {
    stato: STATI.includes(stato) ? stato : null,
    esito: ESITI.includes(esito) ? esito : null,
    tag: TAGS.includes(tag) ? tag : null,
    citta: cleanSearch(sp.get('citta')) || null,
    q: cleanSearch(sp.get('q')) || null,
    min: Number.isInteger(min) && min >= 1 && min <= 10 ? min : null,
    followup: sp.get('followup') === 'scaduti',
    sort: SORT_FIELDS.includes(sort) ? sort : 'created_at',
    ascending: dir === 'asc',
    offset: Number.isInteger(offset) && offset >= 0 ? Math.min(offset, 100000) : 0,
    limit: Number.isInteger(limit) && limit >= 1 ? Math.min(limit, 100) : PAGE_SIZE,
  }
}

// ---------- aggiornamento di un lead ----------

const MAX_MESSAGE = 5000
const MAX_NOTE = 5000

/**
 * Valida un PATCH. Accetta solo i campi previsti; stringa vuota / null svuotano
 * i campi facoltativi.
 * @param {unknown} body
 * @returns {{ok: true, data: Record<string, unknown>} | {ok: false, error: string}}
 */
export function validatePatch(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Richiesta non valida' }
  }

  const data = {}
  const empty = (v) => v === null || (typeof v === 'string' && v.trim() === '')

  for (const [key, value] of Object.entries(body)) {
    switch (key) {
      case 'messaggio_proposto':
        if (empty(value)) data[key] = null
        else if (typeof value !== 'string') return bad(key)
        else if (value.length > MAX_MESSAGE) return { ok: false, error: `Messaggio troppo lungo (max ${MAX_MESSAGE} caratteri)` }
        else data[key] = value
        break

      case 'note':
        if (empty(value)) data[key] = null
        else if (typeof value !== 'string') return bad(key)
        else if (value.length > MAX_NOTE) return { ok: false, error: `Note troppo lunghe (max ${MAX_NOTE} caratteri)` }
        else data[key] = value
        break

      case 'stato':
        // Obbligatorio nel database: non si puÃ² svuotare.
        if (!STATI.includes(value)) return bad(key)
        data[key] = value
        break

      case 'esito':
        if (empty(value)) data[key] = null
        else if (!ESITI.includes(value)) return bad(key)
        else data[key] = value
        break

      case 'canale_invio':
        if (empty(value)) data[key] = null
        else if (!CANALI.includes(value)) return bad(key)
        else data[key] = value
        break

      case 'data_followup':
        if (empty(value)) data[key] = null
        else if (!isValidDate(value)) return bad(key)
        else data[key] = value
        break

      case 'messaggio_inviato_il':
      case 'risposto_il': {
        if (empty(value)) {
          data[key] = null
        } else {
          const iso = toIsoTimestamp(value)
          if (!iso) return bad(key)
          data[key] = iso
        }
        break
      }

      default:
        return { ok: false, error: `Campo non modificabile: ${key}` }
    }
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, error: 'Nessun campo da aggiornare' }
  }
  return { ok: true, data }
}

function bad(key) {
  return { ok: false, error: `Valore non valido per "${key}"` }
}
