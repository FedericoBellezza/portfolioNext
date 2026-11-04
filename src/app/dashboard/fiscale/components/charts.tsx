import type { Cents } from "@/lib/fiscale/money";
import type { F24Category, F24Item } from "@/lib/fiscale/tax-calculator";
import { dayDate, daysBetween, eur, MONTHS, pct } from "./format";
import { Badge, cx } from "./ui";

// --- How the collected money splits ------------------------------------------

export interface SplitPart {
  label: string;
  amount: Cents;
  /** Tailwind background class for the bar segment and the legend swatch. */
  tone: string;
}

/** One horizontal bar: what is yours and what goes to taxes and INPS. */
export function SplitBar({ parts }: { parts: SplitPart[] }) {
  const total = parts.reduce((s, p) => s + Math.max(0, p.amount), 0);
  return (
    <div>
      <div
        className="flex h-3 overflow-hidden rounded-full bg-[var(--fi-fill)]"
        role="img"
        aria-label={parts.map((p) => `${p.label} ${eur(p.amount)}`).join(", ")}
      >
        {total > 0 &&
          parts.map((p) => (
            <div key={p.label} className={p.tone} style={{ width: `${(Math.max(0, p.amount) / total) * 100}%` }} />
          ))}
      </div>
      <dl className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-3">
        {parts.map((p) => (
          <div key={p.label} className="flex items-baseline gap-2">
            <span aria-hidden className={cx("size-2.5 shrink-0 translate-y-[1px] rounded-full", p.tone)} />
            <dt className="text-sm text-[var(--fi-ink-2)]">{p.label}</dt>
            <dd className="fi-num ml-auto text-sm font-medium sm:ml-0">{eur(p.amount)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// --- Monthly collections ------------------------------------------------------

export function RevenueChart({ monthly, currentMonth }: { monthly: Cents[]; currentMonth: number }) {
  const max = Math.max(...monthly, 1);
  return (
    <figure>
      <div className="flex h-40 items-end gap-1.5" role="img" aria-label="Incassi per mese">
        {monthly.map((v, i) => (
          <div key={i} className="group flex h-full flex-1 items-end">
            <div
              title={`${MONTHS[i]}: ${eur(v)}`}
              className={cx(
                "w-full rounded-t-[3px] transition-colors",
                i === currentMonth
                  ? "bg-[var(--fi-action)]"
                  : v > 0
                    ? "bg-[var(--fi-bar)] group-hover:bg-[var(--fi-ink)]"
                    : "bg-[var(--fi-fill)]",
              )}
              style={{ height: `${Math.max((v / max) * 100, v > 0 ? 3 : 1.5)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        {MONTHS.map((m, i) => (
          <span
            key={m}
            className={cx(
              "flex-1 text-center text-[10px] text-[var(--fi-muted)]",
              i === currentMonth && "font-semibold text-[var(--fi-ink)]",
            )}
          >
            {m}
          </span>
        ))}
      </div>
    </figure>
  );
}

/** Compact progress toward the 85.000 € forfettario limit. */
export function ThresholdMeter({ collected, limit, warn }: { collected: Cents; limit: Cents; warn: boolean }) {
  const ratio = Math.min(collected / limit, 1);
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--fi-ink-2)]">
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--fi-fill)]" aria-hidden>
        <span
          className={cx("block h-full rounded-full", warn ? "bg-[var(--fi-warning)]" : "bg-[var(--fi-bar)]")}
          style={{ width: `${ratio * 100}%` }}
        />
      </span>
      <span className={cx(warn && "font-medium text-[var(--fi-warning-text)]")}>
        {pct(ratio, 0)} della soglia di {eur(limit)}
      </span>
    </div>
  );
}

// --- F24 deadlines ----------------------------------------------------------

const CATEGORY: Record<F24Category, string> = {
  inps_fixed: "INPS fissi",
  inps_excess: "INPS eccedenza",
  substitute_tax: "Imposta sostitutiva",
  stamp_duty: "Bollo",
  chamber_fee: "Diritto camerale",
  inail: "INAIL",
};

export function DeadlineList({
  items,
  asOf,
  paid,
  dismissed,
  showCategory = false,
}: {
  items: F24Item[];
  asOf: string;
  /** Settled keys: paid or marked as not due. */
  paid: ReadonlySet<string>;
  dismissed?: ReadonlySet<string>;
  showCategory?: boolean;
}) {
  if (items.length === 0) return <p className="py-4 text-sm text-[var(--fi-ink-2)]">Nessuna scadenza.</p>;
  return (
    <ul className="divide-y divide-[var(--fi-rule)]">
      {items.map((item) => {
        const isPaid = paid.has(item.key);
        const days = daysBetween(asOf, item.dueDate);
        const overdue = !isPaid && days < 0 && (item.amount > 0 || item.unknownAmount);
        return (
          <li key={item.key} className={cx("flex items-center gap-4 py-3", isPaid && "text-[var(--fi-ink-2)]")}>
            <span className="fi-num w-24 shrink-0 text-sm">{dayDate(item.dueDate, Number(asOf.slice(0, 4)))}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{item.label}</p>
              {showCategory && <p className="truncate text-xs text-[var(--fi-muted)]">{CATEGORY[item.category]}</p>}
            </div>
            <span className="fi-num w-24 shrink-0 text-right text-sm font-medium">
              {item.unknownAmount ? <span className="font-normal text-[var(--fi-muted)]">da verificare</span> : eur(item.amount)}
            </span>
            <span className="hidden w-24 shrink-0 text-right sm:block">
              {dismissed?.has(item.key) ? (
                <Badge tone="outline">Non dovuto</Badge>
              ) : isPaid ? (
                <Badge tone="good">Pagato</Badge>
              ) : overdue ? (
                <Badge tone="critical">Da registrare</Badge>
              ) : days >= 0 && days <= 30 ? (
                <Badge tone="warning">Tra {days} gg</Badge>
              ) : item.estimate ? (
                <Badge tone="outline">Stima</Badge>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
