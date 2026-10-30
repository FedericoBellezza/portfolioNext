'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { fraunces } from '../components/leads/fonts'
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
        <p className={`tr-display mt-10 text-3xl ${C.ink2}`}>
          {loadError ? 'Lo stato del bot non è raggiungibile.' : 'Leggo lo stato del bot…'}
        </p>
        {loadError && (
          <div className={`mt-4 max-w-xl ${C.ink2}`}>
            <p>{loadError}</p>
            <button
              onClick={() => run('status')}
              className="mt-4 cursor-pointer rounded-md bg-[var(--tr-action)] px-4 py-2 font-medium text-[var(--tr-action-ink)] hover:bg-[var(--tr-action-hover)]"
            >
              Riprova
            </button>
          </div>
        )}
      </div>
    )
  }

  const s = status
  const now = new Date(s.generated_at).getTime()
  const cycleRunning = waitingCycle !== null

  return (
    <div className={`tr ${fraunces.variable}`}>
      <header className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-b ${C.rule} pb-4`}>
        <h1 className="tr-display text-[26px] font-semibold tracking-tight">Trader AI</h1>
        <StatePill status={s} running={cycleRunning} />
        <span className={`text-[13px] ${C.ink2}`}>Conto demo Alpaca, fase {s.phase}: solo osservazione</span>
        <button
          onClick={() => run('status')}
          disabled={busy !== null}
          className={`ml-auto cursor-pointer rounded-md px-3 py-1.5 text-[13px] ${C.ink2} hover:bg-[var(--tr-surface)] hover:text-[var(--tr-ink)] disabled:opacity-50`}
        >
          {busy === 'status' ? 'Aggiorno…' : `Aggiornato alle ${time(s.generated_at)}`}
        </button>
      </header>

      {demo && (
        <p className={`mt-4 rounded-md border ${C.rule} ${C.surface} px-4 py-3 text-[14px] ${C.ink2}`}>
          Stai vedendo dati di esempio. Per collegare il bot imposta <code>N8N_TRADER_WEBHOOK_URL</code> nelle variabili
          d&apos;ambiente del sito (il segreto <code>N8N_WEBHOOK_SECRET</code> è lo stesso dei lead).
        </p>
      )}
      {loadError && (
        <p className={`mt-4 rounded-md border border-[var(--tr-critical)] ${C.surface} px-4 py-3 text-[14px]`}>
          <span aria-hidden>⚠ </span>Ultimo aggiornamento fallito: {loadError}
        </p>
      )}

      <Hero status={s} now={now} />

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="order-2 flex min-w-0 flex-col gap-12 lg:order-1">
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
            <Breakdown status={s} />
          </Section>

          <Section title="Previsioni valutate" note={`${s.evaluated_predictions.length} chiuse`}>
            <EvaluatedTable rows={s.evaluated_predictions} />
          </Section>

          <Section title="Notizie rilevanti" note="Quelle che il filtro ha passato all'analisi">
            <NewsList items={s.news} now={now} />
          </Section>
        </div>

        <aside className="order-1 flex min-w-0 flex-col gap-10 lg:order-2">
          <Section title="Comandi">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => run('cycle')}
                disabled={busy !== null || cycleRunning || s.stopped}
                className="cursor-pointer rounded-md bg-[var(--tr-action)] px-4 py-2.5 text-left font-medium text-[var(--tr-action-ink)] hover:bg-[var(--tr-action-hover)] disabled:cursor-default disabled:opacity-50"
              >
                {cycleRunning ? 'Ciclo in corso…' : busy === 'cycle' ? 'Avvio…' : LABELS.cycle}
              </button>
              {['evaluate', 'check', 'digest'].map((c) => (
                <button
                  key={c}
                  onClick={() => run(c)}
                  disabled={busy !== null}
                  className={`cursor-pointer rounded-md border ${C.rule} ${C.surface} px-4 py-2 text-left hover:border-[var(--tr-ink-2)] disabled:cursor-default disabled:opacity-50`}
                >
                  {busy === c ? 'In corso…' : LABELS[c]}
                </button>
              ))}
              <button
                onClick={() => run(s.stopped ? 'resume' : 'stop')}
                disabled={busy !== null}
                className={`mt-2 cursor-pointer rounded-md border ${C.rule} px-4 py-2 text-left ${C.ink2} hover:border-[var(--tr-critical)] hover:text-[var(--tr-critical)] disabled:cursor-default disabled:opacity-50`}
              >
                {s.stopped ? LABELS.resume : LABELS.stop}
              </button>
            </div>
            {output && (
              <div className="mt-4" aria-live="polite">
                <p className={`text-[13px] ${C.ink2}`}>
                  {output.ok ? '✓' : '⚠'} {LABELS[output.command]}, alle {time(output.at)}
                </p>
                <pre className={`mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border ${C.rule} ${C.surface} p-3 text-[12px] leading-relaxed`}>
                  {output.text}
                </pre>
              </div>
            )}
          </Section>

          <Spend status={s} />

          <Section title="Configurazione">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[14px]">
              <dt className={C.ink2}>AI</dt>
              <dd>{s.config.backend === 'claude_cli' ? 'Claude Code sul server' : 'API Anthropic'}</dd>
              <dt className={C.ink2}>Filtro</dt>
              <dd>{s.config.models.triage}</dd>
              <dt className={C.ink2}>Analisi</dt>
              <dd>{s.config.models.analyst}</dd>
              <dt className={C.ink2}>Watchlist</dt>
              <dd>
                {s.config.stocks.length} azioni, {s.config.crypto.length} crypto
              </dd>
              <dt className={C.ink2}>Ciclo</dt>
              <dd>ogni {s.config.cycle_minutes} minuti (n8n)</dd>
            </dl>
            <details className="mt-3 text-[14px]">
              <summary className={`cursor-pointer ${C.ink2}`}>Regole di rischio per la fase 2</summary>
              <ul className={`mt-2 space-y-1 ${C.ink2}`}>
                <li>Posizione massima {s.config.risk.max_position_pct}% del conto</li>
                <li>Al massimo {s.config.risk.max_open_positions} posizioni aperte</li>
                <li>Stop loss {s.config.risk.stop_loss_pct}%, take profit {s.config.risk.take_profit_pct}%</li>
                <li>Perdita giornaliera massima {s.config.risk.max_daily_loss_pct}%</li>
                <li>Confidenza minima per entrare {s.config.risk.min_confidence}</li>
              </ul>
            </details>
          </Section>

          <Section title="Log del server">
            <pre className={`max-h-80 overflow-auto rounded-md border ${C.rule} ${C.surface} p-3 text-[11px] leading-relaxed ${C.ink2}`}>
              {s.log_tail.length ? s.log_tail.join('\n') : 'Nessuna riga ancora.'}
            </pre>
          </Section>
        </aside>
      </div>

      <footer className={`mt-16 border-t ${C.rule} pt-4 text-[13px] ${C.ink2}`}>
        Progetto di ricerca su conto simulato. Non è consulenza finanziaria.
      </footer>
    </div>
  )
}

function Section({ title, note, children }) {
  return (
    <section>
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
    <span className={`inline-flex items-center gap-2 rounded-full border ${C.rule} ${C.surface} px-3 py-1 text-[13px]`}>
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: color }} />
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
    <div className="mt-10">
      <p className="tr-display max-w-[24ch] text-[34px] leading-[1.12] tracking-[-0.01em] sm:text-[46px]">{sentence}</p>
      <p className={`mt-4 max-w-[70ch] text-[15px] ${C.ink2}`}>
        {lc ? (
          lc.error ? (
            <span className="text-[var(--tr-ink)]">
              <span aria-hidden>⚠ </span>Ultimo ciclo {ago(lc.started_at, now)} fallito: {lc.error}
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
        {d.avg_signed_return_pct !== null && <> Seguendo i segnali, rendimento medio {pct(d.avg_signed_return_pct, 2)} sul benchmark.</>}
      </p>
    </div>
  )
}

function DirectionTag({ dir }) {
  const d = DIRECTION[dir] ?? { label: dir, glyph: '·' }
  return (
    <span className={`inline-flex items-center gap-1 text-[13px] ${C.ink2}`}>
      <span aria-hidden className="text-[10px]">{d.glyph}</span>
      {d.label}
    </span>
  )
}

function ConfidenceMeter({ value }) {
  return (
    <span className="inline-flex items-center gap-2" title={`Confidenza ${conf(value)}`}>
      <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-[var(--tr-rule)]">
        <span className="absolute inset-y-0 left-0 rounded-full bg-[var(--tr-series)]" style={{ width: `${value * 100}%` }} />
      </span>
      <span className="text-[13px]">{conf(value)}</span>
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
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="min-w-[5.5rem] text-[17px] font-semibold">{p.symbol}</span>
            <DirectionTag dir={p.direction} />
            <ConfidenceMeter value={p.confidence} />
            <span className={`text-[13px] ${C.ink2}`}>
              scade il {dayMonth(p.target_date)} ({p.horizon_days} g)
            </span>
          </div>
          <p className="mt-1.5 max-w-[75ch] text-[14px]">{p.reasoning}</p>
          <p className={`mt-1 text-[13px] ${C.ink2}`}>
            {CATALYST[p.catalyst_type] ?? p.catalyst_type}, {PRICED_IN[p.priced_in] ?? p.priced_in}
            {p.expected_move_pct !== null && p.direction !== 'neutral' && <>, movimento atteso {pct(p.expected_move_pct, 1)}</>}
            . Rischi: {p.key_risks}
          </p>
        </li>
      ))}
    </ul>
  )
}

function Outcome({ hit }) {
  if (hit === null || hit === undefined) return <span className={C.ink2}>—</span>
  return hit ? (
    <span className="inline-flex items-center gap-1.5 text-[var(--tr-good-text)]">
      <span aria-hidden>✓</span>giusta
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[var(--tr-critical)]">
      <span aria-hidden>✗</span>sbagliata
    </span>
  )
}

function EvaluatedTable({ rows }) {
  if (!rows.length) {
    return <p className={C.ink2}>Ancora nessuna previsione scaduta. La prima valutazione arriva alla fine del suo orizzonte.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="tr-num w-full min-w-[560px] text-[14px]">
        <thead>
          <tr className={`border-b ${C.rule} text-left text-[13px] ${C.ink2}`}>
            <th className="py-2 pr-4 font-medium">Titolo</th>
            <th className="py-2 pr-4 font-medium">Direzione</th>
            <th className="py-2 pr-4 font-medium">Confidenza</th>
            <th className="py-2 pr-4 text-right font-medium">Sul benchmark</th>
            <th className="py-2 pr-4 font-medium">Esito</th>
            <th className="py-2 font-medium">Chiusa</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 30).map((p) => (
            <tr key={p.id} className={`border-b ${C.rule}`}>
              <td className="py-2 pr-4 font-semibold">{p.symbol}</td>
              <td className="py-2 pr-4">
                <DirectionTag dir={p.direction} />
              </td>
              <td className="py-2 pr-4">{conf(p.confidence)}</td>
              <td className="py-2 pr-4 text-right">{pct(p.excess_return_pct, 1)}</td>
              <td className="py-2 pr-4">
                <Outcome hit={p.hit} />
              </td>
              <td className={`py-2 ${C.ink2}`}>{p.evaluated_at ? dayMonth(p.evaluated_at) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Breakdown({ status: s }) {
  if (!s.stats.all.n) return null
  const blocks = [
    { title: 'Per catalizzatore', rows: s.stats.by_catalyst, label: (k) => CATALYST[k] ?? k },
    { title: 'Già nel prezzo?', rows: s.stats.by_priced_in, label: (k) => PRICED_IN[k] ?? k },
    { title: 'Per mercato', rows: s.stats.by_asset_class, label: (k) => (k === 'crypto' ? 'crypto' : 'azioni') },
  ]
  return (
    <div className="mt-10 grid gap-8 sm:grid-cols-3">
      {blocks.map((b) => (
        <div key={b.title}>
          <h3 className="text-[14px] font-semibold">{b.title}</h3>
          <ul className="tr-num mt-2 space-y-1 text-[13px]">
            {b.rows.slice(0, 6).map((r) => (
              <li key={r.key} className={`flex justify-between gap-3 border-b ${C.rule} pb-1`}>
                <span className={C.ink2}>{b.label(r.key)}</span>
                <span>
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
    <ul className="space-y-4">
      {items.slice(0, 15).map((n) => (
        <li key={n.id} className="max-w-[75ch]">
          <a
            href={n.url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-[15px] underline decoration-[var(--tr-rule)] underline-offset-4 hover:decoration-[var(--tr-ink-2)]"
          >
            {n.headline}
          </a>
          <p className={`mt-0.5 text-[13px] ${C.ink2}`}>
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
      <div className="flex items-baseline justify-between text-[14px]">
        <span className={C.ink2}>{label}</span>
        <span>
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
      {share >= 1 && <p className="mt-1 text-[13px] text-[var(--tr-critical)]">⚠ Limite raggiunto: l&apos;AI è in pausa, le notizie restano in coda.</p>}
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
        <ul className="mt-4 space-y-1 text-[13px]">
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
