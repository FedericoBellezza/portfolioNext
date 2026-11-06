import { connection } from "next/server";
import Link from "next/link";
import { buildDashboard, todayInRome } from "@/lib/fiscale/data/dashboard";
import { loadGuides } from "@/lib/fiscale/data/guide-media";
import { CheckCircle2, ChevronDown, CircleAlert, Clock3, ExternalLink, FileText, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { fiscaleDb, loadDataset } from "@/lib/fiscale/data/load";
import { sumCents } from "@/lib/fiscale/money";
import {
  awaitingCheck,
  belongsElsewhere,
  fileLabel,
  finalReceiptHint,
  paymentLabel,
  uncheckedFiles,
  missingReceipts,
  paymentEntries,
  proofStatus,
  settlement,
  type PaymentEntry,
  type PaymentFile,
  type ProofStatus,
} from "@/lib/fiscale/receipts";
import type { TaskItem } from "@/lib/fiscale/tasks";
import { yearOf, type F24Item } from "@/lib/fiscale/tax-calculator";
import { createClient } from "@/lib/supabase/server";
import { DeadlineList } from "../components/charts";
import { ConfirmSubmit, SubmitButton } from "../components/form-buttons";
import { date, dayDate, eur, MONTHS } from "../components/format";
import { OverdueBanner } from "../components/overdue-banner";
import { Badge, btn, card, cx, DemoNotice, Disclosure, PageTitle, Panel, Stat, Tabs } from "../components/ui";
import { deleteCreditAction } from "./credit-actions";
import { CreditAmountEdit, CreditForm } from "./credits-ui";
import { deleteDocumentAction, setDocumentProvisionalAction } from "../documenti/actions";
import { recheckFileAction } from "../receipt-check-actions";
import { PaymentFilesUpload, ReceiptAutoCheck } from "./receipt-ui";
import { archiveReminderAction, undoTaskAction } from "./task-actions";
import { OpenTasks, ReminderForm } from "./tasks-ui";

export const metadata = { title: "Scadenze | Fiscale" };
// The check of new receipts with Claude Code runs in this page's server actions.
export const maxDuration = 300;

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

const PROOF: Record<ProofStatus, { icon: typeof CheckCircle2; text: string; color: string }> = {
  confirmed: { icon: CheckCircle2, text: "Pagamento confermato", color: "text-[var(--fi-good-text)]" },
  validating: { icon: Sparkles, text: "In validazione: Claude sta leggendo i file", color: "text-[var(--fi-action)]" },
  waiting: { icon: Clock3, text: "In attesa della ricevuta definitiva", color: "text-[var(--fi-warning-text)]" },
  missing: { icon: CircleAlert, text: "Manca la ricevuta", color: "text-[var(--fi-warning-text)]" },
  scheduled: { icon: Clock3, text: "Programmato", color: "text-[var(--fi-muted)]" },
};

/** Where to download the final receipt: the pages to open, the steps in the tooltip. */
function FinalReceiptLinks({ p, asOf }: { p: PaymentEntry; asOf: string }) {
  const hint = finalReceiptHint(p, asOf);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--fi-ink-2)]" title={hint.text}>
      <span>Scarica la definitiva da</span>
      {hint.links.map((l, i) => (
        <span key={l.href} className="inline-flex items-center gap-2">
          {i > 0 && <span aria-hidden className="text-[var(--fi-muted)]">o</span>}
          <a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-[var(--fi-action)] underline-offset-4 hover:underline">
            {l.label}
            <ExternalLink aria-hidden className="h-3 w-3" />
          </a>
        </span>
      ))}
    </span>
  );
}

/**
 * Proof of one payment: a single status line that opens the list of its files.
 * Each file shows what it is (as Claude read it, or guessed from its name) and
 * whether it is final; the full file name stays in the tooltip and in Documenti.
 * While the final receipt is missing, the pages to get it are always in sight.
 */
function PaymentProof({ p, asOf, links, demo }: { p: PaymentEntry; asOf: string; links: Map<string, string>; demo: boolean }) {
  const status = proofStatus(p, asOf);
  const { icon: Icon, text, color } = PROOF[status];
  const misplaced = p.files.filter(belongsElsewhere);
  const line = (
    <span className={cx("inline-flex items-center gap-1.5 text-xs font-medium", color)}>
      <Icon aria-hidden className="h-3.5 w-3.5 shrink-0" />
      {text}
    </span>
  );
  const extra = (
    <>
      {(status === "waiting" || status === "missing") && (
        <div className="mt-1">
          <FinalReceiptLinks p={p} asOf={asOf} />
        </div>
      )}
      {misplaced.length > 0 && (
        <p className="mt-1 flex items-start gap-1.5 text-xs text-[var(--fi-critical-text)]">
          <CircleAlert aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" />
          {misplaced.length === 1
            ? "Un file sembra di un altro pagamento: aprilo e controlla."
            : `${misplaced.length} file sembrano di un altro pagamento: aprili e controlla.`}
        </p>
      )}
    </>
  );

  if (p.files.length === 0) {
    return (
      <>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {line}
          <PaymentFilesUpload table={p.table} id={p.id} demo={demo} />
        </div>
        {extra}
      </>
    );
  }

  return (
    <>
      <details className="group mt-1.5">
        <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-sm [&::-webkit-details-marker]:hidden">
          {line}
          <span className="inline-flex items-center gap-0.5 text-xs text-[var(--fi-muted)] group-hover:text-[var(--fi-ink-2)]">
            {p.files.length === 1 ? "1 file" : `${p.files.length} file`}
            <ChevronDown aria-hidden className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <div className="mt-2 rounded-md bg-[var(--fi-ground)] p-2.5">
          <ul className="space-y-2 text-xs">
            {p.files.map((f) => {
              const href = links.get(f.path);
              const kind = fileLabel(f);
              const checked = f.check?.status === "ok";
              return (
                <li key={f.path}>
                  <div className="flex items-center gap-2">
                    <FileText aria-hidden className="h-3.5 w-3.5 shrink-0 text-[var(--fi-muted)]" />
                    <span className="flex min-w-0 flex-1 items-center gap-1.5">
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" title={f.title} className="min-w-0 truncate font-medium text-[var(--fi-ink)] underline-offset-4 hover:text-[var(--fi-action)] hover:underline">
                          {kind}
                        </a>
                      ) : (
                        <span title={f.title} className="min-w-0 truncate font-medium">
                          {kind}
                        </span>
                      )}
                      {checked && (
                        <span title="Letto e controllato da Claude" className="shrink-0 text-[var(--fi-action)]">
                          <Sparkles aria-label="Controllato da Claude" className="h-3 w-3" />
                        </span>
                      )}
                    </span>
                    {awaitingCheck(f) ? (
                      <span
                        title="Claude deve ancora leggere il file: fino ad allora non conferma il pagamento"
                        className="shrink-0 rounded-full bg-[var(--fi-action-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--fi-action)]"
                      >
                        in validazione
                      </span>
                    ) : f.id ? (
                      <form action={setDocumentProvisionalAction} className="shrink-0">
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="provisional" value={f.provisional ? "false" : "true"} />
                        <SubmitButton
                          title={f.provisional ? "Segna come definitiva: attesta che il pagamento è avvenuto" : "Segna come provvisoria: il pagamento non è ancora confermato"}
                          className={cx(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium hover:ring-1 hover:ring-current",
                            f.provisional ? "bg-[var(--fi-warning-soft)] text-[var(--fi-warning-text)]" : "bg-[var(--fi-good-soft)] text-[var(--fi-good-text)]",
                          )}
                        >
                          {f.provisional ? "provvisoria" : "definitiva"}
                        </SubmitButton>
                      </form>
                    ) : (
                      <Badge tone="good">definitiva</Badge>
                    )}
                    {f.id && checked && (
                      <form action={recheckFileAction} className="shrink-0">
                        <input type="hidden" name="id" value={f.id} />
                        <SubmitButton
                          iconOnly
                          aria-label={`Fai ricontrollare ${kind} a Claude`}
                          title="Fai ricontrollare a Claude"
                          className="h-6 w-6 justify-center rounded text-[var(--fi-muted)] hover:bg-[var(--fi-action-soft)] hover:text-[var(--fi-action)]"
                        >
                          <RotateCcw aria-hidden className="h-3.5 w-3.5" />
                        </SubmitButton>
                      </form>
                    )}
                    {f.id && (
                      <form action={deleteDocumentAction} className="shrink-0">
                        <input type="hidden" name="id" value={f.id} />
                        <ConfirmSubmit
                          question="Rimuovere il file?"
                          confirmLabel="Sì, rimuovi"
                          pendingLabel="Rimozione…"
                          aria-label={`Rimuovi ${kind}`}
                          title="Rimuovi il file"
                          className="grid h-6 w-6 place-items-center rounded text-[var(--fi-muted)] hover:bg-[var(--fi-critical-soft)] hover:text-[var(--fi-critical-text)]"
                        >
                          <Trash2 aria-hidden className="h-3.5 w-3.5" />
                        </ConfirmSubmit>
                      </form>
                    )}
                  </div>
                  {f.check?.status === "ok" && (f.check.note || f.check.matches === false) && (
                    <p className={cx("mt-1 pl-[22px]", f.check.matches === false ? "text-[var(--fi-critical-text)]" : "text-[var(--fi-ink-2)]")}>
                      {f.check.note ?? "Sembra di un altro pagamento: controlla di averlo collegato a quello giusto."}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          {status !== "confirmed" && <p className="mt-2 text-xs text-[var(--fi-ink-2)]">{finalReceiptHint(p, asOf).text}</p>}
          <div className="mt-2 border-t border-[var(--fi-rule)] pt-2">
            <PaymentFilesUpload table={p.table} id={p.id} hasFiles demo={demo} />
          </div>
        </div>
      </details>
      {extra}
    </>
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
        // Deadlines of the month already paid (maybe in advance, in another month) or
        // marked as not due are not money still to put out: they are told apart.
        const toPay = sumCents(pay.filter((p) => !paid.has(p.key)).map((p) => p.amount));
        const alreadyPaid = sumCents(pay.filter((p) => paid.has(p.key) && !dismissed.has(p.key)).map((p) => p.amount));
        return (
          <section key={month} className={cx(card, "px-5 pt-4 pb-1")}>
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold">
                {MONTHS[mm - 1]} {y}
              </h3>
              {pay.length > 0 && (
                <span className="fi-num text-xs text-[var(--fi-muted)]">
                  {toPay > 0 || alreadyPaid === 0 ? `${eur(toPay)} da pagare` : "Tutto pagato"}
                  {alreadyPaid > 0 && ` · ${eur(alreadyPaid)} già pagati`}
                </span>
              )}
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

export default async function ScadenzePage({ searchParams }: { searchParams: Promise<{ vista?: string; anno?: string }> }) {
  await connection();
  const { vista, anno } = await searchParams;
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
      <ReceiptAutoCheck pending={demo ? 0 : uncheckedFiles(allPayments).length} />
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
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
                      <ConfirmSubmit
                        question="Eliminare il promemoria?"
                        className="text-xs text-[var(--fi-ink-2)] underline-offset-4 hover:text-[var(--fi-critical-text)] hover:underline"
                      >
                        Elimina
                      </ConfirmSubmit>
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
    // The tutorials are the same for every user, demo included: they explain how to pay, not the user's data.
    const guides = await loadGuides();
    const usableCredits = data.credits
      .filter((c) => c.destination === "compensation" && c.residual > 0)
      .map((c) => ({ id: c.id, label: creditLabel(c), residual: c.residual }));
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Stat
            tone="accent"
            label="Da tenere da parte"
            value={eur(m.reserveAfterCredit)}
            hint={
              m.availableCredit > 0
                ? `Tutti gli F24 fino al 30/6/${m.year + 1} (${eur(m.reserve.cashOutUntilHorizon)}) meno il credito`
                : `Tutti gli F24 fino al 30/6/${m.year + 1}, acconti compresi`
            }
          />
          <Stat
            label={`Di cui anticipi sul ${m.year + 1}`}
            value={eur(m.nextYearShare)}
            hint={`Acconti e contributi INPS fissi del ${m.year + 1}: già compresi, si pagano comunque`}
          />
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
            media={guides.media}
            canUpload={guides.canUpload}
            credits={usableCredits}
            tone={m.overdue.length > 0 ? "warning" : "neutral"}
            title="Pagamenti da fare o da registrare"
            intro="Apri una voce per vedere come pagarla e registrare l'importo, anche se l'hai già pagata in anticipo. Se una stima non ti riguarda, segnala come non dovuta."
          />
        )}

        {noReceipt.length > 0 && (
          <Panel
            title="Ricevute da caricare"
            description="Pagamenti senza la ricevuta che li attesta. Carica uno o più file: Claude li legge, capisce se sono definitivi e controlla che siano del pagamento giusto."
          >
            <ul className="-my-2 divide-y divide-[var(--fi-rule)] text-sm">
              {noReceipt.map((p) => (
                <li key={p.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5">
                  <span className="fi-num w-24 shrink-0 text-[var(--fi-ink-2)]">{date(p.date)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{paymentLabel(p)}</span>
                    {p.files.some(awaitingCheck) ? (
                      <span className="block text-xs text-[var(--fi-action)]">In validazione: Claude sta leggendo i file caricati.</span>
                    ) : (
                      <>
                        {p.files.length > 0 && <span className="block text-xs text-[var(--fi-warning-text)]">Hai solo file provvisori.</span>}
                        <span className="mt-0.5 block">
                          <FinalReceiptLinks p={p} asOf={asOf} />
                        </span>
                      </>
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
    // Years with something recorded, newest first; the current one is always there.
    const years = [
      ...new Set([m.year, ...allPayments.map((p) => yearOf(p.date)), ...data.completedTasks.map((t) => yearOf(t.completedAt))]),
    ].sort((a, b) => b - a);
    const year = years.includes(Number(anno)) ? Number(anno) : m.year;
    const payments = allPayments.filter((p) => yearOf(p.date) === year);
    const filings = data.completedTasks
      .filter((t) => yearOf(t.completedAt) === year)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    const expenses = data.expenses.filter((e) => yearOf(e.spentAt) === year);

    // Files of the filings (task receipts are archive documents).
    const filingDocs = new Map<string, PaymentFile>();
    const docIds = filings.map((t) => t.documentId).filter((id): id is string => Boolean(id));
    if (!demo && docIds.length > 0) {
      const db = await fiscaleDb();
      const { data: docs } = await db.from("documents").select("id, title, file_path").in("id", docIds);
      for (const d of docs ?? []) {
        filingDocs.set(String(d.id), { id: null, title: String(d.title), path: String(d.file_path), bucket: "fiscale-docs", provisional: false, check: null });
      }
    }
    const links = demo ? new Map<string, string>() : await fileLinks([...payments.flatMap((p) => p.files), ...filingDocs.values()]);
    const filingTitle = (key: string) => {
      const known = m.tasks.find((t) => t.key === key)?.title;
      if (known) return known;
      const [, kind, y] = key.split(":");
      if (kind === "redditi") return `Dichiarazione dei redditi per il ${Number(y) - 1} (Modello Redditi PF)`;
      if (kind === "inail") return `Dichiarazione retribuzioni INAIL per il ${Number(y) - 1}`;
      if (kind === "inps35") return "Riduzione INPS: passaggio dal 50% al 35%";
      return "Promemoria";
    };

    return (
      <div className="space-y-6">
        {years.length > 1 && (
          <Tabs
            label="Anno dello storico"
            active={String(year)}
            className="inline-flex"
            items={years.map((y) => ({ id: String(y), label: String(y), href: `/dashboard/fiscale/scadenze?vista=storico&anno=${y}` }))}
          />
        )}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <Panel
            title={`Pagamenti del ${year}`}
            description="Confermato = hai la ricevuta definitiva (quietanza o attestazione di pagamento). Il modello F24 o una prenotazione da soli sono provvisori: dicono che hai disposto il pagamento, non che è avvenuto."
            className="lg:col-span-3"
            action={<span className="fi-num text-sm font-medium">{eur(sumCents(payments.map((p) => p.amount)))}</span>}
          >
            {payments.length === 0 ? (
              <p className="text-sm text-[var(--fi-ink-2)]">Nessun pagamento registrato nel {year}.</p>
            ) : (
              <ul className="-my-2 divide-y divide-[var(--fi-rule)] text-sm">
                {payments.map((p) => {
                  const scheduled = p.date > asOf;
                  const s = settlement(p);
                  return (
                    <li key={p.id} className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] gap-x-4 py-3 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto]">
                      <span className="fi-num text-[var(--fi-ink-2)]">{date(p.date)}</span>
                      <div className="min-w-0">
                        <p className="font-medium">
                          {paymentLabel(p)}
                          {scheduled && <span className="ml-1.5 text-xs font-normal text-[var(--fi-muted)]">· programmato</span>}
                        </p>
                        {s.mode !== "bank" && (
                          <p className="fi-num mt-0.5 text-xs text-[var(--fi-ink-2)]">
                            {s.mode === "credit"
                              ? `Tutto con il credito (${eur(s.credit)}), niente addebito in banca`
                              : s.mode === "mixed"
                                ? `Credito ${eur(s.credit)} + addebito in banca ${eur(s.bank)}`
                                : "Compensato con un credito (importo non registrato)"}
                          </p>
                        )}
                        <PaymentProof p={p} asOf={asOf} links={links} demo={demo} />
                      </div>
                      <span className="fi-num text-right font-medium">{eur(p.amount)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <div className="space-y-6 lg:col-span-2">
            <Panel title={`Dichiarazioni fatte nel ${year}`}>
              {filings.length === 0 ? (
                <p className="text-sm text-[var(--fi-ink-2)]">Nessuna.</p>
              ) : (
                <ul className="-my-2 divide-y divide-[var(--fi-rule)] text-sm">
                  {filings.map((t) => {
                    const doc = t.documentId ? filingDocs.get(t.documentId) : undefined;
                    return (
                      <li key={t.key} className="flex flex-wrap items-baseline gap-x-3 py-2.5">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{filingTitle(t.key)}</span>
                          <span className="block text-xs text-[var(--fi-muted)]">Fatto il {date(t.completedAt)}</span>
                        </span>
                        <form action={undoTaskAction}>
                          <input type="hidden" name="key" value={t.key} />
                          <ConfirmSubmit
                            question="Segnarla come non fatta?"
                            confirmLabel="Sì, annulla"
                            pendingLabel="Annullamento…"
                            className="text-xs text-[var(--fi-ink-2)] underline-offset-4 hover:text-[var(--fi-critical-text)] hover:underline"
                          >
                            Annulla
                          </ConfirmSubmit>
                        </form>
                        {doc && (
                          <span className="mt-1.5 flex w-full items-center gap-2 text-xs">
                            <FileText aria-hidden className="h-3.5 w-3.5 shrink-0 text-[var(--fi-muted)]" />
                            {links.get(doc.path) ? (
                              <a href={links.get(doc.path)} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-[var(--fi-ink-2)] underline-offset-4 hover:text-[var(--fi-action)] hover:underline">
                                {doc.title}
                              </a>
                            ) : (
                              <span className="min-w-0 truncate text-[var(--fi-ink-2)]">{doc.title}</span>
                            )}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-4 border-t border-[var(--fi-rule)] pt-3 text-xs text-[var(--fi-ink-2)]">
                Dichiarazioni, visure e gli altri file sono tutti in{" "}
                <Link href="/dashboard/fiscale/documenti" className="font-medium text-[var(--fi-action)] hover:underline">
                  Documenti
                </Link>
                .
              </p>
            </Panel>
            {expenses.length > 0 && (
              <Panel title={`Spese operative ${year}`} description="Non deducibili nel forfettario: solo per tua analisi" action={<span className="fi-num text-sm">{eur(sumCents(expenses.map((e) => e.amount)))}</span>}>
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
      </div>
    );
  }

  function Crediti() {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
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
                      <ConfirmSubmit
                        question="Eliminare il credito?"
                        className="text-xs text-[var(--fi-ink-2)] underline-offset-4 hover:text-[var(--fi-critical-text)] hover:underline"
                      >
                        Elimina
                      </ConfirmSubmit>
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
