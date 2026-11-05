"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cx } from "./ui";

export function Spinner({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return <Loader2 aria-hidden className={cx("shrink-0 animate-spin", className)} />;
}

type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type">;

/**
 * Submit button of a server-action form: disabled with a spinner from the
 * click until the action is done. `iconOnly` swaps the content for the spinner.
 */
export function SubmitButton({ children, className, disabled, iconOnly = false, ...props }: ButtonProps & { iconOnly?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      {...props}
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      className={cx("inline-flex items-center gap-1", pending && "cursor-wait", className)}
    >
      {pending && iconOnly ? (
        <Spinner />
      ) : (
        <>
          {pending && <Spinner />}
          {children}
        </>
      )}
    </button>
  );
}

/**
 * Delete (or undo) in a server-action form, with an inline confirmation in
 * place of the browser dialog: "Eliminare? Sì, elimina · No". Escape cancels.
 */
export function ConfirmSubmit({
  children,
  className,
  question = "Eliminare?",
  confirmLabel = "Sì, elimina",
  pendingLabel = "Eliminazione…",
  ...props
}: ButtonProps & { question?: string; confirmLabel?: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  const [asking, setAsking] = useState(false);
  const wasPending = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);

  // The row usually disappears; if it stays (e.g. an error), go back to the plain button.
  useEffect(() => {
    if (wasPending.current && !pending) setAsking(false);
    wasPending.current = pending;
  }, [pending]);

  if (pending) {
    return (
      <span role="status" className="inline-flex shrink-0 items-center gap-1 text-xs text-[var(--fi-muted)]">
        <Spinner />
        {pendingLabel}
      </span>
    );
  }

  if (asking) {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-2 text-xs"
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          setAsking(false);
          requestAnimationFrame(() => trigger.current?.focus());
        }}
      >
        <span className="text-[var(--fi-ink-2)]">{question}</span>
        <button
          type="submit"
          autoFocus
          className="rounded-sm font-medium text-[var(--fi-critical-text)] underline-offset-4 hover:underline"
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={() => setAsking(false)}
          className="rounded-sm text-[var(--fi-ink-2)] underline-offset-4 hover:text-[var(--fi-ink)] hover:underline"
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button {...props} ref={trigger} type="button" onClick={() => setAsking(true)} className={className}>
      {children}
    </button>
  );
}
