import { connection } from "next/server";
import Link from "next/link";
import { todayInRome } from "@/lib/fiscale/data/dashboard";
import { loadDataset } from "@/lib/fiscale/data/load";
import type { InvoiceRow } from "@/lib/fiscale/data/types";
import { date, eur } from "../components/format";
import { Badge, btn, cx, DemoNotice, PageTitle } from "../components/ui";

export const metadata = { title: "Fatture | Fiscale" };

type Filter = "tutte" | "da-incassare" | "bozze" | "da-inviare";

const FILTERS: { id: Filter; label: string; test: (i: InvoiceRow) => boolean }[] = [
  { id: "tutte", label: "Tutte", test: () => true },
  { id: "da-incassare", label: "Da incassare", test: (i) => i.status === "issued" && i.collected < i.total },
  { id: "da-inviare", label: "Da inviare", test: (i) => i.status === "issued" && i.sdiStatus === "not_sent" },
  { id: "bozze", label: "Bozze", test: (i) => i.status === "draft" },
];

type Tone = "neutral" | "outline" | "critical" | "good" | "warning";

/** One status per invoice, in the order that needs attention first. */
function statusOf(i: InvoiceRow, today: string): { label: string; tone: Tone } {
  if (i.status === "draft") return { label: "Bozza", tone: "outline" };
  if (i.status === "cancelled") return { label: "Annullata", tone: "neutral" };
  if (i.sdiStatus === "rejected" || i.sdiStatus === "refused") return { label: "Scartata dallo SdI", tone: "critical" };
  if (i.sdiStatus === "not_sent") return { label: "Da inviare", tone: "warning" };
  if (i.collected >= i.total) return { label: `Incassata ${date(i.lastCollectedAt)}`, tone: "good" };
  if (i.collected > 0) return { label: `Incassati ${eur(i.collected)}`, tone: "warning" };
  if (i.dueDate && i.dueDate < today) return { label: `Scaduta il ${date(i.dueDate)}`, tone: "critical" };
  return { label: i.dueDate ? `Da incassare entro ${date(i.dueDate)}` : "Da incassare", tone: "neutral" };
}

export default async function FatturePage({ searchParams }: { searchParams: Promise<{ stato?: string }> }) {
  await connection();
  const { stato } = await searchParams;
  const filter: Filter = FILTERS.some((f) => f.id === stato) ? (stato as Filter) : "tutte";
  const today = todayInRome();
  const data = await loadDataset();
  const demo = data.source === "demo";
  const counts = Object.fromEntries(FILTERS.map((f) => [f.id, data.invoices.filter(f.test).length])) as Record<Filter, number>;
  const rows = data.invoices.filter(FILTERS.find((f) => f.id === filter)!.test);
  const unpaid = counts["da-incassare"];

  return (
    <>
      <PageTitle
        title="Fatture"
        action={
          <>
            <Link href="/dashboard/fiscale/fatture/importa" className={btn.outline}>
              Importa fatture passate
            </Link>
            <Link href="/dashboard/fiscale/fatture/nuova" className={btn.primary}>
              Nuova fattura
            </Link>
          </>
        }
      />
      <DemoNotice show={demo} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filtra fatture" className="flex flex-wrap gap-1">
          {FILTERS.map((f) => {
            const active = f.id === filter;
            if (f.id !== "tutte" && counts[f.id] === 0 && !active) return null;
            return (
              <Link
                key={f.id}
                href={f.id === "tutte" ? "/dashboard/fiscale/fatture" : `/dashboard/fiscale/fatture?stato=${f.id}`}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-[var(--fi-action)]",
                  active
                    ? "bg-[var(--fi-ink)] text-white"
                    : "text-[var(--fi-ink-2)] hover:bg-[var(--fi-fill)] hover:text-[var(--fi-ink)]",
                )}
              >
                {f.label}
                <span className={cx("fi-num text-xs", active ? "text-white/70" : "text-[var(--fi-muted)]")}>
                  {counts[f.id]}
                </span>
              </Link>
            );
          })}
        </nav>
        {unpaid > 0 && (
          <Link href="/dashboard/fiscale/incassi" className={btn.outline}>
            Registra incassi
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--fi-rule)] px-6 py-12 text-center">
          <p className="text-sm text-[var(--fi-ink-2)]">
            {filter === "tutte" ? "Non hai ancora fatture." : "Nessuna fattura in questo stato."}
          </p>
          {filter === "tutte" && (
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/dashboard/fiscale/fatture/importa" className={btn.outline}>
                Importa le fatture passate
              </Link>
              <Link href="/dashboard/fiscale/fatture/nuova" className={btn.primary}>
                Crea la prima
              </Link>
            </div>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-[var(--fi-rule)] rounded-xl border border-[var(--fi-rule)] bg-[var(--fi-surface)]">
          {rows.map((i) => {
            const s = statusOf(i, today);
            const clickable = !demo;
            const content = (
              <>
                <span className="fi-num w-20 shrink-0 text-sm font-medium">
                  {i.status === "draft" ? "—" : `${i.number}/${i.fiscalYear}`}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{i.clientName}</span>
                  <span className="block text-xs text-[var(--fi-muted)]">{i.issueDate ? date(i.issueDate) : "Non emessa"}</span>
                </span>
                <span className="hidden sm:block">
                  <Badge tone={s.tone}>{s.label}</Badge>
                </span>
                <span className="fi-num w-28 shrink-0 text-right text-sm font-medium">{eur(i.total)}</span>
              </>
            );
            return (
              <li key={i.id}>
                {clickable ? (
                  <Link
                    href={`/dashboard/fiscale/fatture/${i.id}`}
                    className="flex items-center gap-4 px-4 py-3 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-white focus-visible:outline-2 focus-visible:outline-[var(--fi-action)]"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 px-4 py-3">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
