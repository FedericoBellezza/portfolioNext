"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { DOCUMENT_ACCEPT, DOCUMENT_BUCKET, DOCUMENT_MAX_BYTES, documentMime } from "@/lib/fiscale/documents";
import { taskGuide, type TaskItem } from "@/lib/fiscale/tasks";
import { createClient } from "@/lib/supabase/client";
import { dayDate, daysBetween, eur } from "../components/format";
import { Badge, btn, cx } from "../components/ui";
import { completeTaskAction, createReminderAction, type TaskState } from "./task-actions";

const fieldLabel = "mb-1 block text-xs font-medium text-[var(--fi-ink-2)]";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

const CATEGORY_FOR: Record<string, string> = { redditi: "tax_return", "inail-filing": "inail", inps35: "inps" };

function CompleteForm({ task, demo }: { task: TaskItem; demo: boolean }) {
  const [status, setStatus] = useState<TaskState>(null);
  const [pending, setPending] = useState(false);
  const id = task.key.replace(/[^a-z0-9]/g, "-");
  const guide = taskGuide(task);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("receipt");
    setPending(true);
    setStatus(null);
    try {
      let doc = null;
      if (file instanceof File && file.size > 0) {
        const mime = documentMime(file);
        if (!mime) return setStatus({ ok: false, message: "Formati ammessi: PDF, immagini, XML o P7M." });
        if (file.size > DOCUMENT_MAX_BYTES) return setStatus({ ok: false, message: "Il file supera i 25 MB." });
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user) return setStatus({ ok: false, message: "Sessione scaduta: ricarica la pagina." });
        const path = `${data.user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_").slice(-80)}`;
        const up = await supabase.storage.from(DOCUMENT_BUCKET).upload(path, file, { contentType: mime });
        if (up.error) return setStatus({ ok: false, message: "Caricamento della ricevuta non riuscito." });
        doc = {
          path,
          mime,
          size: file.size,
          title: task.title,
          category: (task.guide && CATEGORY_FOR[task.guide]) || "other",
          year: Number(task.dueDate.slice(0, 4)),
        };
      }
      setStatus(
        await completeTaskAction({
          key: task.key,
          completedAt: String(fd.get("completedAt") ?? ""),
          note: String(fd.get("note") ?? ""),
          doc,
        }),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg bg-white/70 p-4">
      {guide.length > 0 && (
        <div className="mb-4 max-w-[70ch] space-y-1.5 text-sm text-[var(--fi-ink-2)]">
          {guide.map((g) => (
            <p key={g}>{g}</p>
          ))}
        </div>
      )}
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-6">
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-date`} className={fieldLabel}>Fatto il</label>
          <input id={`${id}-date`} name="completedAt" type="date" required max={today()} defaultValue={task.dueDate < today() ? task.dueDate : today()} />
        </div>
        <div className="sm:col-span-4">
          <label htmlFor={`${id}-file`} className={fieldLabel}>Ricevuta (facoltativa, va in Documenti)</label>
          <input
            id={`${id}-file`}
            name="receipt"
            type="file"
            accept={DOCUMENT_ACCEPT}
            className="file:mr-3 file:rounded-md file:border-0 file:bg-[var(--fi-fill)] file:px-3 file:py-1 file:text-sm"
          />
        </div>
        <div className="sm:col-span-4">
          <label htmlFor={`${id}-note`} className={fieldLabel}>Nota (facoltativa)</label>
          <input id={`${id}-note`} name="note" maxLength={500} />
        </div>
        <div className="flex items-end sm:col-span-2">
          <button type="submit" className={cx(btn.primary, "w-full")} disabled={pending || demo}>
            <Check aria-hidden className="h-4 w-4" />
            {pending ? "Salvataggio…" : "Segna come fatto"}
          </button>
        </div>
      </form>
      {status && (
        <p role="status" className={cx("mt-2 text-sm", status.ok ? "text-[var(--fi-good-text)]" : "text-[var(--fi-critical)]")}>
          {status.message}
        </p>
      )}
    </div>
  );
}

/** Open filings and reminders, each expandable to its guide and the "done" form. */
export function OpenTasks({ tasks, asOf, demo }: { tasks: TaskItem[]; asOf: string; demo: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  if (tasks.length === 0) {
    return <p className="text-sm text-[var(--fi-ink-2)]">Niente in sospeso nei prossimi 12 mesi.</p>;
  }
  return (
    <ul className="divide-y divide-[var(--fi-rule)] rounded-xl border border-[var(--fi-rule)] bg-[var(--fi-surface)]">
      {tasks.map((t) => {
        const days = daysBetween(asOf, t.dueDate);
        const expanded = open === t.key;
        return (
          <li key={t.key} className="px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <span className="fi-num hidden w-24 shrink-0 text-sm sm:block">{dayDate(t.dueDate, Number(asOf.slice(0, 4)))}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm">{t.title}</span>
                <span className="block text-xs text-[var(--fi-muted)]">
                  <span className="fi-num sm:hidden">{dayDate(t.dueDate, Number(asOf.slice(0, 4)))} · </span>
                  {t.scope === "business" ? "Attività" : "Personale"}
                  {days < 0 ? " · era da fare: se l'hai già fatto, segnalo" : ""}
                  {t.amount ? ` · ${eur(t.amount)}` : ""}
                  {t.source === "custom" ? " · promemoria" : ""}
                </span>
              </span>
              <div className="flex items-center justify-between gap-4">
              {days < 0 ? (
                <Badge tone="critical">Scaduto</Badge>
              ) : days <= 30 ? (
                <Badge tone="warning">Tra {days} gg</Badge>
              ) : <span />}
              <button
                type="button"
                className={btn.outline}
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : t.key)}
              >
                {expanded ? "Chiudi" : "Come fare"}
              </button>
              </div>
            </div>
            {expanded && <CompleteForm task={t} demo={demo} />}
          </li>
        );
      })}
    </ul>
  );
}

export function ReminderForm({ demo }: { demo: boolean }) {
  const [state, action, pending] = useActionState<TaskState, FormData>(createReminderAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      className="grid max-w-3xl gap-3 sm:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <div className="sm:col-span-4">
        <label htmlFor="rem-title" className={fieldLabel}>Cosa ricordare</label>
        <input id="rem-title" name="title" required maxLength={200} placeholder="Es. IMU seconda rata, bollo auto" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="rem-scope" className={fieldLabel}>Riguarda</label>
        <select id="rem-scope" name="scope" defaultValue="personal">
          <option value="personal">Me (personale)</option>
          <option value="business">L&apos;attività</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="rem-date" className={fieldLabel}>Scadenza</label>
        <input id="rem-date" name="firstDue" type="date" required />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="rem-rec" className={fieldLabel}>Si ripete</label>
        <select id="rem-rec" name="recurrence" defaultValue="yearly">
          <option value="yearly">Ogni anno</option>
          <option value="monthly">Ogni mese</option>
          <option value="once">Una volta</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="rem-amount" className={fieldLabel}>Importo (facoltativo)</label>
        <input id="rem-amount" name="amount" inputMode="decimal" placeholder="0,00" />
      </div>
      <div className="sm:col-span-6">
        <label htmlFor="rem-notes" className={fieldLabel}>Note (facoltative)</label>
        <input id="rem-notes" name="notes" maxLength={1000} placeholder="Es. codice tributo, come si paga, chi chiamare" />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-6">
        <button type="submit" className={btn.primary} disabled={pending || demo}>
          {pending ? "Salvataggio…" : "Aggiungi promemoria"}
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
