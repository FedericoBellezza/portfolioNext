'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Check, Minus, Play, Power, RefreshCw, TriangleAlert, X } from 'lucide-react'

import { fraunces } from '../components/fonts'
import { BarChart, LineChart } from './charts'
import { demoStatus } from './demo'
import { ago, CATALYST, conf, dayMonth, DIRECTION, pct, PRICED_IN, ratio, shortDay, time, usd } from './format'
import './trader.css'

const LABELS = {
  status: 'Aggiorna',
  cycle: 'Esegui un ciclo',
  evaluate: 'Valuta le previsioni scadute',
  check: 'Controlla i collegamenti',
  report: 'Genera il report',
  digest: 'Invia il riepilogo su Telegram',
  budget: 'Dettaglio spesa',
  stop: 'Ferma il bot',
  resume: 'Riattiva il bot',
}

const C = {
  ink2: 'text-[var(--tr-ink-2)]',
  rule: 'border-[var(--tr-rule)]',
  surface: 'bg-[var(--tr-surface)]',
}

// Colonne condivise dalle due righe del layout desktop, così restano allineate.
const COLUMNS = 'grid grid-cols-1 gap-x-14 lg:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]'

async function send(command) {
  try {
    const res = await fetch('/api/trader', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    })
    const data = await res.json().catch(() => ({}))
    // Gli errori di protectedRoute (401/403/500) arrivano come { error }.
    return { ok: false, command, ...data }
  } catch {
    return { ok: false, command, error: 'Il sito non riesce a contattare il proprio server.' }
  }
}

export default function TraderApp() {
  const [status, setStatus] = useState(null)
  const [demo, setDemo] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [busy, setBusy] = useState(null)
  const [output, setOutput] = useState(null)
  const [waitingCycle, setWaitingCycle] = useState(null)
  const lastCycleRef = useRef(undefined)

  const refresh = useCallback(async () => {
    const r = await send('status')
    if (r.ok && r.data) {
      setStatus(r.data)
      setDemo(false)
      setLoadError(null)
      lastCycleRef.current = r.data.last_cycle?.started_at
    } else if (r.notConfigured) {
      setStatus(demoStatus())
      setDemo(true)
      setLoadError(null)
    } else {
      setLoadError(r.error ?? 'Stato non disponibile.')
    }
    return r
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, 60_000)
    return () => clearInterval(id)
  }, [refresh])

  // Dopo "Esegui un ciclo": ricontrolla ogni 8 secondi finché il nuovo ciclo non è finito (max 5 minuti).
  useEffect(() => {
    if (!waitingCycle) return
    const started = Date.now()
    const id = setInterval(async () => {
      const r = await refresh()
      const lc = r.data?.last_cycle
      const done = lc && lc.started_at !== waitingCycle && lc.finished_at
      if (done || Date.now() - started > 300_000) {
        setWaitingCycle(null)
        if (done) {
          setOutput({
            command: 'cycle',
            at: new Date().toISOString(),
            ok: lc.ok,
            text: lc.error
              ? `Ciclo fallito: ${lc.error}`
              : `Ciclo finito: ${lc.news} notizie, ${lc.relevant} rilevanti, ${lc.predictions} previsioni, ${lc.evaluated} valutate.` +
                (lc.paused ? `\nAI in pausa: ${lc.paused}` : ''),
          })
        }
      }
    }, 8_000)
    return () => clearInterval(id)
  }, [waitingCycle, refresh])

  async function run(command) {
    if (command === 'stop' && !window.confirm('Fermare il bot? I prossimi cicli verranno saltati finché non lo riattivi.')) return
    if (demo && command !== 'status') {
      setOutput({ command, at: new Date().toISOString(), ok: false, text: 'Dati di esempio: collega il webhook n8n per usare i comandi.' })
      return
    }
    setBusy(command)
    const r = command === 'status' ? await refresh() : await send(command)
    setBusy(null)
    if (command === 'status') return
    const text = r.ok
      ? command === 'cycle'
        ? 'Ciclo avviato sul server. Il risultato compare qui appena finisce (di solito 1-3 minuti).'
        : (r.stdout || 'Fatto.').trim()
      : [r.error, r.stderr].filter(Boolean).join('\n\n')
    setOutput({ command, at: new Date().toISOString(), ok: r.ok, text })
    if (r.ok && command === 'cycle') setWaitingCycle(lastCycleRef.current ?? 'none')
    if (r.ok && command !== 'cycle') refresh()
  }

  if (!status) {
    return (
      <div className={`tr ${fraunces.variable}`}>
        {loadError ? (
          <div className="max-w-xl pt-6">
            <p className="tr-display text-[28px] leading-tight sm:text-[34px]">Lo stato del bot non è raggiungibile.</p>
            <p className={`mt-3 ${C.ink2}`}>{loadError}</p>
            <button
              onClick={() => run('status')}
              disabled={busy !== null}
              className="tr-btn mt-5 inline-flex items-center gap-2 rounded-md bg-[var(--tr-action)] px-4 font-medium text-[var(--tr-action-ink)] hover:bg-[var(--tr-action-hover)]"
            >
              <RefreshCw aria-hidden className={`size-4 ${busy === 'status' ? 'motion-safe:animate-spin' : ''}`} />
              {busy === 'status' ? 'Riprovo…' : 'Riprova'}
            </button>
          </div>
        ) : (
          <LoadingSkeleton />
        )}
      </div>
    )
  }

  const s = status
  const now = new Date(s.generated_at).getTime()
  const cycleRunning = waitingCycle !== null
  const commandProps = { status: s, busy, cycleRunning, output, onRun: run }

  return (
    <div className={`tr ${fraunces.variable}`}>
      <header className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-b ${C.rule} pb-4`}>
        <h1 className="tr-display text-[26px] font-semibold leading-none tracking-tight">Trader AI</h1>
        <StatePill status={s} running={cycleRunning} />
        <p className={`order-last basis-full text-[13px] ${C.ink2} sm:order-none sm:basis-auto`}>
          Conto demo Alpaca, fase {s.phase}: solo osservazione
        </p>
        <button
          onClick={() => run('status')}
          disabled={busy !== null}
          aria-label={`Aggiorna lo stato. Ultimo aggiornamento alle ${time(s.generated_at)}`}
          className={`tr-btn -mr-2 ml-auto inline-flex items-center gap-2 rounded-md px-2.5 text-[13px] ${C.ink2} hover:bg-[var(--tr-surface)] hover:text-[var(--tr-ink)]`}
        >
          <RefreshCw aria-hidden className={`size-3.5 ${busy === 'status' ? 'motion-safe:animate-spin' : ''}`} />
          <span className="tr-num">
            {busy === 'status' ? (
              'Aggiorno…'
            ) : (
              <>
                <span className="hidden sm:inline">Aggiornato alle </span>
                {time(s.generated_at)}
              </>
            )}
          </span>
        </button>
      </header>

      {demo && (
        <p className={`mt-4 rounded-md border ${C.rule} ${C.surface} px-4 py-3 text-[14px] ${C.ink2}`}>
          Stai vedendo dati di esempio. Per collegare il bot imposta <code className="tr-code">N8N_TRADER_WEBHOOK_URL</code> nelle
          variabili d&apos;ambiente del sito (il segreto <code className="tr-code">N8N_WEBHOOK_SECRET</code> è lo stesso dei lead).
        </p>
      )}
      {loadError && (
        <p
          role="alert"
          className={`mt-4 flex items-start gap-2 rounded-md border border-[var(--tr-critical)] ${C.surface} px-4 py-3 text-[14px]`}
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--tr-critical)]" />
          <span>Ultimo aggiornamento fallito: {loadError}</span>
        </p>
      )}

      {/* Desktop: due colonne indipendenti (la risposta di un comando non sposta la colonna principale).
          Mobile: titolo, comandi, previsioni, poi i pannelli secondari. I Comandi sono resi in due punti,
          uno solo visibile per breakpoint. */}
      <div className={`${COLUMNS} mt-8 gap-y-14 sm:mt-10`}>
        <div className="flex min-w-0 flex-col gap-14">
          <div className="flex flex-col gap-10">
            <Hero status={s} now={now} />
            <div className="lg:hidden">
              <Commands {...commandProps} />
            </div>
          </div>

          <Section title="Previsioni aperte" note={`${s.open_predictions.length} in attesa della scadenza`}>
            <OpenPredictions rows={s.open_predictions} />
          </Section>

          <Section title="Come sta andando" note="Ogni previsione è confrontata con il benchmark (SPY per le azioni, BTC per le crypto).">
            <div className="grid gap-10 md:grid-cols-2">
              <LineChart
                title="Rendimento seguendo i segnali"
                caption="Somma dei rendimenti in eccesso, long sui rialzi e short sui ribassi."
                points={s.stats.daily.map((d) => ({
                  label: d.day,
                  short: shortDay(d.day),
                  value: d.cum_signed_return_pct,
                  detail: `${d.hits}/${d.n} giuste quel giorno`,
                }))}
                format={(v) => pct(v, 1)}
              />
              <BarChart
                title="Calibrazione"
                caption="Quota di previsioni giuste per fascia di confidenza. Se il modello è calibrato, sale da sinistra a destra."
                points={['< 0.55', '0.55–0.65', '0.65–0.75', '≥ 0.75']
                  .map((k) => s.stats.by_confidence.find((g) => g.key === k))
                  .filter(Boolean)
                  .map((g) => ({ label: g.key, value: (g.hit_rate ?? 0) * 100, detail: `${g.hits} su ${g.n}` }))}
                format={(v) => `${Math.round(v)}%`}
                max={100}
                reference={{ value: 50, label: '50%' }}
              />
            </div>
            <Baselines status={s} />
            <Horizons status={s} />
            <ModelComparison status={s} />
            <Breakdown status={s} />
          </Section>

          <Section title="Previsioni valutate" note={`${s.evaluated_predictions.length} chiuse`}>
            <EvaluatedTable rows={s.evaluated_predictions} />
          </Section>

          <Section title="Notizie rilevanti" note="Quelle che il filtro ha passato all'analisi">
            <NewsList items={s.news} now={now} />
          </Section>
        </div>

        <aside className="grid min-w-0 content-start gap-12 md:grid-cols-2 md:gap-x-10 lg:grid-cols-1">
          <div className="hidden lg:block">
            <Commands {...commandProps} />
          </div>
          <Spend status={s} />

          <div className="flex min-w-0 flex-col gap-12">
            <Section title="Configurazione">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[14px]">
                <dt className={C.ink2}>AI</dt>
                <dd>{s.config.backend === 'claude_cli' ? 'Claude Code sul server' : 'API Anthropic'}</dd>
                <dt className={C.ink2}>Filtro</dt>
                <dd className="break-all">{s.config.models.triage}</dd>
                <dt className={C.ink2}>Analisi</dt>
                <dd className="break-all">{s.config.models.analyst}</dd>
                <dt className={C.ink2}>Watchlist</dt>
                <dd>
                  {s.config.stocks.length} azioni, {s.config.crypto.length} crypto
                </dd>
                <dt className={C.ink2}>Ciclo</dt>
                <dd>ogni {s.config.cycle_minutes} minuti (n8n)</dd>
              </dl>
              <details className="tr-details mt-3 text-[14px]">
                <summary className={`tr-hit inline-flex cursor-pointer items-center gap-1.5 ${C.ink2} hover:text-[var(--tr-ink)]`}>
                  Regole di rischio per la fase 2
                </summary>
                <ul className={`mt-2 space-y-1 ${C.ink2}`}>
                  <li>Posizione massima {s.config.risk.max_position_pct}% del conto</li>
                  <li>Al massimo {s.config.risk.max_open_positions} posizioni aperte</li>
                  <li>
                    Stop loss {s.config.risk.stop_loss_pct}%, take profit {s.config.risk.take_profit_pct}%
                  </li>
                  <li>Perdita giornaliera massima {s.config.risk.max_daily_loss_pct}%</li>
                  <li>Confidenza minima per entrare {s.config.risk.min_confidence}</li>
                </ul>
              </details>
            </Section>

            <Section title="Log del server">
              <pre
                tabIndex={0}
                aria-label="Ultime righe del log del server"
                className={`tr-scroll max-h-80 overflow-auto whitespace-pre-wrap rounded-md border ${C.rule} ${C.surface} p-3 text-[11px] leading-relaxed [overflow-wrap:anywhere] ${C.ink2}`}
              >
                {s.log_tail.length ? s.log_tail.join('\n') : 'Nessuna riga ancora.'}
              </pre>
            </Section>
          </div>
        </aside>
      </div>

      <footer className={`mt-16 border-t ${C.rule} pt-4 text-[13px] ${C.ink2}`}>
        Progetto di ricerca su conto simulato. Non è consulenza finanziaria.
      </footer>
    </div>
  )
}

function LoadingSkeleton() {
  const bar = 'rounded bg-[var(--tr-rule)] motion-safe:animate-pulse'
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Leggo lo stato del bot…</span>
      <div className={`flex items-center gap-3 border-b ${C.rule} pb-4`}>
        <div className={`${bar} h-7 w-32`} />
        <div className={`${bar} h-7 w-28 rounded-full`} />
      </div>
      <div className={`${COLUMNS} mt-10 gap-y-10`}>
        <div className="space-y-3">
          <div className={`${bar} h-10 w-full max-w-[34rem]`} />
          <div className={`${bar} h-10 w-4/5 max-w-[28rem]`} />
          <div className={`${bar} mt-6 h-4 w-full max-w-[40rem]`} />
        </div>
        <div className="space-y-2">
          <div className={`${bar} h-11 w-full`} />
          <div className={`${bar} h-10 w-full opacity-60`} />
          <div className={`${bar} h-10 w-full opacity-60`} />
        </div>
      </div>
    </div>
  )
}

function Section({ title, note, children }) {
  return (
    <section className="min-w-0">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="tr-display text-[21px] font-semibold tracking-tight">{title}</h2>
        {note && <p className={`text-[13px] ${C.ink2}`}>{note}</p>}
      </div>
      {children}
    </section>
  )
}

function StatePill({ status, running }) {
  const lc = status.last_cycle
  const stale = lc && new Date(status.generated_at).getTime() - new Date(lc.started_at).getTime() > status.config.cycle_minutes * 3 * 60_000
  const [label, color] = status.stopped
    ? ['Fermo', 'var(--tr-critical)']
    : running
      ? ['Ciclo in corso', 'var(--tr-series)']
      : lc?.error
        ? ['Ultimo ciclo fallito', 'var(--tr-critical)']
        : !lc || stale
          ? ['Nessun ciclo recente', 'var(--tr-warning)']
          : ['In funzione', 'var(--tr-good)']
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 rounded-full border ${C.rule} ${C.surface} px-3 py-1 text-[13px] leading-5`}
    >
      <span aria-hidden className="relative flex size-2">
        {running && <span className="absolute inset-0 rounded-full motion-safe:animate-ping" style={{ background: color, opacity: 0.6 }} />}
        <span className="relative size-2 rounded-full" style={{ background: color }} />
      </span>
      {label}
    </span>
  )
}

function Hero({ status: s, now }) {
  const watched = s.config.stocks.length + s.config.crypto.length
  const d = s.stats.directional
  const open = s.counts.predictions_open
  const lc = s.last_cycle

  const sentence = s.stopped
    ? 'Il bot è fermo. Nessun ciclo partirà finché non lo riattivi.'
    : `Sta osservando ${watched} titoli. ${open === 1 ? 'Una previsione aperta' : `${open} previsioni aperte`}, ` +
      (d.n ? `${d.hits} su ${d.n} giuste finora.` : 'nessuna ancora valutata.')

  return (
    <div className="min-w-0">
      <p className="tr-display max-w-[22ch] text-balance text-[30px] leading-[1.12] tracking-[-0.015em] sm:text-[40px] xl:text-[46px]">
        {sentence}
      </p>
      <p className={`mt-4 max-w-[65ch] text-[15px] leading-relaxed ${C.ink2}`}>
        {lc ? (
          lc.error ? (
            <span className="inline-flex items-start gap-1.5 text-[var(--tr-ink)]">
              <TriangleAlert aria-hidden className="mt-1 size-4 shrink-0 text-[var(--tr-critical)]" />
              <span>
                Ultimo ciclo {ago(lc.started_at, now)} fallito: {lc.error}
              </span>
            </span>
          ) : (
            <>
              Ultimo ciclo {ago(lc.started_at, now)}: {lc.news} notizie nuove, {lc.relevant} rilevanti,{' '}
              {lc.predictions === 1 ? 'una previsione' : `${lc.predictions} previsioni`}.
              {lc.paused && <> L&apos;AI era in pausa: {lc.paused}.</>}
            </>
          )
        ) : (
          'Ancora nessun ciclo: avvia il primo dai comandi.'
        )}
        {d.avg_signed_return_pct !== null && (
          <>
            {' '}
            Seguendo i segnali, rendimento medio <span className="tr-num text-[var(--tr-ink)]">{pct(d.avg_signed_return_pct, 2)}</span>{' '}
            sul benchmark.
          </>
        )}
        {s.counts.predictions_evaluated_directional !== undefined && (
          <>
            {' '}
            Previsioni con una direzione valutate:{' '}
            <span className="tr-num text-[var(--tr-ink)]">
              {s.counts.predictions_evaluated_directional} su {s.phase2_review_after ?? 50}
            </span>
            , poi si decide la fase 2.
          </>
        )}
      </p>
    </div>
  )
}

function Commands({ status: s, busy, cycleRunning, output, onRun }) {
  const secondary = ['evaluate', 'check', 'digest']
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="min-w-0">
      <h2 id={headingId} className="tr-display mb-3 text-[21px] font-semibold tracking-tight">
        Comandi
      </h2>
      <button
        onClick={() => onRun('cycle')}
        disabled={busy !== null || cycleRunning || s.stopped}
        className="tr-btn flex w-full items-center gap-2.5 rounded-md bg-[var(--tr-action)] px-4 text-left font-medium text-[var(--tr-action-ink)] hover:bg-[var(--tr-action-hover)]"
      >
        {cycleRunning || busy === 'cycle' ? (
          <RefreshCw aria-hidden className="size-4 shrink-0 motion-safe:animate-spin" />
        ) : (
          <Play aria-hidden className="size-4 shrink-0 fill-current" />
        )}
        {cycleRunning ? 'Ciclo in corso…' : busy === 'cycle' ? 'Avvio…' : LABELS.cycle}
      </button>
      {s.stopped && <p className={`mt-1.5 text-[13px] ${C.ink2}`}>Riattiva il bot per eseguire un ciclo.</p>}

      <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
        {secondary.map((c) => (
          <button
            key={c}
            onClick={() => onRun(c)}
            disabled={busy !== null}
            className={`tr-btn flex items-center rounded-md border ${C.rule} ${C.surface} px-4 py-2 text-left text-[15px] leading-snug hover:border-[var(--tr-ink-2)]`}
          >
            {busy === c ? 'In corso…' : LABELS[c]}
          </button>
        ))}
      </div>

      <div className={`mt-4 border-t ${C.rule} pt-2`}>
        <button
          onClick={() => onRun(s.stopped ? 'resume' : 'stop')}
          disabled={busy !== null}
          className={`tr-btn -ml-2.5 inline-flex items-center gap-2 rounded-md px-2.5 text-[15px] ${
            s.stopped ? 'font-medium text-[var(--tr-ink)] hover:bg-[var(--tr-surface)]' : `${C.ink2} hover:text-[var(--tr-critical)]`
          }`}
        >
          <Power aria-hidden className="size-3.5 shrink-0" />
          {busy === 'stop' || busy === 'resume' ? 'In corso…' : s.stopped ? LABELS.resume : LABELS.stop}
        </button>
      </div>

      <div aria-live="polite">
        {output && (
          <div className="mt-4">
            <p className={`flex items-center gap-1.5 text-[13px] ${C.ink2}`}>
              {output.ok ? (
                <Check aria-hidden className="size-3.5 text-[var(--tr-good-text)]" />
              ) : (
                <TriangleAlert aria-hidden className="size-3.5 text-[var(--tr-critical)]" />
              )}
              {LABELS[output.command]}, alle {time(output.at)}
            </p>
            <pre
              tabIndex={0}
              className={`tr-scroll mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border ${C.rule} ${C.surface} p-3 text-[12px] leading-relaxed [overflow-wrap:anywhere]`}
            >
              {output.text}
            </pre>
          </div>
        )}
      </div>
    </section>
  )
}

const DIRECTION_ICON = { bullish: ArrowUpRight, bearish: ArrowDownRight, neutral: Minus }

function DirectionTag({ dir }) {
  const d = DIRECTION[dir] ?? { label: dir }
  const Icon = DIRECTION_ICON[dir] ?? Minus
  return (
    <span className={`inline-flex items-center gap-1 text-[13px] ${C.ink2}`}>
      <Icon aria-hidden className="size-3.5" strokeWidth={2.25} />
      {d.label}
    </span>
  )
}

function ConfidenceMeter({ value }) {
  return (
    <span className="inline-flex items-center gap-2" title={`Confidenza ${conf(value)}`}>
      <span className="sr-only">Confidenza</span>
      <span aria-hidden className="relative h-1.5 w-14 overflow-hidden rounded-full bg-[var(--tr-rule)]">
        <span className="absolute inset-y-0 left-0 rounded-full bg-[var(--tr-series)]" style={{ width: `${value * 100}%` }} />
      </span>
      <span className="tr-num text-[13px]">{conf(value)}</span>
    </span>
  )
}

function OpenPredictions({ rows }) {
  if (!rows.length) {
    return <p className={C.ink2}>Nessuna previsione aperta. Ne arriveranno quando una notizia supera il filtro.</p>
  }
  return (
    <ul className={`divide-y divide-[var(--tr-rule)] border-y ${C.rule}`}>
      {rows.map((p) => (
        <li key={p.id} className="py-4">
          <div className="flex items-center gap-x-3">
            <span className="text-[17px] font-semibold sm:min-w-[5.5rem]">{p.symbol}</span>
            <DirectionTag dir={p.direction} />
            <span className="ml-auto sm:ml-0">
              <ConfidenceMeter value={p.confidence} />
            </span>
            <span className={`tr-num ml-auto hidden text-[13px] sm:inline ${C.ink2}`}>
              scade il {dayMonth(p.target_date)} ({p.horizon_days} g)
            </span>
          </div>
          <p className="mt-1.5 max-w-[75ch] text-[15px] leading-snug">{p.reasoning}</p>
          <p className={`mt-1 max-w-[75ch] text-[13px] leading-snug ${C.ink2}`}>
            <span className="sm:hidden">
              Scade il {dayMonth(p.target_date)} ({p.horizon_days} g) ·{' '}
            </span>
            {CATALYST[p.catalyst_type] ?? p.catalyst_type}, {PRICED_IN[p.priced_in] ?? p.priced_in}
            {p.expected_move_pct !== null && p.direction !== 'neutral' && <>, movimento atteso {pct(p.expected_move_pct, 1)}</>}
            . Rischi: {p.key_risks}
          </p>
          {p.entry_mode === 'next_open' && !p.entry_filled_at && p.entry_due && (
            <p className={`mt-1 text-[13px] ${C.ink2}`}>
              Fatta a borsa chiusa: il prezzo d&apos;ingresso sarà quello di apertura del {dayMonth(p.entry_due)}.
            </p>
          )}
          {p.last_confirmation && (
            <p className={`mt-1.5 max-w-[75ch] border-l-2 border-[var(--tr-rule)] pl-3 text-[13px] leading-snug ${C.ink2}`}>
              {p.confirmations === 1 ? 'Confermata' : `Confermata ${p.confirmations} volte`}, l&apos;ultima il{' '}
              {dayMonth(p.last_confirmation.at)} (confidenza {conf(p.last_confirmation.confidence)}):{' '}
              {p.last_confirmation.reasoning}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

function Outcome({ hit }) {
  if (hit === null || hit === undefined) return <span className={C.ink2}>—</span>
  return hit ? (
    <span className="inline-flex items-center gap-1 text-[var(--tr-good-text)]">
      <Check aria-hidden className="size-3.5" strokeWidth={2.5} />
      giusta
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[var(--tr-critical)]">
      <X aria-hidden className="size-3.5" strokeWidth={2.5} />
      sbagliata
    </span>
  )
}

function Closed({ p }) {
  return (
    <>
      {p.evaluated_at ? dayMonth(p.evaluated_at) : '—'}
      {p.closed_reason === 'superseded' && (
        <span title="Chiusa in anticipo, ai prezzi di quel momento, perché il bot ha cambiato direzione sullo stesso titolo">
          , cambio d&apos;idea
        </span>
      )}
    </>
  )
}

const EVALUATED_STEP = 10

function EvaluatedTable({ rows }) {
  const [limit, setLimit] = useState(EVALUATED_STEP)
  if (!rows.length) {
    return <p className={C.ink2}>Ancora nessuna previsione scaduta. La prima valutazione arriva alla fine del suo orizzonte.</p>
  }
  const all = rows.slice(0, 30)
  const shown = all.slice(0, limit)
  return (
    <div>
      {/* Mobile: righe compatte, niente scroll orizzontale. */}
      <ul className={`tr-num divide-y divide-[var(--tr-rule)] border-y ${C.rule} sm:hidden`}>
        {shown.map((p) => (
          <li key={p.id} className="flex items-start justify-between gap-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{p.symbol}</span>
                <DirectionTag dir={p.direction} />
              </div>
              <p className={`mt-0.5 text-[13px] ${C.ink2}`}>
                conf. {conf(p.confidence)} · <Closed p={p} />
              </p>
            </div>
            <div className="shrink-0 text-right text-[14px]">
              <div>{pct(p.excess_return_pct, 1)}</div>
              <div className="text-[13px]">
                <Outcome hit={p.hit} />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden sm:block">
        <table className="tr-num w-full text-[14px]">
          <thead>
            <tr className={`border-b ${C.rule} text-left text-[13px] ${C.ink2}`}>
              <th scope="col" className="py-2 pr-4 font-medium">Titolo</th>
              <th scope="col" className="py-2 pr-4 font-medium">Direzione</th>
              <th scope="col" className="py-2 pr-4 font-medium">Confidenza</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Sul benchmark</th>
              <th scope="col" className="py-2 pr-4 font-medium">Esito</th>
              <th scope="col" className="py-2 font-medium">Chiusa</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id} className={`border-b ${C.rule} hover:bg-[var(--tr-surface)]`}>
                <th scope="row" className="py-2.5 pr-4 text-left font-semibold">{p.symbol}</th>
                <td className="py-2.5 pr-4">
                  <DirectionTag dir={p.direction} />
                </td>
                <td className="py-2.5 pr-4">{conf(p.confidence)}</td>
                <td className="py-2.5 pr-4 text-right">{pct(p.excess_return_pct, 1)}</td>
                <td className="py-2.5 pr-4">
                  <Outcome hit={p.hit} />
                </td>
                <td className={`py-2.5 ${C.ink2}`}>
                  <Closed p={p} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {all.length > EVALUATED_STEP && (
        <button
          type="button"
          onClick={() => setLimit((l) => (l >= all.length ? EVALUATED_STEP : all.length))}
          className={`tr-btn -ml-2 mt-2 rounded-md px-2 text-[14px] ${C.ink2} underline decoration-[var(--tr-rule)] underline-offset-4 hover:text-[var(--tr-ink)] hover:decoration-[var(--tr-ink-2)]`}
        >
          {limit >= all.length ? 'Mostra meno' : `Mostra tutte (${all.length})`}
        </button>
      )}
    </div>
  )
}

// Il bot contro strategie semplici sulle stesse previsioni: vale qualcosa solo se le batte.
function Baselines({ status: s }) {
  const b = s.stats.baselines
  if (!b) return null
  if (!b.n && !b.all_n) {
    return (
      <p className={`mt-10 max-w-[65ch] text-[14px] ${C.ink2}`}>
        Quando ci saranno previsioni valutate, qui il bot verrà confrontato con strategie semplici: seguire il
        movimento dell&apos;ultimo giorno, dire sempre rialzo, dire sempre neutra. Vale qualcosa solo se le batte.
      </p>
    )
  }
  const rows = [
    { label: 'Il bot', hits: b.bot, n: b.n, bot: true },
    { label: "Segui il movimento dell'ultimo giorno", hits: b.momentum, n: b.momentum_n },
    { label: 'Dì sempre rialzo', hits: b.always_bullish, n: b.n },
  ].filter((r) => r.n > 0)
  return (
    <div className="mt-10 min-w-0">
      <h3 className="text-[15px] font-semibold">Contro le strategie semplici</h3>
      <p className={`mt-0.5 max-w-[65ch] text-[13px] ${C.ink2}`}>
        Quota di giuste sulle previsioni con una direzione. Lanciando una moneta si arriva al 50%.
      </p>
      <ul className="mt-3 space-y-2.5">
        {rows.map((r) => {
          const share = r.hits / r.n
          return (
            <li key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[16rem_minmax(0,1fr)_auto]">
              <span className={`text-[14px] ${r.bot ? 'font-semibold' : C.ink2}`}>{r.label}</span>
              <span aria-hidden className="relative order-last col-span-2 h-2 overflow-hidden rounded-full bg-[var(--tr-rule)] sm:order-none sm:col-span-1">
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${share * 100}%`, background: r.bot ? 'var(--tr-series)' : 'var(--tr-ink-2)' }}
                />
                <span className="absolute inset-y-0 left-1/2 w-px bg-[var(--tr-ink)] opacity-40" />
              </span>
              <span className="tr-num text-[14px]">
                {r.hits}/{r.n} <span className={C.ink2}>({ratio(share)})</span>
              </span>
            </li>
          )
        })}
      </ul>
      {b.all_n > 0 && (
        <p className={`mt-3 text-[13px] ${C.ink2}`}>
          Contando anche le neutre: il bot <span className="tr-num">{b.bot_all}/{b.all_n}</span>, «dì sempre neutra»{' '}
          <span className="tr-num">{b.always_neutral}/{b.all_n}</span>.
        </p>
      )}
    </div>
  )
}

// Stesse previsioni, misurate dopo 1, 3, 5 e 10 giorni: quale orizzonte funziona davvero.
function Horizons({ status: s }) {
  const rows = (s.stats.by_horizon ?? []).filter((h) => h.n > 0)
  if (!rows.length) return null
  return (
    <div className="mt-10 min-w-0">
      <h3 className="text-[15px] font-semibold">Dopo quanti giorni funziona</h3>
      <p className={`mt-0.5 max-w-[65ch] text-[13px] ${C.ink2}`}>
        Le previsioni con una direzione, misurate dopo 1, 3, 5 e 10 giorni dall&apos;ingresso, qualunque fosse la scadenza scelta.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="tr-num w-full min-w-[360px] text-[14px]">
          <thead>
            <tr className={`border-b ${C.rule} text-left text-[13px] ${C.ink2}`}>
              <th className="py-1.5 pr-4 font-medium">Dopo</th>
              <th className="py-1.5 pr-4 font-medium">Giuste</th>
              <th className="py-1.5 text-right font-medium">Rendimento medio seguendo il segnale</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.days} className={`border-b ${C.rule}`}>
                <td className="py-1.5 pr-4">{h.days === 1 ? '1 giorno' : `${h.days} giorni`}</td>
                <td className="py-1.5 pr-4">
                  {h.hits}/{h.n} <span className={C.ink2}>({ratio(h.hit_rate)})</span>
                </td>
                <td className="py-1.5 text-right">{pct(h.avg_signed_return_pct, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// "claude-opus-5-5" → "Opus 5.5"
function modelName(id) {
  if (!id) return '—'
  const [family, ...version] = id.replace(/^claude-/, '').split('-')
  return `${family.charAt(0).toUpperCase()}${family.slice(1)} ${version.join('.')}`
}

// Stessa notizia, stesso momento, due modelli: quello ufficiale e quello di confronto.
function ModelComparison({ status: s }) {
  const mc = s.stats.model_comparison
  if (!mc?.pairs) return null
  const a = modelName(mc.official_model)
  const b = modelName(mc.challenger_model)
  const rows = mc.by_horizon.filter((h) => h.n > 0)
  return (
    <div className="mt-10 min-w-0">
      <h3 className="text-[15px] font-semibold">
        {a} contro {b}
      </h3>
      <p className={`mt-0.5 max-w-[65ch] text-[13px] ${C.ink2}`}>
        Sulle notizie importanti anche {b} analizza la stessa notizia, nello stesso momento. Le sue previsioni non
        contano nelle statistiche: servono a capire se conviene cambiare modello. Finora {mc.pairs}{' '}
        {mc.pairs === 1 ? 'coppia' : 'coppie'}, in disaccordo {mc.disagreements}{' '}
        {mc.disagreements === 1 ? 'volta' : 'volte'}; con una direzione {a} {mc.official_directional}, {b}{' '}
        {mc.challenger_directional}.
      </p>
      {rows.length ? (
        <div className="mt-3 overflow-x-auto">
          <table className="tr-num w-full min-w-[420px] text-[14px]">
            <thead>
              <tr className={`border-b ${C.rule} text-left text-[13px] ${C.ink2}`}>
                <th className="py-1.5 pr-4 font-medium">Dopo</th>
                <th className="py-1.5 pr-4 font-medium">Giuste {a}</th>
                <th className="py-1.5 pr-4 font-medium">Giuste {b}</th>
                <th className="py-1.5 text-right font-medium">Rendimento medio {a} / {b}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => (
                <tr key={h.days} className={`border-b ${C.rule}`}>
                  <td className="py-1.5 pr-4">{h.days === 1 ? '1 giorno' : `${h.days} giorni`}</td>
                  <td className="py-1.5 pr-4">
                    {h.official_hits}/{h.n}
                  </td>
                  <td className="py-1.5 pr-4">
                    {h.challenger_hits}/{h.n}
                  </td>
                  <td className="py-1.5 text-right">
                    {pct(h.official_avg_signed_pct, 2)} / {pct(h.challenger_avg_signed_pct, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={`mt-2 text-[13px] ${C.ink2}`}>I primi risultati arrivano il giorno dopo l&apos;ingresso.</p>
      )}
      {mc.recent_disagreements?.length > 0 && (
        <ul className={`mt-4 divide-y divide-[var(--tr-rule)] border-y ${C.rule}`}>
          {mc.recent_disagreements.slice(0, 4).map((d) => (
            <li key={d.id} className="py-2.5 text-[13px] leading-snug">
              <span className="font-semibold">{d.symbol}</span>{' '}
              <span className={C.ink2}>
                il {dayMonth(d.created_at)}: {a} {DIRECTION[d.official]?.label ?? d.official} {conf(d.official_confidence)},{' '}
                {b} {DIRECTION[d.challenger]?.label ?? d.challenger} {conf(d.challenger_confidence)}
              </span>
              <p className="mt-0.5 max-w-[75ch]">{d.reasoning}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Breakdown({ status: s }) {
  if (!s.stats.all.n) return null
  const blocks = [
    { title: 'Per catalizzatore', rows: s.stats.by_catalyst, label: (k) => CATALYST[k] ?? k },
    { title: 'Già nel prezzo?', rows: s.stats.by_priced_in, label: (k) => PRICED_IN[k] ?? k },
    { title: 'Per mercato', rows: s.stats.by_asset_class, label: (k) => (k === 'crypto' ? 'crypto' : 'azioni') },
    { title: 'Per versione delle istruzioni', rows: s.stats.by_version ?? [], label: (k) => k },
  ]
  return (
    <div className="mt-10 grid gap-8 sm:grid-cols-2 2xl:grid-cols-4">
      {blocks.map((b) => (
        <div key={b.title} className="min-w-0">
          <h3 className="text-[14px] font-semibold">{b.title}</h3>
          <ul className="tr-num mt-2 space-y-1 text-[13px]">
            {b.rows.slice(0, 6).map((r) => (
              <li key={r.key} className={`flex justify-between gap-3 border-b ${C.rule} pb-1`}>
                <span className={`truncate ${C.ink2}`}>{b.label(r.key)}</span>
                <span className="shrink-0">
                  {r.hits}/{r.n} <span className={C.ink2}>({ratio(r.hit_rate)})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function NewsList({ items, now }) {
  if (!items.length) return <p className={C.ink2}>Nessuna notizia rilevante ancora.</p>
  return (
    <ul className="space-y-5">
      {items.slice(0, 15).map((n) => (
        <li key={n.id} className="max-w-[75ch]">
          <a
            href={n.url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-[15px] leading-snug underline decoration-[var(--tr-rule)] underline-offset-4 hover:decoration-[var(--tr-ink-2)]"
          >
            {n.headline}
            <span className="sr-only"> (si apre in una nuova scheda)</span>
          </a>
          <p className={`mt-1 text-[13px] ${C.ink2}`}>
            {n.symbols.join(', ')}, importanza {n.importance ?? '—'} su 5, {ago(n.created_at, now)}
            {n.triage_reason && <>. {n.triage_reason}</>}
          </p>
        </li>
      ))}
    </ul>
  )
}

function Meter({ label, value, limit }) {
  const share = Math.min(1, limit ? value / limit : 0)
  const color = share >= 1 ? 'var(--tr-critical)' : share >= 0.8 ? 'var(--tr-warning)' : 'var(--tr-series)'
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-[14px]">
        <span className={C.ink2}>{label}</span>
        <span className="tr-num">
          {usd(value)} <span className={C.ink2}>di {usd(limit)}</span>
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--tr-rule)]"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label={label}
      >
        <div className="h-full rounded-full" style={{ width: `${share * 100}%`, background: color }} />
      </div>
      {share >= 1 && (
        <p className="mt-1.5 flex items-start gap-1.5 text-[13px] text-[var(--tr-critical)]">
          <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          Limite raggiunto: l&apos;AI è in pausa, le notizie restano in coda.
        </p>
      )}
    </div>
  )
}

function Spend({ status: s }) {
  const cli = s.config.backend === 'claude_cli'
  return (
    <Section title="Uso dell'AI">
      <p className={`-mt-2 mb-4 text-[13px] ${C.ink2}`}>
        {cli
          ? "Costo equivalente API stimato da Claude Code: non viene addebitato, ma misura quanto usa dell'abbonamento."
          : "Spesa reale sull'API Anthropic."}
      </p>
      <div className="space-y-4">
        <Meter label="Oggi" value={s.spend.today_usd} limit={s.spend.daily_limit_usd} />
        <Meter label="Questo mese" value={s.spend.month_usd} limit={s.spend.monthly_limit_usd} />
      </div>
      <div className="mt-6">
        <BarChart
          title="Per giorno"
          points={s.spend.daily_30d.map((d) => ({ label: d.day, short: shortDay(d.day), value: d.cost, detail: `${d.n} chiamate` }))}
          format={(v) => usd(v, v < 1 ? 2 : 0)}
          reference={{ value: s.spend.daily_limit_usd, label: 'limite' }}
          height={150}
        />
      </div>
      {s.spend.by_purpose_30d.length > 0 && (
        <ul className="tr-num mt-4 space-y-1 text-[13px]">
          {s.spend.by_purpose_30d.map((r) => (
            <li key={r.purpose + r.model} className="flex justify-between gap-3">
              <span className={C.ink2}>
                {r.purpose === 'triage' ? 'Filtro' : r.purpose === 'analyst' ? 'Analisi' : r.purpose}, {r.n} chiamate
              </span>
              <span>{usd(r.cost)}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
