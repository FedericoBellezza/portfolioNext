import { connection } from "next/server";
import Link from "next/link";
import { buildDashboard, todayInRome } from "@/lib/fiscale/data/dashboard";
import { loadGuideMedia } from "@/lib/fiscale/data/guide-media";
import { loadDataset } from "@/lib/fiscale/data/load";
import { sumCents } from "@/lib/fiscale/money";
import { FileText } from "lucide-react";
import { missingReceipts, paymentEntries, type PaymentEntry, type PaymentFile } from "@/lib/fiscale/receipts";
import type { TaskItem } from "@/lib/fiscale/tasks";
import { yearOf, type F24Item } from "@/lib/fiscale/tax-calculator";
import { createClient } from "@/lib/supabase/server";
import { DeadlineList } from "../components/charts";
import { date, dayDate, eur, MONTHS } from "../components/format";
import { OverdueBanner } from "../components/overdue-banner";
import { Badge, btn, card, cx, DemoNotice, Disclosure, PageTitle, Panel, Stat, Tabs } from "../components/ui";
import { deleteCreditAction } from "./credit-actions";
import { CreditAmountEdit, CreditForm } from "./credits-ui";
import { deleteDocumentAction, setDocumentProvisionalAction } from "../documenti/actions";
import { PaymentFilesUpload } from "./receipt-ui";
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

const paymentLabel = (p: PaymentEntry) =>
  `${p.kind === "other" ? (p.table === "inps" ? "Altri contributi INPS" : "Altro versamento") : KIND_LABEL[p.kind]} ${p.competenceYear}`;

const CREDIT_KIND: Record<string, string> = { irpef: "IRPEF", substitute_tax: "imposta sostitutiva", inps: "INPS", other: "altro" };

type View = "da-fare" | "calendario" | "storico" | "crediti" | "promemoria";
const VIEWS: View[] = ["da-fare", "calendario", "storico", "crediti", "promemoria"];

/** Short-lived links to the private payment files (archive and older single receipts). */
async function fileLinks(files: PaymentFile[]): Promise<Map<string, string>> {
  const links = new Map<string, string>();
  if (files.length === 0) return links;
  const supabase = await createClient();
  for (const bucket of ["fiscale-docs", "fiscale-f24"] as const) {
    const paths = files.filter((f) => f.bucket === bucket).map((f) => f.path);
    if (paths.length === 0) continue;
    const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 600);
    for (const d of data ?? []) if (d.signedUrl && d.path) links.set(d.path, d.signedUrl);
  }
  return links;
}

/** The files of one payment, each openable and (archive ones) removable. */
function PaymentFiles({ files, links }: { files: PaymentFile[]; links: Map<string, string> }) {
  if (files.length === 0) return null;
  return (
    <ul className="mt-1.5 w-full space-y-1 pl-[6.75rem] text-xs">
      {files.map((f) => {
        const href = links.get(f.path);
        return (
          <li key={f.path} className="flex items-center gap-2">
            <FileText aria-hidden className="h-3.5 w-3.5 shrink-0 text-[var(--fi-muted)]" />
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-[var(--fi-ink-2)] underline-offset-4 hover:text-[var(--fi-action)] hover:underline">
                {f.title}
              </a>
            ) : (
              <span className="min-w-0 truncate text-[var(--fi-ink-2)]">{f.title}</span>
            )}
            {f.provisional && <Badge tone="warning">provvisoria</Badge>}
            {f.id && (
              <form action={setDocumentProvisionalAction} className="shrink-0">
                <input type="hidden" name="id" value={f.id} />
                <input type="hidden" name="provisional" value={f.provisional ? "false" : "true"} />
                <button
                  type="submit"
                  title={f.provisional ? "È la ricevuta che attesta il pagamento" : "Es. prenotazione del bollo o ricevuta di invio: la ricevuta definitiva arriva dopo"}
                  className="text-[var(--fi-muted)] underline-offset-4 hover:text-[var(--fi-action)] hover:underline"
                >
                  {f.provisional ? "Segna definitiva" : "Segna provvisoria"}
                </button>
              </form>
            )}
            {f.id && (
              <form action={deleteDocumentAction} className="shrink-0">
                <input type="hidden" name="id" value={f.id} />
                <button type="submit" className="text-[var(--fi-muted)] underline-offset-4 hover:text-[var(--fi-critical-text)] hover:underline">
                  Rimuovi
                </button>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Payments and filings of the coming months, one card per month. */
function MonthCalendar({
  payments,
  tasks,
  asOf,
  paid,
  dismissed,
  done,
}: {
  payments: F24Item[];
  tasks: TaskItem[];
  asOf: string;
  paid: Set<string>;
  dismissed: Set<string>;
  done: Set<string>;
}) {
  const months = [...new Set([...payments, ...tasks].map((i) => i.dueDate.slice(0, 7)))].sort();
  if (months.length === 0) return <p className="text-sm text-[var(--fi-ink-2)]">Nessuna scadenza.</p>;
  const refYear = Number(asOf.slice(0, 4));
  return (
    <div className="space-y-4">
      {months.map((month) => {
        const [y, mm] = month.split("-").map(Number);
        const pay = payments.filter((p) => p.dueDate.startsWith(month));
        const tsk = tasks.filter((t) => t.dueDate.startsWith(month));
        return (
          <section key={month} className={cx(card, "px-5 pt-4 pb-1")}>
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold">
                {MONTHS[mm - 1]} {y}
              </h3>
              {pay.length > 0 && <span className="fi-num text-xs text-[var(--fi-muted)]">{eur(sumCents(pay.map((i) => i.amount)))}</span>}
            </div>
            {pay.length > 0 && <DeadlineList items={pay} asOf={asOf} paid={paid} dismissed={dismissed} showCategory />}
            {tsk.length > 0 && (
              <ul className={cx("divide-y divide-[var(--fi-rule)]", pay.length > 0 && "border-t border-[var(--fi-rule)]")}>
                {tsk.map((t) => (
                  <li key={t.key} className="flex items-center gap-4 py-3">
                    <span className="fi-num w-24 shrink-0 text-sm">{dayDate(t.dueDate, refYear)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{t.title}</span>
                      <span className="block text-xs text-[var(--fi-muted)]">{t.scope === "business" ? "Dichiarazione · attività" : "Promemoria · personale"}</span>
                    </span>
                    {t.amount ? <span className="fi-num w-24 text-right text-sm font-medium">{eur(t.amount)}</span> : <span className="w-24" />}
                    <span className="hidden w-24 text-right sm:block">{done.has(t.key) ? <Badge tone="good">Fatto</Badge> : <Badge tone="accent">Da fare</Badge>}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default async function ScadenzePage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  await connection();
  const { vista } = await searchParams;
  const view: View = VIEWS.includes(vista as View) ? (vista as View) : "da-fare";
  const asOf = todayInRome();
  const data = await loadDataset();
  const demo = data.source === "demo";
  const m = buildDashboard(data, asOf);

  const toHandle = m.schedule.filter(
    (i) => (i.amount > 0 || i.unknownAmount) && !m.paid.has(i.key) && i.dueDate <= `${m.year}-12-31`,
  );
  const horizon = `${m.year + 1}${asOf.slice(4)}`;
  const openTasks = m.tasks.filter((t) => !m.doneTasks.has(t.key) && t.dueDate <= horizon);
  const doneTasks = m.tasks.filter((t) => m.doneTasks.has(t.key));
  const urgentTasks = openTasks.filter((t) => t.dueDate <= `${m.year}-12-31`);
  const creditLabel = (c: (typeof data.credits)[number]) => `Credito ${CREDIT_KIND[c.kind]} ${c.referenceYear}`;
  const allPayments = paymentEntries(data);
  const noReceipt = missingReceipts(allPayments, asOf);

  const tabs = [
    { id: "da-fare", label: "Da fare", count: toHandle.length + urgentTasks.length + noReceipt.length },
    { id: "calendario", label: "Calendario" },
    { id: "storico", label: "Storico" },
    { id: "crediti", label: "Crediti", count: data.credits.filter((c) => c.residual > 0).length },
    { id: "promemoria", label: "Promemoria", count: data.reminders.length },
  ].map((t) => ({ ...t, href: t.id === "da-fare" ? "/dashboard/fiscale/scadenze" : `/dashboard/fiscale/scadenze?vista=${t.id}` }));

  return (
    <>
      <PageTitle
        title="Scadenze"
        description="Cosa pagare, inviare o ricordare: tasse e contributi dell'attività, dichiarazioni e promemoria personali."
        action={
          <Link href="/dashboard/fiscale/export" className={btn.outline}>
            Esporta per il commercialista
          </Link>
        }
      />
      <DemoNotice show={demo} />
      <Tabs items={tabs} active={view} label="Viste delle scadenze" />

      {view === "da-fare" && <DaFare />}
      {view === "calendario" && (
        <div className="space-y-6">
          <MonthCalendar
            payments={m.schedule.filter((i) => i.dueDate >= asOf && (i.amount > 0 || i.unknownAmount))}
            tasks={m.tasks.filter((t) => t.dueDate >= asOf)}
            asOf={asOf}
            paid={m.paid}
            dismissed={m.dismissed}
            done={new Set(m.doneTasks.keys())}
          />
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
      )}
      {view === "storico" && <Storico />}
      {view === "crediti" && <Crediti />}
      {view === "promemoria" && (
        <div className="grid gap-6 lg:grid-cols-5">
          <Panel title="Nuovo promemoria" description="IMU, bollo auto, canoni, raccolta spese detraibili…" className="lg:col-span-3">
            <ReminderForm demo={demo} />
          </Panel>
          <Panel title="I tuoi promemoria" className="lg:col-span-2">
            {data.reminders.length === 0 ? (
              <p className="text-sm text-[var(--fi-ink-2)]">Ancora nessuno.</p>
            ) : (
              <ul className="-my-2 divide-y divide-[var(--fi-rule)] text-sm">
                {data.reminders.map((r) => (
                  <li key={r.id} className="flex items-baseline gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{r.title}</span>
                      <span className="block text-xs text-[var(--fi-muted)]">
                        {r.recurrence === "yearly" ? "Ogni anno" : r.recurrence === "monthly" ? "Ogni mese" : "Una volta"} dal{" "}
                        {date(r.firstDue)} · {r.scope === "business" ? "attività" : "personale"}
                        {r.amount ? ` · ${eur(r.amount)}` : ""}
                      </span>
                    </span>
                    <form action={archiveReminderAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="text-xs text-[var(--fi-ink-2)] underline-offset-4 hover:text-[var(--fi-critical-text)] hover:underline">
                        Elimina
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </>
  );

  async function DaFare() {
    const media = demo ? {} : await loadGuideMedia();
    const usableCredits = data.credits
      .filter((c) => c.destination === "compensation" && c.residual > 0)
      .map((c) => ({ id: c.id, label: creditLabel(c), residual: c.residual }));
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Stat
            tone="accent"
            label="Da tenere da parte"
            value={eur(m.reserveAfterCredit)}
            hint={m.availableCredit > 0 ? "Già scalato il credito disponibile" : `F24 maturati fino al 30/6/${m.year + 1}`}
          />
          <Stat label={`Uscite fino al 30/6/${m.year + 1}`} value={eur(m.reserve.cashOutUntilHorizon)} hint="Inclusi gli acconti dell'anno prossimo" />
          <Stat
            label="Credito disponibile"
            value={eur(m.availableCredit)}
            hint={
              <Link href="/dashboard/fiscale/scadenze?vista=crediti" className="font-medium text-[var(--fi-action)] hover:underline">
                Gestisci i crediti
              </Link>
            }
          />
        </div>

        {toHandle.length === 0 ? (
          <Panel title="Pagamenti">
            <p className="text-sm text-[var(--fi-ink-2)]">Tutti i pagamenti di quest&apos;anno sono registrati.</p>
          </Panel>
        ) : (
          <OverdueBanner
            items={toHandle}
            demo={demo}
            media={media}
            credits={usableCredits}
            tone={m.overdue.length > 0 ? "warning" : "neutral"}
            title="Pagamenti da fare o da registrare"
            intro="Apri una voce per vedere come pagarla e registrare l'importo, anche se l'hai già pagata in anticipo. Se una stima non ti riguarda, segnala come non dovuta."
          />
        )}

        {noReceipt.length > 0 && (
          <Panel
            title="Ricevute da caricare"
            description="Pagamenti senza la ricevuta che li attesta. Puoi caricare più file insieme (F24, quietanza, ricevuta dell'Agenzia), che finiscono anche in Documenti. Una prenotazione segnala come provvisoria in Storico: resta qui finché non carichi quella definitiva."
          >
            <ul className="-my-2 divide-y divide-[var(--fi-rule)] text-sm">
              {noReceipt.map((p) => (
                <li key={p.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5">
                  <span className="fi-num w-24 shrink-0 text-[var(--fi-ink-2)]">{date(p.date)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{paymentLabel(p)}</span>
                    {p.files.length > 0 && (
                      <span className="block text-xs text-[var(--fi-warning-text)]">
                        Hai solo la ricevuta provvisoria: carica quella definitiva appena è pronta
                      </span>
                    )}
                  </span>
                  <span className="fi-num w-24 shrink-0 text-right">{eur(p.amount)}</span>
                  <PaymentFilesUpload table={p.table} id={p.id} hasFiles={p.files.length > 0} demo={demo} />
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <section aria-labelledby="tasks-title">
          <h2 id="tasks-title" className="mb-3 text-[15px] font-semibold">
            Dichiarazioni e promemoria
          </h2>
          <OpenTasks tasks={openTasks} asOf={asOf} demo={demo} />
        </section>
      </div>
    );
  }

  async function Storico() {
    const payments = allPayments.filter((p) => yearOf(p.date) === m.year);
    const links = demo ? new Map<string, string>() : await fileLinks(payments.flatMap((p) => p.files));
    const expenses = data.expenses.filter((e) => yearOf(e.spentAt) === m.year);

    return (
      <div className="grid gap-6 lg:grid-cols-5">
        <Panel
          title={`Pagamenti registrati nel ${m.year}`}
          className="lg:col-span-3"
          action={<span className="fi-num text-sm font-medium">{eur(sumCents(payments.map((p) => p.amount)))}</span>}
        >
          {payments.length === 0 ? (
            <p className="text-sm text-[var(--fi-ink-2)]">Ancora nessun F24 registrato.</p>
          ) : (
            <ul className="-my-2 divide-y divide-[var(--fi-rule)] text-sm">
              {payments.map((p) => {
                const scheduled = p.date > asOf;
                return (
                  <li key={p.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5">
                    <span className="fi-num w-24 shrink-0 text-[var(--fi-ink-2)]">{date(p.date)}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {paymentLabel(p)}
                      {p.compensated && <span className="ml-2"><Badge tone="accent">compensato</Badge></span>}
                      {scheduled && <span className="ml-2"><Badge>programmato</Badge></span>}
                    </span>
                    <span className="fi-num w-24 shrink-0 text-right">{eur(p.amount)}</span>
                    <span className="flex w-full justify-end sm:w-28">
                      <PaymentFilesUpload table={p.table} id={p.id} hasFiles={p.files.length > 0} demo={demo} />
                    </span>
                    <PaymentFiles files={p.files} links={links} />
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="space-y-6 lg:col-span-2">
          <Panel title="Dichiarazioni fatte">
            {doneTasks.length === 0 ? (
              <p className="text-sm text-[var(--fi-ink-2)]">Nessuna ancora.</p>
            ) : (
              <ul className="-my-2 divide-y divide-[var(--fi-rule)] text-sm">
                {doneTasks.map((t) => {
                  const done = m.doneTasks.get(t.key)!;
                  return (
                    <li key={t.key} className="flex items-baseline gap-3 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{t.title}</span>
                        <span className="block text-xs text-[var(--fi-muted)]">
                          Fatto il {date(done.completedAt)}
                          {done.documentId ? " · ricevuta in Documenti" : ""}
                        </span>
                      </span>
                      <form action={undoTaskAction}>
                        <input type="hidden" name="key" value={t.key} />
                        <button type="submit" className="text-xs text-[var(--fi-ink-2)] underline-offset-4 hover:text-[var(--fi-critical-text)] hover:underline">
                          Annulla
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
          {expenses.length > 0 && (
            <Panel title={`Spese operative ${m.year}`} description="Non deducibili nel forfettario: solo per tua analisi" action={<span className="fi-num text-sm">{eur(m.expensesYtd)}</span>}>
              <ul className="-my-2 divide-y divide-[var(--fi-rule)] text-sm">
                {expenses.map((e) => (
                  <li key={e.id} className="flex items-baseline gap-3 py-2">
                    <span className="fi-num w-24 shrink-0 text-[var(--fi-ink-2)]">{date(e.spentAt)}</span>
                    <span className="min-w-0 flex-1 truncate">{e.description ?? e.category}</span>
                    <span className="fi-num">{eur(e.amount)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    );
  }

  function Crediti() {
    return (
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {data.credits.length === 0 ? (
            <Panel title="Crediti d'imposta">
              <p className="text-sm text-[var(--fi-ink-2)]">
                Nessun credito. Se dalla dichiarazione risulta un credito (es. IRPEF), registralo: viene scalato da quanto
                tenere da parte e lo usi quando paghi un F24 in compensazione.
              </p>
            </Panel>
          ) : (
            data.credits.map((c) => {
              const usedPct = c.amount > 0 ? Math.min(100, (c.used / c.amount) * 100) : 0;
              return (
                <section key={c.id} className={cx(card, "p-5")}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[15px] font-semibold">{creditLabel(c)}</h2>
                      <p className="mt-0.5 text-xs text-[var(--fi-muted)]">
                        {c.destination === "refund" ? "Chiesto a rimborso" : "In compensazione negli F24"}
                        {c.source ? ` · ${c.source}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[var(--fi-ink-2)]">Residuo</p>
                      <p className="fi-num text-[24px] font-semibold leading-none tracking-[-0.02em]">{eur(c.residual)}</p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--fi-fill)]" aria-hidden>
                    <div className="h-full rounded-full bg-[var(--fi-action)]" style={{ width: `${usedPct}%` }} />
                  </div>
                  <p className="fi-num mt-1.5 text-xs text-[var(--fi-ink-2)]">
                    Usati {eur(c.used)} di {eur(c.amount)}
                  </p>
                  {c.notes && <p className="mt-3 rounded-lg bg-[var(--fi-warning-soft)] px-3 py-2 text-xs text-[var(--fi-warning-text)]">{c.notes}</p>}
                  {c.uses.length > 0 && (
                    <ul className="mt-4 divide-y divide-[var(--fi-rule)] border-t border-[var(--fi-rule)] text-sm">
                      {c.uses.map((u) => (
                        <li key={u.id} className="flex items-baseline gap-3 py-2">
                          <span className="fi-num w-24 shrink-0 text-[var(--fi-ink-2)]">{date(u.usedAt)}</span>
                          <span className="min-w-0 flex-1 truncate">{u.note ?? "Compensazione"}</span>
                          <span className="fi-num">−{eur(u.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[var(--fi-rule)] pt-3">
                    <CreditAmountEdit id={c.id} amount={c.amount} />
                    <form action={deleteCreditAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="text-xs text-[var(--fi-ink-2)] underline-offset-4 hover:text-[var(--fi-critical-text)] hover:underline">
                        Elimina
                      </button>
                    </form>
                  </div>
                </section>
              );
            })
          )}
        </div>
        <Panel title="Aggiungi un credito" description="Dalla dichiarazione dei redditi, quadro RX" className="lg:col-span-2">
          <CreditForm defaultYear={m.year - 1} demo={demo} />
        </Panel>
      </div>
    );
  }
}
