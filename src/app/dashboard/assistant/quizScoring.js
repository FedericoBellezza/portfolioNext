import { MAX_MESSAGE_CHARS } from '@/lib/assistant/constants'

// Le domande a cui si risponde scrivendo (testo o codice) si correggono a fine quiz con il modello.
export function isWritten(question) {
  return question.type === 'open' || question.type === 'code'
}

export function isAnswered(question, answer) {
  return isWritten(question) ? Boolean(answer?.text?.trim()) : answer?.choice != null
}

// Stato di una domanda: correct | partial | wrong | skipped | pending (risposta scritta non ancora valutata).
export function statusOf(question, answer, grade) {
  if (isWritten(question)) {
    if (!answer?.text?.trim()) return 'skipped'
    return grade?.verdict ?? 'pending'
  }
  if (answer?.choice == null) return 'skipped'
  return answer.choice === question.correct ? 'correct' : 'wrong'
}

export function givenAnswerText(question, answer) {
  // Il codice conserva i rientri: niente trim() sulle righe, solo ai bordi.
  if (isWritten(question)) return answer?.text?.trim() || ''
  return answer?.choice == null ? '' : question.options[answer.choice]
}

export function correctAnswerText(question) {
  return isWritten(question) ? question.reference : question.options[question.correct]
}

// Cosa si manda al correttore per una domanda scritta: la consegna comprende l'eventuale codice da leggere.
export function gradeRequestItem(question, answer) {
  const statement = question.snippet ? `${question.question}\n\nCodice:\n${question.snippet}` : question.question
  return {
    question: statement,
    reference: question.reference,
    answer: answer.text.trim(),
    kind: question.type === 'code' ? 'code' : 'open',
    ...(question.language ? { language: question.language } : {}),
  }
}

// Le risposte aperte non ancora valutate restano fuori dal punteggio: contarle sbagliate falserebbe la percentuale.
export function computeScore(questions, answers, grades) {
  const counts = { correct: 0, partial: 0, wrong: 0, skipped: 0, pending: 0 }
  for (const question of questions) counts[statusOf(question, answers[question.id], grades[question.id])]++
  const total = questions.length - counts.pending
  const points = counts.correct + counts.partial * 0.5
  return { counts, total, points, percent: total ? Math.round((points / total) * 100) : 0 }
}

export function reviewItems(questions, answers, grades) {
  return questions.map((question, index) => ({
    question,
    number: index + 1,
    answer: answers[question.id],
    grade: grades[question.id],
    status: statusOf(question, answers[question.id], grades[question.id]),
  }))
}

const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

// Riga che finisce nella cronologia del messaggio del quiz: il server ne legge solo l'inizio, quindi va in testa e resta corta.
export function buildSummary(items, score) {
  const missed = items.filter((item) => ['wrong', 'partial', 'skipped'].includes(item.status))
  const lines = [`Risultato del quiz: ${score.percent}% (${score.counts.correct} corrette su ${score.total}).`]
  if (missed.length) {
    lines.push(
      `Da rivedere: ${missed.map((item) => `${item.number}) ${clip(item.question.question, 80)}`).join('; ')}.`,
    )
  }
  return lines.join(' ')
}

// Richiesta all'assistente per spiegare gli errori: resta dentro il limite di un messaggio.
export function buildExplainRequest(items) {
  const missed = items.filter((item) => ['wrong', 'partial', 'skipped'].includes(item.status))
  const intro = 'Spiegami meglio queste domande del quiz che ho sbagliato o lasciato in bianco, in base ai materiali:'
  const budget = MAX_MESSAGE_CHARS - intro.length - 50
  const lines = []
  let used = 0
  for (const item of missed) {
    const given = givenAnswerText(item.question, item.answer)
    const line = `${item.number}. ${clip(item.question.question, 300)}\n   La mia risposta: ${given ? clip(given, 250) : '(nessuna)'}\n   Risposta corretta: ${clip(correctAnswerText(item.question), 250)}`
    if (used + line.length > budget) break
    lines.push(line)
    used += line.length + 2
  }
  return `${intro}\n\n${lines.join('\n\n')}`
}
