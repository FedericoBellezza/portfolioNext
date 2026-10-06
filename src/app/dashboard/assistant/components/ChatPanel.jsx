'use client'

import { useEffect, useRef, useState } from 'react'
import { Bug, Check, Download, FileText, Loader2, RotateCcw, Send } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { MAX_MESSAGE_CHARS, MODES } from '@/lib/assistant/constants'
import Markdown from './Markdown'

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
}) {
  const bottomRef = useRef(null)
  const [reportState, setReportState] = useState('idle')

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

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      onSend()
    }
  }

  return (
    <section className="order-1 flex min-h-[32rem] flex-col rounded-xl border border-[var(--dashboard-card-border)] bg-[var(--dashboard-bg)] lg:order-2 lg:h-[calc(100dvh-14rem)]">
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
          <select
            value={documentId}
            onChange={(event) => onDocumentChange(event.target.value)}
            aria-label="Documento"
            className={`${FIELD} max-w-[16rem]`}
          >
            <option value="">{mode === 'ask' ? 'Tutti i documenti' : 'Cerca nei materiali'}</option>
            {readyDocuments.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name}
              </option>
            ))}
          </select>
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
        className="flex items-end gap-2 border-t border-[var(--dashboard-card-border)] bg-[var(--dashboard-card-bg)] p-3"
      >
        <textarea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          maxLength={MAX_MESSAGE_CHARS}
          placeholder={PLACEHOLDERS[mode]}
          aria-label="Messaggio"
          className="min-h-[3rem] flex-1 resize-none rounded-lg border border-[var(--dashboard-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--dashboard-accent)]"
        />
        <Button
          type="submit"
          disabled={loading || !input.trim()}
          className="h-10 bg-[var(--dashboard-accent)] text-white hover:bg-[var(--dashboard-accent-hover)]"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span className="hidden sm:inline">Invia</span>
        </Button>
      </form>
    </section>
  )
}
