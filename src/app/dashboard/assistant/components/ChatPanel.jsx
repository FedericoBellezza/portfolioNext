'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Bug, Check, Download, FileText, Loader2, Paperclip, RotateCcw, Send, X } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import {
  ACCEPTED_EXTENSIONS,
  MAX_ATTACHMENTS,
  MAX_MESSAGE_CHARS,
  MODES,
  formatBytes,
} from '@/lib/assistant/constants'
import AssistantSelect from './AssistantSelect'
import Markdown from './Markdown'

// Spazio lasciato sotto la chat quando è appiccicata (circa lo stesso che c'è sopra, sotto la nav).
const STICKY_BOTTOM_GAP = 24

const PLACEHOLDERS = {
  ask: 'Chiedi qualcosa sui tuoi materiali…',
  summary: 'Di cosa vuoi il riassunto? (es. "il capitolo sugli ammortamenti")',
  quiz: 'Su quale argomento vuoi il quiz?',
  flashcards: 'Su quale argomento vuoi le flashcard?',
  plan: 'Quando hai l\'esame? (es. "esame il 20 gennaio, 3 ore al giorno")',
}

const SUGGESTIONS = [
  'Spiegami i concetti principali del corso',
  'Cosa dicono le slide sul tema…?',
  'Confronta come i miei corsi trattano…',
]

// Le flashcard arrivano come blocco ```tsv: si trasformano in un file importabile in Anki.
function extractFlashcards(content) {
  const block = /```(?:tsv)?\n([\s\S]*?)```/.exec(content)
  if (!block) return null
  const rows = block[1]
    .split('\n')
    .map((line) => line.trim())
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
  const cited = new Set([...message.content.matchAll(/\[F(\d+)\]/g)].map((match) => Number(match[1])))
  return message.sources.filter((source) => cited.has(source.n))
}

function Message({ message, course, onOpenSource }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-[var(--dashboard-accent)] px-4 py-2.5 text-sm text-white">
          {message.attachments?.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {message.attachments.map((file, index) => (
                <span
                  key={index}
                  className="inline-flex max-w-full items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-xs"
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
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
        {message.content}
      </div>
    )
  }

  const sources = citedSources(message)
  const flashcards = message.mode === 'flashcards' ? extractFlashcards(message.content) : null

  return (
    <div className="max-w-[92%] space-y-2">
      <div className="rounded-2xl rounded-bl-md border border-[var(--dashboard-card-border)] bg-[var(--dashboard-card-bg)] px-4 py-3 text-sm text-[var(--dashboard-text)]">
        <Markdown
          onSourceClick={(n) => {
            const source = message.sources?.find((item) => item.n === n)
            if (source) onOpenSource(source)
          }}
        >
          {message.content}
        </Markdown>
        {message.truncated && (
          <p className="mt-2 text-xs text-[var(--dashboard-text-muted)]">
            Gli estratti sono stati limitati per dimensione: la risposta potrebbe non coprire tutto.
          </p>
        )}
      </div>

      {flashcards && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => downloadFlashcards(flashcards, course)}
          className="border-[var(--dashboard-border)] text-[var(--dashboard-text-secondary)] hover:border-[var(--dashboard-accent)] hover:text-[var(--dashboard-accent)]"
        >
          <Download className="h-4 w-4" />
          Scarica per Anki ({flashcards.length} schede)
        </Button>
      )}

      {sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sources.map((source) => (
            <button
              key={source.n}
              type="button"
              onClick={() => onOpenSource(source)}
              title="Apri il file"
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--dashboard-border)] bg-[var(--dashboard-card-bg)] px-2.5 py-1 text-xs text-[var(--dashboard-text-secondary)] transition-colors hover:border-[var(--dashboard-accent)] hover:text-[var(--dashboard-accent)]"
            >
              <FileText className="h-3 w-3 shrink-0" />
              <span className="font-semibold">F{source.n}</span>
              <span className="truncate">
                {[source.course, source.name, source.place].filter(Boolean).join(' · ')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const FIELD =
  'h-8 rounded-md border border-[var(--dashboard-border)] bg-white px-2 text-xs outline-none focus:border-[var(--dashboard-accent)]'

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
  documentId,
  onDocumentChange,
  pageFrom,
  pageTo,
  count,
  onRangeChange,
  onCountChange,
  onOpenSource,
  onReportBug,
  hasDocuments,
  attachments,
  onAttach,
  onRemoveAttachment,
}) {
  const sectionRef = useRef(null)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
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
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

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

  return (
    <section
      ref={sectionRef}
      className="order-1 flex min-h-[32rem] flex-col rounded-xl border border-[var(--dashboard-card-border)] bg-[var(--dashboard-bg)] lg:sticky lg:top-22 lg:order-2 lg:self-start"
    >
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--dashboard-card-border)] bg-[var(--dashboard-card-bg)] p-3">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onModeChange(item.id)}
            title={item.hint}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              mode === item.id
                ? 'bg-[var(--dashboard-accent)] text-white'
                : 'bg-[var(--dashboard-bg-secondary)] text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-accent)]'
            }`}
          >
            {item.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={handleReportBug}
            title="Copia chat, filtri e documenti caricati per segnalare un problema"
            className="inline-flex items-center gap-1 text-xs text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-accent)]"
          >
            {reportState === 'copied' ? <Check className="h-3.5 w-3.5" /> : <Bug className="h-3.5 w-3.5" />}
            {reportState === 'copied' ? 'Copiato!' : reportState === 'failed' ? 'Copia non riuscita' : 'Riporta bug'}
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 text-xs text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-accent)]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Nuova chat
            </button>
          )}
        </div>
      </div>

      {showDocumentOptions && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--dashboard-card-border)] bg-[var(--dashboard-card-bg)] px-3 py-2">
          <AssistantSelect
            value={documentId}
            onChange={onDocumentChange}
            options={readyDocuments.map((doc) => ({ value: doc.id, label: doc.name }))}
            allLabel={mode === 'ask' ? 'Tutti i documenti' : 'Cerca nei materiali'}
            aria-label="Documento"
            size="sm"
            className="w-auto min-w-40 max-w-64 px-2 text-xs"
          />
          {documentId && mode !== 'ask' && (
            <>
              <input
                type="number"
                min={1}
                value={pageFrom}
                onChange={(event) => onRangeChange(event.target.value, pageTo)}
                placeholder="da pag."
                aria-label="Da pagina"
                className={`${FIELD} w-20`}
              />
              <input
                type="number"
                min={1}
                value={pageTo}
                onChange={(event) => onRangeChange(pageFrom, event.target.value)}
                placeholder="a pag."
                aria-label="A pagina"
                className={`${FIELD} w-20`}
              />
            </>
          )}
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

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && !loading && (
          <div className="mx-auto mt-8 max-w-md text-center">
            <h2 className="font-serif text-2xl font-semibold text-[var(--dashboard-text)]">
              {hasDocuments ? 'Cosa vuoi ripassare oggi?' : 'Carica i tuoi materiali'}
            </h2>
            <p className="mt-2 text-sm text-[var(--dashboard-text-secondary)]">
              {hasDocuments
                ? currentMode.hint + '. Ogni risposta cita le fonti: clicca un riferimento per aprire il file alla pagina giusta.'
                : 'Nel pannello a sinistra scegli il corso e trascina slide, trascrizioni e riassunti. Poi fai le tue domande qui.'}
            </p>
            {hasDocuments && mode === 'ask' && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => onInputChange(suggestion)}
                    className="rounded-full border border-[var(--dashboard-border)] bg-[var(--dashboard-card-bg)] px-3 py-1 text-xs text-[var(--dashboard-text-secondary)] hover:border-[var(--dashboard-accent)] hover:text-[var(--dashboard-accent)]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((message) => (
          <Message key={message.id} message={message} course={course} onOpenSource={onOpenSource} />
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-[var(--dashboard-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Sto leggendo i materiali e scrivendo la risposta…
          </div>
        )}
        <div ref={bottomRef} />
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
        className={`border-t bg-[var(--dashboard-card-bg)] p-3 transition-colors ${
          dragging
            ? 'border-[var(--dashboard-accent)] bg-[var(--dashboard-bg-secondary)]'
            : 'border-[var(--dashboard-card-border)]'
        }`}
      >
        {attachments.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((item) => (
              <li
                key={item.id}
                title={item.message}
                className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
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
                <span className="shrink-0 opacity-70">
                  {item.status === 'error' ? item.message : formatBytes(item.size)}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(item.id)}
                  aria-label={`Rimuovi ${item.name}`}
                  className="shrink-0 rounded-full p-0.5 hover:bg-black/10"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-end gap-2">
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--dashboard-border)] bg-white text-[var(--dashboard-text-secondary)] transition-colors hover:border-[var(--dashboard-accent)] hover:text-[var(--dashboard-accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={2}
            maxLength={MAX_MESSAGE_CHARS}
            placeholder={PLACEHOLDERS[mode]}
            aria-label="Messaggio"
            className="min-h-[3rem] flex-1 resize-none rounded-lg border border-[var(--dashboard-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--dashboard-accent)]"
          />
          <Button
            type="submit"
            disabled={loading || uploading || !input.trim()}
            className="h-10 bg-[var(--dashboard-accent)] text-white hover:bg-[var(--dashboard-accent-hover)]"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="hidden sm:inline">Invia</span>
          </Button>
        </div>
      </form>
    </section>
  )
}
