"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_BUCKET,
  DOCUMENT_CATEGORIES,
  DOCUMENT_MAX_BYTES,
  documentMime,
} from "@/lib/fiscale/documents";
import { createClient } from "@/lib/supabase/client";
import { btn, cx } from "../components/ui";
import { registerDocumentAction } from "./actions";

const label = "mb-1 block text-xs font-medium text-[var(--fi-ink-2)]";
const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_").slice(-80);

export function UploadForm({ currentYear }: { currentYear: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return setStatus({ ok: false, message: "Scegli un file." });
    const mime = documentMime(file);
    if (!mime) return setStatus({ ok: false, message: "Formati ammessi: PDF, immagini, XML o P7M." });
    if (file.size > DOCUMENT_MAX_BYTES) return setStatus({ ok: false, message: "Il file supera i 25 MB." });

    setPending(true);
    setStatus(null);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) return setStatus({ ok: false, message: "Sessione scaduta: ricarica la pagina." });
      const path = `${data.user.id}/${crypto.randomUUID()}-${slug(file.name)}`;
      const upload = await supabase.storage.from(DOCUMENT_BUCKET).upload(path, file, { contentType: mime });
      if (upload.error) return setStatus({ ok: false, message: "Caricamento non riuscito." });

      const yearRaw = String(fd.get("year") ?? "").trim();
      const result = await registerDocumentAction({
        title: String(fd.get("title") ?? ""),
        category: String(fd.get("category") ?? "other"),
        year: yearRaw ? Number(yearRaw) : null,
        path,
        mime,
        size: file.size,
      });
      setStatus(result);
      if (result?.ok) {
        formRef.current?.reset();
        setTitle("");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-6">
      <div className="sm:col-span-6">
        <label htmlFor="doc-file" className={label}>File (PDF, immagine, XML o P7M, max 25 MB)</label>
        <input
          id="doc-file"
          name="file"
          type="file"
          required
          accept={DOCUMENT_ACCEPT}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
          }}
          className="file:mr-3 file:rounded-md file:border-0 file:bg-[var(--fi-fill)] file:px-3 file:py-1 file:text-sm"
        />
      </div>
      <div className="sm:col-span-3">
        <label htmlFor="doc-title" className={label}>Titolo</label>
        <input id="doc-title" name="title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="doc-category" className={label}>Categoria</label>
        <select id="doc-category" name="category" defaultValue="tax_return">
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="doc-year" className={label}>Anno</label>
        <input id="doc-year" name="year" inputMode="numeric" maxLength={4} placeholder={String(currentYear)} />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-6">
        <button type="submit" className={btn.primary} disabled={pending}>
          <Upload aria-hidden className="h-4 w-4" />
          {pending ? "Caricamento…" : "Carica documento"}
        </button>
        {status && (
          <p role="status" className={cx("text-sm", status.ok ? "text-[var(--fi-good-text)]" : "text-[var(--fi-critical)]")}>
            {status.message}
          </p>
        )}
      </div>
    </form>
  );
}
