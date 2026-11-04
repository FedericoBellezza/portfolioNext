"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { btn, cx } from "../components/ui";
import { createCreditAction, updateCreditAmountAction, type CreditState } from "./credit-actions";

const fieldLabel = "mb-1 block text-xs font-medium text-[var(--fi-ink-2)]";

function Feedback({ state }: { state: CreditState }) {
  if (!state) return null;
  return (
    <p role="status" className={cx("text-sm", state.ok ? "text-[var(--fi-good-text)]" : "text-[var(--fi-critical)]")}>
      {state.message}
    </p>
  );
}

const submit = (action: (fd: FormData) => void) => (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  startTransition(() => action(fd));
};

export function CreditForm({ defaultYear, demo }: { defaultYear: number; demo: boolean }) {
  const [state, action, pending] = useActionState<CreditState, FormData>(createCreditAction, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} onSubmit={submit(action)} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor="cr-kind" className={fieldLabel}>Tipo</label>
        <select id="cr-kind" name="kind" defaultValue="irpef">
          <option value="irpef">IRPEF</option>
          <option value="substitute_tax">Imposta sostitutiva</option>
          <option value="inps">Contributi INPS</option>
          <option value="other">Altro</option>
        </select>
      </div>
      <div>
        <label htmlFor="cr-year" className={fieldLabel}>Anno</label>
        <input id="cr-year" name="referenceYear" inputMode="numeric" required defaultValue={defaultYear} />
      </div>
      <div>
        <label htmlFor="cr-amount" className={fieldLabel}>Importo (€)</label>
        <input id="cr-amount" name="amount" inputMode="decimal" required />
      </div>
      <div>
        <label htmlFor="cr-dest" className={fieldLabel}>Come lo usi</label>
        <select id="cr-dest" name="destination" defaultValue="compensation">
          <option value="compensation">In compensazione negli F24</option>
          <option value="refund">Chiesto a rimborso</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="cr-source" className={fieldLabel}>Da dove viene (facoltativo)</label>
        <input id="cr-source" name="source" maxLength={200} placeholder="Es. Dichiarazione dei redditi 2027, quadro RX" />
      </div>
      <div className="sm:col-span-2">
        <button type="submit" className={btn.primary} disabled={pending || demo}>
          {pending ? "Salvataggio…" : "Aggiungi credito"}
        </button>
      </div>
      <div className="sm:col-span-2">
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function CreditAmountEdit({ id, amount }: { id: string; amount: number }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CreditState, FormData>(updateCreditAmountAction, null);
  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);
  if (!open) {
    return (
      <button type="button" className="text-xs text-[var(--fi-ink-2)] underline-offset-4 hover:text-[var(--fi-action)] hover:underline" onClick={() => setOpen(true)}>
        Correggi importo
      </button>
    );
  }
  return (
    <form onSubmit={submit(action)} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <div className="w-32">
        <label htmlFor={`cr-edit-${id}`} className={fieldLabel}>Importo giusto (€)</label>
        <input id={`cr-edit-${id}`} name="amount" inputMode="decimal" defaultValue={(amount / 100).toFixed(2).replace(".", ",")} />
      </div>
      <button type="submit" className={btn.outline} disabled={pending}>
        Salva
      </button>
      <button type="button" className="text-xs text-[var(--fi-ink-2)] underline" onClick={() => setOpen(false)}>
        Annulla
      </button>
      <Feedback state={state} />
    </form>
  );
}
