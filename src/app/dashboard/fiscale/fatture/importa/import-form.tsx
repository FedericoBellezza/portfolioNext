"use client";

import { startTransition, useActionState } from "react";
import Link from "next/link";
import { CheckCircle2, FileUp, XCircle } from "lucide-react";
import { btn, cx } from "../../components/ui";
import { importInvoicesAction, type ImportState } from "./actions";

export function ImportForm({ demo }: { demo: boolean }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importInvoicesAction, null);
  const results = state && "results" in state ? state.results : null;
  const imported = results?.filter((r) => r.ok).length ?? 0;

  return (
    <div className="space-y-5">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => action(fd));
        }}
      >
        <div>
          <label htmlFor="files" className="mb-1 block text-xs font-medium text-[var(--fi-ink-2)]">
            File XML delle fatture emesse (.xml o .xml.p7m, anche più di uno)
          </label>
          <input
            id="files"
            name="files"
            type="file"
            multiple
            required
            accept=".xml,.p7m,application/xml,text/xml,application/pkcs7-mime"
            className="file:mr-3 file:rounded-md file:border-0 file:bg-[var(--fi-fill)] file:px-3 file:py-1 file:text-sm"
          />
        </div>
        <button type="submit" className={btn.primary} disabled={pending || demo}>
          <FileUp aria-hidden className="h-4 w-4" />
          {pending ? "Importazione…" : demo ? "Crea il profilo fiscale per importare" : "Importa"}
        </button>
      </form>

      {state && "error" in state && (
        <p role="alert" className="text-sm text-[var(--fi-critical)]">{state.error}</p>
      )}

      {results && (
        <div role="status">
          <p className="mb-2 text-sm font-medium">
            {imported} di {results.length} {results.length === 1 ? "file importato" : "file importati"}
            {imported > 0 && " · ora registra la data d'incasso di ognuna dal suo dettaglio"}
          </p>
          <ul className="divide-y divide-[var(--fi-rule)] rounded-lg border border-[var(--fi-rule)] bg-white text-sm">
            {results.map((r, i) => (
              <li key={`${r.file}-${i}`} className="flex items-start gap-3 px-3 py-2.5">
                {r.ok ? (
                  <CheckCircle2 aria-label="Importato" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--fi-good)]" />
                ) : (
                  <XCircle aria-label="Non importato" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--fi-critical)]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.file}</p>
                  <p className={cx("text-xs", r.ok ? "text-[var(--fi-ink-2)]" : "text-[var(--fi-critical)]")}>{r.message}</p>
                </div>
                {r.invoiceId && (
                  <Link href={`/dashboard/fiscale/fatture/${r.invoiceId}`} className="text-xs text-[var(--fi-action)] underline">
                    Apri
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
