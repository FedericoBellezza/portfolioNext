'use client'

import { AlertTriangle, ExternalLink, Inbox, Plus, RotateCcw, SearchX } from 'lucide-react'
import { ESITO_LABEL, CANALE_LABEL } from '@/lib/leads/constants'
import { StatusChip, ScoreMeter, TagList, FollowupStamp, PendingLabel, CopyButton, Spinner } from './Bits'
import { displayName, fmtDate, followupState, isAwaitingAnalysis, safeHttpUrl } from './helpers'

export default function LeadsList({
  leads,
  total,
  loading,
  error,
  onRetry,
  today,
  activeId,
  onOpen,
  onLoadMore,
  loadingMore,
  filtersActive,
  onReset,
  onAdd,
}) {
  if (loading && leads.length === 0) return <ListSkeleton />

  if (error && leads.length === 0) {
    return (
      <div className="ld-panel flex flex-col items-center gap-3 px-6 py-14 text-center" role="alert">
        <AlertTriangle className="h-8 w-8 text-[var(--ld-danger)]" aria-hidden="true" />
        <p className="ld-display text-xl font-semibold">Non riesco a caricare i lead</p>
        <p className="max-w-md text-sm text-[var(--ld-ink-2)]">{error}</p>
        <button type="button" className="ld-btn ld-btn-primary" onClick={onRetry}>
          <RotateCcw aria-hidden="true" /> Riprova
        </button>
      </div>
    )
  }

  if (leads.length === 0) {
    return (
      <div className="ld-panel flex flex-col items-center gap-3 px-6 py-16 text-center">
        {filtersActive ? (
          <>
            <SearchX className="h-8 w-8 text-[var(--ld-ink-2)]" aria-hidden="true" />
            <p className="ld-display text-xl font-semibold">Nessun lead con questi filtri</p>
            <p className="max-w-sm text-sm text-[var(--ld-ink-2)]">
              Prova ad allargare la ricerca o a togliere qualche filtro.
            </p>
            <button type="button" className="ld-btn" onClick={onReset}>Azzera i filtri</button>
          </>
        ) : (
          <>
            <Inbox className="h-8 w-8 text-[var(--ld-ink-2)]" aria-hidden="true" />
            <p className="ld-display text-xl font-semibold">Ancora nessun lead</p>
            <p className="max-w-sm text-sm text-[var(--ld-ink-2)]">
              Il workflow n8n li aggiungerà qui, oppure incolla tu un profilo Instagram.
            </p>
            <button type="button" className="ld-btn ld-btn-primary" onClick={onAdd}>
              <Plus aria-hidden="true" /> Aggiungi lead
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-[var(--ld-danger)] bg-[var(--ld-danger-soft)] px-4 py-3 text-sm text-[var(--ld-danger)]"
        >
          <span>{error}</span>
          <button type="button" className="ld-btn ld-btn-sm" onClick={onRetry}>Riprova</button>
        </div>
      )}

      {/* desktop: tabella */}
      <div className="ld-panel hidden overflow-hidden lg:block">
        <table className="ld-table">
          <thead>
            <tr>
              <th scope="col">Lead</th>
              <th scope="col">Città</th>
              <th scope="col">Stato</th>
              <th scope="col">Punteggio</th>
              <th scope="col">Tag</th>
              <th scope="col">Esito</th>
              <th scope="col">1° contatto</th>
              <th scope="col"><span className="sr-only">Azioni</span></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, i) => (
              <Row
                key={lead.id}
                lead={lead}
                index={i}
                today={today}
                active={lead.id === activeId}
                onOpen={onOpen}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* mobile e tablet: schede */}
      <ul className="space-y-3 lg:hidden">
        {leads.map((lead, i) => (
          <li key={lead.id}>
            <Card lead={lead} index={i} today={today} onOpen={onOpen} />
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-center gap-2 pt-2">
        <p className="ld-mono text-xs text-[var(--ld-ink-2)]">
          {leads.length} di {total} lead
        </p>
        {leads.length < total && (
          <button type="button" className="ld-btn" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore && <Spinner />}
            Carica altri
          </button>
        )}
      </div>
    </div>
  )
}

function IgLink({ lead }) {
  const href = safeHttpUrl(lead.instagram_url) ?? `https://www.instagram.com/${lead.instagram_handle}/`
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="ld-mono ld-link inline-flex items-center gap-1 text-[0.8125rem]"
      aria-label={`Apri il profilo Instagram di @${lead.instagram_handle} (nuova scheda)`}
    >
      {lead.nome ? `@${lead.instagram_handle}` : 'Apri profilo'}
      <ExternalLink className="h-3 w-3 opacity-60" aria-hidden="true" />
    </a>
  )
}

function Row({ lead, index, today, active, onOpen }) {
  const fu = followupState(lead, today)
  return (
    <tr
      className={`ld-row ld-rise ${fu ? 'is-due' : ''} ${active ? 'is-active' : ''}`}
      style={{ '--i': Math.min(index, 12) }}
      onClick={() => onOpen(lead)}
    >
      <td className="max-w-[18rem]">
        <button
          type="button"
          className="block max-w-full truncate text-left font-semibold hover:text-[var(--ld-accent-ink)]"
          onClick={(e) => {
            e.stopPropagation()
            onOpen(lead)
          }}
        >
          {displayName(lead)}
        </button>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <IgLink lead={lead} />
          {lead.settore && (
            <span className="text-xs text-[var(--ld-ink-2)]">{lead.settore}</span>
          )}
          {isAwaitingAnalysis(lead) && <PendingLabel />}
          <FollowupStamp state={fu} />
        </div>
      </td>
      <td className="text-[var(--ld-ink-2)]">{lead.citta || '—'}</td>
      <td><StatusChip stato={lead.stato} /></td>
      <td><ScoreMeter value={lead.punteggio} /></td>
      <td className="max-w-[15rem]"><TagList tags={lead.tag} /></td>
      <td className="text-[var(--ld-ink-2)]">{lead.esito ? ESITO_LABEL[lead.esito] : '—'}</td>
      <td className="ld-mono whitespace-nowrap text-[0.8125rem] text-[var(--ld-ink-2)]">
        {fmtDate(lead.messaggio_inviato_il)}
      </td>
      <td className="text-right">
        <CopyButton text={lead.messaggio_proposto} label="Copia" small />
      </td>
    </tr>
  )
}

function Card({ lead, index, today, onOpen }) {
  const fu = followupState(lead, today)
  return (
    <article
      className={`ld-card ld-rise ${fu ? 'is-due' : ''}`}
      style={{ '--i': Math.min(index, 8) }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            className="block max-w-full truncate text-left text-base font-semibold"
            onClick={() => onOpen(lead)}
          >
            {displayName(lead)}
          </button>
          <IgLink lead={lead} />
        </div>
        <StatusChip stato={lead.stato} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <ScoreMeter value={lead.punteggio} />
        {lead.citta && <span className="text-[var(--ld-ink-2)]">{lead.citta}</span>}
        {lead.esito && <span className="text-[var(--ld-ink-2)]">{ESITO_LABEL[lead.esito]}</span>}
      </div>

      {lead.tag?.length > 0 && (
        <div className="mt-3"><TagList tags={lead.tag} max={3} /></div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isAwaitingAnalysis(lead) && <PendingLabel />}
        <FollowupStamp state={fu} />
        {lead.messaggio_inviato_il && (
          <span className="ld-mono text-xs text-[var(--ld-ink-2)]">
            Inviato {fmtDate(lead.messaggio_inviato_il)}
            {lead.canale_invio ? ` · ${CANALE_LABEL[lead.canale_invio]}` : ''}
          </span>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <CopyButton text={lead.messaggio_proposto} className="flex-1" />
        <button type="button" className="ld-btn flex-1" onClick={() => onOpen(lead)}>
          Dettaglio
        </button>
      </div>
    </article>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Caricamento lead">
      <div className="ld-panel hidden overflow-hidden lg:block">
        <div className="h-10 border-b border-[var(--ld-line)] bg-[var(--ld-paper-2)]" />
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex items-center gap-6 border-b border-[var(--ld-line-soft)] px-4 py-4">
            <div className="w-56 space-y-2">
              <div className="ld-skel h-4 w-40" />
              <div className="ld-skel h-3 w-24" />
            </div>
            <div className="ld-skel h-4 w-20" />
            <div className="ld-skel h-6 w-24 !rounded-full" />
            <div className="ld-skel h-4 w-24" />
            <div className="ld-skel h-5 w-32" />
            <div className="ld-skel ml-auto h-8 w-20" />
          </div>
        ))}
      </div>
      <div className="space-y-3 lg:hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="ld-card space-y-3">
            <div className="flex justify-between">
              <div className="ld-skel h-5 w-40" />
              <div className="ld-skel h-6 w-20 !rounded-full" />
            </div>
            <div className="ld-skel h-4 w-32" />
            <div className="ld-skel h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
