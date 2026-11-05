"use client";

import { useRef, useState } from "react";
import { Loader2, Sparkles, Upload } from "lucide-react";
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_BUCKET,
  DOCUMENT_CATEGORIES,
  DOCUMENT_MAX_BYTES,
  documentMime,
} from "@/lib/fiscale/documents";
import { createClient } from "@/lib/supabase/client";
import { btn, cx } from "../components/ui";
import { readDocumentAction, registerDocumentAction } from "./actions";
import { Spinner } from "../components/form-buttons";

const label = "mb-1 block text-xs font-medium text-[var(--fi-ink-2)]";
const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_").slice(-80);

type Field = "title" | "category" | "year";
/** The chosen file, uploaded to the private bucket as soon as it is picked. */
type Picked = { file: File; mime: string; upload: Promise<string | null> };
type Reading = { state: "running" } | { state: "done" } | { state: "failed"; message: string } | null;

const DEFAULT_CATEGORY = "tax_return";

/**
 * The file goes to the bucket as soon as it is chosen and Claude reads it to
 * fill title, category and year. What the owner has typed in the meantime is
 * kept; they can also upload without waiting for Claude.
 */
export function UploadForm({ currentYear }: { currentYear: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const picked = useRef<Picked | null>(null);
  const touched = useRef(new Set<Field>());
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [reading, setReading] = useState<Reading>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORY);
  const [year, setYear] = useState("");

  const edit = (field: Field, set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    touched.current.add(field);
    set(e.target.value);
  };

  /** Drops a file uploaded but never registered (another file chosen). */
  function discard(p: Picked | null) {
    if (!p) return;
    void p.upload.then((path) => {
      if (path) void createClient().storage.from(DOCUMENT_BUCKET).remove([path]);
    });
  }

  async function uploadFile(file: File, mime: string): Promise<string | null> {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const path = `${data.user.id}/${crypto.randomUUID()}-${slug(file.name)}`;
    const up = await supabase.storage.from(DOCUMENT_BUCKET).upload(path, file, { contentType: mime });
    return up.error ? null : path;
  }

  async function onPick(file: File | undefined) {
    discard(picked.current);
    picked.current = null;
    touched.current = new Set();
    setStatus(null);
    setReading(null);
    setTitle(file ? file.name.replace(/\.[^.]+$/, "") : "");
    setCategory(DEFAULT_CATEGORY);
    setYear("");
    if (!file) return;

    const mime = documentMime(file);
    if (!mime) return setStatus({ ok: false, message: "Formati ammessi: PDF, immagini, XML o P7M." });
    if (file.size > DOCUMENT_MAX_BYTES) return setStatus({ ok: false, message: "Il file supera i 25 MB." });

    const current: Picked = { file, mime, upload: uploadFile(file, mime) };
    picked.current = current;
    if (mime.startsWith("image/")) {
      return setReading({ state: "failed", message: "Claude non legge le foto: compila i campi a mano." });
    }
    setReading({ state: "running" });
    const path = await current.upload;
    if (picked.current !== current) return;
    if (!path) {
      setReading(null);
      return setStatus({ ok: false, message: "Caricamento non riuscito: ricarica la pagina e riprova." });
    }

    let result;
    try {
      result = await readDocumentAction({ path, name: file.name });
    } catch {
      result = { ok: false as const, message: "Claude non risponde: compila i campi a mano." };
    }
    if (picked.current !== current) return;
    if (!result.ok) return setReading({ state: "failed", message: result.message });
    const f = result.fields;
    if (!touched.current.has("title")) setTitle(f.title);
    if (!touched.current.has("category")) setCategory(f.category);
    if (!touched.current.has("year")) setYear(f.year ? String(f.year) : "");
    setReading({ state: "done" });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const current = picked.current;
    if (!current) return setStatus({ ok: false, message: "Scegli un file." });

    setPending(true);
    setStatus(null);
    try {
      const path = await current.upload;
      if (!path) return setStatus({ ok: false, message: "Caricamento non riuscito: ricarica la pagina e riprova." });
      const result = await registerDocumentAction({
        title,
        category,
        year: year.trim() ? Number(year.trim()) : null,
        path,
        mime: current.mime,
        size: current.file.size,
      });
      setStatus(result);
      if (result?.ok) {
        // The file now belongs to the archive: it must not be discarded.
        picked.current = null;
        touched.current = new Set();
        formRef.current?.reset();
        setReading(null);
        setTitle("");
        setCategory(DEFAULT_CATEGORY);
        setYear("");
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
          onChange={(e) => void onPick(e.target.files?.[0])}
          className="file:mr-3 file:rounded-md file:border-0 file:bg-[var(--fi-fill)] file:px-3 file:py-1 file:text-sm"
        />
        {reading && (
          <p
            role="status"
            className={cx(
              "mt-2 inline-flex items-center gap-1.5 text-xs",
              reading.state === "failed" ? "text-[var(--fi-ink-2)]" : "text-[var(--fi-action)]",
            )}
          >
            {reading.state === "running" ? (
              <>
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                Claude sta leggendo il documento per compilare i campi…
              </>
            ) : reading.state === "done" ? (
              <>
                <Sparkles aria-hidden className="h-3.5 w-3.5" />
                Campi compilati da Claude: controllali prima di caricare.
              </>
            ) : (
              reading.message
            )}
          </p>
        )}
      </div>
      <div className="sm:col-span-3">
        <label htmlFor="doc-title" className={label}>Titolo</label>
        <input id="doc-title" name="title" required maxLength={200} value={title} onChange={edit("title", setTitle)} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="doc-category" className={label}>Categoria</label>
        <select id="doc-category" name="category" value={category} onChange={edit("category", setCategory)}>
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="doc-year" className={label}>Anno</label>
        <input
          id="doc-year"
          name="year"
          inputMode="numeric"
          maxLength={4}
          placeholder={String(currentYear)}
          value={year}
          onChange={edit("year", setYear)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-6">
        <button type="submit" className={btn.primary} disabled={pending}>
          {pending ? <Spinner className="h-4 w-4" /> : <Upload aria-hidden className="h-4 w-4" />}
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
