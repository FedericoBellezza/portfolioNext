"use client";

import { startTransition, useActionState, useId, useRef } from "react";
import { Upload } from "lucide-react";
import { attachReceipt, type ActionState } from "../obligations-actions";
import { cx } from "../components/ui";

/** Picks a PDF or image and attaches it to a recorded payment as soon as it is chosen. */
export function ReceiptUpload({
  table,
  id,
  replace = false,
  demo,
}: {
  table: "inps" | "tax";
  id: string;
  replace?: boolean;
  demo: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(attachReceipt, null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputId = useId();

  return (
    <form ref={formRef} className="inline-flex items-center gap-2">
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <input
        id={inputId}
        name="receipt"
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        className="sr-only"
        disabled={pending || demo}
        onChange={(e) => {
          if (!e.currentTarget.files?.length || !formRef.current) return;
          const fd = new FormData(formRef.current);
          startTransition(() => action(fd));
        }}
      />
      <label
        htmlFor={inputId}
        className={cx(
          "inline-flex cursor-pointer items-center gap-1 text-xs font-medium underline-offset-4 hover:underline",
          replace ? "text-[var(--fi-ink-2)]" : "text-[var(--fi-action)]",
          (pending || demo) && "pointer-events-none opacity-50",
        )}
      >
        {!replace && <Upload aria-hidden className="h-3.5 w-3.5" />}
        {pending ? "Caricamento…" : replace ? "Sostituisci" : "Carica ricevuta"}
      </label>
      {state && !state.ok && (
        <span role="status" className="text-xs text-[var(--fi-critical)]">
          {state.message}
        </span>
      )}
    </form>
  );
}
