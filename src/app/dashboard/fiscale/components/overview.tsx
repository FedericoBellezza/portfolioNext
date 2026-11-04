import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { buildDashboard } from "@/lib/fiscale/data/dashboard";
import type { FiscalDataset } from "@/lib/fiscale/data/types";
import { DeadlineList, RevenueChart, RevenueLimit, TaxWaterfall } from "./charts";
import { OverdueBanner } from "./overdue-banner";
import { date, eur, pct } from "./format";
import { btn, DemoNotice, Kpi, PageTitle, Panel, TextLink } from "./ui";

const openLabel = (n: number) => (n === 1 ? "1 fattura aperta" : `${n} fatture aperte`);

/** Panoramica, pura funzione dei dati: usata dalla dashboard (e riusabile per una demo pubblica). */
export function Overview({ data, asOf, newInvoiceHref = "/dashboard/fiscale/fatture/nuova" }: {
  data: FiscalDataset;
  asOf: string;
  newInvoiceHref?: string | null;
}) {
  const m = buildDashboard(data, asOf);
  const warnings = [...new Set([...m.ytd.warnings, ...m.projected.warnings])];
  const startupUntil = Number(data.profile.activityStartDate.slice(0, 4)) + data.profile.startupYears - 1;
  const openCount = data.invoices.filter((i) => i.status === "issued" && i.collected < i.total).length;

  return (
    <>
      <PageTitle
        title="Fiscale"
        description="Regime forfettario · coefficiente 67% · INPS Gestione Artigiani"
        action={
          newInvoiceHref && (
            <Link href={newInvoiceHref} className={btn.primary}>
              Nuova fattura
            </Link>
          )
        }
      />
      <DemoNotice show={data.source === "demo"} />
      <OverdueBanner items={m.overdue} demo={data.source === "demo"} />

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={`Lordo incassato ${m.year}`} value={eur(m.ytd.grossRevenue)} hint={`al ${date(asOf)}`} />
          <Kpi label="Netto reale" value={eur(m.ytd.netCash)} tone="good" hint="lordo − INPS versati − imposta" />
          <Kpi
            label="Da accantonare oggi"
            value={eur(m.reserve.matured)}
            tone="reserve"
            hint={`F24 maturati fino al 30 giu ${m.year + 1}`}
          />
          <Kpi
            label="Da incassare"
            value={eur(m.outstanding)}
            hint={
              openCount > 0 ? (
                <Link href="/dashboard/fiscale/incassi" className="text-[var(--fi-action)] underline">
                  {openLabel(openCount)}: registra gli incassi
                </Link>
              ) : (
                openLabel(openCount)
              )
            }
          />
        </div>

        {warnings.length > 0 && (
          <div className="flex gap-3 rounded-xl border border-[var(--fi-warning)]/50 bg-[var(--fi-warning-soft)] p-4 text-sm text-[var(--fi-warning-text)]">
            <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            <ul className="space-y-1">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-3">
          <Panel
            className="xl:col-span-2"
            title="Dal lordo al netto"
            description={
              m.ytd.isStartupRate
                ? `Aliquota start-up ${pct(m.ytd.taxRate, 0)} fino al ${startupUntil}`
                : `Aliquota ordinaria ${pct(m.ytd.taxRate, 0)}`
            }
          >
            <TaxWaterfall ytd={m.ytd} yearEnd={m.yearEndOnCurrentRevenue} />
          </Panel>

          <div className="space-y-6">
            <Panel title="Accantonamento" description="Quanto tenere da parte per le prossime scadenze">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--fi-ink-2)]">Maturato su redditi {m.year}</dt>
                  <dd className="fi-num font-semibold text-[var(--fi-reserve)]">{eur(m.reserve.matured)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--fi-ink-2)]">Uscite totali fino al 30/6/{m.year + 1}</dt>
                  <dd className="fi-num">{eur(m.reserve.cashOutUntilHorizon)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--fi-ink-2)]">Su ogni 1.000 € incassati</dt>
                  <dd className="fi-num">{eur(Math.round(m.projected.effectiveBurdenRate * 100_000))}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-[var(--fi-muted)]">
                Il totale include anche gli acconti {m.year + 1} di giugno: non sono tasse su redditi già incassati, ma
                escono dal conto.
              </p>
            </Panel>
            <Panel title="Limite forfettario" description="Soglia ricavi per restare nel regime">
              <RevenueLimit ytd={m.ytd} projected={m.projected} />
            </Panel>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Panel
            className="xl:col-span-2"
            title={`Incassi ${m.year}`}
            description="Principio di cassa: conta la data di incasso, non quella di emissione"
          >
            <RevenueChart monthly={m.monthlyRevenue} currentMonth={Number(asOf.slice(5, 7)) - 1} />
          </Panel>
          <Panel title="Prossimi F24" action={<TextLink href="/dashboard/fiscale/scadenze">Tutte →</TextLink>}>
            <DeadlineList items={m.reserve.upcoming.slice(0, 6)} asOf={asOf} paid={m.paid} dismissed={m.dismissed} />
          </Panel>
        </div>
      </div>
    </>
  );
}
