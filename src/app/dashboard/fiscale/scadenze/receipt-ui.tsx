"use client";

import { useId, useState } from "react";
import { Upload } from "lucide-react";
import { DOCUMENT_ACCEPT, DOCUMENT_BUCKET, DOCUMENT_MAX_BYTES, documentMime } from "@/lib/fiscale/documents";
import { createClient } from "@/lib/supabase/client";
import { addPaymentFilesAction, type ActionState } from "../obligations-actions";
import { cx } from "../components/ui";

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
