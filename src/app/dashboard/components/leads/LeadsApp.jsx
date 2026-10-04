'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { Play, Plus, RefreshCw, RotateCcw, Undo2 } from 'lucide-react'
import './leads.css'
import { fraunces } from './fonts'
import PipelineStrip from './PipelineStrip'
import FiltersBar from './FiltersBar'
import LeadsList from './LeadsList'
import LeadDrawer from './LeadDrawer'
import AddLeadDialog from './AddLeadDialog'
import { Spinner } from './Bits'
import { api, buildListQuery, EMPTY_FILTERS, hasActiveFilters } from './helpers'

const TEXT_KEYS = ['q', 'citta']

export default function LeadsApp() {
  // il portal di drawer e dialog deve stare dentro .ld per ereditare palette e font
  const [container, setContainer] = useState(null)

  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState(EMPTY_FILTERS) // filters, con debounce sui campi di testo

  const [leads, setLeads] = useState([])
  const [total, setTotal] = useState(0)
  const [today, setToday] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState(false)

  const [selected, setSelected] = useState(null)
  const [addOpen, setAddOpen] = useState(false)

  const [running, setRunning] = useState(false) // chiamata al webhook in corso
  const [retrying, setRetrying] = useState(false) // reset dei lead falliti in corso
  const [reviving, setReviving] = useState(false) // riattivazione dei lead scartati in corso
  const [watching, setWatching] = useState(false) // dopo l'avvio: aggiornamento periodico
  const quietReload = useRef(false) // ricarica senza sfarfallio della lista

  // ---- debounce: i campi di testo aspettano, i select applicano subito
  useEffect(() => {
    const textChanged = TEXT_KEYS.some((k) => filters[k] !== applied[k])
    const t = setTimeout(() => setApplied(filters), textChanged ? 300 : 0)
    return () => clearTimeout(t)
  }, [filters]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- lista
  useEffect(() => {
    const ctrl = new AbortController()
    const quiet = quietReload.current
    quietReload.current = false
    if (!quiet) {
      setLoading(true)
      setError(null)
    }
    api(buildListQuery(applied), { signal: ctrl.signal })
      .then((d) => {
        setLeads(d.leads)
        setTotal(d.total)
        setToday(d.today)
      })
      .catch((e) => {
        if (e?.name === 'AbortError' || quiet) return
        setLeads([])
        setTotal(0)
        setError(e.message)
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false)
      })
    return () => ctrl.abort()
  }, [applied, reloadKey])

  // ---- contatori
  const loadStats = useCallback(async () => {
    try {
      const s = await api('/stats')
      setStats(s)
      setToday(s.today)
      setStatsError(false)
    } catch (e) {
      if (e?.name !== 'AbortError') setStatsError(true)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const reloadAll = () => {
    setReloadKey((k) => k + 1)
    loadStats()
  }

  // ---- automazione n8n
  const runAutomation = async () => {
    if (running) return
    setRunning(true)
    try {
      await api('/automazione', { method: 'POST', body: {} })
      toast.success('Automazione avviata')
      setWatching(true)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setRunning(false)
    }
  }

  // ---- lead con analisi fallita → di nuovo "nuovo"
  const retryFailed = async () => {
    if (retrying) return
    setRetrying(true)
    try {
      const { updated } = await api('/riprova-falliti', { method: 'POST', body: {} })
      toast.success(updated === 1 ? '1 lead riportato a Nuovo' : `${updated} lead riportati a Nuovo`)
      reloadAll()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setRetrying(false)
    }
  }

  // ---- lead scartati → di nuovo "nuovo"
  const reviveDiscarded = async () => {
    if (reviving) return
    const n = stats?.stati?.scartato ?? 0
    if (!window.confirm(`Riportare a Nuovo ${n === 1 ? '1 lead scartato' : `${n} lead scartati`}?`)) return
    setReviving(true)
    try {
      const { updated } = await api('/riattiva-scartati', { method: 'POST', body: {} })
      toast.success(updated === 1 ? '1 lead riportato a Nuovo' : `${updated} lead riportati a Nuovo`)
      reloadAll()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setReviving(false)
    }
  }

  // Dopo l'avvio la lista si aggiorna da sola ogni 8 s (max 10 volte) per vedere arrivare i risultati.
  useEffect(() => {
    if (!watching) return
    let n = 0
    const t = setInterval(() => {
      n += 1
      quietReload.current = true
      setReloadKey((k) => k + 1)
      loadStats()
      if (n >= 10) setWatching(false)
    }, 8000)
    return () => clearInterval(t)
  }, [watching, loadStats])

  const loadMore = async () => {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      const d = await api(buildListQuery(applied, leads.length))
      setLeads((prev) => {
        const seen = new Set(prev.map((l) => l.id))
        return [...prev, ...d.leads.filter((l) => !seen.has(l.id))]
      })
      setTotal(d.total)
    } catch (e) {
      if (e?.name !== 'AbortError') setError(e.message)
    } finally {
      setLoadingMore(false)
    }
  }

  // ---- mutazioni
  const handleSaved = (updated) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
    setSelected((cur) => (cur && cur.id === updated.id ? updated : cur))
    loadStats()
  }

  const handleDeleted = (id) => {
    setLeads((prev) => prev.filter((l) => l.id !== id))
    setTotal((t) => Math.max(0, t - 1))
    setSelected(null)
    loadStats()
  }

  const handleAdded = (created) => {
    if (created.length) reloadAll()
  }

  const navigate = (delta) => {
    const i = leads.findIndex((l) => l.id === selected?.id)
    const next = leads[i + delta]
    if (i >= 0 && next) setSelected(next)
  }
  const selIndex = selected ? leads.findIndex((l) => l.id === selected.id) : -1

  // ---- filtri
  const filtersActive = hasActiveFilters(filters)
  const resetFilters = () => setFilters({ ...EMPTY_FILTERS, sort: filters.sort, dir: filters.dir })

  return (
    <div ref={setContainer} className={`ld ${fraunces.variable} space-y-5`}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="ld-eyebrow mb-1.5">Lead commerciali</p>
          <h1 className="ld-display text-[2.5rem] font-semibold leading-none text-[var(--ld-ink)] sm:text-5xl">
            Registro lead
          </h1>
          <p className="mt-2 max-w-xl text-[var(--ld-ink-2)]">
            Leggi l’analisi, copia il messaggio, invialo a mano e tieni traccia di contatti ed esiti.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="ld-btn ld-btn-icon"
            onClick={reloadAll}
            aria-label="Aggiorna elenco"
            title="Aggiorna"
            disabled={loading}
          >
            {loading ? <Spinner /> : <RefreshCw aria-hidden="true" />}
          </button>
          {stats?.stati?.errore_analisi > 0 && (
            <button
              type="button"
              className="ld-btn flex-1 sm:flex-none"
              onClick={retryFailed}
              disabled={retrying}
              title="Riporta in stato Nuovo tutti i lead con analisi fallita"
            >
              {retrying ? <Spinner /> : <RotateCcw aria-hidden="true" />}
              {retrying ? 'Ripristino…' : 'Riprova falliti'}
              {!retrying && (
                <span className="ld-mono rounded-full bg-[var(--ld-accent-soft)] px-1.5 text-xs text-[var(--ld-accent-ink)]">
                  {stats.stati.errore_analisi}
                </span>
              )}
            </button>
          )}
          {stats?.stati?.scartato > 0 && (
            <button
              type="button"
              className="ld-btn flex-1 sm:flex-none"
              onClick={reviveDiscarded}
              disabled={reviving}
              title="Riporta in stato Nuovo tutti i lead scartati"
            >
              {reviving ? <Spinner /> : <Undo2 aria-hidden="true" />}
              {reviving ? 'Ripristino…' : 'Riattiva scartati'}
              {!reviving && (
                <span className="ld-mono rounded-full bg-[var(--ld-accent-soft)] px-1.5 text-xs text-[var(--ld-accent-ink)]">
                  {stats.stati.scartato}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            className="ld-btn flex-1 sm:flex-none"
            onClick={runAutomation}
            disabled={running}
            title="Avvia il workflow n8n che analizza i lead in stato Nuovo"
          >
            {running ? <Spinner /> : <Play aria-hidden="true" />}
            {running ? 'Avvio…' : 'Avvia analisi'}
            {stats?.stati?.nuovo > 0 && !running && (
              <span className="ld-mono rounded-full bg-[var(--ld-accent-soft)] px-1.5 text-xs text-[var(--ld-accent-ink)]">
                {stats.stati.nuovo}
              </span>
            )}
          </button>
          <button type="button" className="ld-btn ld-btn-primary flex-1 sm:flex-none" onClick={() => setAddOpen(true)}>
            <Plus aria-hidden="true" />
            Aggiungi lead
          </button>
        </div>
      </header>

      {watching && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-[var(--ld-line)] bg-[var(--ld-paper)] px-4 py-2.5 text-sm text-[var(--ld-ink-2)]"
        >
          <Spinner className="text-[var(--ld-accent)]" />
          Analisi in corso: la lista si aggiorna da sola ogni 8 secondi.
          <button type="button" className="ld-link ml-auto shrink-0" onClick={() => setWatching(false)}>
            Smetti
          </button>
        </p>
      )}

      {statsError && (
        <p role="alert" className="text-sm text-[var(--ld-danger)]">
          Contatori non disponibili al momento.{' '}
          <button type="button" className="ld-link" onClick={loadStats}>Riprova</button>
        </p>
      )}

      <PipelineStrip
        stats={statsError ? { total: 0, stati: {}, followup: 0 } : stats}
        statoFilter={filters.stato}
        followupActive={filters.followup}
        onAll={() => setFilters({ ...filters, stato: '', followup: false })}
        onStato={(s) =>
          setFilters({ ...filters, stato: filters.stato === s ? '' : s, followup: false })
        }
        onFollowup={() =>
          setFilters({ ...filters, followup: !filters.followup, stato: '' })
        }
      />

      <FiltersBar filters={filters} onChange={setFilters} onReset={resetFilters} container={container} />

      <div className={loading && leads.length > 0 ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={loading}>
        <LeadsList
          leads={leads}
          total={total}
          loading={loading}
          error={error}
          onRetry={reloadAll}
          today={today}
          activeId={selected?.id}
          onOpen={setSelected}
          onLoadMore={loadMore}
          loadingMore={loadingMore}
          filtersActive={filtersActive}
          onReset={resetFilters}
          onAdd={() => setAddOpen(true)}
        />
      </div>

      <LeadDrawer
        lead={selected}
        today={today}
        container={container}
        onClose={() => setSelected(null)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
        onNavigate={navigate}
        hasPrev={selIndex > 0}
        hasNext={selIndex >= 0 && selIndex < leads.length - 1}
      />

      <AddLeadDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        container={container}
        onAdded={handleAdded}
        onOpenLead={setSelected}
      />

      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 2800,
          style: {
            background: '#2d2d2d',
            color: '#fffdf9',
            borderRadius: '10px',
            fontSize: '0.875rem',
          },
        }}
      />
    </div>
  )
}
