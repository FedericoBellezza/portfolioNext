'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, AlarmClock } from 'lucide-react'
import toast from 'react-hot-toast'
import { STATO_LABEL, TAG_LABEL } from '@/lib/leads/constants'
import { copyToClipboard } from './helpers'

export function StatusChip({ stato }) {
  return (
    <span className={`ld-chip ld-st-${stato}`}>{STATO_LABEL[stato] ?? stato}</span>
  )
}

export function ScoreMeter({ value }) {
  if (value == null) return <span className="ld-mono text-[var(--ld-ink-2)]">—</span>
  return (
    <span
      className="inline-flex items-center gap-2"
      role="img"
      aria-label={`Punteggio ${value} su 10`}
    >
      <span className="ld-score" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} className={i < value ? 'on' : ''} />
        ))}
      </span>
      <span className="ld-mono text-sm font-semibold">{value}</span>
    </span>
  )
}

export function TagList({ tags, max = 2 }) {
  if (!tags?.length) return <span className="text-[var(--ld-ink-2)]">—</span>
  const shown = tags.slice(0, max)
  const rest = tags.length - shown.length
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((t) => (
        <span key={t} className="ld-tag">{TAG_LABEL[t] ?? t}</span>
      ))}
      {rest > 0 && (
        <span
          className="ld-tag"
          title={tags.slice(max).map((t) => TAG_LABEL[t] ?? t).join(', ')}
        >
          +{rest}
        </span>
      )}
    </span>
  )
}

/** Lead con solo l'handle: il workflow non l'ha ancora analizzato. */
export function PendingLabel() {
  return (
    <span className="ld-pending">
      <span className="ld-pending-dot" aria-hidden="true" />
      In attesa di analisi
    </span>
  )
}

export function FollowupStamp({ state }) {
  if (!state) return null
  const late = state.kind === 'scaduto'
  return (
    <span className={`ld-stamp ${late ? 'is-late' : ''}`}>
      <AlarmClock className="h-3 w-3" aria-hidden="true" />
      {late ? `Follow-up scaduto · ${state.days} g` : 'Follow-up oggi'}
    </span>
  )
}

/**
 * Copia `text` negli appunti e conferma sia sul bottone sia con un toast.
 * `getText` permette di copiare un testo non ancora salvato (bozza nel dettaglio).
 */
export function CopyButton({ text, getText, label = 'Copia messaggio', small = false, className = '' }) {
  const [done, setDone] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const value = getText ? getText() : text
  const empty = !value || !String(value).trim()

  const onClick = async (e) => {
    e.stopPropagation()
    const content = getText ? getText() : text
    if (!content || !String(content).trim()) {
      toast.error('Nessun messaggio da copiare')
      return
    }
    const ok = await copyToClipboard(content)
    if (ok) {
      toast.success('Messaggio copiato negli appunti')
      setDone(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setDone(false), 1800)
    } else {
      toast.error('Copia non riuscita: seleziona il testo e copialo a mano')
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={empty}
      title={empty ? 'Nessun messaggio proposto' : label}
      className={`ld-btn ${small ? 'ld-btn-sm' : ''} ${done ? 'is-done' : ''} ${className}`}
    >
      {done ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      <span aria-live="polite">{done ? 'Copiato' : label}</span>
    </button>
  )
}

export function Spinner({ className = '' }) {
  return (
    <svg
      className={`ld-spin h-4 w-4 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.55" />
    </svg>
  )
}
