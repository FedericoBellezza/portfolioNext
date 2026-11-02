'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Check, ExternalLink, Play, Power, RefreshCw, TriangleAlert } from 'lucide-react'

import { fraunces } from '../components/fonts'
import { MultiLineChart } from '../trader/charts'
import { ago, dayMonth, pct, shortDay, time, usd } from '../trader/format'
import '../trader/trader.css'
import { COPY_LABELS } from './commands'
import { demoCopyStatus } from './demo'

const C = {
  ink2: 'text-[var(--tr-ink-2)]',
  rule: 'border-[var(--tr-rule)]',
  surface: 'bg-[var(--tr-surface)]',
}
const COLUMNS = 'grid grid-cols-1 gap-x-14 lg:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]'
const CYCLE_MINUTES = 30

const TRADE_STATUS = {
  ordered: { label: 'copiata', tone: 'good' },
  queued: { label: 'in coda', tone: 'wait' },
  skipped: { label: 'saltata', tone: 'muted' },
  ignored: { label: 'scartata', tone: 'muted' },
}
const OWNER = { SP: 'coniuge', JT: 'conto congiunto', DC: 'figlio a carico' }
const ORDER_STATUS = {
  filled: 'eseguito',
  partially_filled: 'eseguito in parte',
  accepted: 'inviato',
  new: 'inviato',
  pending_new: 'inviato',
  canceled: 'annullato',
  expired: 'scaduto',
  rejected: 'rifiutato',
  failed: 'non inviato',
}

async function send(command) {
  try {
    const res = await fetch('/api/copybot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    })
    const data = await res.json().catch(() => ({}))
    return { ok: false, command, ...data }
  } catch {
    return { ok: false, command, error: 'Il sito non riesce a contattare il proprio server.' }
  }
}

const money = (v) => (v === null || v === undefined ? '—' : usd(v, 0))
const amountRange = (lo, hi) => (lo == null ? '—' : hi == null ? `oltre ${usd(lo, 0)}` : `${usd(lo, 0)} – ${usd(hi, 0)}`)
const days = (from, now) => Math.max(0, Math.floor((now - new Date(from).getTime()) / 86_400_000))

export default function CopyBotApp() {
  const [status, setStatus] = useState(null)
  const [demo, setDemo] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [busy, setBusy] = useState(null)
  const [output, setOutput] = useState(null)
  const [waitingCycle, setWaitingCycle] = useState(null)
  const lastCycleRef = useRef(undefined)

  const refresh = useCallback(async () => {
    const r = await send('copy-status')
    if (r.ok && r.data) {
      setStatus(r.data)
      setDemo(false)
      setLoadError(null)
      lastCycleRef.current = r.data.last_cycle?.started_at
    } else if (r.notConfigured) {
      setStatus(demoCopyStatus())
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

  // Dopo "Esegui un giro": ricontrolla ogni 8 secondi finché il giro non è finito (max 5 minuti).
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
          const orders = lc.orders?.length ?? 0
          setOutput({
            command: 'copy-cycle',
            at: new Date().toISOString(),
            ok: lc.ok,
            text: lc.error
              ? `Giro fallito: ${lc.error}`
              : `Giro finito: borsa ${lc.market_open ? 'aperta' : 'chiusa'}, ${orders === 1 ? 'un ordine' : `${orders} ordini`}.` +
                (lc.warnings?.length ? `\n${lc.warnings.join('\n')}` : ''),
          })
        }
      }
    }, 8_000)
    return () => clearInterval(id)
  }, [waitingCycle, refresh])

  async function run(command) {
    if (command === 'copy-stop' && !window.confirm('Fermare il Copy Bot? Nessun giro (e nessun ordine) partirà finché non lo riattivi.')) return
    if (demo && command !== 'copy-status') {
      setOutput({ command, at: new Date().toISOString(), ok: false, text: 'Dati di esempio: collega il webhook n8n per usare i comandi.' })
      return
    }
    setBusy(command)
    const r = command === 'copy-status' ? await refresh() : await send(command)
    setBusy(null)
    if (command === 'copy-status') return
    const text = r.ok
      ? command === 'copy-cycle'
        ? 'Giro avviato sul server. Il risultato compare qui appena finisce.'
        : command === 'copy-refresh'
          ? 'Lettura avviata sul server (13F e dichiarazioni). Aggiorna la pagina tra un paio di minuti.'
          : (r.stdout || 'Fatto.').trim()
      : [r.error, r.stderr].filter(Boolean).join('\n\n')
    setOutput({ command, at: new Date().toISOString(), ok: r.ok, text })
    if (r.ok && command === 'copy-cycle') setWaitingCycle(lastCycleRef.current ?? 'none')
    if (r.ok && command !== 'copy-cycle') refresh()
  }

  if (!status) {
    return (
      <div className={`tr ${fraunces.variable}`}>
        {loadError ? (
          <div className="max-w-xl pt-6">
            <p className="tr-display text-[28px] leading-tight sm:text-[34px]">Lo stato del Copy Bot non è raggiungibile.</p>
            <p className={`mt-3 ${C.ink2}`}>{loadError}</p>
            <button
              onClick={() => run('copy-status')}
              disabled={busy !== null}
              className="tr-btn mt-5 inline-flex items-center gap-2 rounded-md bg-[var(--tr-action)] px-4 font-medium text-[var(--tr-action-ink)] hover:bg-[var(--tr-action-hover)]"
            >
              <RefreshCw aria-hidden className={`size-4 ${busy === 'copy-status' ? 'motion-safe:animate-spin' : ''}`} />
              {busy === 'copy-status' ? 'Riprovo…' : 'Riprova'}
            </button>
          </div>
        ) : (
          <p aria-busy="true" className={`pt-6 ${C.ink2}`}>Leggo lo stato del Copy Bot…</p>
        )}
      </div>
    )
  }

  const s = status
  const now = new Date(s.generated_at).getTime()
  const cycleRunning = waitingCycle !== null
  const fund = s.sleeves.find((x) => x.name === 'fund')
  const congress = s.sleeves.find((x) => x.name === 'congress')
  const commandProps = { status: s, busy, cycleRunning, output, onRun: run }

  return (
    <div className={`tr ${fraunces.variable}`}>
      <header className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-b ${C.rule} pb-4`}>
        <h1 className="tr-display text-[26px] font-semibold leading-none tracking-tight">Copy Bot</h1>
        <StatePill status={s} running={cycleRunning} />
        <p className={`order-last basis-full text-[13px] ${C.ink2} sm:order-none sm:basis-auto`}>
          Conto demo Alpaca separato, ordini automatici
        </p>
        <button
          onClick={() => run('copy-status')}
          disabled={busy !== null}
          aria-label={`Aggiorna lo stato. Ultimo aggiornamento alle ${time(s.generated_at)}`}
          className={`tr-btn -mr-2 ml-auto inline-flex items-center gap-2 rounded-md px-2.5 text-[13px] ${C.ink2} hover:bg-[var(--tr-surface)] hover:text-[var(--tr-ink)]`}
        >
          <RefreshCw aria-hidden className={`size-3.5 ${busy === 'copy-status' ? 'motion-safe:animate-spin' : ''}`} />
          <span className="tr-num">
            {busy === 'copy-status' ? 'Aggiorno…' : (
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
          Stai vedendo dati di esempio. La pagina usa lo stesso webhook del Trader AI (<code className="tr-code">N8N_TRADER_WEBHOOK_URL</code>):
          appena è configurato mostra i dati veri.
        </p>
      )}
      {loadError && (
        <p role="alert" className={`mt-4 flex items-start gap-2 rounded-md border border-[var(--tr-critical)] ${C.surface} px-4 py-3 text-[14px]`}>
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--tr-critical)]" />
          <span>Ultimo aggiornamento fallito: {loadError}</span>
        </p>
      )}

      <div className={`${COLUMNS} mt-8 gap-y-14 sm:mt-10`}>
        <div className="flex min-w-0 flex-col gap-14">
          <div className="flex flex-col gap-10">
            <Hero status={s} fund={fund} congress={congress} now={now} />
            <div className="lg:hidden">
              <Commands {...commandProps} />
            </div>
          </div>

          <Section title="Andamento" note={`Rendimento dall'avvio, confrontato con ${s.benchmark.symbol}`}>
            <Performance status={s} />
          </Section>

          <Section title={`Copia del fondo: ${s.config.fund.name}`} note={fund ? `quota di ${money(fund.capital_usd)}` : null}>
            <FundPanel status={s} sleeve={fund} />
          </Section>

          <Section title="Operazioni del Congresso" note={congress ? `quota di ${money(congress.capital_usd)}` : null}>
            <CongressPanel status={s} sleeve={congress} now={now} />
          </Section>

          <Section title="Ordini" note="Gli ultimi inviati al conto demo">
            <Orders rows={s.orders} />
          </Section>
        </div>

        <aside className="grid min-w-0 content-start gap-12 md:grid-cols-2 md:gap-x-10 lg:grid-cols-1">
          <div className="hidden lg:block">
            <Commands {...commandProps} />
          </div>
          <Account status={s} />
          <div className="flex min-w-0 flex-col gap-12">
            <Rules status={s} />
            <Section title="Log del server">
              <pre
                tabIndex={0}
                aria-label="Ultime righe del log del Copy Bot"
                className={`tr-scroll max-h-80 overflow-auto whitespace-pre-wrap rounded-md border ${C.rule} ${C.surface} p-3 text-[11px] leading-relaxed [overflow-wrap:anywhere] ${C.ink2}`}
              >
                {s.log_tail.length ? s.log_tail.join('\n') : 'Nessuna riga ancora.'}
              </pre>
            </Section>
          </div>
        </aside>
      </div>

      <footer className={`mt-16 border-t ${C.rule} pt-4 text-[13px] ${C.ink2}`}>
        Progetto di ricerca su conto simulato, non è consulenza finanziaria. I 13F e le dichiarazioni del Congresso sono
        documenti pubblici che arrivano settimane dopo le operazioni: il bot copia il passato, non anticipa nulla.
      </footer>
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
  const stale = lc && new Date(status.generated_at).getTime() - new Date(lc.started_at).getTime() > CYCLE_MINUTES * 3 * 60_000
  const [label, color] = status.stopped
    ? ['Fermo', 'var(--tr-critical)']
    : running
      ? ['Giro in corso', 'var(--tr-series)']
      : lc?.error
        ? ['Ultimo giro fallito', 'var(--tr-critical)']
        : !lc || stale
          ? ['Nessun giro recente', 'var(--tr-warning)']
          : ['In funzione', 'var(--tr-good)']
  return (
    <span role="status" className={`inline-flex items-center gap-2 rounded-full border ${C.rule} ${C.surface} px-3 py-1 text-[13px] leading-5`}>
      <span aria-hidden className="relative flex size-2">
        {running && <span className="absolute inset-0 rounded-full motion-safe:animate-ping" style={{ background: color, opacity: 0.6 }} />}
        <span className="relative size-2 rounded-full" style={{ background: color }} />
      </span>
      {label}
    </span>
  )
}

function Signed({ value, digits = 1 }) {
  if (value === null || value === undefined) return <span className={C.ink2}>—</span>
  const color = value > 0 ? 'text-[var(--tr-good-text)]' : value < 0 ? 'text-[var(--tr-critical)]' : ''
  return <span className={`tr-num ${color}`}>{pct(value, digits)}</span>
}

function Hero({ status: s, fund, congress, now }) {
  const lc = s.last_cycle
  const total = (fund?.value_usd ?? 0) + (congress?.value_usd ?? 0)
  const sentence = s.stopped
    ? 'Il Copy Bot è fermo. Nessun ordine partirà finché non lo riattivi.'
    : !fund
      ? 'Il Copy Bot non ha ancora fatto il primo giro.'
      : `Copia ${s.config.fund.name} e le operazioni dichiarate dai deputati USA, ${money(total)} in tutto.`
  return (
    <div className="min-w-0">
      <p className="tr-display max-w-[24ch] text-balance text-[30px] leading-[1.12] tracking-[-0.015em] sm:text-[40px] xl:text-[44px]">
        {sentence}
      </p>
      {fund && (
        <dl className="tr-num mt-6 grid max-w-xl grid-cols-3 gap-4 text-[14px]">
          {[
            ['Fondo', fund.return_pct],
            ['Congresso', congress?.return_pct],
            [s.benchmark.symbol, s.benchmark.return_pct],
          ].map(([label, v]) => (
            <div key={label} className={`border-t ${C.rule} pt-2`}>
              <dt className={C.ink2}>{label}</dt>
              <dd className="tr-display mt-0.5 text-[26px] leading-none">
                <Signed value={v} />
              </dd>
            </div>
          ))}
        </dl>
      )}
      <p className={`mt-4 max-w-[65ch] text-[15px] leading-relaxed ${C.ink2}`}>
        {lc ? (
          lc.error ? (
            <span className="inline-flex items-start gap-1.5 text-[var(--tr-ink)]">
              <TriangleAlert aria-hidden className="mt-1 size-4 shrink-0 text-[var(--tr-critical)]" />
              <span>Ultimo giro {ago(lc.started_at, now)} fallito: {lc.error}</span>
            </span>
          ) : (
            <>
              Ultimo giro {ago(lc.started_at, now)}, borsa {lc.market_open ? 'aperta' : 'chiusa'}:{' '}
              {lc.orders?.length ? `${lc.orders.length} ordini inviati` : 'nessun ordine'}.
              {lc.new_13f && <> Nuovo 13F del trimestre {dayMonth(lc.new_13f.period)}.</>}
              {lc.warnings?.length > 0 && <> Avvisi: {lc.warnings.join('; ')}.</>}
            </>
          )
        ) : (
          'Ancora nessun giro: avvia il primo dai comandi.'
        )}
        {s.started_at && <> In funzione dal {dayMonth(s.started_at)}.</>}
      </p>
    </div>
  )
}

function Performance({ status: s }) {
  const capital = Object.fromEntries(s.sleeves.map((x) => [x.name, x.capital_usd]))
  const start = s.benchmark.start
  const rows = s.history.map((h) => ({
    label: h.day,
    short: shortDay(h.day),
    values: {
      fund: h.fund != null && capital.fund ? (h.fund / capital.fund - 1) * 100 : null,
      congress: h.congress != null && capital.congress ? (h.congress / capital.congress - 1) * 100 : null,
      bench: h.benchmark && start ? (h.benchmark / start - 1) * 100 : null,
    },
  }))
  return (
    <MultiLineChart
      title="Rendimento cumulato"
      caption="Valore di fine giornata di ogni quota rispetto al capitale iniziale."
      series={[
        { key: 'fund', label: 'Fondo', color: 'var(--tr-series)' },
        { key: 'congress', label: 'Congresso', color: 'var(--tr-series-2)' },
        { key: 'bench', label: s.benchmark.symbol, color: 'var(--tr-bench)', dashed: true },
      ]}
      rows={rows}
      format={(v) => pct(v, 1)}
    />
  )
}

function SleeveSummary({ sleeve }) {
  return (
    <p className={`mb-4 text-[14px] ${C.ink2}`}>
      Valore <span className="tr-num text-[var(--tr-ink)]">{money(sleeve.value_usd)}</span> (
      <Signed value={sleeve.return_pct} />) · investito {money(sleeve.invested_usd)} · contanti {money(sleeve.cash_usd)}
      {sleeve.realized_usd !== 0 && <> · realizzato {usd(sleeve.realized_usd, 0)}</>}
    </p>
  )
}

function FundPanel({ status: s, sleeve }) {
  const f = s.fund
  if (!f.filing) {
    return <p className={C.ink2}>Ancora nessun 13F letto. Il bot lo cerca alla SEC a ogni giro (ogni 6 ore al massimo).</p>
  }
  const held = Object.fromEntries((sleeve?.positions ?? []).map((p) => [p.symbol, p]))
  const symbols = [...new Set([...f.targets.map((t) => t.symbol), ...Object.keys(held)])]
  const target = Object.fromEntries(f.targets.map((t) => [t.symbol, t]))
  return (
    <div>
      <p className={`mb-2 text-[14px] ${C.ink2}`}>
        13F del trimestre chiuso il {dayMonth(f.filing.period)}, depositato il {dayMonth(f.filing.filed_date)}
        {f.filing.note?.covered_pct != null && <>: le prime {f.filing.note.targets} posizioni coprono il {f.filing.note.covered_pct}% del portafoglio</>}.{' '}
        <a href={f.filing.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline decoration-[var(--tr-rule)] underline-offset-4 hover:text-[var(--tr-ink)]">
          Documento SEC <ExternalLink aria-hidden className="size-3" />
        </a>
        {f.rebalance_pending && <> Ribilanciamento in corso.</>}
        {f.untradable.length > 0 && <> Non negoziabili su Alpaca: {f.untradable.join(', ')}.</>}
      </p>
      {sleeve && <SleeveSummary sleeve={sleeve} />}
      <div className="overflow-x-auto">
        <table className="tr-num w-full min-w-[30rem] text-[14px]">
          <thead>
            <tr className={`border-b ${C.rule} text-left text-[13px] ${C.ink2}`}>
              <th scope="col" className="py-2 pr-4 font-medium">Titolo</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Obiettivo</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Attuale</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Valore</th>
              <th scope="col" className="py-2 text-right font-medium">Risultato</th>
            </tr>
          </thead>
          <tbody>
            {symbols.map((sym) => {
              const p = held[sym]
              const t = target[sym]
              return (
                <tr key={sym} className={`border-b ${C.rule} hover:bg-[var(--tr-surface)]`}>
                  <th scope="row" className="py-2 pr-4 text-left">
                    <span className="font-semibold">{sym}</span>
                    {t?.name && <span className={`ml-2 hidden text-[12px] font-normal md:inline ${C.ink2}`}>{t.name.toLowerCase()}</span>}
                  </th>
                  <td className="py-2 pr-4 text-right">{t ? pct(t.weight_pct, 1, false) : '—'}</td>
                  <td className="py-2 pr-4 text-right">{p ? pct(p.weight_pct, 1, false) : '—'}</td>
                  <td className="py-2 pr-4 text-right">{p ? money(p.value_usd) : '—'}</td>
                  <td className="py-2 text-right">
                    <Signed value={p?.pnl_pct} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TradeStatus({ t }) {
  const st = TRADE_STATUS[t.status] ?? { label: t.status, tone: 'muted' }
  const color = st.tone === 'good' ? 'text-[var(--tr-good-text)]' : st.tone === 'wait' ? 'text-[var(--tr-ink)]' : C.ink2
  return (
    <span className={`text-[13px] ${color}`} title={t.reason ?? undefined}>
      {st.tone === 'good' && <Check aria-hidden className="mr-1 inline size-3.5" strokeWidth={2.5} />}
      {st.label}
      {t.reason && <span className={`${C.ink2}`}>: {t.reason}</span>}
    </span>
  )
}

const BUYS_STEP = 12

function CongressPanel({ status: s, sleeve, now }) {
  const [limit, setLimit] = useState(BUYS_STEP)
  const c = s.congress
  const positions = sleeve?.positions ?? []
  return (
    <div>
      <p className={`mb-4 text-[14px] ${C.ink2}`}>
        {c.counts.ptr_parsed} dichiarazioni lette{c.counts.ptr_unreadable ? `, ${c.counts.ptr_unreadable} scansionate e saltate` : ''}
        {c.checked_at && <>, ultimo controllo {ago(c.checked_at, now)}</>}. Ogni acquisto copiato occupa un posto da{' '}
        {sleeve ? money(sleeve.capital_usd / s.config.congress.max_positions) : '—'} e si vende dopo {s.config.congress.hold_days} giorni o
        quando lo stesso deputato dichiara la vendita.
      </p>
      {sleeve && <SleeveSummary sleeve={sleeve} />}

      <h3 className="mb-2 text-[15px] font-semibold">
        Posizioni aperte <span className={`font-normal ${C.ink2}`}>{positions.length} su {s.config.congress.max_positions} posti</span>
      </h3>
      {positions.length ? (
        <ul className={`mb-8 divide-y divide-[var(--tr-rule)] border-y ${C.rule}`}>
          {positions.map((p) => (
            <li key={p.symbol} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5 text-[14px]">
              <span className="min-w-[4.5rem] font-semibold">{p.symbol}</span>
              <span className="min-w-0 flex-1">{p.member ?? '—'}</span>
              <span className={`tr-num text-[13px] ${C.ink2}`}>
                da {days(p.opened_at, now)} g · {money(p.value_usd)}
              </span>
              <span className="w-16 text-right">
                <Signed value={p.pnl_pct} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={`mb-8 ${C.ink2}`}>Nessuna posizione aperta.</p>
      )}

      <h3 className="mb-2 text-[15px] font-semibold">
        Acquisti dichiarati <span className={`font-normal ${C.ink2}`}>gli ultimi {c.recent_buys.length}, con cosa ne ha fatto il bot</span>
      </h3>
      {c.recent_buys.length ? (
        <>
          <ul className={`divide-y divide-[var(--tr-rule)] border-y ${C.rule}`}>
            {c.recent_buys.slice(0, limit).map((t) => (
              <li key={t.id} className="py-2.5 text-[14px]">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="min-w-[4.5rem] font-semibold">{t.symbol}</span>
                  <span className="min-w-0 flex-1">
                    {t.member}
                    {t.owner && <span className={C.ink2}> ({OWNER[t.owner] ?? t.owner})</span>}
                  </span>
                  <span className={`tr-num text-[13px] ${C.ink2}`}>{amountRange(t.amount_low, t.amount_high)}</span>
                </div>
                <div className={`mt-0.5 flex flex-wrap gap-x-3 text-[13px] ${C.ink2}`}>
                  <span className="tr-num">
                    comprata il {dayMonth(t.trade_date)}, dichiarata il {dayMonth(t.filed_date)} (
                    {Math.round((new Date(t.filed_date) - new Date(t.trade_date)) / 86_400_000)} g dopo)
                  </span>
                  <TradeStatus t={t} />
                </div>
              </li>
            ))}
          </ul>
          {c.recent_buys.length > BUYS_STEP && (
            <button
              type="button"
              onClick={() => setLimit((l) => (l >= c.recent_buys.length ? BUYS_STEP : c.recent_buys.length))}
              className={`tr-btn -ml-2 mt-2 rounded-md px-2 text-[14px] ${C.ink2} underline decoration-[var(--tr-rule)] underline-offset-4 hover:text-[var(--tr-ink)]`}
            >
              {limit >= c.recent_buys.length ? 'Mostra meno' : `Mostra tutti (${c.recent_buys.length})`}
            </button>
          )}
        </>
      ) : (
        <p className={C.ink2}>Ancora nessun acquisto letto dalle dichiarazioni.</p>
      )}
    </div>
  )
}

function Orders({ rows }) {
  if (!rows.length) return <p className={C.ink2}>Ancora nessun ordine. Partono solo a borsa aperta.</p>
  return (
    <ul className={`divide-y divide-[var(--tr-rule)] border-y ${C.rule}`}>
      {rows.slice(0, 25).map((o) => (
        <li key={o.id} className="py-2.5 text-[14px]">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span className={`w-16 font-medium ${o.side === 'buy' ? 'text-[var(--tr-good-text)]' : 'text-[var(--tr-critical)]'}`}>
              {o.side === 'buy' ? 'Compra' : 'Vende'}
            </span>
            <span className="min-w-[4.5rem] font-semibold">{o.symbol}</span>
            <span className={`text-[13px] ${C.ink2}`}>{o.sleeve === 'fund' ? 'fondo' : 'Congresso'}</span>
            <span className="tr-num ml-auto text-[13px]">
              {o.filled_qty && o.filled_avg_price
                ? `${+o.filled_qty.toFixed(4)} az. a ${usd(o.filled_avg_price, 2)}`
                : o.notional
                  ? usd(o.notional, 0)
                  : `${o.qty} az.`}
            </span>
          </div>
          <p className={`mt-0.5 text-[13px] ${C.ink2}`}>
            <span className="tr-num">{dayMonth(o.created_at)}, {time(o.created_at)}</span> · {ORDER_STATUS[o.status] ?? o.status} · {o.reason}
          </p>
        </li>
      ))}
    </ul>
  )
}

function Commands({ status: s, busy, cycleRunning, output, onRun }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="min-w-0">
      <h2 id={headingId} className="tr-display mb-3 text-[21px] font-semibold tracking-tight">Comandi</h2>
      <button
        onClick={() => onRun('copy-cycle')}
        disabled={busy !== null || cycleRunning || s.stopped}
        className="tr-btn flex w-full items-center gap-2.5 rounded-md bg-[var(--tr-action)] px-4 text-left font-medium text-[var(--tr-action-ink)] hover:bg-[var(--tr-action-hover)]"
      >
        {cycleRunning || busy === 'copy-cycle' ? (
          <RefreshCw aria-hidden className="size-4 shrink-0 motion-safe:animate-spin" />
        ) : (
          <Play aria-hidden className="size-4 shrink-0 fill-current" />
        )}
        {cycleRunning ? 'Giro in corso…' : busy === 'copy-cycle' ? 'Avvio…' : COPY_LABELS['copy-cycle']}
      </button>
      {s.stopped && <p className={`mt-1.5 text-[13px] ${C.ink2}`}>Riattiva il bot per eseguire un giro.</p>}
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {['copy-refresh', 'copy-check'].map((c) => (
          <button
            key={c}
            onClick={() => onRun(c)}
            disabled={busy !== null}
            className={`tr-btn flex items-center rounded-md border ${C.rule} ${C.surface} px-4 py-2 text-left text-[15px] leading-snug hover:border-[var(--tr-ink-2)]`}
          >
            {busy === c ? 'In corso…' : COPY_LABELS[c]}
          </button>
        ))}
      </div>
      <div className={`mt-4 border-t ${C.rule} pt-2`}>
        <button
          onClick={() => onRun(s.stopped ? 'copy-resume' : 'copy-stop')}
          disabled={busy !== null}
          className={`tr-btn -ml-2.5 inline-flex items-center gap-2 rounded-md px-2.5 text-[15px] ${
            s.stopped ? 'font-medium text-[var(--tr-ink)] hover:bg-[var(--tr-surface)]' : `${C.ink2} hover:text-[var(--tr-critical)]`
          }`}
        >
          <Power aria-hidden className="size-3.5 shrink-0" />
          {busy === 'copy-stop' || busy === 'copy-resume' ? 'In corso…' : s.stopped ? COPY_LABELS['copy-resume'] : COPY_LABELS['copy-stop']}
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
              {COPY_LABELS[output.command]}, alle {time(output.at)}
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

function Account({ status: s }) {
  const a = s.account
  return (
    <Section title="Conto demo">
      {a ? (
        <dl className="tr-num grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[14px]">
          <dt className={C.ink2}>Valore</dt>
          <dd>{usd(a.equity, 2)}</dd>
          <dt className={C.ink2}>Contanti</dt>
          <dd>{usd(a.cash, 2)}</dd>
          <dt className={C.ink2}>Numero</dt>
          <dd>{a.account_number}</dd>
          <dt className={C.ink2}>Letto</dt>
          <dd>{time(a.at)}</dd>
        </dl>
      ) : (
        <p className={C.ink2}>Disponibile dopo il primo giro.</p>
      )}
      {s.congress.counts.pending_orders > 0 && (
        <p className={`mt-2 text-[13px] ${C.ink2}`}>{s.congress.counts.pending_orders} ordini in attesa di esecuzione.</p>
      )}
    </Section>
  )
}

function Rules({ status: s }) {
  const f = s.config.fund
  const c = s.config.congress
  return (
    <Section title="Regole">
      <ul className={`space-y-1.5 text-[14px] ${C.ink2}`}>
        <li>
          Capitale diviso {s.config.fund_share_pct}% fondo, {100 - s.config.fund_share_pct}% Congresso.
        </li>
        <li>
          Fondo: prime {f.max_holdings} posizioni del 13F, al massimo {f.max_weight_pct}% per titolo, ritocco oltre{' '}
          {f.rebalance_band_pct} {f.rebalance_band_pct === 1 ? 'punto' : 'punti'} di scarto.
        </li>
        <li>
          Congresso: acquisti da {usd(c.min_amount_usd, 0)} in su, fatti da meno di {c.max_trade_age_days} giorni, {c.max_positions} posti,
          vendita dopo {c.hold_days} giorni{c.sell_on_member_sale ? ' o alla vendita dichiarata dallo stesso deputato' : ''}.
          {c.members.length > 0 && <> Solo: {c.members.join(', ')}.</>}
        </li>
        <li>
          Ordini a mercato solo a borsa aperta, massimo {s.config.max_orders_per_day} al giorno, niente leva né vendite allo scoperto.
        </li>
      </ul>
    </Section>
  )
}
