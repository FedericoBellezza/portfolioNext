// Dati di esempio, mostrati quando N8N_TRADER_WEBHOOK_URL non è configurata (es. in locale).
// Stessa forma del JSON di `python -m trader status` (trader/status.py nel progetto trader-ai).

const DAY = 86_400_000
const iso = (t) => new Date(t).toISOString().slice(0, 19) + '+00:00'
const date = (t) => new Date(t).toISOString().slice(0, 10)

function prediction(id, symbol, direction, confidence, horizon, catalyst, pricedIn, reasoning, created) {
  const crypto = symbol.includes('/')
  return {
    id, created_at: iso(created), symbol, asset_class: crypto ? 'crypto' : 'stock', direction, confidence,
    horizon_days: horizon, expected_move_pct: direction === 'neutral' ? 0 : 3, catalyst_type: catalyst,
    priced_in: pricedIn, reasoning, key_risks: 'Mercato debole nel complesso.', entry_price: 100,
    benchmark_symbol: symbol === 'BTC/USD' ? null : crypto ? 'BTC/USD' : 'SPY', target_date: date(created + horizon * DAY),
    status: 'open', return_pct: null, benchmark_return_pct: null, excess_return_pct: null, hit: null, evaluated_at: null,
  }
}

function summarize(rows) {
  const hits = rows.reduce((a, r) => a + (r.hit ?? 0), 0)
  const signed = rows
    .filter((r) => r.direction !== 'neutral')
    .map((r) => (r.excess_return_pct ?? 0) * (r.direction === 'bullish' ? 1 : -1))
  return {
    n: rows.length,
    hits,
    hit_rate: rows.length ? hits / rows.length : null,
    avg_signed_return_pct: signed.length ? signed.reduce((a, b) => a + b, 0) / signed.length : null,
  }
}

function groups(rows, key) {
  const m = new Map()
  rows.forEach((r) => m.set(key(r), [...(m.get(key(r)) ?? []), r]))
  return [...m.entries()].map(([k, v]) => ({ key: k, ...summarize(v) })).sort((a, b) => b.n - a.n)
}

const bucket = (c) => (c < 0.55 ? '< 0.55' : c < 0.65 ? '0.55–0.65' : c < 0.75 ? '0.65–0.75' : '≥ 0.75')

export function demoStatus(now = Date.now()) {
  const open = [
    prediction(1, 'NVDA', 'bullish', 0.72, 10, 'earnings', 'partially', 'Guidance sul data center alzata oltre il consenso; il titolo ha reagito solo in parte.', now - 0.2 * DAY),
    prediction(2, 'ETH/USD', 'bullish', 0.66, 7, 'crypto_specific', 'no', 'Afflussi netti negli ETF per il quinto giorno; il prezzo non ha ancora seguito BTC.', now - 0.6 * DAY),
    prediction(3, 'BA', 'bearish', 0.64, 14, 'legal_regulatory', 'partially', 'Nuova ispezione FAA sulle consegne: rischio di ulteriori ritardi nel trimestre.', now - 1.1 * DAY),
    prediction(4, 'JPM', 'neutral', 0.58, 5, 'macro', 'yes', "Dati sull'inflazione in linea: notizia già scontata dal mercato.", now - 1.4 * DAY),
    prediction(5, 'LLY', 'bullish', 0.69, 15, 'product', 'no', 'Approvazione anticipata in Europa per la nuova formulazione.', now - 2.3 * DAY),
  ]
  const outcomes = [
    ['AAPL', 'bullish', 0.71, 3.4, 'earnings'], ['TSLA', 'bearish', 0.62, 2.1, 'management'],
    ['MSFT', 'bullish', 0.68, -1.2, 'partnership'], ['BTC/USD', 'bullish', 0.6, 4.8, 'crypto_specific'],
    ['XOM', 'bearish', 0.57, -2.6, 'macro'], ['AMD', 'bullish', 0.74, 5.1, 'product'],
    ['DIS', 'bearish', 0.61, 1.4, 'management'], ['SOL/USD', 'bullish', 0.55, -6.3, 'crypto_specific'],
    ['GS', 'bullish', 0.66, 0.9, 'earnings'], ['PFE', 'bearish', 0.63, -0.8, 'legal_regulatory'],
    ['META', 'bullish', 0.77, 2.7, 'earnings'], ['KO', 'neutral', 0.59, 0.6, 'analyst_rating'],
  ]
  const evaluated = outcomes
    .map(([sym, dir, conf, excess, cat], i) => {
      const created = now - (24 - i * 1.6) * DAY
      const signed = dir === 'bearish' ? -excess : excess
      const hit = dir === 'neutral' ? (Math.abs(excess) <= 2 ? 1 : 0) : signed > 0 ? 1 : 0
      return {
        ...prediction(100 + i, sym, dir, conf, 10, cat, 'partially', 'Previsione di esempio.', created),
        status: 'evaluated',
        excess_return_pct: excess,
        return_pct: excess + 0.4,
        benchmark_return_pct: 0.4,
        hit,
        evaluated_at: iso(created + 10 * DAY),
      }
    })
    .reverse()

  const directional = evaluated.filter((e) => e.direction !== 'neutral')
  let cum = 0
  const daily = [...evaluated].reverse().map((e) => {
    cum += e.direction === 'neutral' ? 0 : (e.excess_return_pct ?? 0) * (e.direction === 'bullish' ? 1 : -1)
    return { day: (e.evaluated_at ?? '').slice(0, 10), ...summarize([e]), cum_signed_return_pct: cum }
  })

  return {
    generated_at: iso(now),
    phase: 1,
    paper_only: true,
    config: {
      backend: 'claude_cli',
      models: { triage: 'claude-haiku-5-5', analyst: 'claude-sonnet-5-5', review: 'claude-opus-5-5' },
      cycle_minutes: 30,
      stocks: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD', 'AVGO', 'ORCL', 'CRM', 'NFLX', 'JPM', 'BAC', 'GS', 'V', 'MA', 'UNH', 'LLY', 'JNJ', 'PFE', 'XOM', 'CVX', 'CAT', 'BA', 'WMT', 'COST', 'KO', 'MCD', 'DIS'],
      crypto: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'LINK/USD', 'AVAX/USD'],
      risk: { max_position_pct: 5, max_open_positions: 10, stop_loss_pct: 7, take_profit_pct: 15, max_daily_loss_pct: 3, min_confidence: 0.65 },
    },
    stopped: false,
    last_cycle: {
      started_at: iso(now - 12 * 60_000),
      finished_at: iso(now - 10 * 60_000),
      ok: true, news: 14, relevant: 3, predictions: 1, evaluated: 0, paused: null, error: null, error_streak: 0,
    },
    spend: {
      today_usd: 1.12,
      month_usd: 31.4,
      daily_limit_usd: 3,
      monthly_limit_usd: 60,
      by_purpose_30d: [
        { purpose: 'analyst', model: 'claude-sonnet-5-5', n: 182, cost: 22.9 },
        { purpose: 'triage', model: 'claude-haiku-5-5', n: 410, cost: 8.3 },
        { purpose: 'check', model: 'claude-haiku-5-5', n: 3, cost: 0.04 },
      ],
      daily_30d: Array.from({ length: 14 }, (_, i) => ({
        day: date(now - (13 - i) * DAY),
        n: 20 + ((i * 7) % 13),
        cost: 0.6 + ((i * 37) % 100) / 60,
      })),
    },
    counts: {
      news_total: 3120, news_24h: 186, relevant_24h: 21, untriaged: 0, pending_tickers: 2,
      predictions_open: open.length, predictions_evaluated: evaluated.length,
    },
    stats: {
      all: summarize(evaluated),
      directional: summarize(directional),
      by_confidence: groups(directional, (r) => bucket(r.confidence)),
      by_catalyst: groups(evaluated, (r) => r.catalyst_type),
      by_priced_in: groups(directional, (r) => r.priced_in),
      by_asset_class: groups(evaluated, (r) => r.asset_class),
      daily,
    },
    open_predictions: open,
    evaluated_predictions: evaluated,
    news: [
      { id: 1, created_at: iso(now - 0.2 * DAY), headline: 'Nvidia raises data center outlook as AI demand stays strong', source: 'benzinga', url: 'https://www.benzinga.com', symbols: ['NVDA'], importance: 5, triage_reason: 'Guidance alzata sopra le attese' },
      { id: 2, created_at: iso(now - 0.5 * DAY), headline: 'Spot Ether ETFs log fifth straight day of inflows', source: 'benzinga', url: 'https://www.benzinga.com', symbols: ['ETHUSD'], importance: 4, triage_reason: 'Flussi istituzionali in crescita' },
      { id: 3, created_at: iso(now - 1.1 * DAY), headline: 'FAA opens new review of Boeing 737 production line', source: 'benzinga', url: 'https://www.benzinga.com', symbols: ['BA'], importance: 4, triage_reason: 'Possibili ritardi nelle consegne' },
    ],
    log_tail: [
      '2026-10-30 14:18:02 INFO    trader.news: Notizie nuove: 14',
      '2026-10-30 14:18:09 INFO    trader.triage: Rilevanti: 3 su 14',
      '2026-10-30 14:19:41 INFO    trader.analyst: NVDA: bullish conf 0.72 orizzonte 10g',
      '2026-10-30 14:20:03 INFO    trader: Ciclo: 14 notizie, 3 rilevanti, 1 previsioni, 0 valutate',
    ],
  }
}
