"use client";

import { startTransition, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { COEFFICIENTS, type ProfileInput } from "@/lib/fiscale/profile";
import { btn, card, cx } from "../components/ui";
import { Spinner } from "../components/form-buttons";
import { saveProfileAction, type ProfileFormState } from "./actions";

const label = "mb-1 block text-xs font-medium text-[var(--fi-ink-2)]";
const hint = "mt-1 text-xs text-[var(--fi-muted)]";
const choice =
  "flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--fi-rule)] p-3 transition-colors hover:border-[var(--fi-rule-strong)] has-[:checked]:border-[var(--fi-action)] has-[:checked]:bg-[var(--fi-action-soft)]";

function Group({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className={cx(card, "p-5")}>
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-[var(--fi-ink-2)]">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function ProfileForm({ initial, isNew }: { initial: ProfileInput; isNew: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(saveProfileAction, null);
  const invalid = (field: string) => (state && !state.ok && state.field === field ? true : undefined);

  // A brand-new profile turns the demo data into the user's own: show the overview.
  useEffect(() => {
    if (state?.ok && state.created) router.push("/dashboard/fiscale");
  }, [state, router]);

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={(e) => {
        // Manual submit: a <form action> would reset the fields even on a validation error.
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <Group title="Anagrafica" description="Compare come intestazione delle tue fatture elettroniche.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className={label}>Nome</label>
            <input id="firstName" name="firstName" defaultValue={initial.firstName} autoComplete="given-name" aria-invalid={invalid("firstName")} />
          </div>
          <div>
            <label htmlFor="lastName" className={label}>Cognome</label>
            <input id="lastName" name="lastName" defaultValue={initial.lastName} autoComplete="family-name" aria-invalid={invalid("lastName")} />
          </div>
          <div>
            <label htmlFor="vatNumber" className={label}>Partita IVA</label>
            <input id="vatNumber" name="vatNumber" defaultValue={initial.vatNumber} inputMode="numeric" maxLength={13} autoComplete="off" aria-invalid={invalid("vatNumber")} />
          </div>
          <div>
            <label htmlFor="taxCode" className={label}>Codice fiscale</label>
            <input id="taxCode" name="taxCode" defaultValue={initial.taxCode} maxLength={16} autoComplete="off" className="uppercase" aria-invalid={invalid("taxCode")} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-4">
            <label htmlFor="address" className={label}>Indirizzo della sede (domicilio fiscale)</label>
            <input id="address" name="address" defaultValue={initial.address} autoComplete="street-address" aria-invalid={invalid("address")} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="streetNumber" className={label}>Civico</label>
            <input id="streetNumber" name="streetNumber" defaultValue={initial.streetNumber} autoComplete="off" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="postalCode" className={label}>CAP</label>
            <input id="postalCode" name="postalCode" defaultValue={initial.postalCode} inputMode="numeric" maxLength={5} autoComplete="postal-code" aria-invalid={invalid("postalCode")} />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="city" className={label}>Comune</label>
            <input id="city" name="city" defaultValue={initial.city} autoComplete="address-level2" aria-invalid={invalid("city")} />
          </div>
          <div className="sm:col-span-1">
            <label htmlFor="province" className={label}>Prov.</label>
            <input id="province" name="province" defaultValue={initial.province} maxLength={2} autoComplete="off" className="uppercase" aria-invalid={invalid("province")} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="email" className={label}>Email (facoltativa)</label>
            <input id="email" name="email" type="email" defaultValue={initial.email} autoComplete="email" aria-invalid={invalid("email")} />
          </div>
          <div>
            <label htmlFor="pec" className={label}>PEC (facoltativa)</label>
            <input id="pec" name="pec" type="email" defaultValue={initial.pec} autoComplete="off" aria-invalid={invalid("pec")} />
          </div>
          <div>
            <label htmlFor="iban" className={label}>IBAN per i pagamenti (facoltativo)</label>
            <input id="iban" name="iban" defaultValue={initial.iban} autoComplete="off" className="uppercase" aria-invalid={invalid("iban")} />
            <p className={hint}>Va nelle fatture come coordinate di pagamento.</p>
          </div>
        </div>
      </Group>

      <Group title="Attività e tasse" description="Servono a calcolare imposta sostitutiva, contributi INPS e scadenze F24.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="activityStartDate" className={label}>Inizio attività (apertura partita IVA)</label>
            <input id="activityStartDate" name="activityStartDate" type="date" defaultValue={initial.activityStartDate} aria-invalid={invalid("activityStartDate")} />
          </div>
          <div>
            <label htmlFor="atecoCode" className={label}>Codice ATECO</label>
            <input id="atecoCode" name="atecoCode" defaultValue={initial.atecoCode} placeholder="es. 62.10.00" autoComplete="off" aria-invalid={invalid("atecoCode")} />
            <p className={hint}>Lo trovi nella visura camerale o nel certificato di attribuzione della partita IVA.</p>
          </div>
        </div>
        <div>
          <label htmlFor="coefficient" className={label}>Coefficiente di redditività</label>
          <select id="coefficient" name="coefficient" defaultValue={String(initial.coefficient)} aria-invalid={invalid("coefficient")}>
            {COEFFICIENTS.map((c) => (
              <option key={c.value} value={String(c.value)}>{c.label}</option>
            ))}
          </select>
          <p className={hint}>Dipende dal gruppo del tuo codice ATECO: è la parte dei ricavi su cui paghi imposta e contributi.</p>
        </div>

        <fieldset>
          <legend className={label}>Aliquota dell&apos;imposta sostitutiva</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className={choice}>
              <input type="radio" name="startupRate" value="5" defaultChecked={initial.startupRate} className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium">5% per i primi 5 anni</span>
                <span className="block text-xs text-[var(--fi-ink-2)]">Nuova attività con i requisiti, poi 15% dal sesto anno.</span>
              </span>
            </label>
            <label className={choice}>
              <input type="radio" name="startupRate" value="15" defaultChecked={!initial.startupRate} className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium">15%</span>
                <span className="block text-xs text-[var(--fi-ink-2)]">Aliquota ordinaria del forfettario.</span>
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className={label}>Riduzioni dei contributi INPS (Gestione Artigiani)</legend>
          <div className="space-y-2">
            <label className={choice}>
              <input type="checkbox" name="inps35" defaultChecked={initial.inps35} className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium">Riduzione del 35% per i forfettari</span>
                <span className="block text-xs text-[var(--fi-ink-2)]">Solo se l&apos;hai chiesta all&apos;INPS e ti è stata concessa.</span>
              </span>
            </label>
            <label className={choice}>
              <input type="checkbox" name="inps50" defaultChecked={initial.inps50} className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium">Riduzione del 50% per i nuovi iscritti nel 2025</span>
                <span className="block text-xs text-[var(--fi-ink-2)]">
                  Per 36 mesi dall&apos;iscrizione. Non si somma al 35%: finché vale si applica il 50%, poi il 35% se attivo.
                </span>
              </span>
            </label>
          </div>
        </fieldset>
      </Group>

      <Group title="Fatture">
        <label className={choice}>
          <input type="checkbox" name="stampToClient" defaultChecked={initial.stampToClient} className="mt-0.5" />
          <span>
            <span className="block text-sm font-medium">Addebita al cliente il bollo da 2 €</span>
            <span className="block text-xs text-[var(--fi-ink-2)]">Sulle fatture sopra 77,47 € il bollo si aggiunge al totale.</span>
          </span>
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="invoicePrefix" className={label}>Prefisso del numero di fattura (facoltativo)</label>
            <input id="invoicePrefix" name="invoicePrefix" defaultValue={initial.invoicePrefix} maxLength={10} autoComplete="off" aria-invalid={invalid("invoicePrefix")} />
          </div>
          <div>
            <label htmlFor="paymentDays" className={label}>Giorni per il pagamento</label>
            <input id="paymentDays" name="paymentDays" type="number" min={0} max={365} defaultValue={initial.paymentDays} aria-invalid={invalid("paymentDays")} />
            <p className={hint}>Scadenza proposta sulle nuove fatture.</p>
          </div>
        </div>
      </Group>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={btn.primary} disabled={pending}>
          {pending ? <Spinner className="h-4 w-4" /> : <Save aria-hidden className="h-4 w-4" />}
          {pending ? "Salvataggio…" : isNew ? "Crea il profilo" : "Salva le modifiche"}
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
