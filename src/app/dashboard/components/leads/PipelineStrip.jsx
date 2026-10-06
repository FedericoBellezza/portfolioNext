'use client'

import { STATI, STATO_LABEL } from '@/lib/leads/constants'

const DOT = {
  nuovo: '#4a6a8a',
  da_rivedere: '#c08a1f',
  contattato: '#c4735b',
  risposto: '#4b8a62',
  scartato: '#9a948d',
  errore_analisi: '#b3392f',
}

/** Contatori per stato: ogni cella è anche un filtro. */
export default function PipelineStrip({ stats, statoFilter, followupActive, onStato, onFollowup, onAll }) {
  const total = stats?.total ?? 0
  const noFilter = !statoFilter && !followupActive

  return (
    <section aria-label="Contatori per stato" className="ld-panel overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 [&>*]:border-[var(--ld-line-soft)] max-xl:[&>*]:border-b xl:[&>*:not(:first-child)]:border-l">
        <Tile
          label="Tutti"
          value={stats?.total}
          pressed={noFilter}
          onClick={onAll}
          dot="#2d2d2d"
        />
        {STATI.map((s) => (
          <Tile
            key={s}
            label={s === 'errore_analisi' ? 'Errori' : STATO_LABEL[s]}
            hint={s === 'errore_analisi' ? 'analisi fallita' : undefined}
            value={stats?.stati?.[s]}
            pressed={statoFilter === s && !followupActive}
            onClick={() => onStato(s)}
            dot={DOT[s]}
          />
        ))}
        <Tile
          label="Follow-up"
          hint="scaduti o di oggi"
          value={stats?.followup}
          pressed={followupActive}
          onClick={onFollowup}
          dot="#b3392f"
          alert={(stats?.followup ?? 0) > 0}
        />
      </div>

      {/* barra proporzionale: la distribuzione della pipeline a colpo d'occhio */}
      <div
        className="flex h-1.5 w-full bg-[var(--ld-line-soft)]"
        role="img"
        aria-label="Distribuzione dei lead per stato"
      >
        {stats && total > 0 &&
          STATI.map((s) => {
            const n = stats.stati[s] ?? 0
            if (!n) return null
            return (
              <span
                key={s}
                title={`${STATO_LABEL[s]}: ${n}`}
                style={{ width: `${(n / total) * 100}%`, background: DOT[s] }}
              />
            )
          })}
      </div>
    </section>
  )
}

function Tile({ label, hint, value, pressed, onClick, dot, alert = false }) {
  return (
    <button
      type="button"
      className="ld-tile"
      aria-pressed={pressed}
      onClick={onClick}
      style={{ '--tile-dot': dot }}
    >
      <span className="ld-eyebrow flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: dot }}
        />
        {label}
      </span>
      {value == null ? (
        <span className="ld-skel mt-1 inline-block h-8 w-10" aria-label="Caricamento" />
      ) : (
        <span
          className={`ld-display text-[2rem] font-semibold leading-none ${
            alert ? 'text-[var(--ld-danger)]' : 'text-[var(--ld-ink)]'
          }`}
        >
          {value}
        </span>
      )}
      {hint && <span className="text-[0.6875rem] text-[var(--ld-ink-2)]">{hint}</span>}
    </button>
  )
}
