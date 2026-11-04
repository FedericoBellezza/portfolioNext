import { connection } from "next/server";
import { todayInRome } from "@/lib/fiscale/data/dashboard";
import { loadDataset } from "@/lib/fiscale/data/load";
import { buildLedger, ledgerSummary } from "@/lib/fiscale/ledger";
import { toCents } from "@/lib/fiscale/money";
import { yearOf } from "@/lib/fiscale/tax-calculator";
import { eur } from "../components/format";
import { btn, DemoNotice, PageTitle, Panel } from "../components/ui";

export const metadata = { title: "Export | Fiscale" };

const LABELS = {
  ricavi_incassati: "Ricavi incassati",
  reddito_lordo: "Reddito lordo",
  contributi_previdenziali_versati: "Contributi versati",
  reddito_netto: "Reddito netto",
  imposta_sostitutiva: "Imposta sostitutiva",
} as const;

export default async function ExportPage() {
  await connection();
  const data = await loadDataset();
  const current = yearOf(todayInRome());
  const start = yearOf(data.profile.activityStartDate);
  const years = Array.from({ length: current - start + 1 }, (_, i) => current - i);

  return (
    <>
      <PageTitle
        title="Export per il commercialista"
        description="Registro incassi e pagamenti e riepilogo per il Quadro LM del Modello Redditi PF."
      />
      <DemoNotice show={data.source === "demo"} />
      <div className="grid gap-6 lg:grid-cols-2">
        {years.map((y) => {
          const summary = ledgerSummary(data, y);
          const rows = buildLedger(data, y).length;
          return (
            <Panel
              key={y}
              title={`Anno d'imposta ${y}`}
              description={`${rows} movimenti${y === current ? " · anno in corso" : ""}`}
            >
              <dl className="divide-y divide-[var(--fi-rule)] text-sm">
                {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((k) => (
                  <div key={k} className="flex justify-between py-2">
                    <dt className="text-[var(--fi-ink-2)]">{LABELS[k]}</dt>
                    <dd className="fi-num">{eur(toCents(summary[k]))}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex gap-2">
                <a href={`/api/fiscale/export?year=${y}&format=csv`} className={btn.primary}>
                  CSV / Excel
                </a>
                <a href={`/api/fiscale/export?year=${y}&format=json`} className={btn.outline}>
                  JSON
                </a>
              </div>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
