"use client";

import { startTransition, useActionState, useState } from "react";
import { FileUp, TriangleAlert } from "lucide-react";
import { guideFor, type GuideMedia } from "@/lib/fiscale/guides";
import type { F24Item } from "@/lib/fiscale/tax-calculator";
import { dismissObligation, registerF24, type ActionState } from "../obligations-actions";
import { date, eur } from "./format";
import { GuideStepper } from "./guide-stepper";
import { btn, cx } from "./ui";

const toInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const fieldLabel = "mb-1 block text-xs font-medium text-[var(--fi-ink-2)]";

/**
 * Past F24 deadlines with nothing recorded: the owner uploads the receipt and the
 * amount actually paid, and every figure is recalculated with the real payment.
 */
export function OverdueBanner({
  items,
  demo,
  title,
  intro,
  tone = "warning",
  media = {},
}: {
  items: F24Item[];
  demo: boolean;
  /** Owner's guide images and videos (signed links), by slot. */
  media?: GuideMedia;
  title?: string;
  intro?: string;
  tone?: "warning" | "neutral";
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (items.length === 0) return null;
  const total = items.reduce((s, i) => s + i.amount, 0);
  const warning = tone === "warning";

  return (
    <section
      aria-labelledby="overdue-title"
      className={cx(
        "mb-6 rounded-xl border p-5",
        warning
          ? "border-[var(--fi-warning)]/60 bg-[var(--fi-warning-soft)]"
          : "border-[var(--fi-rule)] bg-[var(--fi-surface)]",
      )}
    >
      <div className="flex items-start gap-3">
        {warning && <TriangleAlert aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-[var(--fi-warning-text)]" />}
        <div className="min-w-0 flex-1">
          <h2 id="overdue-title" className="text-[15px] font-semibold">
            {title ?? (items.length === 1 ? "1 adempimento da registrare" : `${items.length} adempimenti da registrare`)}
          </h2>
          <p className="mt-0.5 text-sm text-[var(--fi-ink-2)]">
            {intro ??
              `Scadenze passate senza un F24 registrato (${eur(total)} stimati). Inserisci l'importo pagato e, se ce l'hai, la ricevuta: i calcoli si aggiornano con i dati reali.`}
          </p>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-[var(--fi-warning)]/30 rounded-lg border border-[var(--fi-warning)]/30 bg-[var(--fi-surface)]">
        {items.map((item) => (
          <li key={item.key} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="fi-num w-24 shrink-0 text-xs font-medium">{date(item.dueDate)}</span>
              <span className="min-w-0 flex-1 text-sm">
                {item.label}
                <span className="ml-2 text-xs text-[var(--fi-muted)]">
                  {item.category === "inail"
                    ? "Sezione INAIL"
                    : `${item.category.startsWith("inps") ? "Causale" : "Tributo"} ${item.code}`}
                </span>
              </span>
              <span className="fi-num text-sm font-medium">{item.unknownAmount ? "da verificare" : eur(item.amount)}</span>
              <button
                type="button"
                className={btn.outline}
                aria-expanded={open === item.key}
                onClick={() => setOpen(open === item.key ? null : item.key)}
              >
                {open === item.key ? "Chiudi" : "Come pagare e registra"}
              </button>
            </div>
            {open === item.key && (
              <GuideStepper guide={guideFor(item)} media={media} canUpload={!demo}>
                <RegisterForm item={item} demo={demo} />
              </GuideStepper>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

function RegisterForm({ item, demo }: { item: F24Item; demo: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(registerF24, null);
  const [dismissState, dismissAction, dismissing] = useActionState<ActionState, FormData>(dismissObligation, null);
  const [showDismiss, setShowDismiss] = useState(false);
  const id = item.key.replace(/:/g, "-");

  return (
    <div>
      <form
        className="grid gap-3 sm:grid-cols-4"
        onSubmit={(e) => {
          // Manual submit keeps date, amount and file selected if the server rejects it.
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => action(fd));
        }}
      >
        <input type="hidden" name="key" value={item.key} />
        <div>
          <label htmlFor={`${id}-date`} className={fieldLabel}>Pagato il</label>
          <input id={`${id}-date`} name="paidAt" type="date" required defaultValue={item.dueDate > today ? today : item.dueDate} max={today} />
        </div>
        <div>
          <label htmlFor={`${id}-amount`} className={fieldLabel}>Importo pagato (€)</label>
          <input id={`${id}-amount`} name="amount" inputMode="decimal" required defaultValue={item.unknownAmount ? "" : toInput(item.amount)} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-file`} className={fieldLabel}>Ricevuta F24 (facoltativa: PDF, JPG o PNG, max 5 MB)</label>
          <input
            id={`${id}-file`}
            name="receipt"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="file:mr-3 file:rounded-md file:border-0 file:bg-[var(--fi-fill)] file:px-3 file:py-1 file:text-sm"
          />
        </div>
        <label className="flex items-start gap-2 text-sm sm:col-span-4">
          <input type="checkbox" name="compensated" className="mt-0.5" />
          <span>
            Pagato in compensazione
            <span className="block text-xs text-[var(--fi-muted)]">
              F24 a zero perché coperto da un credito (es. IRPEF): inserisci comunque l&apos;importo del tributo.
            </span>
          </span>
        </label>
        <div className="sm:col-span-3">
          <label htmlFor={`${id}-ref`} className={fieldLabel}>Protocollo o nota (facoltativo)</label>
          <input id={`${id}-ref`} name="reference" maxLength={100} />
        </div>
        <div className="flex items-end">
          <button type="submit" className={cx(btn.primary, "w-full")} disabled={pending || demo}>
            <FileUp aria-hidden className="h-4 w-4" />
            {pending ? "Salvataggio…" : "Registra"}
          </button>
        </div>
      </form>
      {state && (
        <p role="status" className={cx("mt-2 text-sm", state.ok ? "text-[var(--fi-good-text)]" : "text-[var(--fi-critical)]")}>
          {state.message}
        </p>
      )}
      {demo && <p className="mt-2 text-xs text-[var(--fi-muted)]">In modalità demo il salvataggio è disattivato.</p>}

      <div className="mt-3 border-t border-[var(--fi-rule)] pt-3 text-xs text-[var(--fi-ink-2)]">
        {showDismiss ? (
          <form action={dismissAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="key" value={item.key} />
            <div className="min-w-48 flex-1">
              <label htmlFor={`${id}-reason`} className={fieldLabel}>Perché non è dovuto?</label>
              <input id={`${id}-reason`} name="reason" maxLength={300} placeholder="Es. pagato all'iscrizione" />
            </div>
            <button type="submit" className={btn.outline} disabled={dismissing || demo}>
              Conferma
            </button>
          </form>
        ) : (
          <button type="button" className="underline hover:text-[var(--fi-action)]" onClick={() => setShowDismiss(true)}>
            Non era dovuto? Segnalo come non dovuto
          </button>
        )}
        {dismissState && !dismissState.ok && <p className="mt-2 text-[var(--fi-critical)]">{dismissState.message}</p>}
      </div>
    </div>
  );
}
