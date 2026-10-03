// Helper puri lato client: formattazione, link sicuri, appunti, chiamate API.

import { PAGE_SIZE } from '@/lib/leads/constants'

const dateFmt = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** 'YYYY-MM-DD' → Date locale (senza slittamenti di fuso). */
function parseDateOnly(s) {
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function fmtDate(value) {
  if (!value) return '—'
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseDateOnly(value) : new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d)
}

export function fmtDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : dateTimeFmt.format(d)
}

/** ISO → valore per <input type="datetime-local"> (ora locale). */
export function isoToLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Valore di <input type="datetime-local"> → ISO UTC (o '' se vuoto). */
export function localInputToIso(v) {
  if (!v) return ''
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

/**
 * Stato del follow-up rispetto a `today` (YYYY-MM-DD, fuso di Roma, dato dal server).
 * @returns {null | {kind: 'oggi' | 'scaduto', days: number}}
 */
export function followupState(lead, today) {
  if (!lead.data_followup || !today || lead.stato === 'scartato') return null
  if (lead.data_followup > today) return null
  if (lead.data_followup === today) return { kind: 'oggi', days: 0 }
  const days = Math.round(
    (parseDateOnly(today).getTime() - parseDateOnly(lead.data_followup).getTime()) / 86400000
  )
  return { kind: 'scaduto', days }
}

/** Accetta solo http(s): i valori vengono dal database e non devono diventare `javascript:`. */
export function safeHttpUrl(value) {
  if (!value) return null
  try {
    const raw = String(value).trim()
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}

/** Lead appena aggiunto: solo handle, il workflow n8n non l'ha ancora analizzato. */
export function isAwaitingAnalysis(lead) {
  return lead.stato === 'nuovo' && !lead.nome?.trim() && !lead.analizzato_il
}

export function displayName(lead) {
  return lead.nome?.trim() || `@${lead.instagram_handle}`
}

/** navigator.clipboard con fallback a execCommand (HTTP, iframe, browser datati). */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // passa al fallback
  }
  const previous = document.activeElement
  let ta
  try {
    ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-1000px'
    ta.style.opacity = '0'
    // Dentro un dialog modale (drawer) il focus trap di Radix toglie il focus a qualsiasi
    // elemento esterno, e senza focus select() non lascia nulla da copiare: si monta lì dentro.
    const host = previous?.closest?.('[role="dialog"]') ?? document.body
    host.appendChild(ta)
    ta.focus()
    ta.select()
    ta.setSelectionRange(0, text.length)
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    ta?.remove()
    previous?.focus?.()
  }
}

// ---------- API ----------

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

/** fetch JSON verso /api/leads. Su 401 rimanda al login. */
export async function api(path, { method = 'GET', body, signal } = {}) {
  let res
  try {
    res = await fetch(`/api/leads${path}`, {
      method,
      signal,
      cache: 'no-store',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    if (e?.name === 'AbortError') throw e
    throw new ApiError('Connessione assente o server non raggiungibile', 0)
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    // risposta non JSON
  }

  if (res.status === 401) {
    window.location.href = '/login'
    throw new ApiError('Sessione scaduta', 401)
  }
  if (!res.ok) {
    throw new ApiError(data?.error || `Errore ${res.status}`, res.status)
  }
  return data
}

export function buildListQuery(filters, offset = 0) {
  const p = new URLSearchParams()
  if (filters.q.trim()) p.set('q', filters.q.trim())
  if (filters.stato) p.set('stato', filters.stato)
  if (filters.esito) p.set('esito', filters.esito)
  if (filters.tag) p.set('tag', filters.tag)
  if (filters.citta.trim()) p.set('citta', filters.citta.trim())
  if (filters.min) p.set('min', filters.min)
  if (filters.followup) p.set('followup', 'scaduti')
  p.set('sort', filters.sort)
  p.set('dir', filters.dir)
  p.set('offset', String(offset))
  p.set('limit', String(PAGE_SIZE))
  return `?${p.toString()}`
}

export const EMPTY_FILTERS = {
  q: '',
  stato: '',
  esito: '',
  tag: '',
  citta: '',
  min: '',
  followup: false,
  sort: 'created_at',
  dir: 'desc',
}

export function hasActiveFilters(f) {
  return Boolean(f.q || f.stato || f.esito || f.tag || f.citta || f.min || f.followup)
}
