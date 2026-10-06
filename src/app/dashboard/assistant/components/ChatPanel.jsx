'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  AlignLeft,
  ArrowRight,
  ArrowUp,
  Bug,
  CalendarDays,
  Check,
  Copy,
  Download,
  FileText,
  FolderOpen,
  Layers,
  ListChecks,
  Loader2,
  Maximize2,
  MessageSquareText,
  Minimize2,
  Paperclip,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import {
  ACCEPTED_EXTENSIONS,
  MAX_ATTACHMENTS,
  MAX_MESSAGE_CHARS,
  MODES,
  formatBytes,
} from '@/lib/assistant/constants'
import { copyToClipboard } from '@/lib/assistant/bugReport'
import AssistantMultiSelect from './AssistantMultiSelect'
import Markdown from './Markdown'
import { citedNumbers, stripCitations, stripCitationsInFences } from '../citations'

// Spazio lasciato sotto la chat quando è appiccicata (circa lo stesso che c'è sopra, sotto la nav).
const STICKY_BOTTOM_GAP = 24
const COMPOSER_MAX_HEIGHT = 176

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-white'

const MODE_ICONS = {
  ask: MessageSquareText,
  summary: AlignLeft,
  quiz: ListChecks,
  flashcards: Layers,
  plan: CalendarDays,
}

const PLACEHOLDERS = {
  ask: 'Chiedi qualcosa sui tuoi materiali…',
  summary: 'Di cosa vuoi il riassunto? (es. "il capitolo sugli ammortamenti")',
  quiz: 'Su quale argomento vuoi il quiz?',
  flashcards: 'Su quale argomento vuoi le flashcard?',
  plan: 'Quando hai l\'esame? (es. "esame il 20 gennaio, 3 ore al giorno")',
}

const SUGGESTIONS = {
  ask: [
    'Spiegami i concetti principali del corso',
    'Cosa dicono le slide sul tema…?',
    'Confronta come i miei corsi trattano…',
  ],
  summary: ['Riassumi il capitolo su…', 'Fammi uno schema delle definizioni chiave', 'Riassumi l\'ultima lezione in 10 punti'],
  quiz: ['Un quiz di 5 domande sugli argomenti principali', 'Domande a risposta aperta su…', 'Metti alla prova le mie conoscenze su…'],
  flashcards: ['Flashcard sulle definizioni principali', 'Schede sulle formule e i loro usi', 'Flashcard sul capitolo…'],
  plan: ['Esame tra due settimane, 2 ore al giorno', 'Piano di ripasso per il weekend', 'Esame il… e ho già studiato metà del programma'],
}

// Le flashcard arrivano come blocco ```tsv: si trasformano in un file importabile in Anki.
function extractFlashcards(content) {
  const block = /```(?:tsv)?\n([\s\S]*?)```/.exec(content)
  if (!block) return null
  const rows = block[1]
    .split('\n')
    .map((line) => stripCitations(line).trim())
    .filter((line) => line.includes('\t'))
  return rows.length ? rows : null
}

function downloadFlashcards(rows, course) {
  const text = ['#separator:tab', '#html:false', ...rows].join('\n')
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `flashcard-${(course || 'tutti-i-corsi').replace(/\W+/g, '-').toLowerCase()}.txt`
  link.click()
  URL.revokeObjectURL(url)
}

function citedSources(message) {
  if (!message.sources?.length) return []
  const cited = citedNumbers(message.content)
  return message.sources.filter((source) => cited.has(source.n))
}

const ENTER = 'animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none'

function ActionButton({ onClick, children, label, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--dashboard-text-muted)] transition-colors hover:bg-[var(--dashboard-bg-secondary)] hover:text-[var(--dashboard-text)] active:scale-[0.97] ${FOCUS_RING} ${className}`}
    >
      {children}
    </button>
  )
}

function AssistantAvatar() {
  return (
    <span
      aria-hidden
      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--dashboard-accent)]/10 text-[var(--dashboard-accent)]"
    >
      <Sparkles className="h-3.5 w-3.5" />
    </span>
  )
}

function Message({ message, course, onOpenSource }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  if (message.role === 'user') {
    return (
      <div className={`flex justify-end ${ENTER}`}>
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-[var(--dashboard-accent)] px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-[0_6px_16px_-8px_rgba(150,70,45,0.55)]">
          {message.attachments?.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {message.attachments.map((file, index) => (
                <span
                  key={index}
                  className="inline-flex max-w-full items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 text-xs"
                >
                  <Paperclip className="h-3 w-3 shrink-0" />
                  <span className="truncate">{file.name}</span>
                </span>
              ))}
            </div>
          )}
          {message.content}
        </div>
      </div>
    )
  }

  if (message.error) {
    return (
      <div className={`flex gap-3 ${ENTER}`}>
        <span
          aria-hidden
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600"
        >
          <X className="h-3.5 w-3.5" />
        </span>
        <div
          role="alert"
          className="max-w-[min(100%,40rem)] rounded-2xl rounded-tl-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700"
        >
          <p className="font-medium">Non sono riuscito a rispondere</p>
          <p className="mt-0.5 break-words">{message.content}</p>
        </div>
      </div>
    )
  }

  const sources = citedSources(message)
  const flashcards = message.mode === 'flashcards' ? extractFlashcards(message.content) : null

  async function handleCopy() {
    if (await copyToClipboard(message.content)) setCopied(true)
  }

  return (
    <div className={`flex gap-3 ${ENTER}`}>
      <AssistantAvatar />
      <div className="min-w-0 max-w-[min(100%,46rem)] flex-1 space-y-2">
        <div className="rounded-2xl rounded-tl-md border border-[var(--dashboard-card-border)] bg-[var(--dashboard-card-bg)] px-4 py-3 text-[15px] text-[var(--dashboard-text)] shadow-[0_1px_2px_rgba(120,80,60,0.05)]">
          <Markdown
            onSourceClick={(n) => {
              const source = message.sources?.find((item) => item.n === n)
              if (source) onOpenSource(source)
            }}
          >
            {message.mode === 'flashcards' ? stripCitationsInFences(message.content) : message.content}
          </Markdown>
          {message.truncated && (
            <p className="mt-2 text-xs text-[var(--dashboard-text-muted)]">
              Gli estratti sono stati limitati per dimensione: la risposta potrebbe non coprire tutto.
            </p>
          )}
        </div>

        {sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sources.map((source) => (
              <button
                key={source.n}
                type="button"
                onClick={() => onOpenSource(source)}
                title="Apri il file"
                className={`inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-card-bg)] px-2 py-1 text-xs text-[var(--dashboard-text-secondary)] transition-colors hover:border-[var(--dashboard-accent)] hover:text-[var(--dashboard-accent)] active:scale-[0.98] ${FOCUS_RING}`}
              >
                <FileText className="h-3 w-3 shrink-0" />
                <span className="font-semibold tabular-nums">F{source.n}</span>
                <span className="truncate">
                  {[source.course, source.name, source.place].filter(Boolean).join(' · ')}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="-ml-2 flex flex-wrap items-center gap-0.5">
          <ActionButton onClick={handleCopy} label="Copia la risposta">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copiata' : 'Copia'}
          </ActionButton>
          {flashcards && (
            <ActionButton
              onClick={() => downloadFlashcards(flashcards, course)}
              label="Scarica le flashcard per Anki"
              className="text-[var(--dashboard-accent)] hover:text-[var(--dashboard-accent-hover)]"
            >
              <Download className="h-3.5 w-3.5" />
              Scarica per Anki ({flashcards.length} schede)
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div role="status" className={`flex items-center gap-3 ${ENTER}`}>
      <AssistantAvatar />
      <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-md border border-[var(--dashboard-card-border)] bg-[var(--dashboard-card-bg)] px-4 py-3 text-sm text-[var(--dashboard-text-secondary)]">
        <span aria-hidden className="flex items-center gap-1">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              style={{ animationDelay: `${delay}ms` }}
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--dashboard-accent-light)] motion-reduce:animate-none"
            />
          ))}
        </span>
        Sto leggendo i materiali e scrivendo la risposta…
      </div>
    </div>
  )
}

const FIELD =
  'h-8 rounded-md border border-[var(--dashboard-border)] bg-white px-2 text-xs tabular-nums outline-none transition-colors focus:border-[var(--dashboard-accent)] focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]/25'

export default function ChatPanel({
  messages,
  loading,
  input,
  onInputChange,
  onSend,
  onReset,
  mode,
  onModeChange,
  course,
  readyDocuments,
  documentIds,
  onDocumentsChange,
  count,
  onCountChange,
  onOpenSource,
  onReportBug,
  hasDocuments,
  attachments,
  onAttach,
  onRemoveAttachment,
  expanded,
  onToggleExpand,
}) {
  const sectionRef = useRef(null)
  const scrollerRef = useRef(null)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  const [reportState, setReportState] = useState('idle')
  const [dragging, setDragging] = useState(false)

  const uploading = attachments.some((item) => item.status === 'uploading')
  const canAttach = attachments.filter((item) => item.status !== 'error').length < MAX_ATTACHMENTS

  // Su desktop la chat resta appiccicata sotto la nav (sticky) e occupa il resto dello schermo.
  // All'inizio sopra c'è l'intestazione, quindi l'altezza segue lo scroll: parte dalla posizione
  // naturale della griglia e, una volta agganciata, parte dal top dello sticky. Si scrive sullo
  // style senza passare dallo stato per non ri-renderizzare tutti i messaggi a ogni frame.
  useLayoutEffect(() => {
    const section = sectionRef.current
    const grid = section?.parentElement
    if (!grid) return
    const desktop = window.matchMedia('(min-width: 1024px)')
    let frame = 0

    function update() {
      frame = 0
      if (!desktop.matches) {
        section.style.height = ''
        return
      }
      const stickyTop = Number.parseFloat(getComputedStyle(section).top) || 0
      const top = Math.max(grid.getBoundingClientRect().top, stickyTop)
      section.style.height = `${window.innerHeight - top - STICKY_BOTTOM_GAP}px`
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
    // Espandendo cambia la posizione della griglia: l'altezza va ricalcolata.
  }, [expanded])

  // Si scorre solo la lista dei messaggi, non la pagina intera.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (scroller) scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  // La casella di testo cresce con il contenuto fino a un massimo, poi scorre.
  useLayoutEffect(() => {
    const area = textareaRef.current
    if (!area) return
    area.style.height = 'auto'
    area.style.height = `${Math.min(area.scrollHeight, COMPOSER_MAX_HEIGHT)}px`
  }, [input])

  useEffect(() => {
    if (reportState === 'idle') return
    const timer = setTimeout(() => setReportState('idle'), 2500)
    return () => clearTimeout(timer)
  }, [reportState])

  async function handleReportBug() {
    setReportState((await onReportBug()) ? 'copied' : 'failed')
  }

  const currentMode = MODES.find((item) => item.id === mode) ?? MODES[0]
  const showCount = mode === 'quiz' || mode === 'flashcards'
  const showDocumentOptions = readyDocuments.length > 0 || showCount
  const canSend = !loading && !uploading && Boolean(input.trim())
  const nearLimit = input.length > MAX_MESSAGE_CHARS * 0.8

  function handleFilePick(event) {
    const files = [...event.target.files]
    event.target.value = ''
    if (files.length) onAttach(files)
  }

  function handleDrop(event) {
    event.preventDefault()
    setDragging(false)
    const files = [...event.dataTransfer.files]
    if (files.length) onAttach(files)
  }

  // Incollando uno screenshot (o un file copiato) si allega senza passare dal selettore.
  function handlePaste(event) {
    const files = [...event.clipboardData.files]
    if (!files.length) return
    event.preventDefault()
    onAttach(files)
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      onSend()
    }
  }

  function pickSuggestion(suggestion) {
    onInputChange(suggestion)
    textareaRef.current?.focus()
  }

  return (
    <section
      ref={sectionRef}
      aria-label="Chat con l'assistente"
      className="order-1 flex min-h-[32rem] max-h-[85dvh] flex-col overflow-hidden rounded-2xl border border-[var(--dashboard-card-border)] bg-[var(--dashboard-bg)] shadow-[0_1px_2px_rgba(120,80,60,0.06),0_16px_32px_-20px_rgba(120,80,60,0.28)] lg:sticky lg:top-22 lg:order-2 lg:max-h-none lg:self-start"
    >
      <div className="flex items-center gap-2 border-b border-[var(--dashboard-card-border)] bg-[var(--dashboard-card-bg)] px-3 py-2.5">
        <div
          role="tablist"
          aria-label="Modalità"
          className="-mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {MODES.map((item) => {
            const Icon = MODE_ICONS[item.id] ?? MessageSquareText
            const active = mode === item.id
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onModeChange(item.id)}
                title={item.hint}
                className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all active:scale-[0.97] ${FOCUS_RING} ${
                  active
                    ? 'bg-[var(--dashboard-accent)] text-white shadow-[0_4px_10px_-4px_rgba(150,70,45,0.6)]'
                    : 'text-[var(--dashboard-text-secondary)] hover:bg-[var(--dashboard-bg-secondary)] hover:text-[var(--dashboard-text)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
        </div>

        <div className="flex shrink-0 items-center gap-0.5 border-l border-[var(--dashboard-card-border)] pl-2">
          <ActionButton
            onClick={handleReportBug}
            label="Copia chat, filtri e documenti caricati per segnalare un problema"
          >
            {reportState === 'copied' ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Bug className="h-3.5 w-3.5" />
            )}
            <span className="hidden xl:inline">
              {reportState === 'copied' ? 'Copiato' : reportState === 'failed' ? 'Copia non riuscita' : 'Segnala un bug'}
            </span>
          </ActionButton>
          {messages.length > 0 && (
            <ActionButton onClick={onReset} label="Nuova chat">
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Nuova chat</span>
            </ActionButton>
          )}
          <ActionButton
            onClick={onToggleExpand}
            label={expanded ? 'Mostra il pannello dei materiali' : 'Espandi la chat a tutta pagina'}
            className="max-lg:hidden"
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span className="hidden xl:inline">{expanded ? 'Riduci' : 'Espandi'}</span>
          </ActionButton>
        </div>
      </div>

      {showDocumentOptions && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--dashboard-card-border)] bg-[var(--dashboard-card-bg)] px-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--dashboard-text-muted)]">
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="max-w-40 truncate font-medium text-[var(--dashboard-text-secondary)]" title={course || undefined}>
              {course || 'Tutti i corsi'}
            </span>
            <span aria-hidden>/</span>
          </span>
          <AssistantMultiSelect
            value={documentIds}
            onChange={onDocumentsChange}
            options={readyDocuments.map((doc) => ({ value: doc.id, label: doc.name }))}
            allLabel={mode === 'ask' ? 'Tutti i documenti' : 'Cerca nei materiali'}
            aria-label="Documenti"
            className="w-auto min-w-40 max-w-64"
          />
          {showCount && (
            <input
              type="number"
              min={1}
              max={mode === 'quiz' ? 10 : 20}
              value={count}
              onChange={(event) => onCountChange(event.target.value)}
              placeholder={mode === 'quiz' ? 'n. domande' : 'n. schede'}
              aria-label="Quantità"
              className={`${FIELD} w-24`}
            />
          )}
        </div>
      )}

      <div
        ref={scrollerRef}
        role="log"
        aria-live="polite"
        aria-label="Conversazione"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5"
      >
        <div className="mx-auto w-full max-w-4xl space-y-5">
        {messages.length === 0 && !loading && (
          <div className={`mx-auto flex max-w-lg flex-col items-center pt-6 text-center sm:pt-10 ${ENTER}`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--dashboard-accent)]/10 text-[var(--dashboard-accent)]">
              {hasDocuments ? <Sparkles className="h-5 w-5" /> : <FolderOpen className="h-5 w-5" />}
            </span>
            <h2 className="mt-4 text-balance font-serif text-2xl font-semibold tracking-tight text-[var(--dashboard-text)] sm:text-3xl">
              {hasDocuments ? 'Cosa vuoi ripassare oggi?' : 'Carica i tuoi materiali'}
            </h2>
            <p className="mt-2 max-w-md text-pretty text-sm leading-relaxed text-[var(--dashboard-text-secondary)]">
              {hasDocuments
                ? `${currentMode.hint}. Ogni risposta cita le fonti: clicca un riferimento per aprire il file alla pagina giusta.`
                : 'Scegli il corso e trascina slide, trascrizioni e riassunti nella sezione Materiali. Poi fai le tue domande qui.'}
            </p>

            {hasDocuments ? (
              <ul className="mt-6 w-full space-y-2 text-left">
                {SUGGESTIONS[mode].map((suggestion) => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      onClick={() => pickSuggestion(suggestion)}
                      className={`group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--dashboard-card-border)] bg-[var(--dashboard-card-bg)] px-4 py-3 text-sm text-[var(--dashboard-text-secondary)] transition-all hover:-translate-y-px hover:border-[var(--dashboard-accent-light)] hover:text-[var(--dashboard-text)] hover:shadow-[0_8px_18px_-12px_rgba(120,80,60,0.35)] active:translate-y-0 active:scale-[0.99] ${FOCUS_RING}`}
                    >
                      {suggestion}
                      <ArrowRight className="h-4 w-4 shrink-0 text-[var(--dashboard-text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--dashboard-accent)]" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <a
                href="#assistant-sources"
                className={`mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--dashboard-accent)] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--dashboard-accent-hover)] active:scale-[0.98] ${FOCUS_RING}`}
              >
                Vai ai materiali
                <ArrowRight className="h-4 w-4" />
              </a>
            )}
          </div>
        )}

        {messages.map((message) => (
          <Message key={message.id} message={message} course={course} onOpenSource={onOpenSource} />
        ))}

        {loading && <TypingIndicator />}
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSend()
        }}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes('Files')) return
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false)
        }}
        onDrop={handleDrop}
        className="relative border-t border-[var(--dashboard-card-border)] bg-[var(--dashboard-card-bg)] p-3"
      >
        <div
          className={`mx-auto max-w-4xl rounded-2xl border bg-white transition-all focus-within:border-[var(--dashboard-accent)] focus-within:ring-2 focus-within:ring-[var(--dashboard-accent)]/20 ${
            dragging ? 'border-[var(--dashboard-accent)] ring-2 ring-[var(--dashboard-accent)]/20' : 'border-[var(--dashboard-border)]'
          }`}
        >
          {attachments.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 px-3 pt-3">
              {attachments.map((item) => (
                <li
                  key={item.id}
                  title={item.message}
                  className={`inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
                    item.status === 'error'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-[var(--dashboard-border)] bg-[var(--dashboard-bg-secondary)] text-[var(--dashboard-text-secondary)]'
                  }`}
                >
                  {item.status === 'uploading' ? (
                    <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                  ) : (
                    <FileText className="h-3 w-3 shrink-0" />
                  )}
                  <span className="truncate">{item.name}</span>
                  <span className="shrink-0 tabular-nums opacity-70">
                    {item.status === 'error' ? item.message : formatBytes(item.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(item.id)}
                    aria-label={`Rimuovi ${item.name}`}
                    className={`shrink-0 cursor-pointer rounded p-0.5 transition-colors hover:bg-black/10 ${FOCUS_RING}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={1}
            maxLength={MAX_MESSAGE_CHARS}
            placeholder={PLACEHOLDERS[mode]}
            aria-label="Messaggio"
            className="block max-h-44 w-full resize-none bg-transparent px-4 pb-1 pt-3 text-[15px] leading-relaxed text-[var(--dashboard-text)] outline-none placeholder:text-[var(--dashboard-text-muted)]"
          />

          <div className="flex items-center gap-1 px-2 pb-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(',')}
              onChange={handleFilePick}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canAttach}
              title={
                canAttach
                  ? 'Allega file solo a questo messaggio (PDF, Word, slide, testo, immagini)'
                  : `Massimo ${MAX_ATTACHMENTS} allegati`
              }
              aria-label="Allega file"
              className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--dashboard-text-secondary)] transition-all hover:bg-[var(--dashboard-bg-secondary)] hover:text-[var(--dashboard-accent)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--dashboard-text-secondary)] ${FOCUS_RING}`}
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <p className="ml-1 hidden min-w-0 flex-1 truncate text-xs text-[var(--dashboard-text-muted)] sm:block">
              <kbd className="font-sans">Invio</kbd> per inviare · <kbd className="font-sans">Maiusc + Invio</kbd> per andare a capo
            </p>
            <span className="flex-1 sm:hidden" />

            {nearLimit && (
              <span
                className={`shrink-0 text-xs tabular-nums ${
                  input.length >= MAX_MESSAGE_CHARS ? 'text-red-600' : 'text-[var(--dashboard-text-muted)]'
                }`}
              >
                {input.length}/{MAX_MESSAGE_CHARS}
              </span>
            )}

            <Button
              type="submit"
              size="icon"
              disabled={!canSend}
              aria-label="Invia messaggio"
              className="h-9 w-9 shrink-0 cursor-pointer rounded-lg bg-[var(--dashboard-accent)] text-white transition-all hover:bg-[var(--dashboard-accent-hover)] active:scale-95 disabled:bg-[var(--dashboard-bg-secondary)] disabled:text-[var(--dashboard-text-muted)] disabled:opacity-100"
            >
              {loading || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {dragging && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-3 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--dashboard-accent)] bg-[var(--dashboard-card-bg)]/90 text-sm font-medium text-[var(--dashboard-accent)]"
          >
            <Paperclip className="h-4 w-4" />
            Rilascia per allegare al messaggio
          </div>
        )}
      </form>
    </section>
  )
}
