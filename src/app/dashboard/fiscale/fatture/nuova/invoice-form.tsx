"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import type { ClientRow } from "@/lib/fiscale/data/types";
import { computeInvoiceTotals } from "@/lib/fiscale/invoice-math";
import { toCents } from "@/lib/fiscale/money";
import type { FiscalProfile } from "@/lib/fiscale/tax-config";
import { eur, pct } from "../../components/format";
import { btn, cx } from "../../components/ui";
import { createDraftInvoice, type DraftState } from "../actions";
import { Spinner } from "../../components/form-buttons";

type Line = { description: string; quantity: string; unitPrice: string };

const parseNumber = (s: string) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const card = "rounded-xl border border-[var(--fi-rule)] bg-[var(--fi-surface)] p-5";
const label = "mb-1.5 block text-xs font-medium text-[var(--fi-ink-2)]";

export function InvoiceForm({
  clients,
  profile,
  today,
  demo,
}: {
  clients: ClientRow[];
  profile: FiscalProfile;
  today: string;
  demo: boolean;
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [issueDate, setIssueDate] = useState(today);
  const [termsDays, setTermsDays] = useState("30");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ description: "Sviluppo software", quantity: "1", unitPrice: "1000" }]);
  const [state, formAction, pending] = useActionState<DraftState, FormData>(createDraftInvoice, null);

  const totals = useMemo(
    () =>
      computeInvoiceTotals(
        lines.map((l) => ({
          description: l.description,
          quantity: parseNumber(l.quantity),
          unitPrice: toCents(parseNumber(l.unitPrice)),
        })),
        { issueDate, profile },
      ),
    [lines, issueDate, profile],
  );

  const dueDate = addDays(issueDate, Math.max(0, parseNumber(termsDays)));
  const client = clients.find((c) => c.id === clientId);
  const payload = JSON.stringify({
    clientId,
    issueDate,
    dueDate,
    notes,
    lines: lines.map((l) => ({
      description: l.description,
      quantity: parseNumber(l.quantity),
      unitPrice: parseNumber(l.unitPrice),
    })),
  });

  const update = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <form action={formAction} className="grid grid-cols-1 gap-6 xl:grid-cols-5">
      <input type="hidden" name="payload" value={payload} />

      <div className="space-y-6 xl:col-span-3">
        <section className={card}>
          <h2 className="mb-4 text-[15px] font-semibold">Cliente e date</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label htmlFor="client" className={label}>
                Cliente
              </label>
              <select id="client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                {clients.length === 0 && <option value="">Nessun cliente in anagrafica</option>}
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.vatNumber ? `· P.IVA ${c.vatNumber}` : ""}
                  </option>
                ))}
              </select>
              {clients.length === 0 && (
                <p className="mt-1.5 text-xs text-[var(--fi-ink-2)]">
                  Nessun cliente in anagrafica.{" "}
                  <Link href="/dashboard/fiscale/clienti" className="text-[var(--fi-action)] underline">
                    Aggiungine uno
                  </Link>
                  .
                </p>
              )}
              {client && (
                <p className="mt-1.5 text-xs text-[var(--fi-muted)]">
                  Recapito SdI: {client.pec ? `PEC ${client.pec}` : `codice ${client.sdiCode}`} · {client.city}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="issueDate" className={label}>
                Data emissione
              </label>
              <input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div>
              <label htmlFor="terms" className={label}>
                Pagamento a (giorni)
              </label>
              <input id="terms" inputMode="numeric" value={termsDays} onChange={(e) => setTermsDays(e.target.value)} />
            </div>
            <div>
              <span className={label}>Scadenza</span>
              <p className="fi-num flex h-[34px] items-center text-sm">{dueDate}</p>
            </div>
          </div>
        </section>

        <section className={card}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Righe</h2>
            <button
              type="button"
              className={btn.outline}
              onClick={() => setLines((ls) => [...ls, { description: "", quantity: "1", unitPrice: "0" }])}
            >
              <Plus aria-hidden className="h-4 w-4" /> Riga
            </button>
          </div>
          <div className="space-y-3">
            <div className="hidden grid-cols-12 gap-2 text-xs text-[var(--fi-muted)] sm:grid">
              <span className="col-span-6">Descrizione</span>
              <span className="col-span-2">Quantità</span>
              <span className="col-span-2">Prezzo €</span>
              <span className="col-span-2 text-right">Totale</span>
            </div>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <input
                  className="col-span-12 sm:col-span-6"
                  placeholder="Descrizione"
                  aria-label="Descrizione"
                  value={l.description}
                  onChange={(e) => update(i, { description: e.target.value })}
                />
                <input
                  className="col-span-4 sm:col-span-2"
                  inputMode="decimal"
                  aria-label="Quantità"
                  value={l.quantity}
                  onChange={(e) => update(i, { quantity: e.target.value })}
                />
                <input
                  className="col-span-4 sm:col-span-2"
                  inputMode="decimal"
                  aria-label="Prezzo unitario"
                  value={l.unitPrice}
                  onChange={(e) => update(i, { unitPrice: e.target.value })}
                />
                <div className="col-span-4 flex items-center justify-end gap-1 sm:col-span-2">
                  <span className="fi-num text-sm">{eur(totals.lines[i]?.lineTotal ?? 0)}</span>
                  <button
                    type="button"
                    aria-label="Rimuovi riga"
                    disabled={lines.length === 1}
                    onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                    className="rounded-md p-1.5 text-[var(--fi-muted)] hover:text-[var(--fi-critical)] disabled:opacity-30"
                  >
                    <Trash2 aria-hidden className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={card}>
          <label htmlFor="notes" className={label}>
            Note (opzionali)
          </label>
          <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </section>
      </div>

      <aside className="xl:col-span-2">
        <section className={cx(card, "xl:sticky xl:top-24")}>
          <h2 className="mb-4 text-[15px] font-semibold">Anteprima</h2>
          <dl className="divide-y divide-[var(--fi-rule)] text-sm">
            <Row label="Imponibile (N2.2, senza IVA)" value={eur(totals.taxableAmount)} />
            <Row
              label={totals.stampDutyRequired ? "Bollo virtuale" : "Bollo (sotto 77,47 €)"}
              value={totals.stampDutyCharged ? eur(totals.stampDuty) : totals.stampDutyRequired ? "a tuo carico" : "—"}
            />
            <Row label="Totale documento" value={eur(totals.totalDocument)} strong />
          </dl>

          <div className="mt-5 rounded-lg bg-[var(--fi-fill)]/60 p-4">
            <p className="fi-label mb-2">Quando lo incassi</p>
            <dl className="space-y-1.5 text-sm">
              <Row plain label="Reddito imponibile (67%)" value={eur(totals.estimate.taxableIncome)} />
              <Row plain label="INPS stimata" value={`− ${eur(totals.estimate.inps)}`} />
              <Row plain label="Imposta sostitutiva" value={`− ${eur(totals.estimate.substituteTax)}`} />
              {totals.stampDutyRequired && <Row plain label="Bollo versato con F24" value={`− ${eur(totals.stampDuty)}`} />}
              <Row plain strong label={`Netto stimato (${pct(totals.estimate.netRate)})`} value={eur(totals.estimate.net)} />
            </dl>
            <p className="mt-2 text-xs text-[var(--fi-muted)]">Stima marginale: assume il minimale INPS già coperto.</p>
          </div>

          <details className="mt-5 text-xs text-[var(--fi-ink-2)]">
            <summary className="cursor-pointer">Diciture in fattura</summary>
            <div className="mt-2 space-y-2">
              {totals.notes.map((n) => (
                <p key={n}>{n}</p>
              ))}
            </div>
          </details>

          {state && !state.ok && (
            <p role="alert" className="mt-4 text-sm text-[var(--fi-critical)]">
              {state.message}
            </p>
          )}
          <button type="submit" className={cx(btn.primary, "mt-5 w-full")} disabled={pending || !clientId || demo}>
            {pending && <Spinner className="h-4 w-4" />}
            {pending ? "Salvataggio…" : demo ? "Crea il profilo fiscale per salvare" : "Salva bozza"}
          </button>
        </section>
      </aside>
    </form>
  );
}

function Row({ label, value, strong, plain }: { label: string; value: string; strong?: boolean; plain?: boolean }) {
  return (
    <div className={cx("flex justify-between gap-4", !plain && "py-2.5", strong && "font-semibold")}>
      <dt className={strong ? "" : "text-[var(--fi-ink-2)]"}>{label}</dt>
      <dd className="fi-num">{value}</dd>
    </div>
  );
}
