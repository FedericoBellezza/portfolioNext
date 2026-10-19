'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Flag,
  ListChecks,
  Loader2,
  MessageSquareText,
  Minus,
  RotateCcw,
  X,
} from 'lucide-react'
import { QUIZ_GRADE_BATCH_SIZE } from '@/lib/assistant/constants'
import {
  buildExplainRequest,
  buildSummary,
  computeScore,
  correctAnswerText,
  gradeRequestItem,
  givenAnswerText,
  isAnswered,
  isWritten,
  reviewItems,
} from '../quizScoring'

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-white'

const LETTERS = 'ABCDEF'
const OPEN_ANSWER_MAX = 3000
const CODE_ANSWER_MAX = 6000
const INDENT = '  '

const TYPE_LABELS = {
  choice: 'Scelta multipla',
  truefalse: 'Vero o falso',
  open: 'Risposta aperta',
  code: 'Esercizio di codice',
}

const STATUS = {
  correct: { label: 'Corretta', icon: Check, badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
  partial: { label: 'Parziale', icon: Minus, badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-400' },
  wrong: { label: 'Sbagliata', icon: X, badge: 'bg-red-100 text-red-700', bar: 'bg-red-500' },
  skipped: { label: 'Senza risposta', icon: Minus, badge: 'bg-stone-200 text-stone-600', bar: 'bg-stone-300' },
  pending: { label: 'Non valutata', icon: AlertTriangle, badge: 'bg-stone-200 text-stone-600', bar: 'bg-stone-200' },
}

const BUTTON =
  'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'
const PRIMARY = `${BUTTON} bg-[var(--dashboard-accent)] text-white hover:bg-[var(--dashboard-accent-hover)] ${FOCUS_RING}`
const SECONDARY = `${BUTTON} border border-[var(--dashboard-border)] bg-white text-[var(--dashboard-text-secondary)] hover:border-[var(--dashboard-accent)] hover:text-[var(--dashboard-accent)] ${FOCUS_RING}`

const CODE_BOX =
  'overflow-x-auto rounded-lg bg-[var(--dashboard-bg-secondary)] p-3 font-mono text-[13px] leading-relaxed text-[var(--dashboard-text)]'

function verdictFor(percent) {
  if (percent >= 80) return 'Ottimo lavoro'
  if (percent >= 60) return 'Buon livello, rivedi gli errori'
  return 'Da ripassare'
}

function Snippet({ code, language }) {
  return (
    <div className="mt-3">
      {language && (
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--dashboard-text-muted)]">
          {language}
        </p>
      )}
      <pre className={CODE_BOX}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

function AnswerBlock({ label, text, code = false, tone = 'text-[var(--dashboard-text-muted)]' }) {
  return (
    <div>
      <p className={`text-xs font-medium uppercase tracking-wide ${tone}`}>{label}</p>
      {!text ? (
        <p className="mt-0.5 italic text-[var(--dashboard-text-muted)]">Nessuna risposta</p>
      ) : code ? (
        <pre className={`mt-1 ${CODE_BOX}`}>
          <code>{text}</code>
        </pre>
      ) : (
        <p className="mt-0.5 whitespace-pre-wrap break-words leading-relaxed">{text}</p>
      )}
    </div>
  )
}

/**
 * quiz: { questions, expected, pending, error }. Un quiz lungo arriva a blocchi: finché `pending` è vero
 * `questions` continua a crescere fino a `expected`.
 */
export default function QuizPlayer({ quiz, busy = false, onOpenSource, onFinish, onAsk, onRetryLoad }) {
  // Un nuovo giro ("Rifai gli errori") lavora su un sottoinsieme; null = tutte le domande del quiz.
  const [subset, setSubset] = useState(null)
  const [phase, setPhase] = useState('play') // play | grading | results
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [grades, setGrades] = useState({})
  const [gradeError, setGradeError] = useState(null)
  const [filter, setFilter] = useState('all')
  const cardRef = useRef(null)

  const questions = subset ?? quiz.questions
  const loadingMore = !subset && quiz.pending
  const loadError = !subset && !quiz.pending ? quiz.error : null
  const total = loadingMore ? Math.max(quiz.expected, questions.length) : questions.length

  const question = questions[Math.min(index, questions.length - 1)]
  const answer = answers[question.id]
  const answered = questions.filter((item) => isAnswered(item, answers[item.id])).length

  const items = useMemo(() => reviewItems(questions, answers, grades), [questions, answers, grades])
  const score = useMemo(() => computeScore(questions, answers, grades), [questions, answers, grades])
  const toReview = items.filter((item) => ['wrong', 'partial', 'skipped'].includes(item.status))

  // Mostrando i risultati la card riparte dall'alto della chat invece di restare in fondo alla lista.
  useEffect(() => {
    if (phase !== 'results') return
    const card = cardRef.current
    const scroller = card?.closest('[role="log"]')
    if (!card || !scroller) return
    const offset = card.getBoundingClientRect().top - scroller.getBoundingClientRect().top
    scroller.scrollTo({ top: scroller.scrollTop + offset - 16, behavior: 'smooth' })
  }, [phase])

  function setChoice(choice) {
    setAnswers((current) => ({ ...current, [question.id]: { choice } }))
  }

  function setText(text) {
    setAnswers((current) => ({ ...current, [question.id]: { text } }))
  }

  // Nel campo di codice Tab inserisce un rientro; Maiusc+Tab ed Esc lasciano uscire dal campo (tastiera e screen reader).
  function handleCodeKeyDown(event) {
    if (event.key === 'Escape') {
      event.currentTarget.blur()
      return
    }
    if (event.key !== 'Tab' || event.shiftKey) return
    event.preventDefault()
    const area = event.currentTarget
    const { selectionStart, selectionEnd, value } = area
    setText(`${value.slice(0, selectionStart)}${INDENT}${value.slice(selectionEnd)}`)
    requestAnimationFrame(() => area.setSelectionRange(selectionStart + INDENT.length, selectionStart + INDENT.length))
  }

  // Le risposte scritte non ancora valutate si mandano al correttore a gruppi: una sola richiesta per tutte
  // non starebbe nel minuto di una singola generazione. Quel che è già stato valutato si tiene anche se un gruppo fallisce.
  async function gradeWrittenAnswers() {
    const pending = questions.filter((item) => isWritten(item) && answers[item.id]?.text?.trim() && !grades[item.id])
    const next = { ...grades }
    let failure = null

    for (let start = 0; start < pending.length; start += QUIZ_GRADE_BATCH_SIZE) {
      const group = pending.slice(start, start + QUIZ_GRADE_BATCH_SIZE)
      try {
        const response = await fetch('/api/assistant/quiz/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: group.map((item) => gradeRequestItem(item, answers[item.id])) }),
        })
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.ok) throw new Error(data?.error ?? `Errore ${response.status}`)
        group.forEach((item, position) => {
          if (data.grades[position]) next[item.id] = data.grades[position]
        })
      } catch (error) {
        failure = error.message
        break
      }
    }
    return { grades: next, failure }
  }

  async function finish() {
    setGradeError(null)
    setPhase('grading')
    const result = await gradeWrittenAnswers()
    setGrades(result.grades)
    setGradeError(result.failure)
    setPhase('results')
    const finalItems = reviewItems(questions, answers, result.grades)
    onFinish?.(buildSummary(finalItems, computeScore(questions, answers, result.grades)))
  }

  function startRound(list) {
    setSubset(list)
    setAnswers({})
    setGrades({})
    setGradeError(null)
    setFilter('all')
    setIndex(0)
    setPhase('play')
  }

  if (phase === 'grading') {
    const writtenCount = questions.filter((item) => isWritten(item) && answers[item.id]?.text?.trim()).length
    return (
      <div
        ref={cardRef}
        role="status"
        className="flex items-center gap-3 rounded-2xl border border-[var(--dashboard-card-border)] bg-[var(--dashboard-card-bg)] px-4 py-6 text-sm text-[var(--dashboard-text-secondary)]"
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--dashboard-accent)]" />
        Sto correggendo {writtenCount === 1 ? 'la tua risposta scritta' : `le tue ${writtenCount} risposte scritte`}…
      </div>
    )
  }

  if (phase === 'results') {
    const shown = filter === 'review' ? toReview : items
    return (
      <div ref={cardRef} className="space-y-4">
        <div className="rounded-2xl border border-[var(--dashboard-card-border)] bg-[var(--dashboard-card-bg)] p-4 shadow-[0_1px_2px_rgba(120,80,60,0.05)] sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--dashboard-text-muted)]">
                Risultato del quiz
              </p>
              <p className="mt-1 font-serif text-5xl font-semibold tabular-nums tracking-tight text-[var(--dashboard-text)]">
                {score.percent}%
              </p>
            </div>
            <p className="pb-1 text-sm text-[var(--dashboard-text-secondary)]">
              <span className="font-medium text-[var(--dashboard-text)]">{verdictFor(score.percent)}</span>
              <span className="tabular-nums">
                {' · '}
                {score.counts.correct} corrette su {score.total}
              </span>
            </p>
          </div>

          <div
            role="img"
            aria-label={`${score.counts.correct} corrette, ${score.counts.partial} parziali, ${score.counts.wrong} sbagliate, ${score.counts.skipped} senza risposta`}
            className="mt-4 flex h-2 overflow-hidden rounded-full bg-[var(--dashboard-bg-secondary)]"
          >
            {['correct', 'partial', 'wrong', 'skipped'].map((key) =>
              score.counts[key] ? (
                <span
                  key={key}
                  className={STATUS[key].bar}
                  style={{ width: `${(score.counts[key] / questions.length) * 100}%` }}
                />
              ) : null,
            )}
          </div>
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--dashboard-text-secondary)]">
            {['correct', 'partial', 'wrong', 'skipped'].map((key) =>
              score.counts[key] ? (
                <li key={key} className="flex items-center gap-1.5 tabular-nums">
                  <span aria-hidden className={`h-2 w-2 rounded-full ${STATUS[key].bar}`} />
                  {score.counts[key]} {STATUS[key].label.toLowerCase()}
                </li>
              ) : null,
            )}
          </ul>

          {gradeError && (
            <div
              role="alert"
              className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              <span>
                {score.counts.pending}{' '}
                {score.counts.pending === 1 ? 'risposta scritta non è stata valutata' : 'risposte scritte non sono state valutate'}{' '}
                e {score.counts.pending === 1 ? 'resta fuori' : 'restano fuori'} dal punteggio ({gradeError}).
              </span>
              <button type="button" onClick={finish} className={`${SECONDARY} px-2.5 py-1 text-xs`}>
                <RotateCcw className="h-3.5 w-3.5" />
                Riprova
              </button>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {toReview.length > 0 && (
              <button type="button" onClick={() => startRound(toReview.map((item) => item.question))} className={PRIMARY}>
                <RotateCcw className="h-4 w-4" />
                Rifai gli errori ({toReview.length})
              </button>
            )}
            <button type="button" onClick={() => startRound(null)} className={toReview.length > 0 ? SECONDARY : PRIMARY}>
              <ListChecks className="h-4 w-4" />
              Rifai tutto il quiz
            </button>
            {toReview.length > 0 && onAsk && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onAsk(buildExplainRequest(items))}
                className={SECONDARY}
              >
                <MessageSquareText className="h-4 w-4" />
                Spiegami gli errori
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1" role="tablist" aria-label="Domande da mostrare">
          {[
            ['all', `Tutte (${items.length})`],
            ['review', `Da rivedere (${toReview.length})`],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              onClick={() => setFilter(id)}
              className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${FOCUS_RING} ${
                filter === id
                  ? 'bg-[var(--dashboard-accent)]/10 text-[var(--dashboard-accent)]'
                  : 'text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {shown.length === 0 && (
          <p className="rounded-xl border border-dashed border-[var(--dashboard-border)] px-4 py-6 text-center text-sm text-[var(--dashboard-text-muted)]">
            Nessun errore: hai risposto bene a tutto.
          </p>
        )}

        <ol className="space-y-3">
          {shown.map((item) => {
            const status = STATUS[item.status]
            const StatusIcon = status.icon
            const given = givenAnswerText(item.question, item.answer)
            const source = item.question.sourceInfo
            const written = isWritten(item.question)
            const isCode = item.question.type === 'code'
            return (
              <li
                key={item.question.id}
                className="rounded-xl border border-[var(--dashboard-card-border)] bg-[var(--dashboard-card-bg)] p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${status.badge}`}
                    title={status.label}
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    <span className="sr-only">{status.label}</span>
                  </span>
                  <div className="min-w-0 flex-1 space-y-2.5 text-sm text-[var(--dashboard-text)]">
                    <div>
                      <p className="whitespace-pre-wrap break-words font-medium leading-relaxed">
                        <span className="tabular-nums text-[var(--dashboard-text-muted)]">{item.number}.</span>{' '}
                        {item.question.question}
                      </p>
                      {item.question.snippet && <Snippet code={item.question.snippet} language={item.question.language} />}
                    </div>

                    <div className="space-y-2">
                      <AnswerBlock label="La tua risposta" text={given} code={isCode} />
                      {(item.status !== 'correct' || written) && (
                        <AnswerBlock
                          label={written ? 'Soluzione di riferimento' : 'Risposta corretta'}
                          text={correctAnswerText(item.question)}
                          code={isCode}
                          tone="text-emerald-700"
                        />
                      )}
                    </div>

                    {item.grade?.feedback && (
                      <p className="whitespace-pre-wrap break-words rounded-lg bg-[var(--dashboard-bg-secondary)] px-3 py-2 leading-relaxed">
                        <span className="font-medium">{status.label}.</span> {item.grade.feedback}
                      </p>
                    )}
                    {item.question.explanation && (
                      <p className="whitespace-pre-wrap break-words leading-relaxed text-[var(--dashboard-text-secondary)]">
                        {item.question.explanation}
                      </p>
                    )}
                    {source && (
                      <button
                        type="button"
                        onClick={() => onOpenSource?.(source)}
                        title="Apri il file"
                        className={`inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md border border-[var(--dashboard-border)] bg-white px-2 py-1 text-xs text-[var(--dashboard-text-secondary)] transition-colors hover:border-[var(--dashboard-accent)] hover:text-[var(--dashboard-accent)] active:scale-[0.98] ${FOCUS_RING}`}
                      >
                        <FileText className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {[source.course, source.name, source.place].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    )
  }

  const isLastLoaded = index >= questions.length - 1
  const unanswered = questions.length - answered
  const progress = ((index + 1) / total) * 100

  return (
    <div
      ref={cardRef}
      className="rounded-2xl border border-[var(--dashboard-card-border)] bg-[var(--dashboard-card-bg)] p-4 shadow-[0_1px_2px_rgba(120,80,60,0.05)] sm:p-5"
    >
      <div className="flex items-center justify-between gap-3 text-xs text-[var(--dashboard-text-muted)]">
        <span className="font-medium tabular-nums">
          Domanda {index + 1} di {total}
        </span>
        <span>{TYPE_LABELS[question.type]}</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={index + 1}
        aria-label="Avanzamento del quiz"
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--dashboard-bg-secondary)]"
      >
        <div
          className="h-full rounded-full bg-[var(--dashboard-accent)] transition-all duration-300 motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* key: ogni domanda riparte da una casella e da uno stato di focus puliti */}
      <div key={question.id} className="mt-5 animate-in fade-in duration-200 motion-reduce:animate-none">
        <p className="whitespace-pre-wrap break-words font-serif text-lg font-semibold leading-snug text-[var(--dashboard-text)]">
          {question.question}
        </p>
        {question.snippet && <Snippet code={question.snippet} language={question.language} />}

        {question.type === 'code' ? (
          <div className="mt-4">
            <textarea
              value={answer?.text ?? ''}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={handleCodeKeyDown}
              rows={9}
              maxLength={CODE_ANSWER_MAX}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              wrap="off"
              placeholder={`Scrivi il codice${question.language ? ` (${question.language})` : ''}…`}
              aria-label="Il tuo codice"
              className="block w-full resize-y overflow-x-auto rounded-xl border border-[var(--dashboard-border)] bg-white px-3.5 py-3 font-mono text-[13px] leading-relaxed text-[var(--dashboard-text)] outline-none transition-colors placeholder:text-[var(--dashboard-text-muted)] focus:border-[var(--dashboard-accent)] focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]/25"
            />
            <p className="mt-1 text-xs text-[var(--dashboard-text-muted)]">
              Il codice non viene eseguito: lo corregge l&apos;assistente alla fine, confrontandolo con una soluzione
              modello. Tab inserisce un rientro, Esc esce dal campo.
            </p>
          </div>
        ) : question.type === 'open' ? (
          <div className="mt-4">
            <textarea
              value={answer?.text ?? ''}
              onChange={(event) => setText(event.target.value)}
              rows={4}
              maxLength={OPEN_ANSWER_MAX}
              placeholder="Scrivi la tua risposta…"
              aria-label="La tua risposta"
              className="block w-full resize-y rounded-xl border border-[var(--dashboard-border)] bg-white px-3.5 py-3 text-[15px] leading-relaxed text-[var(--dashboard-text)] outline-none transition-colors placeholder:text-[var(--dashboard-text-muted)] focus:border-[var(--dashboard-accent)] focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]/25"
            />
            <p className="mt-1 text-xs text-[var(--dashboard-text-muted)]">
              Verrà corretta alla fine, insieme alle altre risposte scritte.
            </p>
          </div>
        ) : (
          <div role="radiogroup" aria-label="Opzioni di risposta" className="mt-4 space-y-2">
            {question.options.map((option, optionIndex) => {
              const selected = answer?.choice === optionIndex
              return (
                <button
                  key={optionIndex}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setChoice(optionIndex)}
                  className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-[15px] leading-relaxed transition-all active:scale-[0.995] ${FOCUS_RING} ${
                    selected
                      ? 'border-[var(--dashboard-accent)] bg-[var(--dashboard-accent)]/8 text-[var(--dashboard-text)]'
                      : 'border-[var(--dashboard-border)] bg-white text-[var(--dashboard-text-secondary)] hover:border-[var(--dashboard-accent-light)] hover:text-[var(--dashboard-text)]'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                      selected
                        ? 'bg-[var(--dashboard-accent)] text-white'
                        : 'bg-[var(--dashboard-bg-secondary)] text-[var(--dashboard-text-secondary)]'
                    }`}
                  >
                    {LETTERS[optionIndex]}
                  </span>
                  <span className="min-w-0 break-words">{option}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {isLastLoaded && loadError && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          <span>
            Non sono riuscito a generare le altre domande: il quiz si ferma a {questions.length} su {quiz.expected} ({loadError}).
          </span>
          {onRetryLoad && (
            <button type="button" onClick={onRetryLoad} className={`${SECONDARY} px-2.5 py-1 text-xs`}>
              <RotateCcw className="h-3.5 w-3.5" />
              Riprova
            </button>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIndex((current) => current - 1)}
          disabled={index === 0}
          className={SECONDARY}
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </button>

        <div className="flex items-center gap-2">
          {isLastLoaded && !loadingMore && unanswered > 0 && (
            <span className="hidden text-xs text-[var(--dashboard-text-muted)] sm:inline">
              {unanswered} senza risposta
            </span>
          )}
          {!isLastLoaded ? (
            <button type="button" onClick={() => setIndex((current) => current + 1)} className={PRIMARY}>
              {isAnswered(question, answer) ? 'Avanti' : 'Salta'}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : loadingMore ? (
            <button type="button" disabled className={PRIMARY}>
              <Loader2 className="h-4 w-4 animate-spin" />
              Genero altre domande…
            </button>
          ) : (
            <button type="button" onClick={finish} className={PRIMARY}>
              <Flag className="h-4 w-4" />
              Termina il quiz
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
