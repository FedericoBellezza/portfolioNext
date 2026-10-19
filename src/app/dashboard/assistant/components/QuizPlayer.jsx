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
import {
  buildExplainRequest,
  buildSummary,
  computeScore,
  correctAnswerText,
  givenAnswerText,
  reviewItems,
} from '../quizScoring'

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-white'

const LETTERS = 'ABCDEF'
const OPEN_ANSWER_MAX = 3000

const TYPE_LABELS = { choice: 'Scelta multipla', truefalse: 'Vero o falso', open: 'Risposta aperta' }

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

function verdictFor(percent) {
  if (percent >= 80) return 'Ottimo lavoro'
  if (percent >= 60) return 'Buon livello, rivedi gli errori'
  return 'Da ripassare'
}

export default function QuizPlayer({ quiz, sources = [], busy = false, onOpenSource, onFinish, onAsk }) {
  const [questions, setQuestions] = useState(quiz.questions)
  const [phase, setPhase] = useState('play') // play | grading | results
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [grades, setGrades] = useState({})
  const [gradeError, setGradeError] = useState(null)
  const [filter, setFilter] = useState('all')
  const cardRef = useRef(null)

  const question = questions[index]
  const answer = answers[question.id]
  const answered = questions.filter((item) => {
    const given = answers[item.id]
    return item.type === 'open' ? Boolean(given?.text?.trim()) : given?.choice != null
  }).length

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

  // Le risposte aperte non ancora valutate (e non vuote) si mandano al correttore in un'unica richiesta.
  async function gradeOpenAnswers() {
    const pending = questions.filter((item) => item.type === 'open' && answers[item.id]?.text?.trim() && !grades[item.id])
    if (!pending.length) return grades

    const response = await fetch('/api/assistant/quiz/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: pending.map((item) => ({
          question: item.question,
          reference: item.reference,
          answer: answers[item.id].text.trim(),
        })),
      }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.ok) throw new Error(data?.error ?? `Errore ${response.status}`)

    const next = { ...grades }
    pending.forEach((item, position) => {
      if (data.grades[position]) next[item.id] = data.grades[position]
    })
    return next
  }

  async function finish() {
    setGradeError(null)
    setPhase('grading')
    let finalGrades = grades
    try {
      finalGrades = await gradeOpenAnswers()
      setGrades(finalGrades)
    } catch (error) {
      setGradeError(error.message)
    }
    setPhase('results')
    const finalItems = reviewItems(questions, answers, finalGrades)
    onFinish?.(buildSummary(finalItems, computeScore(questions, answers, finalGrades)))
  }

  function startRound(subset) {
    setQuestions(subset)
    setAnswers({})
    setGrades({})
    setGradeError(null)
    setFilter('all')
    setIndex(0)
    setPhase('play')
  }

  const sourceFor = (item) => (item.source ? sources.find((source) => source.n === item.source) : null)

  if (phase === 'grading') {
    return (
      <div
        ref={cardRef}
        role="status"
        className="flex items-center gap-3 rounded-2xl border border-[var(--dashboard-card-border)] bg-[var(--dashboard-card-bg)] px-4 py-6 text-sm text-[var(--dashboard-text-secondary)]"
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--dashboard-accent)]" />
        Sto correggendo le tue risposte aperte…
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
                {score.counts.pending} {score.counts.pending === 1 ? 'risposta aperta non è stata valutata' : 'risposte aperte non sono state valutate'}{' '}
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
            <button
              type="button"
              onClick={() => startRound(quiz.questions)}
              className={toReview.length > 0 ? SECONDARY : PRIMARY}
            >
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
            const source = sourceFor(item.question)
            const isOpen = item.question.type === 'open'
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
                    <p className="whitespace-pre-wrap break-words font-medium leading-relaxed">
                      <span className="tabular-nums text-[var(--dashboard-text-muted)]">{item.number}.</span>{' '}
                      {item.question.question}
                    </p>

                    <div className="space-y-1.5">
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        <span className="text-xs font-medium uppercase tracking-wide text-[var(--dashboard-text-muted)]">
                          La tua risposta
                        </span>
                        <br />
                        {given || <span className="italic text-[var(--dashboard-text-muted)]">Nessuna risposta</span>}
                      </p>
                      {(item.status !== 'correct' || isOpen) && (
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          <span className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                            {isOpen ? 'Risposta di riferimento' : 'Risposta corretta'}
                          </span>
                          <br />
                          {correctAnswerText(item.question)}
                        </p>
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
                        <span className="font-semibold tabular-nums">F{source.n}</span>
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

  const isLast = index === questions.length - 1
  const unanswered = questions.length - answered
  const progress = ((index + 1) / questions.length) * 100

  return (
    <div
      ref={cardRef}
      className="rounded-2xl border border-[var(--dashboard-card-border)] bg-[var(--dashboard-card-bg)] p-4 shadow-[0_1px_2px_rgba(120,80,60,0.05)] sm:p-5"
    >
      <div className="flex items-center justify-between gap-3 text-xs text-[var(--dashboard-text-muted)]">
        <span className="font-medium tabular-nums">
          Domanda {index + 1} di {questions.length}
        </span>
        <span>{TYPE_LABELS[question.type]}</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={questions.length}
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

        {question.type === 'open' ? (
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
              Verrà corretta alla fine, insieme alle altre risposte aperte.
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
          {isLast && unanswered > 0 && (
            <span className="hidden text-xs text-[var(--dashboard-text-muted)] sm:inline">
              {unanswered} senza risposta
            </span>
          )}
          {isLast ? (
            <button type="button" onClick={finish} className={PRIMARY}>
              <Flag className="h-4 w-4" />
              Termina il quiz
            </button>
          ) : (
            <button type="button" onClick={() => setIndex((current) => current + 1)} className={PRIMARY}>
              {answer?.choice != null || answer?.text?.trim() ? 'Avanti' : 'Salta'}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
