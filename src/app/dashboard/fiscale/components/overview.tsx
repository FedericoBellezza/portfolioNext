import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CircleCheck,
  FilePen,
  PiggyBank,
  Receipt,
  Send,
  TriangleAlert,
} from "lucide-react";
import { buildDashboard } from "@/lib/fiscale/data/dashboard";
import type { FiscalDataset } from "@/lib/fiscale/data/types";
import { sumCents } from "@/lib/fiscale/money";
import { yearOf } from "@/lib/fiscale/tax-calculator";
import { DeadlineList, SplitBar, ThresholdMeter } from "./charts";
import { date, daysBetween, eur, pct, shortDate } from "./format";
import { btn, card, cx, DemoNotice, Disclosure, PageTitle, Panel, Stat, TextLink } from "./ui";
import { YearFlowChart } from "./year-flow-chart";

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

type Tone = "critical" | "warning" | "neutral" | "good";
interface Todo {
  key: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  text: React.ReactNode;
  href: string;
  action: string;
  tone: Tone;
}

const ICON_TONE: Record<Tone, string> = {
  critical: "bg-[var(--fi-critical-soft)] text-[var(--fi-critical-text)]",
  warning: "bg-[var(--fi-warning-soft)] text-[var(--fi-warning-text)]",
  neutral: "bg-[var(--fi-fill)] text-[var(--fi-ink-2)]",
  good: "bg-[var(--fi-good-soft)] text-[var(--fi-good-text)]",
};

/** Panoramica: quanto mi resta, cosa devo fare, come va l'anno. */
export function Overview({
  data,
  asOf,
  newInvoiceHref = "/dashboard/fiscale/fatture/nuova",
}: {
  data: FiscalDataset;
  asOf: string;
  newInvoiceHref?: string | null;
}) {
  const m = buildDashboard(data, asOf);
  const year = m.yearEndOnCurrentRevenue;
  const startupUntil = Number(data.profile.activityStartDate.slice(0, 4)) + data.profile.startupYears - 1;
  const month = Number(asOf.slice(5, 7)) - 1;

  // --- Da fare --------------------------------------------------------------
  const unpaid = data.invoices.filter((i) => i.status === "issued" && i.collected < i.total);
  const drafts = data.invoices.filter((i) => i.status === "draft");
  const toSend = data.invoices.filter((i) => i.status === "issued" && i.sdiStatus === "not_sent");
  const next = m.reserve.upcoming.find((i) => (i.amount > 0 || i.unknownAmount) && daysBetween(asOf, i.dueDate) <= 30);
  const limitWarning = m.projected.revenueLimit.status !== "ok";
  // Invoiced this year, stamp duty charged to the client included (it is income too, as in
  // collections). Taxes and the threshold stay on collections: the forfettario is cash-based.
  const invoicedYtd = sumCents(
    data.invoices
      .filter((i) => i.status === "issued" && i.issueDate && yearOf(i.issueDate) === m.year && i.issueDate <= asOf)
      .map((i) => i.total),
  );

  const todos: Todo[] = [];
  if (m.overdue.length > 0)
    todos.push({
      key: "overdue",
      icon: TriangleAlert,
      tone: "critical",
      text: plural(m.overdue.length, "pagamento F24 passato da registrare", "pagamenti F24 passati da registrare"),
      href: "/dashboard/fiscale/scadenze",
      action: "Registra",
    });
  if (m.overdueTasks.length > 0)
    todos.push({
      key: "tasks-overdue",
      icon: TriangleAlert,
      tone: "critical",
      text:
        m.overdueTasks.length === 1
          ? `Scaduto: ${m.overdueTasks[0].title}`
          : `${m.overdueTasks.length} dichiarazioni o promemoria scaduti`,
      href: "/dashboard/fiscale/scadenze",
      action: "Vedi",
    });
  if (next)
    todos.push({
      key: "next",
      icon: CalendarClock,
      tone: "warning",
      text: (
        <>
          Entro il {shortDate(next.dueDate)}: {next.label}
          <span className="fi-num text-[var(--fi-ink-2)]"> · {next.unknownAmount ? "importo da verificare" : eur(next.amount)}</span>
        </>
      ),
      href: "/dashboard/fiscale/scadenze",
      action: "Come pagare",
    });
  for (const t of m.tasks.filter((t) => !m.doneTasks.has(t.key) && t.dueDate >= asOf && daysBetween(asOf, t.dueDate) <= 30)) {
    todos.push({
      key: `task-${t.key}`,
      icon: CalendarCheck,
      tone: "warning",
      text: (
        <>
          Entro il {shortDate(t.dueDate)}: {t.title}
          {t.amount ? <span className="fi-num text-[var(--fi-ink-2)]"> · {eur(t.amount)}</span> : null}
        </>
      ),
      href: "/dashboard/fiscale/scadenze",
      action: "Come fare",
    });
  }
  if (unpaid.length > 0)
    todos.push({
      key: "unpaid",
      icon: Receipt,
      tone: "neutral",
      text: (
        <>
          {plural(unpaid.length, "fattura da incassare", "fatture da incassare")}
          <span className="fi-num text-[var(--fi-ink-2)]"> · {eur(m.outstanding)}</span>
        </>
      ),
      href: "/dashboard/fiscale/incassi",
      action: "Registra incasso",
    });
  if (toSend.length > 0)
    todos.push({
      key: "send",
      icon: Send,
      tone: "warning",
      text: plural(toSend.length, "fattura emessa da inviare allo SdI", "fatture emesse da inviare allo SdI"),
      href: "/dashboard/fiscale/fatture?stato=da-inviare",
      action: "Invia",
    });
  if (drafts.length > 0)
    todos.push({
      key: "drafts",
      icon: FilePen,
      tone: "neutral",
      text: plural(drafts.length, "bozza da emettere", "bozze da emettere"),
      href: "/dashboard/fiscale/fatture?stato=bozze",
      action: "Apri",
    });
  if (m.availableCredit > 0)
    todos.push({
      key: "credit",
      icon: PiggyBank,
      tone: "good",
      text: (
        <>
          <span className="fi-num">{eur(m.availableCredit)}</span> di credito da usare nei prossimi F24
        </>
      ),
      href: "/dashboard/fiscale/scadenze?vista=crediti",
      action: "Vedi",
    });

  // --- Il tuo anno: money in and out by month ---------------------------------
  const outPaid = Array<number>(12).fill(0);
  for (const p of [...data.inpsPayments, ...data.taxPayments]) {
    if (yearOf(p.paidAt) === m.year) outPaid[Number(p.paidAt.slice(5, 7)) - 1] += p.amount;
  }
  const outPlanned = Array<number>(12).fill(0);
  for (const i of m.schedule) {
    if (yearOf(i.dueDate) === m.year && i.amount > 0 && !m.paid.has(i.key)) outPlanned[Number(i.dueDate.slice(5, 7)) - 1] += i.amount;
  }

  return (
    <>
      <PageTitle
        title="Panoramica"
        description={`Regime forfettario · aggiornata al ${date(asOf)}`}
        action={
          newInvoiceHref && (
            <Link href={newInvoiceHref} className={cx(btn.primary, "lg:hidden")}>
              Nuova fattura
            </Link>
          )
        }
      />
      <DemoNotice show={data.source === "demo"} />

      <div className="space-y-6">
        {/* Headline figures */}
        <div className="grid gap-4 md:grid-cols-3">
          <Stat
            label={`Fatturato nel ${m.year}`}
            value={eur(invoicedYtd)}
            hint={
              <div className="space-y-1.5">
                <p>
                  Incassato <span className="fi-num font-medium text-[var(--fi-ink-2)]">{eur(m.ytd.grossRevenue)}</span>: tasse e
                  soglia si calcolano su questo
                </p>
                <ThresholdMeter collected={m.ytd.grossRevenue} limit={m.ytd.revenueLimit.limit} warn={limitWarning} />
              </div>
            }
          />
          <Stat
            tone="accent"
            label="Da tenere da parte"
            value={eur(m.reserveAfterCredit)}
            hint={
              m.availableCredit > 0
                ? `Per gli F24 fino al 30/6/${m.year + 1}, già scalato il credito`
                : `Per gli F24 fino al 30/6/${m.year + 1}`
            }
          />
          <Stat label="Ti resta" value={eur(year.netAccrual)} hint="Dopo imposta sostitutiva e contributi INPS dell'anno" />
        </div>

        {/* Da fare + prossime scadenze */}
        <div className="grid gap-6 lg:grid-cols-5">
          <section className={cx(card, "lg:col-span-3")} aria-labelledby="todo-title">
            <div className="flex items-baseline justify-between px-5 pt-5 pb-3">
              <h2 id="todo-title" className="text-[15px] font-semibold">Da fare</h2>
              {todos.length > 0 && <span className="fi-num text-xs text-[var(--fi-muted)]">{todos.length}</span>}
            </div>
            {todos.length === 0 ? (
              <p className="flex items-center gap-2 px-5 pb-5 text-sm text-[var(--fi-ink-2)]">
                <CircleCheck aria-hidden className="h-4 w-4 text-[var(--fi-good)]" /> Niente in sospeso: sei in regola.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--fi-rule)] border-t border-[var(--fi-rule)]">
                {todos.map(({ key, icon: Icon, text, href, action, tone }) => (
                  <li key={key}>
                    <Link
                      href={href}
                      className="group flex items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-[var(--fi-ground)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--fi-action)]"
                    >
                      <span className={cx("grid size-8 shrink-0 place-items-center rounded-lg", ICON_TONE[tone])}>
                        <Icon aria-hidden className="h-4 w-4" />
                      </span>
                      <span className={cx("min-w-0 flex-1 text-sm", tone === "critical" && "font-medium")}>{text}</span>
                      <span className="hidden shrink-0 items-center gap-1 text-sm font-medium text-[var(--fi-action)] sm:inline-flex">
                        {action}
                        <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                      </span>
                      <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-[var(--fi-muted)] sm:hidden" />
                      <span className="sr-only sm:hidden">{action}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Panel
            title="Prossimi F24"
            className="lg:col-span-2"
            action={<TextLink href="/dashboard/fiscale/scadenze?vista=calendario">Tutti</TextLink>}
          >
            <div className="-my-3">
              <DeadlineList
                items={m.reserve.upcoming.filter((i) => i.amount > 0 || i.unknownAmount).slice(0, 5)}
                asOf={asOf}
                paid={m.paid}
                dismissed={m.dismissed}
                compact
              />
            </div>
          </Panel>
        </div>

        {/* Il tuo anno */}
        <Panel title={`Il tuo ${m.year}`} description="Incassi sopra la linea, F24 sotto: passa sopra un mese per il dettaglio">
          {year.grossRevenue === 0 ? (
            <p className="text-sm text-[var(--fi-ink-2)]">
              Nel {m.year} non hai ancora registrato incassi: le tasse del forfettario si calcolano su quello che incassi.{" "}
              <TextLink href="/dashboard/fiscale/incassi">Registra un incasso</TextLink>
            </p>
          ) : (
            <div className="space-y-8">
              <YearFlowChart year={m.year} incoming={m.monthlyRevenue} outPaid={outPaid} outPlanned={outPlanned} currentMonth={month} />

              <div className="border-t border-[var(--fi-rule)] pt-6">
                <p className="mb-3 text-sm text-[var(--fi-ink-2)]">
                  Come si divide quello che hai incassato, <span className="fi-num">{eur(year.grossRevenue)}</span>
                </p>
                <SplitBar
                  parts={[
                    { label: "Ti resta", amount: year.netAccrual, tone: "bg-[var(--fi-series-in)]" },
                    { label: "Imposta sostitutiva", amount: year.substituteTax, tone: "bg-[var(--fi-series-out)]" },
                    { label: "Contributi INPS", amount: year.inpsDue.total, tone: "bg-[var(--fi-series-inps)]" },
                  ]}
                />
              </div>

              <Disclosure summary="Come è calcolato">
                <dl className="max-w-xl divide-y divide-[var(--fi-rule)] text-sm">
                  {[
                    [`Incassato nel ${m.year} (conta la data d'incasso)`, eur(year.grossRevenue)],
                    [`Reddito imponibile (${pct(year.coefficient, 0)} dell'incassato)`, eur(year.taxableGross)],
                    ["Contributi INPS versati nell'anno, deducibili", `− ${eur(year.inpsDeducted)}`],
                    [
                      `Imposta sostitutiva ${pct(year.taxRate, 0)}${year.isStartupRate ? ` (start-up fino al ${startupUntil})` : ""}`,
                      eur(year.substituteTax),
                    ],
                    [
                      `Contributi INPS dell'anno: fissi ${eur(year.inpsDue.fixedTotal)} + eccedenza ${eur(year.inpsDue.excess)}`,
                      eur(year.inpsDue.total),
                    ],
                    ["Su ogni 1.000 € incassati, tra imposta e INPS", eur(Math.round(year.effectiveBurdenRate * 100_000))],
                    ...(m.availableCredit > 0
                      ? [["Credito d'imposta disponibile, scalato da quanto tenere da parte", eur(m.availableCredit)]]
                      : []),
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-6 py-2">
                      <dt className="text-[var(--fi-ink-2)]">{label}</dt>
                      <dd className="fi-num shrink-0">{value}</dd>
                    </div>
                  ))}
                </dl>
                {limitWarning && (
                  <p className="mt-3 max-w-xl text-xs text-[var(--fi-warning-text)]">
                    Di questo passo a fine anno arrivi a circa {eur(m.projected.grossRevenue)}: sopra 85.000 € esci dal
                    forfettario dall&apos;anno successivo.
                  </p>
                )}
                {m.projected.warnings.length > 0 && (
                  <ul className="mt-3 max-w-xl space-y-1 text-xs text-[var(--fi-ink-2)]">
                    {[...new Set(m.projected.warnings)].map((w) => (
                      <li key={w}>· {w}</li>
                    ))}
                  </ul>
                )}
              </Disclosure>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
