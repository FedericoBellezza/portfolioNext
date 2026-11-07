"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, Upload } from "lucide-react";
import type { DocumentPayment } from "@/lib/fiscale/f24-match";
import type { PaymentOutcome } from "@/lib/fiscale/payment-write";
import { fileTitle } from "@/lib/fiscale/receipts";
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
type Picked = { file: File; mime: string; upload: Promise<string | null>; payment: DocumentPayment | null };
/** One file of a multiple upload, saved with what Claude read in it. */
type BulkItem = {
  name: string;
  state: "waiting" | "reading" | "saving" | "done" | "failed";
  message?: string;
  saved?: string;
  payments?: PaymentOutcome[];
};

/** Files read and saved at the same time in a multiple upload. */
const BULK_PARALLEL = 2;
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
  const [payments, setPayments] = useState<PaymentOutcome[] | null>(null);
  const [bulk, setBulk] = useState<BulkItem[] | null>(null);
  const bulkRunning = bulk?.some((b) => b.state !== "done" && b.state !== "failed") ?? false;

  // Leaving the page would stop the files still in the queue.
  useEffect(() => {
    if (!bulkRunning) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [bulkRunning]);

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

  function onChoose(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (files.length > 1) return void runBulk(files);
    setBulk(null);
    void onPick(files[0]);
  }

  /**
   * Several files: each one is uploaded, read by Claude and saved with the
   * title, category and year Claude proposes (the file name when it cannot
   * read it). Paid F24 also fill the matching items of Scadenze.
   */
  async function runBulk(files: File[]) {
    discard(picked.current);
    picked.current = null;
    setStatus(null);
    setReading(null);
    setPayments(null);
    setBulk(files.map((f) => ({ name: f.name, state: "waiting" })));
    const update = (i: number, patch: Partial<BulkItem>) =>
      setBulk((prev) => prev && prev.map((b, j) => (j === i ? { ...b, ...patch } : b)));

    let next = 0;
    const worker = async () => {
      while (next < files.length) {
        const i = next++;
        try {
          update(i, await saveOne(files[i], (state) => update(i, { state })));
        } catch {
          update(i, { state: "failed", message: "Errore imprevisto." });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(BULK_PARALLEL, files.length) }, worker));
    formRef.current?.reset();
  }

  async function saveOne(file: File, progress: (s: BulkItem["state"]) => void): Promise<Partial<BulkItem>> {
    const mime = documentMime(file);
    if (!mime) return { state: "failed", message: "Formato non ammesso." };
    if (file.size > DOCUMENT_MAX_BYTES) return { state: "failed", message: "Supera i 25 MB." };
    progress("reading");
    const path = await uploadFile(file, mime);
    if (!path) return { state: "failed", message: "Caricamento non riuscito." };

    let fields = { title: fileTitle(file.name), category: "other", year: null as number | null, payment: null as DocumentPayment | null };
    let note: string | undefined;
    if (mime.startsWith("image/")) {
      note = "Foto: salvata con il nome del file in Altro.";
    } else {
      const read = await readDocumentAction({ path, name: file.name }).catch(() => null);
      if (read?.ok) fields = read.fields;
      else note = "Claude non l'ha letto: salvato con il nome del file in Altro.";
    }

    progress("saving");
    const result = await registerDocumentAction({ ...fields, path, mime, size: file.size });
    if (!result?.ok) {
      void createClient().storage.from(DOCUMENT_BUCKET).remove([path]);
      return { state: "failed", message: result?.message ?? "Salvataggio non riuscito." };
    }
    const cat = DOCUMENT_CATEGORIES.find((c) => c.id === fields.category)?.label ?? "Altro";
    return {
      state: "done",
      saved: `${fields.title} · ${cat}${fields.year ? ` · ${fields.year}` : ""}`,
      message: note,
      payments: result.payments,
    };
  }

  async function onPick(file: File | undefined) {
    discard(picked.current);
    picked.current = null;
    touched.current = new Set();
    setStatus(null);
    setPayments(null);
    setReading(null);
    setTitle(file ? file.name.replace(/\.[^.]+$/, "") : "");
    setCategory(DEFAULT_CATEGORY);
    setYear("");
    if (!file) return;

    const mime = documentMime(file);
    if (!mime) return setStatus({ ok: false, message: "Formati ammessi: PDF, immagini, XML o P7M." });
    if (file.size > DOCUMENT_MAX_BYTES) return setStatus({ ok: false, message: "Il file supera i 25 MB." });

    const current: Picked = { file, mime, upload: uploadFile(file, mime), payment: null };
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
    current.payment = f.payment;
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
        // Only when the owner kept the category Claude found for it.
        payment: category === "f24" ? current.payment : null,
      });
      setStatus(result);
      setPayments(result?.payments?.length ? result.payments : null);
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
    <form ref={formRef} onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-6">
      <div className="sm:col-span-6">
        <label htmlFor="doc-file" className={label}>File (PDF, immagine, XML o P7M, max 25 MB ciascuno)</label>
        <input
          id="doc-file"
          name="file"
          type="file"
          required
          multiple
          disabled={bulkRunning}
          accept={DOCUMENT_ACCEPT}
          onChange={(e) => onChoose(e.target.files)}
          className="file:mr-3 file:rounded-md file:border-0 file:bg-[var(--fi-fill)] file:px-3 file:py-1 file:text-sm"
        />
        <p className="mt-1.5 text-xs text-[var(--fi-muted)]">
          Puoi sceglierne più di uno: Claude li legge e li archivia da solo. Gli F24 pagati e le ricevute del bollo
          registrano il pagamento nelle Scadenze. Le fatture XML vanno in Fatture → Importa.
        </p>
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
      {bulk ? (
        <BulkList items={bulk} />
      ) : (
        <>
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
          {payments && (
            <div className="sm:col-span-6">
              <PaymentList payments={payments} />
            </div>
          )}
        </>
      )}
    </form>
  );
}

const RESULT = {
  registered: { text: "Registrato", className: "text-[var(--fi-good-text)]" },
  linked: { text: "Collegato", className: "text-[var(--fi-action)]" },
  skipped: { text: "Non registrato", className: "text-[var(--fi-warning-text)]" },
} as const;

/** What a payment file did in Scadenze, one line per F24 item. */
function PaymentList({ payments }: { payments: PaymentOutcome[] }) {
  return (
    <ul className="space-y-0.5 text-xs">
      {payments.map((p, i) => (
        <li key={i}>
          <span className={cx("font-medium", RESULT[p.result].className)}>{RESULT[p.result].text}</span>{" "}
          <span className="text-[var(--fi-ink)]">{p.label}</span>
          <span className="text-[var(--fi-muted)]"> — {p.detail}</span>
        </li>
      ))}
    </ul>
  );
}

const STATE_TEXT: Record<BulkItem["state"], string> = {
  waiting: "In coda",
  reading: "Claude lo sta leggendo…",
  saving: "Salvataggio…",
  done: "Archiviato",
  failed: "Non caricato",
};

function BulkList({ items }: { items: BulkItem[] }) {
  const finished = items.filter((b) => b.state === "done" || b.state === "failed").length;
  const running = finished < items.length;
  const saved = items.filter((b) => b.state === "done").length;
  const registered = items.reduce((n, b) => n + (b.payments?.filter((p) => p.result === "registered").length ?? 0), 0);
  const paid = registered === 0 ? "" : registered === 1 ? ", 1 pagamento registrato" : `, ${registered} pagamenti registrati`;
  return (
    <div className="sm:col-span-6">
      <p role="status" className="mb-2 inline-flex items-center gap-1.5 text-sm text-[var(--fi-ink-2)]">
        {running && <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />}
        {running ? `${finished} di ${items.length} file elaborati: non chiudere la pagina.` : `Fatto: ${saved} di ${items.length} file archiviati${paid}.`}
      </p>
      <ul className="divide-y divide-[var(--fi-rule)] rounded-xl border border-[var(--fi-rule)]">
        {items.map((b, i) => (
          <li key={i} className="space-y-1 px-3 py-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm">{b.name}</span>
              <span
                className={cx(
                  "shrink-0 text-xs",
                  b.state === "failed" ? "text-[var(--fi-critical)]" : b.state === "done" ? "text-[var(--fi-good-text)]" : "text-[var(--fi-muted)]",
                )}
              >
                {STATE_TEXT[b.state]}
              </span>
            </div>
            {b.saved && <p className="text-xs text-[var(--fi-ink-2)]">→ {b.saved}</p>}
            {b.message && <p className="text-xs text-[var(--fi-muted)]">{b.message}</p>}
            {b.payments && b.payments.length > 0 && <PaymentList payments={b.payments} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
