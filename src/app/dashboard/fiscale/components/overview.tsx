import Link from "next/link";
import { ArrowRight, CalendarClock, CircleCheck, FilePen, Receipt, Send, TriangleAlert } from "lucide-react";
import { buildDashboard } from "@/lib/fiscale/data/dashboard";
import type { FiscalDataset } from "@/lib/fiscale/data/types";
import { DeadlineList, RevenueChart, SplitBar, ThresholdMeter } from "./charts";
import { date, daysBetween, eur, pct, shortDate } from "./format";
import { btn, cx, DemoNotice, Disclosure, PageTitle, Section, TextLink } from "./ui";

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

interface Todo {
  key: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  text: React.ReactNode;
  href: string;
  action: string;
  urgent?: boolean;
}

/** Panoramica: cosa devo fare, quanto mi resta, come sta andando l'anno. */
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

  // --- Da fare --------------------------------------------------------------
  const unpaid = data.invoices.filter((i) => i.status === "issued" && i.collected < i.total);
  const drafts = data.invoices.filter((i) => i.status === "draft");
  const toSend = data.invoices.filter((i) => i.status === "issued" && i.sdiStatus === "not_sent");
  const next = m.reserve.upcoming.find((i) => (i.amount > 0 || i.unknownAmount) && daysBetween(asOf, i.dueDate) <= 30);
  const limitWarning = m.projected.revenueLimit.status !== "ok";

  const todos: Todo[] = [];
  if (m.overdue.length > 0)
    todos.push({
      key: "overdue",
      icon: TriangleAlert,
      urgent: true,
      text: <>{plural(m.overdue.length, "pagamento F24 passato da registrare", "pagamenti F24 passati da registrare")}</>,
      href: "/dashboard/fiscale/scadenze#registra",
      action: "Registra",
    });
  if (next)
    todos.push({
      key: "next",
      icon: CalendarClock,
      text: (
        <>
          Entro il {shortDate(next.dueDate)}: {next.label}
          <span className="fi-num text-[var(--fi-ink-2)]"> · {next.unknownAmount ? "importo da verificare" : eur(next.amount)}</span>
        </>
      ),
      href: "/dashboard/fiscale/scadenze#registra",
      action: "Come pagare",
    });
  if (unpaid.length > 0)
    todos.push({
      key: "unpaid",
      icon: Receipt,
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
      text: <>{plural(toSend.length, "fattura emessa da inviare allo SdI", "fatture emesse da inviare allo SdI")}</>,
      href: `/dashboard/fiscale/fatture?stato=da-inviare`,
      action: "Invia",
    });
  if (drafts.length > 0)
    todos.push({
      key: "drafts",
      icon: FilePen,
      text: <>{plural(drafts.length, "bozza da emettere", "bozze da emettere")}</>,
      href: `/dashboard/fiscale/fatture?stato=bozze`,
      action: "Apri",
    });

  return (
    <>
      <PageTitle
        title="Fiscale"
        description={`Regime forfettario · ${m.year}`}
        action={
          newInvoiceHref && (
            <Link href={newInvoiceHref} className={btn.primary}>
              Nuova fattura
            </Link>
          )
        }
      />
      <DemoNotice show={data.source === "demo"} />

      <div className="space-y-12">
        {/* Da fare */}
        <Section title="Da fare">
          {todos.length === 0 ? (
            <p className="flex items-center gap-2 rounded-xl border border-[var(--fi-rule)] bg-[var(--fi-surface)] px-4 py-4 text-sm text-[var(--fi-ink-2)]">
              <CircleCheck aria-hidden className="h-4 w-4 text-[var(--fi-good)]" /> Niente in sospeso: sei in regola.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--fi-rule)] rounded-xl border border-[var(--fi-rule)] bg-[var(--fi-surface)]">
              {todos.map(({ key, icon: Icon, text, href, action, urgent }) => (
                <li key={key}>
                  <Link
                    href={href}
                    className="group flex items-center gap-3 px-4 py-3.5 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-white focus-visible:outline-2 focus-visible:outline-[var(--fi-action)]"
                  >
                    <Icon
                      aria-hidden
                      className={cx("h-4 w-4 shrink-0", urgent ? "text-[var(--fi-critical)]" : "text-[var(--fi-muted)]")}
                    />
                    <span className={cx("min-w-0 flex-1 text-sm", urgent && "font-medium")}>{text}</span>
                    <span className="hidden shrink-0 items-center gap-1 text-sm text-[var(--fi-action)] sm:inline-flex">
                      {action}
                      <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                    <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-[var(--fi-muted)] sm:hidden" />
                    <span className="sr-only sm:hidden">{action}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Quanto mi resta */}
        <section className="rounded-xl border border-[var(--fi-rule)] bg-[var(--fi-surface)] p-6">
          {year.grossRevenue === 0 ? (
            <div className="space-y-2">
              <p className="text-lg font-semibold">Nel {m.year} non hai ancora registrato incassi.</p>
              <p className="text-sm text-[var(--fi-ink-2)]">
                Le tasse del forfettario si calcolano su quello che incassi.{" "}
                <TextLink href="/dashboard/fiscale/incassi">Registra un incasso</TextLink> oppure{" "}
                <TextLink href="/dashboard/fiscale/fatture/importa">importa le fatture passate</TextLink>.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-[15px] font-semibold text-[var(--fi-ink-2)]">Il tuo {m.year}</h2>
              <p className="mt-2 text-2xl font-semibold leading-snug tracking-[-0.02em]">
                Hai incassato <span className="fi-num">{eur(year.grossRevenue)}</span>
              </p>
              <div className="mt-5">
                <SplitBar
                  parts={[
                    { label: "Ti resta", amount: year.netAccrual, tone: "bg-[var(--fi-ink)]" },
                    { label: "Imposta sostitutiva", amount: year.substituteTax, tone: "bg-[var(--fi-action)]" },
                    { label: "Contributi INPS", amount: year.inpsDue.total, tone: "bg-[var(--fi-bar)]/45" },
                  ]}
                />
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-[var(--fi-rule)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm">
                  Da tenere da parte adesso:{" "}
                  <b className="fi-num text-base font-semibold">{eur(m.reserve.matured)}</b>
                  <span className="text-[var(--fi-ink-2)]"> per gli F24 fino al 30 giugno {m.year + 1}</span>
                </p>
                <TextLink href="/dashboard/fiscale/scadenze">Vedi le scadenze</TextLink>
              </div>

              <div className="mt-5">
                <Disclosure summary="Come è calcolato">
                  <dl className="max-w-xl divide-y divide-[var(--fi-rule)] text-sm">
                    {[
                      ["Incassato nel " + m.year + " (conta la data d'incasso)", eur(year.grossRevenue)],
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
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-6 py-2">
                        <dt className="text-[var(--fi-ink-2)]">{label}</dt>
                        <dd className="fi-num shrink-0">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {m.projected.warnings.length > 0 && (
                    <ul className="mt-3 max-w-xl space-y-1 text-xs text-[var(--fi-ink-2)]">
                      {[...new Set(m.projected.warnings)].map((w) => (
                        <li key={w}>· {w}</li>
                      ))}
                    </ul>
                  )}
                </Disclosure>
              </div>
            </>
          )}
        </section>

        {/* Andamento e prossime scadenze */}
        <div className="grid gap-12 lg:grid-cols-2">
          <Section
            title={`Incassi ${m.year}`}
            action={
              <ThresholdMeter collected={m.ytd.grossRevenue} limit={m.ytd.revenueLimit.limit} warn={limitWarning} />
            }
          >
            <RevenueChart monthly={m.monthlyRevenue} currentMonth={Number(asOf.slice(5, 7)) - 1} />
            {limitWarning && (
              <p className="mt-3 text-xs text-[var(--fi-warning-text)]">
                Di questo passo a fine anno arrivi a circa {eur(m.projected.grossRevenue)}: sopra 85.000 € esci dal
                forfettario dall&apos;anno successivo.
              </p>
            )}
          </Section>

          <Section
            title="Prossime scadenze"
            action={<TextLink href="/dashboard/fiscale/scadenze">Tutte</TextLink>}
          >
            <DeadlineList
              items={m.reserve.upcoming.filter((i) => i.amount > 0 || i.unknownAmount).slice(0, 5)}
              asOf={asOf}
              paid={m.paid}
              dismissed={m.dismissed}
            />
            <p className="mt-2 text-xs text-[var(--fi-muted)]">Aggiornato al {date(asOf)}.</p>
          </Section>
        </div>
      </div>
    </>
  );
}
