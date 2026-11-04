import { connection } from "next/server";
import { buildDashboard, todayInRome } from "@/lib/fiscale/data/dashboard";
import { loadDataset } from "@/lib/fiscale/data/load";
import { sumCents } from "@/lib/fiscale/money";
import type { F24Item } from "@/lib/fiscale/tax-calculator";
import { DeadlineList } from "../components/charts";
import { OverdueBanner } from "../components/overdue-banner";
import { eur, MONTHS } from "../components/format";
import { DemoNotice, PageTitle, Panel } from "../components/ui";

export const metadata = { title: "Scadenze F24 | Fiscale" };

function groupByMonth(items: F24Item[]) {
  const groups = new Map<string, F24Item[]>();
  for (const i of items) {
    const k = i.dueDate.slice(0, 7);
    groups.set(k, [...(groups.get(k) ?? []), i]);
  }
  return [...groups.entries()];
}

export default async function ScadenzePage() {
  await connection();
  const asOf = todayInRome();
  const data = await loadDataset();
  const m = buildDashboard(data, asOf);

  return (
    <>
      <PageTitle
        title="Scadenze F24"
        description="Calendario simulato con metodo storico. Gli importi dell'anno in corso sono stime sugli incassi a oggi."
      />
      <DemoNotice show={data.source === "demo"} />
      <OverdueBanner
        items={m.schedule.filter((i) => i.amount > 0 && !m.paid.has(i.key) && i.dueDate <= `${m.year}-12-31`)}
        demo={data.source === "demo"}
        tone={m.overdue.length > 0 ? "warning" : "neutral"}
        title="Registra i pagamenti"
        intro="Tutte le scadenze di quest'anno non ancora registrate, anche quelle future già pagate in anticipo. Se una stima non era dovuta (es. importo zero), segnala come non dovuta."
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {groupByMonth(m.schedule).map(([month, items]) => {
            const [y, mm] = month.split("-").map(Number);
            return (
              <Panel
                key={month}
                title={`${MONTHS[mm - 1]} ${y}`}
                action={<span className="fi-num text-sm font-medium">{eur(sumCents(items.map((i) => i.amount)))}</span>}
              >
                <DeadlineList items={items} asOf={asOf} paid={m.paid} dismissed={m.dismissed} showCategory />
              </Panel>
            );
          })}
        </div>
        <div className="space-y-6">
          <Panel title="Totali" description={`Fino al 30/6/${m.year + 1}`}>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--fi-ink-2)]">Maturato da accantonare</dt>
                <dd className="fi-num font-semibold text-[var(--fi-reserve)]">{eur(m.reserve.matured)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--fi-ink-2)]">Uscite totali</dt>
                <dd className="fi-num">{eur(m.reserve.cashOutUntilHorizon)}</dd>
              </div>
            </dl>
          </Panel>
          <Panel title="Regole applicate">
            <ul className="space-y-2.5 text-sm text-[var(--fi-ink-2)]">
              <li>
                <b className="text-[var(--fi-ink)]">INPS fissi</b>: 4 rate (16/5, 20/8, 16/11, 16/2), sul minimale e
                riproporzionate ai mesi di attività.
              </li>
              <li>
                <b className="text-[var(--fi-ink)]">Saldo e 1° acconto</b> il 30/6 (o 31/7 +0,40%),{" "}
                <b className="text-[var(--fi-ink)]">2° acconto</b> il 30/11. Acconti 50% + 50% per i forfettari.
              </li>
              <li>
                Nessun acconto nel primo anno; nessuno se l&apos;imposta dell&apos;anno prima è ≤ 51,65 €; rata unica a
                novembre se ≤ 257,52 €.
              </li>
              <li>
                <b className="text-[var(--fi-ink)]">Bollo</b>: trimestrale, rinviabile al 30/9 o al 30/11 finché il
                cumulato resta sotto 5.000 €.
              </li>
              <li>Scadenze nel weekend o festive spostate al primo giorno lavorativo.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
