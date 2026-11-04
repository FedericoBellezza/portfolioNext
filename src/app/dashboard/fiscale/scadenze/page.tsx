import { connection } from "next/server";
import Link from "next/link";
import { buildDashboard, todayInRome } from "@/lib/fiscale/data/dashboard";
import { loadGuideMedia } from "@/lib/fiscale/data/guide-media";
import { loadDataset } from "@/lib/fiscale/data/load";
import { sumCents, type Cents } from "@/lib/fiscale/money";
import { yearOf, type F24Item } from "@/lib/fiscale/tax-calculator";
import { createClient } from "@/lib/supabase/server";
import { DeadlineList } from "../components/charts";
import { date, eur, MONTHS } from "../components/format";
import { OverdueBanner } from "../components/overdue-banner";
import { btn, DemoNotice, Disclosure, PageTitle, Section } from "../components/ui";
import { archiveReminderAction, undoTaskAction } from "./task-actions";
import { OpenTasks, ReminderForm } from "./tasks-ui";

export const metadata = { title: "Scadenze | Fiscale" };

const KIND_LABEL: Record<string, string> = {
  fixed_q1: "INPS fissi 1ª rata",
  fixed_q2: "INPS fissi 2ª rata",
  fixed_q3: "INPS fissi 3ª rata",
  fixed_q4: "INPS fissi 4ª rata",
  excess_balance: "INPS eccedenza saldo",
  excess_advance_1: "INPS eccedenza 1° acconto",
  excess_advance_2: "INPS eccedenza 2° acconto",
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

function byMonth(items: F24Item[]) {
  const groups = new Map<string, F24Item[]>();
  for (const i of items) groups.set(i.dueDate.slice(0, 7), [...(groups.get(i.dueDate.slice(0, 7)) ?? []), i]);
  return [...groups.entries()];
}

/** Short-lived links to the private F24 receipts. */
async function receiptLinks(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.storage.from("fiscale-f24").createSignedUrls(paths, 600);
  return new Map((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl]));
}

function Calendar({ items, asOf, paid, dismissed }: { items: F24Item[]; asOf: string; paid: Set<string>; dismissed: Set<string> }) {
  return (
    <div className="space-y-6">
      {byMonth(items).map(([month, group]) => {
        const [y, mm] = month.split("-").map(Number);
        return (
          <div key={month}>
            <div className="flex items-baseline justify-between border-b border-[var(--fi-rule)] pb-1.5">
              <h3 className="text-sm font-medium">
                {MONTHS[mm - 1]} {y}
              </h3>
              <span className="fi-num text-xs text-[var(--fi-muted)]">{eur(sumCents(group.map((i) => i.amount)))}</span>
            </div>
            <DeadlineList items={group} asOf={asOf} paid={paid} dismissed={dismissed} showCategory />
          </div>
        );
      })}
    </div>
  );
}

export default async function TassePage() {
  await connection();
  const asOf = todayInRome();
  const data = await loadDataset();
  const demo = data.source === "demo";
  const m = buildDashboard(data, asOf);
  const media = demo ? {} : await loadGuideMedia();

  const toHandle = m.schedule.filter(
    (i) => (i.amount > 0 || i.unknownAmount) && !m.paid.has(i.key) && i.dueDate <= `${m.year}-12-31`,
  );
  const upcoming = m.schedule.filter((i) => i.dueDate >= asOf && (i.amount > 0 || i.unknownAmount));
  const past = m.schedule.filter((i) => i.dueDate < asOf && (i.amount > 0 || m.paid.has(i.key)));

  type Payment = { id: string; date: string; label: string; amount: Cents; receipt: string | null; compensated?: boolean };
  const payments: Payment[] = [
    ...data.inpsPayments.map((p) => ({ id: p.id, date: p.paidAt, label: `${KIND_LABEL[p.kind]} ${p.competenceYear}`, amount: p.amount, receipt: p.receiptPath, compensated: p.compensated })),
    ...data.taxPayments.map((p) => ({ id: p.id, date: p.paidAt, label: `${KIND_LABEL[p.kind]} ${p.competenceYear}`, amount: p.amount, receipt: p.receiptPath, compensated: p.compensated })),
  ]
    .filter((p) => yearOf(p.date) === m.year)
    .sort((a, b) => b.date.localeCompare(a.date));
  const links = demo ? new Map<string, string>() : await receiptLinks(payments.map((p) => p.receipt).filter((p): p is string => Boolean(p)));
  const expenses = data.expenses.filter((e) => yearOf(e.spentAt) === m.year);

  // Filings and reminders: everything not done up to 12 months ahead, done ones of this year apart.
  const horizon = `${m.year + 1}${asOf.slice(4)}`;
  const openTasks = m.tasks.filter((t) => !m.doneTasks.has(t.key) && t.dueDate <= horizon);
  const doneTasks = m.tasks.filter((t) => m.doneTasks.has(t.key));

  return (
    <>
      <PageTitle
        title="Scadenze"
        description="Tutto quello che c'è da pagare, inviare o ricordare: tasse e contributi dell'attività, dichiarazioni e promemoria personali."
        action={
          <Link href="/dashboard/fiscale/export" className={btn.outline}>
            Esporta per il commercialista
          </Link>
        }
      />
      <DemoNotice show={demo} />

      <p className="mb-10 text-sm text-[var(--fi-ink-2)]">
        Da tenere da parte adesso <b className="fi-num text-base font-semibold text-[var(--fi-ink)]">{eur(m.reserve.matured)}</b>
        <span className="mx-2 text-[var(--fi-rule)]">|</span>
        Uscite previste fino al 30 giugno {m.year + 1}{" "}
        <b className="fi-num font-medium text-[var(--fi-ink)]">{eur(m.reserve.cashOutUntilHorizon)}</b>
      </p>

      <div className="space-y-12">
        <div id="registra" className="scroll-mt-24">
          {toHandle.length === 0 ? (
            <Section title="Da pagare o registrare">
              <p className="text-sm text-[var(--fi-ink-2)]">Tutte le scadenze di quest&apos;anno sono registrate.</p>
            </Section>
          ) : (
            <OverdueBanner
              items={toHandle}
              demo={demo}
              media={media}
              tone={m.overdue.length > 0 ? "warning" : "neutral"}
              title="Da pagare o registrare"
              intro="Apri una voce per vedere come pagarla e registrare l'importo. Vale anche per quelle già pagate in anticipo; se una stima non ti riguarda, segnala come non dovuta."
            />
          )}
        </div>

        <Section title="Dichiarazioni e promemoria" id="adempimenti">
          <OpenTasks tasks={openTasks} asOf={asOf} demo={demo} />
          <div className="mt-4 space-y-3">
            {doneTasks.length > 0 && (
              <Disclosure summary={`Già fatti (${doneTasks.length})`}>
                <ul className="max-w-2xl divide-y divide-[var(--fi-rule)] text-sm">
                  {doneTasks.map((t) => {
                    const done = m.doneTasks.get(t.key)!;
                    return (
                      <li key={t.key} className="flex items-baseline gap-4 py-2">
                        <span className="min-w-0 flex-1 truncate">{t.title}</span>
                        <span className="shrink-0 text-xs text-[var(--fi-ink-2)]">
                          fatto il {date(done.completedAt)}
                          {done.documentId ? " · ricevuta in Documenti" : ""}
                        </span>
                        <form action={undoTaskAction}>
                          <input type="hidden" name="key" value={t.key} />
                          <button type="submit" className="text-xs text-[var(--fi-ink-2)] underline-offset-4 hover:text-[var(--fi-critical)] hover:underline">
                            Annulla
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              </Disclosure>
            )}
            <Disclosure summary="Aggiungi un promemoria (IMU, bollo auto, altre scadenze personali…)">
              <ReminderForm demo={demo} />
              {data.reminders.length > 0 && (
                <ul className="mt-6 max-w-3xl divide-y divide-[var(--fi-rule)] text-sm">
                  {data.reminders.map((r) => (
                    <li key={r.id} className="flex items-baseline gap-4 py-2">
                      <span className="min-w-0 flex-1 truncate">
                        {r.title}
                        <span className="ml-2 text-xs text-[var(--fi-muted)]">
                          {r.recurrence === "yearly" ? "ogni anno" : r.recurrence === "monthly" ? "ogni mese" : "una volta"} dal{" "}
                          {date(r.firstDue)} · {r.scope === "business" ? "attività" : "personale"}
                        </span>
                      </span>
                      <form action={archiveReminderAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className="text-xs text-[var(--fi-ink-2)] underline-offset-4 hover:text-[var(--fi-critical)] hover:underline">
                          Elimina
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </Disclosure>
          </div>
        </Section>

        <Section title="Prossimi pagamenti">
          <Calendar items={upcoming} asOf={asOf} paid={m.paid} dismissed={m.dismissed} />
          {past.length > 0 && (
            <div className="mt-6">
              <Disclosure summary={`Pagamenti passati (${past.length})`}>
                <Calendar items={past} asOf={asOf} paid={m.paid} dismissed={m.dismissed} />
              </Disclosure>
            </div>
          )}
        </Section>

        <Section
          title={`Pagamenti registrati nel ${m.year}`}
          action={<span className="fi-num text-sm text-[var(--fi-ink-2)]">{eur(sumCents(payments.map((p) => p.amount)))}</span>}
        >
          {payments.length === 0 ? (
            <p className="text-sm text-[var(--fi-ink-2)]">Ancora nessun F24 registrato.</p>
          ) : (
            <ul className="divide-y divide-[var(--fi-rule)] text-sm">
              {payments.map((p) => {
                const href = p.receipt ? links.get(p.receipt) : undefined;
                return (
                  <li key={p.id} className="flex items-baseline gap-4 py-2.5">
                    <span className="fi-num w-24 shrink-0 text-[var(--fi-ink-2)]">{date(p.date)}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {p.label}
                      {p.compensated && <span className="ml-2 text-xs text-[var(--fi-muted)]">in compensazione</span>}
                    </span>
                    {href && (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--fi-action)] underline-offset-4 hover:underline">
                        Ricevuta
                      </a>
                    )}
                    <span className="fi-num w-24 shrink-0 text-right">{eur(p.amount)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <div className="space-y-3 border-t border-[var(--fi-rule)] pt-6">
          {expenses.length > 0 && (
            <Disclosure summary={`Spese operative ${m.year} · ${eur(m.expensesYtd)} (non deducibili, solo per tua analisi)`}>
              <ul className="max-w-2xl divide-y divide-[var(--fi-rule)] text-sm">
                {expenses.map((e) => (
                  <li key={e.id} className="flex items-baseline gap-4 py-2">
                    <span className="fi-num w-24 shrink-0 text-[var(--fi-ink-2)]">{date(e.spentAt)}</span>
                    <span className="min-w-0 flex-1 truncate">{e.description ?? e.category}</span>
                    <span className="fi-num">{eur(e.amount)}</span>
                  </li>
                ))}
              </ul>
            </Disclosure>
          )}
          <Disclosure summary="Come calcoliamo le scadenze">
            <ul className="max-w-2xl space-y-2 text-sm text-[var(--fi-ink-2)]">
              <li>INPS fissi: 4 rate (16/5, 20/8, 16/11, 16/2) sul minimale, in proporzione ai mesi di attività e con le tue riduzioni.</li>
              <li>Saldo e 1° acconto di imposta e INPS eccedenza il 30/6 (proroghe dell&apos;anno incluse), 2° acconto il 30/11. Acconti 50% + 50%.</li>
              <li>Nessun acconto nel primo anno; nessuno se l&apos;imposta dell&apos;anno prima è fino a 51,65 €; rata unica a novembre fino a 257,52 €.</li>
              <li>Bollo trimestrale, rinviabile finché il totale resta sotto 5.000 €. INAIL il 16/2, stimato sull&apos;ultimo premio.</li>
              <li>Scadenze nel weekend o festive spostate al primo giorno lavorativo.</li>
            </ul>
          </Disclosure>
        </div>
      </div>
    </>
  );
}
