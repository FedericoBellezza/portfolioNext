import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { todayInRome } from "@/lib/fiscale/data/dashboard";
import { loadInvoiceForXml } from "@/lib/fiscale/data/invoice-xml";
import { fiscaleDb } from "@/lib/fiscale/data/load";
import { toCents } from "@/lib/fiscale/money";
import { daysBetween, date, eur } from "../../components/format";
import { ConfirmSubmit, SubmitButton } from "../../components/form-buttons";
import { Badge, btn, PageTitle, Panel } from "../../components/ui";
import { deleteCollectionAction, deleteDraftAction, regenerateXmlAction } from "./actions";
import { CollectionForm, IssueForm, SdiStatusForm } from "./invoice-actions";

export const metadata = { title: "Fattura | Fiscale" };

const PORTAL_URL = "https://ivaservizi.agenziaentrate.gov.it/portale/";

const SDI_LABEL: Record<string, string> = {
  not_sent: "Da inviare",
  sent: "Inviata, in attesa di esito",
  delivered: "Consegnata",
  not_delivered: "Mancata consegna",
  rejected: "Scartata",
};

type Row = Record<string, unknown>;
const clientName = (c: Row | null) =>
  c ? String(c.company_name ?? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()) : "—";

export default async function FatturaPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const db = await fiscaleDb();
  const loaded = await loadInvoiceForXml(db, id);
  if (!loaded) notFound();
  const { invoice, items, currentClient } = loaded;
  const { data: paymentRows } = await db
    .from("invoice_payments")
    .select("id, collected_at, amount")
    .eq("invoice_id", id)
    .order("collected_at");
  const payments = (paymentRows ?? []).map((p) => ({ id: String(p.id), date: String(p.collected_at), amount: toCents(p.amount as string) }));
  const total = toCents(invoice.total_amount as string);
  const remaining = Math.max(0, total - payments.reduce((s, p) => s + p.amount, 0));

  const today = todayInRome();
  const draft = invoice.status === "draft";
  const client = (invoice.client_snapshot as Row | null) ?? currentClient;
  const sdi = String(invoice.sdi_status);
  const issueDate = invoice.issue_date ? String(invoice.issue_date) : null;
  const daysSinceIssue = issueDate ? daysBetween(issueDate, today) : 0;
  const title = draft ? "Bozza di fattura" : `Fattura n. ${invoice.number}/${invoice.fiscal_year}`;

  return (
    <>
      <PageTitle
        title={title}
        description={
          <>
            {clientName(client)} · {draft ? "non ancora emessa" : `emessa il ${date(issueDate)}`}
          </>
        }
        action={
          <Link href="/dashboard/fiscale/fatture" className={btn.outline}>
            ← Fatture
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          <Panel title="Righe">
            <ul className="divide-y divide-[var(--fi-rule)] text-sm">
              {items.map((it) => (
                <li key={String(it.id)} className="flex items-baseline gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    {String(it.description)}
                    <span className="ml-2 text-xs text-[var(--fi-muted)]">
                      {Number(it.quantity)} × {eur(toCents(it.unit_price as string))} · {String(it.vat_nature)}
                    </span>
                  </span>
                  <span className="fi-num">{eur(toCents(it.line_total as string))}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-[var(--fi-rule)] pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--fi-ink-2)]">Imponibile</dt>
                <dd className="fi-num">{eur(toCents(invoice.taxable_amount as string))}</dd>
              </div>
              {Number(invoice.stamp_duty_amount) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-[var(--fi-ink-2)]">Bollo virtuale</dt>
                  <dd className="fi-num">
                    {invoice.stamp_duty_charged ? eur(toCents(invoice.stamp_duty_amount as string)) : "a tuo carico"}
                  </dd>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <dt>Totale documento</dt>
                <dd className="fi-num text-base">{eur(toCents(invoice.total_amount as string))}</dd>
              </div>
              {invoice.due_date ? (
                <div className="flex justify-between text-xs text-[var(--fi-muted)]">
                  <dt>Scadenza pagamento</dt>
                  <dd>{date(String(invoice.due_date))}</dd>
                </div>
              ) : null}
            </dl>
          </Panel>

          <Panel title="Cliente" description={draft ? "Dati attuali in anagrafica" : "Dati congelati al momento dell'emissione"}>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div><dt className="fi-label">Nome</dt><dd>{clientName(client)}</dd></div>
              <div><dt className="fi-label">P.IVA / CF</dt><dd className="fi-num">{String(client?.vat_number ?? client?.tax_code ?? "—")}</dd></div>
              <div><dt className="fi-label">Recapito SdI</dt><dd className="fi-num">{String(client?.sdi_code ?? "—")}{client?.pec ? ` · ${client.pec}` : ""}</dd></div>
              <div><dt className="fi-label">Sede</dt><dd>{String(client?.address ?? "")} {String(client?.street_number ?? "")}, {String(client?.postal_code ?? "")} {String(client?.city ?? "")}</dd></div>
            </dl>
          </Panel>
        </div>

        <aside className="space-y-6 xl:col-span-2">
          {!draft && (
            <Panel
              title="Incassi"
              description="La data d'incasso decide l'anno in cui paghi le tasse"
              action={<Badge tone={remaining === 0 ? "good" : "outline"}>{remaining === 0 ? "Incassata" : `Da incassare ${eur(remaining)}`}</Badge>}
            >
              {payments.length > 0 && (
                <ul className="mb-4 divide-y divide-[var(--fi-rule)] text-sm">
                  {payments.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-2">
                      <span className="fi-num flex-1">{date(p.date)}</span>
                      <span className="fi-num">{eur(p.amount)}</span>
                      <form action={deleteCollectionAction}>
                        <input type="hidden" name="invoiceId" value={id} />
                        <input type="hidden" name="paymentId" value={p.id} />
                        <ConfirmSubmit question="Eliminare l'incasso?" className="text-xs text-[var(--fi-ink-2)] underline hover:text-[var(--fi-critical)]">
                          Elimina
                        </ConfirmSubmit>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              {remaining > 0 && <CollectionForm id={id} remaining={remaining} today={today} />}
            </Panel>
          )}
          {draft ? (
            <Panel title="Emissione">
              <IssueForm id={id} defaultDate={issueDate && issueDate <= today ? issueDate : today} today={today} />
              <form action={deleteDraftAction} className="mt-4 border-t border-[var(--fi-rule)] pt-3">
                <input type="hidden" name="id" value={id} />
                <ConfirmSubmit question="Eliminare la bozza?" className="text-xs text-[var(--fi-ink-2)] underline hover:text-[var(--fi-critical)]">
                  Elimina bozza
                </ConfirmSubmit>
              </form>
            </Panel>
          ) : (
            <Panel
              title="Invio allo SdI"
              action={<Badge tone={sdi === "delivered" ? "good" : sdi === "rejected" ? "critical" : sdi === "not_sent" ? "solid" : "neutral"}>{SDI_LABEL[sdi] ?? sdi}</Badge>}
            >
              {sdi === "not_sent" && daysSinceIssue > 12 && (
                <p className="mb-4 rounded-lg bg-[var(--fi-warning-soft)] p-3 text-sm text-[var(--fi-warning-text)]">
                  Sono passati {daysSinceIssue} giorni dall&apos;emissione: la fattura immediata va trasmessa entro 12
                  giorni dalla data del documento.
                </p>
              )}
              {sdi === "rejected" && (
                <div className="mb-4 rounded-lg bg-[var(--fi-critical-soft)] p-3 text-sm text-[var(--fi-critical-text)]">
                  <p>
                    Una fattura scartata si considera non emessa. Correggi i dati del cliente in anagrafica, poi rigenera
                    l&apos;XML e reinvialo entro 5 giorni dallo scarto, con lo stesso numero e la stessa data.
                  </p>
                  <form action={regenerateXmlAction} className="mt-3">
                    <input type="hidden" name="id" value={id} />
                    <SubmitButton className={btn.primary}>Rigenera XML con i dati attuali</SubmitButton>
                  </form>
                </div>
              )}

              <ol className="space-y-4 text-sm">
                <li>
                  <p className="fi-label mb-1.5">1 · Scarica il file</p>
                  {invoice.xml_payload ? (
                    <a href={`/api/fiscale/fatture/${id}/xml`} className={btn.primary}>
                      <Download aria-hidden className="h-4 w-4" /> {String(invoice.sdi_filename)}
                    </a>
                  ) : (
                    <form action={regenerateXmlAction}>
                      <input type="hidden" name="id" value={id} />
                      <SubmitButton className={btn.primary}>Genera XML</SubmitButton>
                    </form>
                  )}
                </li>
                <li>
                  <p className="fi-label mb-1.5">2 · Caricalo sul portale</p>
                  <p className="text-[var(--fi-ink-2)]">
                    Fatture e Corrispettivi → Fatturazione elettronica → Trasmissione → carica il file. Il portale
                    controlla l&apos;XML prima dell&apos;invio.
                  </p>
                  <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer" className={`${btn.outline} mt-2`}>
                    Apri Fatture e Corrispettivi <ExternalLink aria-hidden className="h-4 w-4" />
                  </a>
                </li>
                <li>
                  <p className="fi-label mb-1.5">3 · Segna l&apos;esito</p>
                  <SdiStatusForm id={id} current={sdi} identifier={invoice.sdi_identifier ? String(invoice.sdi_identifier) : null} />
                </li>
              </ol>
            </Panel>
          )}
        </aside>
      </div>
    </>
  );
}
