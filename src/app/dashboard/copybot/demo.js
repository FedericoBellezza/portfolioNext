// Dati di esempio, mostrati quando N8N_TRADER_WEBHOOK_URL non è configurata (es. in locale).
// Stessa forma del JSON di `python -m copybot status` (copybot/status.py nel progetto trader-ai).

const DAY = 86_400_000
const iso = (t) => new Date(t).toISOString().slice(0, 19) + '+00:00'
const date = (t) => new Date(t).toISOString().slice(0, 10)

export function demoCopyStatus() {
  const now = Date.now()
  const start = now - 20 * DAY
  const fundTargets = [
    ['AAPL', 'APPLE INC', 23.1, 228],
    ['AXP', 'AMERICAN EXPRESS CO', 17.9, 341],
    ['KO', 'COCA COLA CO', 11.4, 69],
    ['GOOGL', 'ALPHABET INC', 9.8, 196],
    ['BAC', 'BANK OF AMER CORP', 9.6, 47],
    ['CVX', 'CHEVRON CORPORATION', 4.9, 158],
    ['OXY', 'OCCIDENTAL PETE CORP', 4.5, 44],
    ['MCO', 'MOODYS CORP', 3.9, 489],
  ]
  const fundPositions = fundTargets.map(([symbol, , w, price], i) => {
    const cost = 50_000 * (w / 100)
    const value = cost * (1 + ((i % 3) - 1) * 0.021)
    return {
      symbol, qty: value / price, cost_usd: cost, price, value_usd: value, pnl_pct: (value / cost - 1) * 100,
      opened_at: iso(start), member: null, source: '0001193125-26-352200', price_at: iso(now), target_pct: w,
      weight_pct: (value / 50_400) * 100,
    }
  })
  const congressPositions = [
    ['NVDA', 'Cleo Fields', 182, 0.034, 15],
    ['DDOG', 'Jonathan Jackson', 131, -0.012, 12],
    ['CACI', 'Lisa McClain', 512, 0.008, 9],
    ['SNOW', 'Maria Elvira Salazar', 214, 0.051, 18],
  ].map(([symbol, member, price, r, d]) => ({
    symbol, qty: 1250 / price, cost_usd: 1250, price, value_usd: 1250 * (1 + r), pnl_pct: r * 100,
    opened_at: iso(now - d * DAY), member, source: '20035669', price_at: iso(now), target_pct: null,
    weight_pct: ((1250 * (1 + r)) / 50_100) * 100,
  }))
  const sum = (rows) => rows.reduce((a, p) => a + p.value_usd, 0)
  const fundValue = sum(fundPositions) + 50_000 * 0.149
  const congressValue = sum(congressPositions) + 40_000
  const history = Array.from({ length: 21 }, (_, i) => {
    const k = i / 20
    return {
      day: date(start + i * DAY),
      benchmark: 580 * (1 + 0.012 * k + 0.004 * Math.sin(i)),
      fund: 50_000 + (fundValue - 50_000) * k + 120 * Math.sin(i / 2),
      congress: 50_000 + (congressValue - 50_000) * k + 90 * Math.cos(i / 3),
      account: 100_000,
    }
  })
  const buy = (id, symbol, member, owner, lo, hi, tradeAgo, filedAgo, status, reason = null) => ({
    id, doc_id: '20035669', member, owner, asset: symbol, symbol, side: 'buy', trade_date: date(now - tradeAgo * DAY),
    filed_date: date(now - filedAgo * DAY), amount_low: lo, amount_high: hi, status, reason, created_at: iso(now - filedAgo * DAY),
  })
  return {
    generated_at: iso(now),
    paper_only: true,
    stopped: false,
    started_at: iso(start),
    last_cycle: {
      started_at: iso(now - 12 * 60_000), finished_at: iso(now - 11 * 60_000), ok: true, market_open: true,
      new_13f: null, orders: [], fills: 0, warnings: [], error: null,
    },
    account: { equity: fundValue + congressValue, cash: 47_450, buying_power: 94_900, status: 'ACTIVE', account_number: 'PA-ESEMPIO', at: iso(now - 11 * 60_000) },
    benchmark: { symbol: 'SPY', start: 580, last: 587, return_pct: 1.2 },
    config: {
      fund_share_pct: 50, min_order_usd: 5, max_orders_per_day: 40,
      fund: { name: 'Berkshire Hathaway', cik: 1067983, max_holdings: 20, max_weight_pct: 25, rebalance_band_pct: 1 },
      congress: { max_positions: 40, hold_days: 0, sell_on_member_sale: true, partial_sale_fraction: 0.5, replace_oldest_when_full: true, min_amount_usd: 15001, max_trade_age_days: 60, members: [] },
    },
    sleeves: [
      { name: 'fund', label: 'Copia del fondo', capital_usd: 50_000, cash_usd: 7450, invested_usd: sum(fundPositions), value_usd: fundValue, realized_usd: 0, return_pct: (fundValue / 50_000 - 1) * 100, positions: fundPositions },
      { name: 'congress', label: 'Operazioni del Congresso', capital_usd: 50_000, cash_usd: 40_000, invested_usd: sum(congressPositions), value_usd: congressValue, realized_usd: 0, return_pct: (congressValue / 50_000 - 1) * 100, positions: congressPositions },
    ],
    fund: {
      filing: {
        id: '0001193125-26-352200', kind: 'fund', filed_date: '2026-08-14', period: '2026-06-30',
        url: 'https://www.sec.gov/Archives/edgar/data/1067983/000119312526352200/', status: 'parsed',
        note: { holdings: 29, targets: 20, covered_pct: 96 },
      },
      targets: fundTargets.map(([symbol, name, w]) => ({ symbol, name, weight_pct: w })),
      rebalance_pending: false,
      rebalanced_at: iso(start),
      untradable: [],
    },
    congress: {
      counts: { ptr_parsed: 34, ptr_unreadable: 5, buys: 72, queued: 1, ordered: 4, pending_orders: 0 },
      checked_at: iso(now - 40 * 60_000),
      recent_buys: [
        buy(7, 'SNOW', 'Maria Elvira Salazar', '', 15001, 50000, 26, 18, 'ordered'),
        buy(6, 'NVDA', 'Cleo Fields', '', 15001, 50000, 32, 15, 'ordered'),
        buy(5, 'DDOG', 'Jonathan Jackson', 'JT', 50001, 100000, 35, 12, 'ordered'),
        buy(4, 'NOKBF', 'Laurel Lee', 'SP', 15001, 50000, 45, 12, 'skipped', 'non negoziabile su Alpaca'),
        buy(3, 'CACI', 'Lisa McClain', 'SP', 15001, 50000, 49, 9, 'ordered'),
        buy(2, 'MU', 'John J. McGuire III', 'SP', 1001, 15000, 39, 2, 'ignored', 'importo sotto la soglia'),
        buy(1, 'EL', 'Jonathan Jackson', 'JT', 50001, 100000, 35, 1, 'queued'),
      ],
      recent_sells: [],
    },
    orders: [
      { id: 3, created_at: iso(now - 9 * DAY), sleeve: 'congress', symbol: 'SNOW', side: 'buy', notional: 1250, qty: null, status: 'filled', filled_qty: 11.68, filled_avg_price: 214, reason: 'acquisto dichiarato da Maria Elvira Salazar' },
      { id: 2, created_at: iso(now - 15 * DAY), sleeve: 'congress', symbol: 'NVDA', side: 'buy', notional: 1250, qty: null, status: 'filled', filled_qty: 14.12, filled_avg_price: 177, reason: 'acquisto dichiarato da Cleo Fields' },
      { id: 1, created_at: iso(start), sleeve: 'fund', symbol: 'AAPL', side: 'buy', notional: 11550, qty: null, status: 'filled', filled_qty: 51.8, filled_avg_price: 223, reason: 'peso obiettivo 23.1% (ora 0.0%)' },
    ],
    history,
    log_tail: ['(esempio) 12:30:02 INFO copybot: Giro: borsa aperta, 0 ordini, 0 eseguiti registrati'],
  }
}
