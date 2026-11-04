"use client";

import { startTransition, useActionState } from "react";
import { btn, cx } from "../../components/ui";
import { issueInvoiceAction, registerCollectionAction, updateSdiStatusAction, type InvoiceActionState } from "./actions";

const fieldLabel = "mb-1 block text-xs font-medium text-[var(--fi-ink-2)]";

function Feedback({ state }: { state: InvoiceActionState }) {
  if (!state) return null;
  return (
    <p role="status" className={cx("mt-2 text-sm", state.ok ? "text-[var(--fi-good-text)]" : "text-[var(--fi-critical)]")}>
      {state.message}
    </p>
  );
}

const submit =
  (action: (fd: FormData) => void) =>
  (e: React.FormEvent<HTMLFormElement>) => {
    // Manual submit: React would otherwise reset the fields even when the server refuses.
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };

export function IssueForm({ id, defaultDate, today }: { id: string; defaultDate: string; today: string }) {
  const [state, action, pending] = useActionState<InvoiceActionState, FormData>(issueInvoiceAction, null);
  return (
    <form onSubmit={submit(action)} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor="issueDate" className={fieldLabel}>Data di emissione</label>
        <input id="issueDate" name="issueDate" type="date" required max={today} defaultValue={defaultDate} />
      </div>
      <p className="text-xs text-[var(--fi-ink-2)]">
        Il numero viene assegnato ora e non si potrà più modificare la fattura. Se c&apos;è un errore dopo
        l&apos;emissione serve una nota di credito.
      </p>
      <button type="submit" className={cx(btn.primary, "w-full")} disabled={pending}>
        {pending ? "Emissione…" : "Emetti fattura"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

const OPTIONS = [
  { value: "sent", label: "Inviata, in attesa di esito" },
  { value: "delivered", label: "Consegnata (ricevuta di consegna)" },
  { value: "not_delivered", label: "Mancata consegna (è nel cassetto fiscale del cliente)" },
  { value: "rejected", label: "Scartata (notifica di scarto)" },
];

export function SdiStatusForm({ id, current, identifier }: { id: string; current: string; identifier: string | null }) {
  const [state, action, pending] = useActionState<InvoiceActionState, FormData>(updateSdiStatusAction, null);
  return (
    <form onSubmit={submit(action)} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor="status" className={fieldLabel}>Esito sul portale</label>
        <select id="status" name="status" defaultValue={current === "not_sent" ? "sent" : current}>
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="identifier" className={fieldLabel}>Identificativo SdI (facoltativo)</label>
        <input id="identifier" name="identifier" inputMode="numeric" defaultValue={identifier ?? ""} />
      </div>
      <button type="submit" className={cx(btn.outline, "w-full")} disabled={pending}>
        {pending ? "Salvataggio…" : "Aggiorna stato"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function CollectionForm({ id, remaining, today }: { id: string; remaining: number; today: string }) {
  const [state, action, pending] = useActionState<InvoiceActionState, FormData>(registerCollectionAction, null);
  return (
    <form onSubmit={submit(action)} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="collectedAt" className={fieldLabel}>Incassata il</label>
          <input id="collectedAt" name="collectedAt" type="date" required max={today} defaultValue={today} />
        </div>
        <div>
          <label htmlFor="amount" className={fieldLabel}>Importo (€)</label>
          <input id="amount" name="amount" inputMode="decimal" required defaultValue={(remaining / 100).toFixed(2).replace(".", ",")} />
        </div>
      </div>
      <button type="submit" className={cx(btn.primary, "w-full")} disabled={pending}>
        {pending ? "Salvataggio…" : "Registra incasso"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
