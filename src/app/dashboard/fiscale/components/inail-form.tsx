"use client";

import { startTransition, useActionState } from "react";
import { registerInailAction, type ActionState } from "../obligations-actions";
import { btn, cx } from "./ui";

const fieldLabel = "mb-1 block text-xs font-medium text-[var(--fi-ink-2)]";

export function InailForm({ year, today, demo }: { year: number; today: string; demo: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(registerInailAction, null);
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <div>
        <label htmlFor="inail-year" className={fieldLabel}>Anno di riferimento</label>
        <input id="inail-year" name="competenceYear" inputMode="numeric" required defaultValue={year} />
      </div>
      <div>
        <label htmlFor="inail-date" className={fieldLabel}>Pagato il</label>
        <input id="inail-date" name="paidAt" type="date" required max={today} defaultValue={`${year}-02-16`} />
      </div>
      <div>
        <label htmlFor="inail-amount" className={fieldLabel}>Importo (€)</label>
        <input id="inail-amount" name="amount" inputMode="decimal" required />
      </div>
      <div>
        <label htmlFor="inail-file" className={fieldLabel}>Ricevuta (facoltativa)</label>
        <input
          id="inail-file"
          name="receipt"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="file:mr-3 file:rounded-md file:border-0 file:bg-[var(--fi-fill)] file:px-3 file:py-1 file:text-sm"
        />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" className={btn.outline} disabled={pending || demo}>
          {pending ? "Salvataggio…" : "Registra premio INAIL"}
        </button>
        {state && (
          <p role="status" className={cx("text-sm", state.ok ? "text-[var(--fi-good-text)]" : "text-[var(--fi-critical)]")}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
