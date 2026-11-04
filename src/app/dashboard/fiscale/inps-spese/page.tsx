import { connection } from "next/server";
import { buildDashboard, todayInRome } from "@/lib/fiscale/data/dashboard";
import { loadDataset } from "@/lib/fiscale/data/load";
import { sumCents, type Cents } from "@/lib/fiscale/money";
import { yearOf } from "@/lib/fiscale/tax-calculator";
import { createClient } from "@/lib/supabase/server";
import { date, eur } from "../components/format";
import { DemoNotice, Kpi, PageTitle, Panel } from "../components/ui";

export const metadata = { title: "INPS e spese | Fiscale" };

const INPS_KIND: Record<string, string> = {
  fixed_q1: "Fissi 1ª rata",
  fixed_q2: "Fissi 2ª rata",
  fixed_q3: "Fissi 3ª rata",
  fixed_q4: "Fissi 4ª rata",
  excess_balance: "Eccedenza saldo",
  excess_advance_1: "Eccedenza 1° acconto",
  excess_advance_2: "Eccedenza 2° acconto",
  other: "Altro",
};

const TAX_KIND: Record<string, string> = {
  substitute_tax_balance: "Imposta sostitutiva saldo",
  substitute_tax_advance_1: "Imposta sostitutiva 1° acconto",
  substitute_tax_advance_2: "Imposta sostitutiva 2° acconto",
  stamp_duty_q1: "Bollo 1° trimestre",
  stamp_duty_q2: "Bollo 2° trimestre",
  stamp_duty_q3: "Bollo 3° trimestre",
  stamp_duty_q4: "Bollo 4° trimestre",
  chamber_fee: "Diritto camerale",
  inail_premium: "Premio INAIL",
  other: "Altro",
};

type Movement = { id: string; date: string; label: string; meta: string; amount: Cents; href?: string };

function Movements({ rows, total }: { rows: Movement[]; total: Cents }) {
  if (rows.length === 0) return <p className="py-6 text-sm text-[var(--fi-ink-2)]">Nessun movimento.</p>;
  return (
    <ul className="divide-y divide-[var(--fi-rule)] text-sm">
      {rows.map((r) => (
        <li key={r.id} className="flex items-baseline gap-3 py-2.5">
          <span className="fi-num w-24 shrink-0 text-xs text-[var(--fi-ink-2)]">{date(r.date)}</span>
          <span className="min-w-0 flex-1 truncate">
            {r.label}
            <span className="ml-2 text-xs text-[var(--fi-muted)]">{r.meta}</span>
          </span>
          {r.href && (
            <a
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--fi-action)] underline hover:text-[var(--fi-action-hover)]"
            >
              Ricevuta
            </a>
          )}
          <span className="fi-num">{eur(r.amount)}</span>
        </li>
      ))}
      <li className="flex justify-between py-2.5 font-semibold">
        <span>Totale</span>
        <span className="fi-num">{eur(total)}</span>
      </li>
    </ul>
  );
}

/** Short-lived links to the private F24 receipts. */
async function receiptLinks(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.storage.from("fiscale-f24").createSignedUrls(paths, 600);
  return new Map((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl]));
}

export default async function InpsSpesePage() {
  await connection();
  const asOf = todayInRome();
  const data = await loadDataset();
  const m = buildDashboard(data, asOf);
  const inps = data.inpsPayments.filter((p) => yearOf(p.paidAt) === m.year);
  const taxes = data.taxPayments.filter((p) => yearOf(p.paidAt) === m.year);
  const expenses = data.expenses.filter((e) => yearOf(e.spentAt) === m.year);
  const links =
    data.source === "demo"
      ? new Map<string, string>()
      : await receiptLinks([...inps, ...taxes].map((p) => p.receiptPath).filter((p): p is string => Boolean(p)));
  const href = (path: string | null) => (path ? links.get(path) : undefined);

  return (
    <>
      <PageTitle
        title="INPS e spese"
        description="I contributi INPS si deducono nell'anno in cui li paghi. Le altre spese no: servono solo a capire quanto guadagni davvero."
      />
      <DemoNotice show={data.source === "demo"} />
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Kpi
            label={`INPS versati ${m.year}`}
            value={eur(m.ytd.inpsDeducted)}
            hint={`dovuti per competenza ${eur(m.yearEndOnCurrentRevenue.inpsDue.total)}`}
          />
          <Kpi label="Spese operative" value={eur(m.expensesYtd)} hint="non deducibili nel forfettario" />
          <Kpi label="Guadagno effettivo" value={eur(m.ytd.netCash - m.expensesYtd)} tone="good" hint="netto reale − spese" />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="F24 INPS" description={`Gestione Artigiani · versati nel ${m.year}`}>
            <Movements
              rows={inps.map((p) => ({
                id: p.id,
                date: p.paidAt,
                label: `${INPS_KIND[p.kind]} ${p.competenceYear}`,
                meta: p.kind.startsWith("fixed") ? "AF" : "AP",
                amount: p.amount,
                href: href(p.receiptPath),
              }))}
              total={sumCents(inps.map((p) => p.amount))}
            />
          </Panel>
          <Panel title="F24 Erario" description={`Imposta sostitutiva, bollo, diritto camerale · ${m.year}`}>
            <Movements
              rows={taxes.map((p) => ({
                id: p.id,
                date: p.paidAt,
                label: `${TAX_KIND[p.kind]} ${p.competenceYear}`,
                meta: p.tributeCode ?? "",
                amount: p.amount,
                href: href(p.receiptPath),
              }))}
              total={sumCents(taxes.map((p) => p.amount))}
            />
          </Panel>
          <Panel title="Spese" description="Solo per analisi di redditività" className="xl:col-span-2">
            <Movements
              rows={expenses.map((e) => ({
                id: e.id,
                date: e.spentAt,
                label: e.description ?? e.category,
                meta: e.vendor ?? e.category,
                amount: e.amount,
              }))}
              total={m.expensesYtd}
            />
          </Panel>
        </div>
      </div>
    </>
  );
}
