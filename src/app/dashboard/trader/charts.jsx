'use client'

import { useEffect, useRef, useState } from 'react'

// Grafici SVG a serie singola, con tooltip al passaggio e vista tabella alternativa.

function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

function niceTicks(min, max, count = 4) {
  if (min === max) {
    min -= 1
    max += 1
  }
  const span = max - min
  const mag = Math.pow(10, Math.floor(Math.log10(span / count)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? 10 * mag
  const ticks = []
  const end = Math.ceil(max / step - 1e-9) * step
  for (let v = Math.floor(min / step + 1e-9) * step; v <= end + step * 0.001; v += step) ticks.push(Number(v.toFixed(10)))
  return ticks
}

// Margini del grafico: quello sinistro si allarga quanto serve alle etichette dell'asse Y.
function margins(tickLabels) {
  const longest = Math.max(...tickLabels.map((t) => String(t).length))
  return { top: 12, right: 12, bottom: 24, left: Math.max(32, Math.ceil(longest * 6.4) + 10) }
}

function ChartFrame({ title, caption, table, children }) {
  const [showTable, setShowTable] = useState(false)
  return (
    <figure className="m-0">
      <div className="flex items-center justify-between gap-3">
        <figcaption className="text-[15px] font-semibold">{title}</figcaption>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="tr-hit -my-1 -mr-2 shrink-0 cursor-pointer rounded px-2 text-[13px] text-[var(--tr-ink-2)] underline decoration-[var(--tr-rule)] underline-offset-4 hover:text-[var(--tr-ink)] hover:decoration-[var(--tr-ink-2)]"
          aria-pressed={showTable}
          aria-label={showTable ? `${title}: mostra il grafico` : `${title}: mostra i dati in tabella`}
        >
          {showTable ? 'Grafico' : 'Tabella'}
        </button>
      </div>
      {caption && <p className="mt-0.5 text-[13px] text-[var(--tr-ink-2)]">{caption}</p>}
      <div className="mt-3">
        {showTable ? (
          <table className="tr-num w-full text-[13px]">
            <thead>
              <tr className="text-left text-[var(--tr-ink-2)]">
                {table.head.map((h, i) => (
                  <th key={i} scope="col" className="pb-1 pr-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-t border-[var(--tr-rule)]">
                  {r.map((c, j) => (
                    <td key={j} className="py-1 pr-3">{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          children
        )}
      </div>
    </figure>
  )
}

function Tooltip({ x, y, width, children }) {
  const left = Math.min(Math.max(x, 70), Math.max(70, width - 70))
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-[var(--tr-rule)] bg-[var(--tr-surface)] px-2.5 py-1.5 text-[12px] leading-snug shadow-sm"
      style={{ left, top: y - 10 }}
      role="status"
    >
      {children}
    </div>
  )
}

/** Linea: andamento cumulato (può andare sotto zero). */
export function LineChart({ title, caption, points, format, height = 180 }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)
  const table = { head: ['Giorno', 'Valore'], rows: points.map((p) => [p.label, format(p.value)]) }

  if (points.length < 2) {
    return (
      <ChartFrame title={title} caption={caption} table={table}>
        <p className="text-[13px] text-[var(--tr-ink-2)]">Servono almeno due giorni di valutazioni per disegnare l&apos;andamento.</p>
      </ChartFrame>
    )
  }

  const values = points.map((p) => p.value)
  const ticks = niceTicks(Math.min(0, ...values), Math.max(0, ...values))
  const M = margins(ticks.map(format))
  const lo = ticks[0]
  const hi = ticks[ticks.length - 1]
  const iw = Math.max(0, width - M.left - M.right)
  const ih = height - M.top - M.bottom
  const x = (i) => M.left + (i / (points.length - 1)) * iw
  const y = (v) => M.top + ih - ((v - lo) / (hi - lo)) * ih
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('')
  const labelEvery = Math.ceil(points.length / Math.max(2, Math.floor(iw / 70)))

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - rect.left - M.left) / iw) * (points.length - 1))
    setHover(Math.min(points.length - 1, Math.max(0, i)))
  }

  return (
    <ChartFrame title={title} caption={caption} table={table}>
      <div ref={ref} className="relative" style={{ height }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`${title}: ultimo valore ${format(values[values.length - 1])}`}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
            className="touch-pan-y"
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--tr-axis)' : 'var(--tr-grid)'} strokeWidth={1} />
                <text x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--tr-muted)" className="tr-num">
                  {format(t)}
                </text>
              </g>
            ))}
            {points.map((p, i) =>
              (points.length - 1 - i) % labelEvery === 0 ? (
                <text key={p.label} x={x(i)} y={height - 6} textAnchor="middle" fontSize={11} fill="var(--tr-muted)" className="tr-num">
                  {p.short ?? p.label}
                </text>
              ) : null,
            )}
            <path d={d} fill="none" stroke="var(--tr-series)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {hover === null && (
              <circle cx={x(points.length - 1)} cy={y(values[values.length - 1])} r={3.5} fill="var(--tr-series)" />
            )}
            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + ih} stroke="var(--tr-axis)" strokeWidth={1} />
                <circle cx={x(hover)} cy={y(points[hover].value)} r={5} fill="var(--tr-series)" stroke="var(--tr-surface)" strokeWidth={2} />
              </g>
            )}
          </svg>
        )}
        {hover !== null && width > 0 && (
          <Tooltip x={x(hover)} y={y(points[hover].value)} width={width}>
            <div className="text-[var(--tr-ink-2)]">{points[hover].label}</div>
            <div className="tr-num font-semibold">{format(points[hover].value)}</div>
            {points[hover].detail && <div className="text-[var(--tr-ink-2)]">{points[hover].detail}</div>}
          </Tooltip>
        )}
      </div>
    </ChartFrame>
  )
}

/** Barre verticali dalla base zero, con linea di riferimento opzionale (es. limite di spesa). */
export function BarChart({ title, caption, points, format, reference, max, height = 170 }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)
  const table = {
    head: ['Voce', 'Valore', ''],
    rows: points.map((p) => [p.short ?? p.label, format(p.value), p.detail ?? '']),
  }
  if (points.length === 0) {
    return (
      <ChartFrame title={title} caption={caption} table={table}>
        <p className="text-[13px] text-[var(--tr-ink-2)]">Ancora nessun dato.</p>
      </ChartFrame>
    )
  }

  const top = max ?? Math.max(...points.map((p) => p.value), reference?.value ?? 0)
  const ticks = niceTicks(0, top || 1, 3)
  const M = margins(ticks.map(format))
  const hi = ticks[ticks.length - 1]
  const iw = Math.max(0, width - M.left - M.right)
  const ih = height - M.top - M.bottom
  const slot = iw / points.length
  const bw = Math.max(2, Math.min(28, slot - 2))
  const y = (v) => M.top + ih - (v / hi) * ih
  const cx = (i) => M.left + slot * i + slot / 2
  const labelEvery = Math.ceil(points.length / Math.max(2, Math.floor(iw / 48)))

  const barPath = (i, v) => {
    const x0 = cx(i) - bw / 2
    const y0 = y(v)
    const h = M.top + ih - y0
    if (h <= 0) return ''
    const r = Math.min(4, bw / 2, h)
    return `M${x0},${M.top + ih}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x0 + bw - r}Q${x0 + bw},${y0} ${x0 + bw},${y0 + r}V${M.top + ih}Z`
  }

  return (
    <ChartFrame title={title} caption={caption} table={table}>
      <div ref={ref} className="relative" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={title} onPointerLeave={() => setHover(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--tr-axis)' : 'var(--tr-grid)'} strokeWidth={1} />
                <text x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--tr-muted)" className="tr-num">
                  {format(t)}
                </text>
              </g>
            ))}
            {points.map((p, i) => (
              <g key={p.label}>
                <path d={barPath(i, p.value)} fill="var(--tr-series)" opacity={hover === null || hover === i ? 1 : 0.55} />
                {(points.length - 1 - i) % labelEvery === 0 && (
                  <text x={cx(i)} y={height - 6} textAnchor="middle" fontSize={11} fill="var(--tr-muted)" className="tr-num">
                    {p.short ?? p.label}
                  </text>
                )}
                <rect
                  x={M.left + slot * i}
                  y={M.top}
                  width={slot}
                  height={ih}
                  fill="transparent"
                  onPointerEnter={() => setHover(i)}
                  onPointerDown={() => setHover(i)}
                />
              </g>
            ))}
            {reference && reference.value <= hi && (
              <g>
                <line
                  x1={M.left}
                  x2={width - M.right}
                  y1={y(reference.value)}
                  y2={y(reference.value)}
                  stroke="var(--tr-ink-2)"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                />
                <text x={width - M.right} y={y(reference.value) - 4} textAnchor="end" fontSize={11} fill="var(--tr-ink-2)">
                  {reference.label}
                </text>
              </g>
            )}
          </svg>
        )}
        {hover !== null && width > 0 && (
          <Tooltip x={cx(hover)} y={y(points[hover].value)} width={width}>
            <div className="text-[var(--tr-ink-2)]">{points[hover].short ?? points[hover].label}</div>
            <div className="tr-num font-semibold">{format(points[hover].value)}</div>
            {points[hover].detail && <div className="text-[var(--tr-ink-2)]">{points[hover].detail}</div>}
          </Tooltip>
        )}
      </div>
    </ChartFrame>
  )
}
