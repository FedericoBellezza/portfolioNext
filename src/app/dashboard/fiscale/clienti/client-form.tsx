"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { UserPlus } from "lucide-react";
import { CLIENT_KIND_LABEL, CLIENT_KINDS, type ClientKind } from "@/lib/fiscale/client-kinds";
import { btn, cx } from "../components/ui";
import { createClientAction, type ClientFormState } from "./actions";
import { Spinner } from "../components/form-buttons";

const label = "mb-1 block text-xs font-medium text-[var(--fi-ink-2)]";
const hint = "mt-1 text-xs text-[var(--fi-muted)]";

export function ClientForm({ demo }: { demo: boolean }) {
  const [kind, setKind] = useState<ClientKind>("company");
  const [state, action, pending] = useActionState<ClientFormState, FormData>(createClientAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setKind("company");
    }
  }, [state]);

  const invalid = (field: string) => (state && !state.ok && state.field === field ? true : undefined);
  const foreign = kind === "foreign";
  const pa = kind === "public_administration";

  return (
    <form
      ref={formRef}
      className="space-y-5"
      noValidate
      onSubmit={(e) => {
        // Manual submit: a <form action> would clear the fields even on a validation error.
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <div>
        <label htmlFor="kind" className={label}>Tipo di cliente</label>
        <select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as ClientKind)}>
          {CLIENT_KINDS.map((k) => (
            <option key={k} value={k}>{CLIENT_KIND_LABEL[k]}</option>
          ))}
        </select>
      </div>

      {kind === "individual" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className={label}>Nome</label>
            <input id="firstName" name="firstName" autoComplete="off" aria-invalid={invalid("firstName")} />
          </div>
          <div>
            <label htmlFor="lastName" className={label}>Cognome</label>
            <input id="lastName" name="lastName" autoComplete="off" />
          </div>
        </div>
      ) : (
        <div>
          <label htmlFor="companyName" className={label}>{pa ? "Ente" : "Denominazione"}</label>
          <input id="companyName" name="companyName" autoComplete="off" aria-invalid={invalid("companyName")} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="vatNumber" className={label}>{foreign ? "Partita IVA / VAT number" : "Partita IVA"}</label>
          <input id="vatNumber" name="vatNumber" autoComplete="off" aria-invalid={invalid("vatNumber")} />
          {kind === "individual" && <p className={hint}>Lascia vuoto se è un privato senza P.IVA.</p>}
        </div>
        <div>
          <label htmlFor="taxCode" className={label}>Codice fiscale</label>
          <input id="taxCode" name="taxCode" autoComplete="off" aria-invalid={invalid("taxCode")} />
          {!foreign && kind !== "individual" && <p className={hint}>Facoltativo se coincide con la P.IVA.</p>}
        </div>
      </div>

      {!foreign && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sdiCode" className={label}>{pa ? "Codice univoco ufficio (6 caratteri)" : "Codice destinatario SDI"}</label>
            <input id="sdiCode" name="sdiCode" autoComplete="off" maxLength={7} aria-invalid={invalid("sdiCode")} />
            {!pa && <p className={hint}>Vuoto = 0000000: la fattura arriva via PEC o nel cassetto fiscale del cliente.</p>}
          </div>
          <div>
            <label htmlFor="pec" className={label}>PEC (facoltativa)</label>
            <input id="pec" name="pec" type="email" autoComplete="off" aria-invalid={invalid("pec")} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
        <div className="sm:col-span-4">
          <label htmlFor="address" className={label}>Indirizzo</label>
          <input id="address" name="address" autoComplete="off" aria-invalid={invalid("address")} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="streetNumber" className={label}>Civico</label>
          <input id="streetNumber" name="streetNumber" autoComplete="off" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="postalCode" className={label}>{foreign ? "Codice postale" : "CAP"}</label>
          <input id="postalCode" name="postalCode" autoComplete="off" aria-invalid={invalid("postalCode")} />
        </div>
        <div className={foreign ? "sm:col-span-2" : "sm:col-span-3"}>
          <label htmlFor="city" className={label}>{foreign ? "Città" : "Comune"}</label>
          <input id="city" name="city" autoComplete="off" aria-invalid={invalid("city")} />
        </div>
        {foreign ? (
          <div className="sm:col-span-2">
            <label htmlFor="country" className={label}>Nazione (es. DE, FR)</label>
            <input id="country" name="country" maxLength={2} autoComplete="off" aria-invalid={invalid("country")} />
          </div>
        ) : (
          <div className="sm:col-span-1">
            <label htmlFor="province" className={label}>Prov.</label>
            <input id="province" name="province" maxLength={2} autoComplete="off" aria-invalid={invalid("province")} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className={label}>Email (facoltativa)</label>
          <input id="email" name="email" type="email" autoComplete="off" aria-invalid={invalid("email")} />
        </div>
        <div>
          <label htmlFor="notes" className={label}>Note (facoltative)</label>
          <input id="notes" name="notes" autoComplete="off" />
        </div>
      </div>

      {state && (
        <p
          role="status"
          className={cx("text-sm", state.ok ? "text-[var(--fi-good-text)]" : "text-[var(--fi-critical)]")}
        >
          {state.message}
        </p>
      )}
      <button type="submit" className={btn.primary} disabled={pending || demo}>
        {pending ? <Spinner className="h-4 w-4" /> : <UserPlus aria-hidden className="h-4 w-4" />}
        {pending ? "Salvataggio…" : demo ? "Crea il profilo fiscale per salvare" : "Aggiungi cliente"}
      </button>
    </form>
  );
}
