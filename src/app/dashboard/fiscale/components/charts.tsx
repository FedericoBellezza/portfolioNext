import type { Cents } from "@/lib/fiscale/money";
import type { F24Category, F24Item, TaxYearResult } from "@/lib/fiscale/tax-calculator";
import { daysBetween, eur, MONTHS, pct, shortDate } from "./format";
import { Badge, cx } from "./ui";

// --- Dal lordo al netto -----------------------------------------------------

type Row = { label: string; detail?: string; value: string; kind?: "sub" | "total" | "minus" };

function Rows({ rows }: { rows: Row[] }) {
  return (
    <dl className="divide-y divide-[var(--fi-rule)]">
      {rows.map((r) => (
        <div key={r.label} className={cx("flex items-baseline justify-between gap-4 py-2.5", r.kind === "total" && "font-semibold")}>
          <dt className="min-w-0 text-sm">
            <span className={cx(r.kind === "sub" && "text-[var(--fi-ink-2)]")}>{r.label}</span>
            {r.detail && <span className="ml-2 text-xs text-[var(--fi-muted)]">{r.detail}</span>}
          </dt>
          <dd className={cx("fi-num text-sm", r.kind === "minus" && "text-[var(--fi-ink-2)]", r.kind === "total" && "fi-display text-base")}>
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Left: the forfettario formula on cash collected so far. Right: what this year's income really costs. */
export function TaxWaterfall({ ytd, yearEnd }: { ytd: TaxYearResult; yearEnd: TaxYearResult }) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <p className="fi-label mb-2">Cassa ad oggi</p>
        <Rows
          rows={[
            { label: "Lordo incassato", value: eur(ytd.grossRevenue) },
            { label: "Reddito imponibile lordo", detail: `× ${pct(ytd.coefficient, 0)}`, value: eur(ytd.taxableGross), kind: "sub" },
            { label: "INPS versati (deducibili)", value: `− ${eur(ytd.inpsDeducted)}`, kind: "minus" },
            { label: "Reddito imponibile netto", value: eur(ytd.taxableNet), kind: "sub" },
            { label: "Imposta sostitutiva", detail: pct(ytd.taxRate, 0), value: `− ${eur(ytd.substituteTax)}`, kind: "minus" },
            { label: "Netto reale", value: eur(ytd.netCash), kind: "total" },
          ]}
        />
      </div>
      <div>
        <p className="fi-label mb-2">Per competenza {yearEnd.year}</p>
        <Rows
          rows={[
            { label: "Lordo incassato", value: eur(yearEnd.grossRevenue) },
            { label: "INPS fissi", detail: `${yearEnd.inpsDue.activeMonths} mesi`, value: `− ${eur(yearEnd.inpsDue.fixedTotal)}`, kind: "minus" },
            { label: "INPS eccedenza minimale", detail: pct(yearEnd.inpsDue.params.rate, 0), value: `− ${eur(yearEnd.inpsDue.excess)}`, kind: "minus" },
            { label: "Imposta sostitutiva", detail: "INPS dell'anno dedotti", value: `− ${eur(yearEnd.substituteTax)}`, kind: "minus" },
            { label: "Pressione fiscale", value: pct(yearEnd.effectiveBurdenRate), kind: "sub" },
            { label: "Netto per competenza", value: eur(yearEnd.netAccrual), kind: "total" },
          ]}
        />
      </div>
    </div>
  );
}

// --- Incassi mensili -------------------------------------------------------

export function RevenueChart({ monthly, currentMonth }: { monthly: Cents[]; currentMonth: number }) {
  const max = Math.max(...monthly, 1);
  return (
    <figure>
      <div className="flex h-52 items-end gap-1.5" role="img" aria-label="Incassi per mese">
        {monthly.map((v, i) => (
          <div key={i} className="group flex h-full flex-1 items-end">
            <div
              title={`${MONTHS[i]}: ${eur(v)}`}
              className={cx(
                "w-full rounded-t-sm transition-colors",
                i === currentMonth
                  ? "bg-[var(--fi-reserve)]"
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
            className={cx("flex-1 text-center text-[10px] text-[var(--fi-muted)]", i === currentMonth && "font-semibold text-[var(--fi-ink)]")}
          >
            {m}
          </span>
        ))}
      </div>
    </figure>
  );
}

// --- Soglia 85.000 € -------------------------------------------------------

export function RevenueLimit({ ytd, projected }: { ytd: TaxYearResult; projected: TaxYearResult }) {
  const { limit } = ytd.revenueLimit;
  const ytdPct = Math.min(ytd.grossRevenue / limit, 1) * 100;
  const projPct = Math.min(projected.grossRevenue / limit, 1) * 100;
  const danger = projected.revenueLimit.status !== "ok";
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-[var(--fi-ink-2)]">
        <span>0 €</span>
        <span className="fi-num">{eur(limit)}</span>
      </div>
      <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-full bg-[var(--fi-fill)]">
        <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--fi-bar)]/25" style={{ width: `${projPct}%` }} />
        <div
          className={cx("absolute inset-y-0 left-0 rounded-full", danger ? "bg-[var(--fi-warning)]" : "bg-[var(--fi-good)]")}
          style={{ width: `${ytdPct}%` }}
        />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-[var(--fi-ink-2)]">Incassato</dt>
          <dd className="fi-num font-medium">
            {eur(ytd.grossRevenue)} · {pct(ytd.revenueLimit.ratio)}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--fi-ink-2)]">Stima a fine anno</dt>
          <dd className="fi-num font-medium">{eur(projected.grossRevenue)}</dd>
        </div>
      </dl>
    </div>
  );
}

// --- Scadenze F24 ----------------------------------------------------------

const CATEGORY: Record<F24Category, { label: string; dot: string }> = {
  inps_fixed: { label: "INPS fissi", dot: "bg-[var(--fi-reserve)]" },
  inps_excess: { label: "INPS eccedenza", dot: "bg-[var(--fi-reserve)]/50" },
  substitute_tax: { label: "Imposta sostitutiva", dot: "bg-[var(--fi-ink)]" },
  stamp_duty: { label: "Bollo", dot: "bg-[var(--fi-muted)]" },
  chamber_fee: { label: "Diritto camerale", dot: "bg-[var(--fi-muted)]/50" },
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
  if (items.length === 0) return <p className="py-6 text-sm text-[var(--fi-ink-2)]">Nessuna scadenza.</p>;
  return (
    <ul className="divide-y divide-[var(--fi-rule)]">
      {items.map((item) => {
        const isPaid = paid.has(item.key);
        const days = daysBetween(asOf, item.dueDate);
        const overdue = !isPaid && days < 0 && item.amount > 0;
        return (
          <li key={item.key} className={cx("flex items-center gap-3 py-3", isPaid && "opacity-60")}>
            <div className="fi-num w-14 shrink-0 text-xs font-medium">{shortDate(item.dueDate)}</div>
            <span className={cx("size-2 shrink-0 rounded-full", CATEGORY[item.category].dot)} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{item.label}</p>
              <p className="truncate text-xs text-[var(--fi-muted)]">
                {showCategory && `${CATEGORY[item.category].label} · `}
                {item.category.startsWith("inps") ? "Causale" : "Tributo"} {item.code}
                {item.credit ? ` · credito ${eur(item.credit)}` : ""}
                {item.note ? ` · ${item.note}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="fi-num text-sm font-medium">{eur(item.amount)}</span>
              {dismissed?.has(item.key) ? (
                <Badge tone="outline">Non dovuto</Badge>
              ) : isPaid ? (
                <Badge>Pagato</Badge>
              ) : overdue ? (
                <Badge tone="critical">Da registrare</Badge>
              ) : days >= 0 && days <= 30 ? (
                <Badge tone="solid">Tra {days} gg</Badge>
              ) : item.estimate ? (
                <Badge tone="outline">Stima</Badge>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
