"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Loader2, Upload } from "lucide-react";
import { DOCUMENT_ACCEPT, DOCUMENT_BUCKET, DOCUMENT_MAX_BYTES, documentMime } from "@/lib/fiscale/documents";
import { createClient } from "@/lib/supabase/client";
import { addPaymentFilesAction, type ActionState } from "../obligations-actions";
import { checkPaymentFilesAction } from "../receipt-check-actions";
import { cx } from "../components/ui";

/**
 * Has Claude Code (owner's server) read the payment files not yet checked, a
 * few per call, as soon as the page shows some: after an upload, after an F24
 * is registered with its files, or for older files. Runs once per count, so a
 * file that cannot be saved does not loop.
 */
export function ReceiptAutoCheck({ pending }: { pending: number }) {
  const router = useRouter();
  const [state, setState] = useState<{ running: boolean; error: string | null }>({ running: false, error: null });
  const [attempt, setAttempt] = useState(0);
  const tried = useRef<string | null>(null);

  useEffect(() => {
    const key = `${pending}:${attempt}`;
    if (pending === 0 || tried.current === key) return;
    tried.current = key;
    let alive = true;
    setState({ running: true, error: null });
    (async () => {
      let error: string | null = null;
      try {
        for (let round = 0; round < 20; round++) {
          const r = await checkPaymentFilesAction();
          if (!r.ok) {
            error = r.message;
            break;
          }
          if (r.remaining === 0 || r.checked === 0) break;
        }
      } catch {
        error = "Controllo dei file non riuscito.";
      }
      if (!alive) return;
      setState({ running: false, error });
      router.refresh();
    })();
    return () => {
      alive = false;
    };
  }, [pending, attempt, router]);

  if (state.running) {
    return (
      <p role="status" className="mb-4 inline-flex items-center gap-2 rounded-md bg-[var(--fi-action-soft)] px-3 py-2 text-sm text-[var(--fi-action)]">
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        Claude sta leggendo {pending === 1 ? "1 file nuovo" : `${pending} file nuovi`} per capire se sono ricevute definitive…
      </p>
    );
  }
  if (state.error) {
    return (
      <p role="status" className="mb-4 inline-flex flex-wrap items-center gap-2 rounded-md bg-[var(--fi-warning-soft)] px-3 py-2 text-sm text-[var(--fi-warning-text)]">
        <CircleAlert aria-hidden className="h-4 w-4" />
        {state.error}
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className="font-medium underline underline-offset-4"
        >
          Riprova
        </button>
      </p>
    );
  }
  return null;
}

/**
 * Picks one or more files (F24, bank receipt, Agenzia receipt...) and attaches
 * them to a recorded payment as soon as they are chosen. Files go straight from
 * the browser to the private archive bucket; the server then links them.
 */
export function PaymentFilesUpload({
  table,
  id,
  hasFiles = false,
  demo,
}: {
  table: "inps" | "tax";
  id: string;
  hasFiles?: boolean;
  demo: boolean;
}) {
  const [status, setStatus] = useState<ActionState>(null);
  const [pending, setPending] = useState(false);
  const inputId = useId();

  async function upload(picked: File[]) {
    const files = picked.slice(0, 10);
    for (const f of files) {
      if (!documentMime(f)) return setStatus({ ok: false, message: `${f.name}: usa PDF, JPG, PNG, XML o P7M.` });
      if (f.size > DOCUMENT_MAX_BYTES) return setStatus({ ok: false, message: `${f.name}: supera i 25 MB.` });
    }
    setPending(true);
    setStatus(null);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) return setStatus({ ok: false, message: "Sessione scaduta: ricarica la pagina." });
      const uploaded = [];
      for (const f of files) {
        const mime = documentMime(f)!;
        const path = `${data.user.id}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]+/g, "_").slice(-80)}`;
        const up = await supabase.storage.from(DOCUMENT_BUCKET).upload(path, f, { contentType: mime });
        if (up.error) {
          if (uploaded.length) await supabase.storage.from(DOCUMENT_BUCKET).remove(uploaded.map((u) => u.path));
          return setStatus({ ok: false, message: `Caricamento di ${f.name} non riuscito.` });
        }
        uploaded.push({ path, mime, size: f.size, name: f.name });
      }
      setStatus(await addPaymentFilesAction({ table, id, files: uploaded }));
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <input
        id={inputId}
        type="file"
        multiple
        accept={DOCUMENT_ACCEPT}
        className="sr-only"
        disabled={pending || demo}
        onChange={(e) => {
          const picked = Array.from(e.currentTarget.files ?? []);
          e.currentTarget.value = "";
          if (picked.length) void upload(picked);
        }}
      />
      <label
        htmlFor={inputId}
        className={cx(
          "inline-flex cursor-pointer items-center gap-1 text-xs font-medium underline-offset-4 hover:underline",
          hasFiles ? "text-[var(--fi-ink-2)]" : "text-[var(--fi-action)]",
          (pending || demo) && "pointer-events-none opacity-50",
        )}
      >
        <Upload aria-hidden className="h-3.5 w-3.5" />
        {pending ? "Caricamento…" : hasFiles ? "Aggiungi file" : "Carica ricevute"}
      </label>
      {status && !status.ok && (
        <span role="status" className="text-xs text-[var(--fi-critical)]">
          {status.message}
        </span>
      )}
    </span>
  );
}
