"use client";

import { useState } from "react";
import { eur, MONTHS } from "./format";
import { cx } from "./ui";

const MONTH_NAMES = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

const HEIGHT = 220; // px shared by both sides: one value axis

/**
 * The fiscal year at a glance: money in above the line (collections), money out
 * below it (F24 paid, and the ones still expected). Same scale on both sides.
 */
export function YearFlowChart({
  year,
  incoming,
  outPaid,
  outPlanned,
  currentMonth,
}: {
  year: number;
  incoming: number[];
  outPaid: number[];
  outPlanned: number[];
  currentMonth: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const maxIn = Math.max(...incoming, 1);
  const maxOut = Math.max(...outPaid.map((p, i) => p + outPlanned[i]), 1);
  const scale = HEIGHT / (maxIn + maxOut);
  const topH = maxIn * scale;
  const bottomH = maxOut * scale;
  const px = (cents: number) => (cents > 0 ? Math.max(cents * scale, 2) : 0);
  const shown = hover ?? currentMonth;

  return (
    <figure>
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--fi-ink-2)]">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-[var(--fi-series-in)]" /> Incassi
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-[var(--fi-series-out)]" /> F24 pagati
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-[var(--fi-series-out)]/35" /> F24 previsti
        </span>
        <span className="fi-num ml-auto text-[var(--fi-ink)]" aria-live="polite">
          <b className="font-medium">{MONTH_NAMES[shown]}</b>: +{eur(incoming[shown])} · −
          {eur(outPaid[shown] + outPlanned[shown])}
          {outPlanned[shown] > 0 && <span className="text-[var(--fi-muted)]"> (di cui previsti {eur(outPlanned[shown])})</span>}
        </span>
      </div>

      <div className="flex gap-1 sm:gap-1.5" role="img" aria-label={`Incassi e F24 per mese nel ${year}`} onMouseLeave={() => setHover(null)}>
        {incoming.map((inc, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${MONTH_NAMES[i]}: incassi ${eur(inc)}, F24 pagati ${eur(outPaid[i])}, previsti ${eur(outPlanned[i])}`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className={cx(
              "group flex min-w-0 flex-1 flex-col items-stretch rounded-md px-0.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--fi-action)]",
              shown === i && "bg-[var(--fi-fill)]/70",
            )}
          >
            {/* money in */}
            <span className="flex flex-col justify-end" style={{ height: topH }}>
              <span
                className={cx("w-full rounded-t-[4px] bg-[var(--fi-series-in)]", i > currentMonth && "opacity-40")}
                style={{ height: px(inc) }}
              />
            </span>
            {/* zero line */}
            <span aria-hidden className="h-px w-full bg-[var(--fi-rule-strong)]" />
            {/* money out: paid first, planned after a 2px gap */}
            <span className="flex flex-col" style={{ height: bottomH }}>
              {outPaid[i] > 0 && (
                <span className={cx("w-full bg-[var(--fi-series-out)]", outPlanned[i] === 0 && "rounded-b-[4px]")} style={{ height: px(outPaid[i]) }} />
              )}
              {outPlanned[i] > 0 && (
                <span
                  className={cx("w-full rounded-b-[4px] bg-[var(--fi-series-out)]/35", outPaid[i] > 0 && "mt-[2px]")}
                  style={{ height: px(outPlanned[i]) }}
                />
              )}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-2 flex gap-1 sm:gap-1.5" aria-hidden>
        {MONTHS.map((m, i) => (
          <span
            key={m}
            className={cx("min-w-0 flex-1 text-center text-[11px] text-[var(--fi-muted)]", i === currentMonth && "font-semibold text-[var(--fi-ink)]")}
          >
            {/* Very narrow screens: the initial only ("Dic" would push the row wider). */}
            <span className="min-[360px]:hidden">{m.charAt(0)}</span>
            <span className="hidden min-[360px]:inline">{m}</span>
          </span>
        ))}
      </div>

      {/* Hidden through a wrapper: a table ignores the 1px height of sr-only and would stretch the page. */}
      <div className="sr-only">
      <table>
        <caption>Incassi e F24 per mese nel {year}</caption>
        <thead>
          <tr>
            <th>Mese</th>
            <th>Incassi</th>
            <th>F24 pagati</th>
            <th>F24 previsti</th>
          </tr>
        </thead>
        <tbody>
          {incoming.map((inc, i) => (
            <tr key={i}>
              <th>{MONTH_NAMES[i]}</th>
              <td>{eur(inc)}</td>
              <td>{eur(outPaid[i])}</td>
              <td>{eur(outPlanned[i])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  );
}
