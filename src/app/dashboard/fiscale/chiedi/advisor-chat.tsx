"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Check, CircleAlert, Copy, FileText, Globe, Loader2, Paperclip, Plus, Sparkles, Square, X } from "lucide-react";
import { DEFAULT_MODEL, MODELS } from "@/lib/assistant/constants";
import {
  ADVISOR_ACCEPT,
  ADVISOR_MAX_FILES,
  ADVISOR_MAX_FILES_BYTES,
  ADVISOR_MAX_HISTORY,
  ADVISOR_MAX_MESSAGE,
  type AdvisorFile,
  type AdvisorReply,
  type AdvisorTurn,
} from "@/lib/fiscale/advisor-shared";
import { btn, cx } from "../components/ui";
import { Markdown } from "./markdown";
import { ModelSelect } from "./model-select";

type Message = AdvisorTurn & { id: string; meta?: { model: string | null; durationMs: number | null } };
type Prefs = { model: string; webSearch: boolean };

/** The conversation lives only in this browser. */
const STORE = "fiscale-advisor-v1";
const MAX_STORED = 60;

const SUGGESTIONS = [
  "Quanto devo tenere da parte oggi per tasse e contributi?",
  "Quali sono le prossime scadenze e quanto pago?",
  "Ho pagamenti senza ricevuta definitiva o scadenze saltate?",
  "Mi conviene chiedere la riduzione INPS del 35%?",
];

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fi-action)]";
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()));
const modelLabel = (id: string | null) => MODELS.find((m) => m.id === id)?.label ?? id ?? "";

function readStore(): { messages: Message[]; prefs: Prefs } | null {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return {
      messages: Array.isArray(v.messages) ? v.messages : [],
      prefs: {
        model: MODELS.some((m) => m.id === v.prefs?.model) ? v.prefs.model : DEFAULT_MODEL,
        webSearch: v.prefs?.webSearch !== false,
      },
    };
  } catch {
    return null;
  }
}

function writeStore(messages: Message[], prefs: Prefs) {
  try {
    localStorage.setItem(STORE, JSON.stringify({ messages: messages.slice(-MAX_STORED), prefs }));
  } catch {
    // Storage full or blocked: the chat still works, it just is not remembered.
  }
}

export function AdvisorChat({ demo }: { demo: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prefs, setPrefs] = useState<Prefs>({ model: DEFAULT_MODEL, webSearch: true });
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState<{ startedAt: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = readStore();
    if (saved) {
      setMessages(saved.messages);
      setPrefs(saved.prefs);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) writeStore(messages, prefs);
  }, [messages, prefs, loaded]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending, error]);

  useEffect(() => {
    if (!pending) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed(Math.round((Date.now() - pending.startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [pending]);

  useEffect(() => () => abort.current?.abort(), []);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setError(null);
    const next = [...files, ...Array.from(list)].slice(0, ADVISOR_MAX_FILES);
    if (files.length + list.length > ADVISOR_MAX_FILES) setError(`Al massimo ${ADVISOR_MAX_FILES} allegati per messaggio.`);
    else if (next.reduce((s, f) => s + f.size, 0) > ADVISOR_MAX_FILES_BYTES) {
      setError("Allegati troppo grandi: al massimo 4 MB in tutto.");
      return;
    }
    setFiles(next);
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || pending) return;
    if (message.length > ADVISOR_MAX_MESSAGE) {
      setError(`Messaggio troppo lungo: al massimo ${ADVISOR_MAX_MESSAGE.toLocaleString("it-IT")} caratteri.`);
      return;
    }
    const sentFiles = files;
    const userMsg: Message = {
      id: newId(),
      role: "user",
      content: message,
      files: sentFiles.length ? sentFiles.map((f) => ({ name: f.name, text: "" })) : undefined,
    };
    const history: AdvisorTurn[] = messages
      .slice(-ADVISOR_MAX_HISTORY * 2)
      .map(({ role, content, files: f }) => ({ role, content, ...(f?.length ? { files: f.filter((x) => x.text) } : {}) }));

    setMessages((m) => [...m, userMsg]);
    setInput("");
    setFiles([]);
    setError(null);
    setPending({ startedAt: Date.now() });

    const form = new FormData();
    form.set("payload", JSON.stringify({ message, model: prefs.model, webSearch: prefs.webSearch, history }));
    for (const f of sentFiles) form.append("files", f);
    const controller = new AbortController();
    abort.current = controller;

    try {
      const res = await fetch("/api/fiscale/chat", { method: "POST", body: form, signal: controller.signal });
      const data = (await res.json().catch(() => null)) as AdvisorReply | { ok: false; error: string } | null;
      if (!res.ok || !data || !data.ok) {
        throw new Error((data && !data.ok && data.error) || `Errore ${res.status}`);
      }
      // The user's turn keeps the text read from its files, for follow-up questions.
      const read: AdvisorFile[] = data.files;
      setMessages((m) => [
        ...m.map((x) => (x.id === userMsg.id ? { ...x, files: read.length ? read : x.files } : x)),
        { id: newId(), role: "assistant", content: data.text, meta: { model: data.model, durationMs: data.durationMs } },
      ]);
    } catch (e) {
      const stopped = controller.signal.aborted;
      // The question goes back into the box, ready to send again.
      setMessages((m) => m.filter((x) => x.id !== userMsg.id));
      setInput(message);
      setFiles(sentFiles);
      setError(stopped ? "Richiesta interrotta." : e instanceof Error ? e.message : "Qualcosa è andato storto.");
    } finally {
      abort.current = null;
      setPending(null);
      textarea.current?.focus();
    }
  }

  function reset() {
    abort.current?.abort();
    setMessages([]);
    setError(null);
    setInput("");
    setFiles([]);
    textarea.current?.focus();
  }

  const status =
    elapsed < 6
      ? "Leggo i tuoi dati fiscali…"
      : prefs.webSearch && elapsed < 60
        ? "Ragiono e controllo le fonti ufficiali…"
        : elapsed < 60
          ? "Ragiono sulla tua domanda…"
          : "Ci vuole ancora un po': con la ricerca web una risposta può richiedere un paio di minuti…";

  return (
    <div className="flex h-[calc(100dvh-61px-52px-48px)] min-h-[540px] flex-col overflow-hidden rounded-xl border border-[var(--fi-rule)] bg-[var(--fi-surface)] lg:h-[calc(100dvh-61px-72px)]">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--fi-rule)] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h1 className="text-[17px] font-semibold leading-tight tracking-[-0.01em]">Chiedi al commercialista</h1>
          <p className="mt-0.5 truncate text-xs text-[var(--fi-muted)]">
            Risponde Claude con i dati di questa app{prefs.webSearch ? " e le fonti ufficiali sul web" : ""}.
          </p>
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={reset} className={cx(btn.outline, "shrink-0")}>
            <Plus aria-hidden className="h-4 w-4" />
            <span className="hidden sm:inline">Nuova conversazione</span>
            <span className="sm:hidden">Nuova</span>
          </button>
        )}
      </header>

      <div ref={scroller} className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-[760px] px-4 py-6 sm:px-6">
          {demo && (
            <p className="mb-6 rounded-lg border border-dashed border-[var(--fi-rule-strong)] px-3 py-2 text-xs text-[var(--fi-ink-2)]">
              Il profilo fiscale non è ancora creato: le risposte useranno i dati dimostrativi.
            </p>
          )}

          {loaded && messages.length === 0 && !pending && (
            <div className="flex flex-col items-center pt-6 text-center sm:pt-12">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--fi-action-soft)] text-[var(--fi-action)]">
                <Sparkles aria-hidden className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-[17px] font-semibold">Fai una domanda sulla tua partita IVA</h2>
              <p className="mt-1.5 max-w-[52ch] text-pretty text-sm text-[var(--fi-ink-2)]">
                Conosce fatture, incassi, F24 pagati e ricevute, crediti e scadenze, e può aprire i documenti del tuo archivio. Puoi
                anche incollare un&apos;email o allegare un PDF, per esempio un avviso di pagamento.
              </p>
              <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className={cx(
                      "rounded-lg border border-[var(--fi-rule)] bg-white px-3.5 py-2.5 text-left text-sm text-[var(--fi-ink-2)] transition-colors duration-150 hover:border-[var(--fi-rule-strong)] hover:bg-[var(--fi-ground)] hover:text-[var(--fi-ink)]",
                      focus,
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <ol className="space-y-7" aria-live="polite">
            {messages.map((m) => (m.role === "user" ? <UserMessage key={m.id} m={m} /> : <AnswerMessage key={m.id} m={m} />))}
            {pending && (
              <li className="flex flex-col gap-2">
                <AnswerLabel />
                <p className="flex items-center gap-2 text-sm text-[var(--fi-ink-2)]">
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin text-[var(--fi-action)]" />
                  {status}
                  <span className="fi-num text-xs text-[var(--fi-muted)]">{elapsed} s</span>
                </p>
              </li>
            )}
          </ol>
        </div>
      </div>

      <div className="border-t border-[var(--fi-rule)] bg-[var(--fi-ground)]/60 px-4 py-3 sm:px-6">
        <form
          className="mx-auto max-w-[760px]"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          {error && (
            <p role="alert" className="mb-2 flex items-start gap-2 rounded-lg bg-[var(--fi-critical-soft)] px-3 py-2 text-sm text-[var(--fi-critical-text)]">
              <CircleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">{error}</span>
              <button type="button" onClick={() => setError(null)} aria-label="Chiudi" className={cx("rounded p-0.5 hover:bg-black/5", focus)}>
                <X aria-hidden className="h-4 w-4" />
              </button>
            </p>
          )}

          <div className="rounded-xl border border-[var(--fi-rule)] bg-white shadow-[0_1px_2px_rgba(18,22,43,0.06)] transition-colors focus-within:border-[var(--fi-action)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--fi-action)_18%,transparent)]">
            {files.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 px-3 pt-3">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex max-w-full items-center gap-1.5 rounded-md bg-[var(--fi-fill)] py-1 pl-2 pr-1 text-xs">
                    <FileText aria-hidden className="h-3.5 w-3.5 shrink-0 text-[var(--fi-muted)]" />
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setFiles(files.filter((_, j) => j !== i))}
                      aria-label={`Rimuovi ${f.name}`}
                      className={cx("rounded p-0.5 text-[var(--fi-muted)] hover:bg-black/5 hover:text-[var(--fi-ink)]", focus)}
                    >
                      <X aria-hidden className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <label htmlFor="advisor-input" className="sr-only">
              Domanda
            </label>
            <textarea
              id="advisor-input"
              ref={textarea}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={2}
              placeholder="Scrivi la tua domanda o incolla un'email…"
              style={{ border: 0, boxShadow: "none", background: "transparent", resize: "none" }}
              className="block max-h-[40vh] min-h-[56px] px-3.5 pt-3 [field-sizing:content]"
            />

            <div className="flex items-center gap-1.5 px-2 pb-2">
              <input
                ref={fileInput}
                type="file"
                multiple
                accept={ADVISOR_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={files.length >= ADVISOR_MAX_FILES}
                title="Allega PDF o testo"
                aria-label="Allega file"
                className={cx(
                  "grid h-8 w-8 place-items-center rounded-lg text-[var(--fi-ink-2)] transition-colors hover:bg-[var(--fi-fill)] hover:text-[var(--fi-ink)] disabled:opacity-40",
                  focus,
                )}
              >
                <Paperclip aria-hidden className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, webSearch: !p.webSearch }))}
                aria-pressed={prefs.webSearch}
                title={prefs.webSearch ? "Ricerca web attiva: cita le fonti ufficiali" : "Ricerca web spenta: risposte più rapide"}
                className={cx(
                  "flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors",
                  prefs.webSearch
                    ? "bg-[var(--fi-action-soft)] text-[var(--fi-action)]"
                    : "text-[var(--fi-muted)] hover:bg-[var(--fi-fill)] hover:text-[var(--fi-ink)]",
                  focus,
                )}
              >
                <Globe aria-hidden className="h-3.5 w-3.5" />
                Ricerca web
              </button>
              <ModelSelect value={prefs.model} onChange={(model) => setPrefs((p) => ({ ...p, model }))} />

              <div className="ml-auto">
                {pending ? (
                  <button
                    type="button"
                    onClick={() => abort.current?.abort()}
                    aria-label="Interrompi"
                    className={cx("grid h-8 w-8 place-items-center rounded-lg bg-[var(--fi-ink)] text-white hover:bg-[var(--fi-ink-2)]", focus)}
                  >
                    <Square aria-hidden className="h-3 w-3 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    aria-label="Invia"
                    className={cx(
                      "grid h-8 w-8 place-items-center rounded-lg bg-[var(--fi-action)] text-white transition-colors hover:bg-[var(--fi-action-hover)] disabled:cursor-not-allowed disabled:opacity-40",
                      focus,
                    )}
                  >
                    <ArrowUp aria-hidden className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-[var(--fi-muted)]">
            Un aiuto, non una consulenza professionale: verifica le fonti sulle scelte importanti. La conversazione resta solo in questo browser.
          </p>
        </form>
      </div>
    </div>
  );
}

function UserMessage({ m }: { m: Message }) {
  return (
    <li className="flex flex-col items-end gap-1.5">
      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-[var(--fi-action-soft)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--fi-ink)]">
        {m.content}
      </div>
      {m.files && m.files.length > 0 && (
        <ul className="flex max-w-[85%] flex-wrap justify-end gap-1.5">
          {m.files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex max-w-full items-center gap-1.5 rounded-md border border-[var(--fi-rule)] px-2 py-1 text-xs text-[var(--fi-ink-2)]">
              <FileText aria-hidden className="h-3.5 w-3.5 shrink-0 text-[var(--fi-muted)]" />
              <span className="truncate">{f.name}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function AnswerLabel() {
  return (
    <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--fi-muted)]">
      <Sparkles aria-hidden className="h-3.5 w-3.5 text-[var(--fi-action)]" />
      Commercialista AI
    </p>
  );
}

function AnswerMessage({ m }: { m: Message }) {
  const [copied, setCopied] = useState(false);
  return (
    <li className="flex flex-col gap-2">
      <AnswerLabel />
      <div className="text-sm text-[var(--fi-ink)]">
        <Markdown>{m.content}</Markdown>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-[var(--fi-muted)]">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(m.content);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              // Clipboard blocked: nothing to do.
            }
          }}
          className={cx("flex items-center gap-1 rounded px-1 py-0.5 hover:bg-[var(--fi-fill)] hover:text-[var(--fi-ink)]", focus)}
        >
          {copied ? <Check aria-hidden className="h-3 w-3" /> : <Copy aria-hidden className="h-3 w-3" />}
          {copied ? "Copiato" : "Copia"}
        </button>
        {m.meta && (
          <span className="fi-num">
            {modelLabel(m.meta.model)}
            {m.meta.durationMs ? ` · ${Math.round(m.meta.durationMs / 1000)} s` : ""}
          </span>
        )}
      </div>
    </li>
  );
}
