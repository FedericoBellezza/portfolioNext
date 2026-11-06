"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { date as fmtDate, eur } from "../components/format";
import { btn, cx } from "../components/ui";
import { registerCollectionsAction, type BulkState } from "./actions";
import { Spinner } from "../components/form-buttons";

export interface OpenInvoice {
  id: string;
  label: string;
  clientName: string;
  issueDate: string;
  suggestedDate: string;
  remaining: number; // cents
}

const toInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export function CollectionsForm({ invoices, today }: { invoices: OpenInvoice[]; today: string }) {
  const [state, action, pending] = useActionState<BulkState, FormData>(registerCollectionsAction, null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Saved invoices leave the list: start again from an empty selection.
  useEffect(() => {
    if (state?.ok) setSelected(new Set());
  }, [state]);
  const all = selected.size === invoices.length && invoices.length > 0;
  const total = invoices.filter((i) => selected.has(i.id)).reduce((s, i) => s + i.remaining, 0);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <div className="-mx-5 overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b border-[var(--fi-rule)] text-xs text-[var(--fi-muted)]">
            <tr>
              <th className="py-2.5 pl-5 text-left font-medium">
                <input
                  type="checkbox"
                  aria-label="Seleziona tutte"
                  checked={all}
                  onChange={() => setSelected(all ? new Set() : new Set(invoices.map((i) => i.id)))}
                />
              </th>
              <th className="px-3 py-2.5 text-left font-medium">Fattura</th>
              <th className="px-3 py-2.5 text-left font-medium">Cliente</th>
              <th className="px-3 py-2.5 text-left font-medium">Incassata il</th>
              <th className="py-2.5 pr-5 pl-3 text-left font-medium">Importo (€)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--fi-rule)]">
            {invoices.map((inv) => {
              const on = selected.has(inv.id);
              const error = state?.errors?.[inv.id];
              return (
                <tr key={inv.id} className={cx(on && "bg-white")}>
                  <td className="py-2.5 pl-5 align-top">
                    <input
                      type="checkbox"
                      name="selected"
                      value={inv.id}
                      aria-label={`Incassata ${inv.label}`}
                      checked={on}
                      onChange={() => toggle(inv.id)}
                    />
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <Link href={`/dashboard/fiscale/fatture/${inv.id}`} className="fi-num font-medium hover:text-[var(--fi-action)]">
                      {inv.label}
                    </Link>
                    <p className="text-xs text-[var(--fi-muted)]">del {fmtDate(inv.issueDate)}</p>
                  </td>
                  <td className="max-w-48 truncate px-3 py-2.5 align-top">{inv.clientName}</td>
                  <td className="px-3 py-2.5 align-top">
                    <input
                      type="date"
                      name={`date-${inv.id}`}
                      defaultValue={inv.suggestedDate}
                      min={inv.issueDate}
                      max={today}
                      disabled={!on}
                      aria-label={`Data incasso ${inv.label}`}
                    />
                    {error && <p className="mt-1 text-xs text-[var(--fi-critical)]">{error}</p>}
                  </td>
                  <td className="py-2.5 pr-5 pl-3 align-top">
                    <input
                      name={`amount-${inv.id}`}
                      inputMode="decimal"
                      defaultValue={toInput(inv.remaining)}
                      disabled={!on}
                      aria-label={`Importo incassato ${inv.label}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="submit" className={btn.primary} disabled={pending || selected.size === 0}>
          {pending && <Spinner className="h-4 w-4" />}
          {pending ? "Salvataggio…" : `Registra ${selected.size || ""} incass${selected.size === 1 ? "o" : "i"}`}
        </button>
        {selected.size > 0 && <span className="fi-num text-sm text-[var(--fi-ink-2)]">Totale {eur(total)}</span>}
        {state && (
          <p role="status" className={cx("text-sm", state.ok ? "text-[var(--fi-good-text)]" : "text-[var(--fi-critical)]")}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
