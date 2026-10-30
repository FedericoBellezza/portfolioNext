const nf = (d) => new Intl.NumberFormat('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d })

export const usd = (v, d = 2) => `$${nf(d).format(v)}`
export const pct = (v, d = 1, sign = true) =>
  v === null || v === undefined ? '—' : `${sign && v > 0 ? '+' : ''}${nf(d).format(v)}%`
export const ratio = (v) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`)
export const conf = (v) => nf(2).format(v)

export const time = (s) => new Date(s).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
export const dayMonth = (s) =>
  new Date(s.length === 10 ? `${s}T12:00:00` : s).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })

export const shortDay = (d) => {
  const [, m, day] = d.split('-')
  return `${Number(day)}/${Number(m)}`
}

export function ago(s, now) {
  const min = Math.round((now - new Date(s).getTime()) / 60_000)
  if (min < 1) return 'adesso'
  if (min < 60) return `${min} min fa`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} ${h === 1 ? 'ora' : 'ore'} fa`
  const d = Math.round(h / 24)
  return `${d} ${d === 1 ? 'giorno' : 'giorni'} fa`
}

export const CATALYST = {
  earnings: 'trimestrale',
  guidance: 'guidance',
  analyst_rating: 'giudizio analisti',
  m_and_a: 'fusioni e acquisizioni',
  product: 'prodotto',
  partnership: 'accordo',
  legal_regulatory: 'legale o normativo',
  management: 'management',
  macro: 'macro',
  sector: 'settore',
  crypto_specific: 'crypto',
  other: 'altro',
}

export const PRICED_IN = { no: 'non nel prezzo', partially: 'in parte nel prezzo', yes: 'già nel prezzo' }

export const DIRECTION = {
  bullish: { label: 'rialzo' },
  bearish: { label: 'ribasso' },
  neutral: { label: 'neutra' },
}

// Stessa lista del workflow n8n "Trader AI - Comandi Dashboard": se ne aggiungi uno, aggiornali entrambi.
export const COMMANDS = ['status', 'cycle', 'evaluate', 'report', 'budget', 'check', 'digest', 'stop', 'resume']
