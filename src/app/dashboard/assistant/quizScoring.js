import { MAX_MESSAGE_CHARS } from '@/lib/assistant/constants'

// Stato di una domanda: correct | partial | wrong | skipped | pending (risposta aperta non ancora valutata).
export function statusOf(question, answer, grade) {
  if (question.type === 'open') {
    if (!answer?.text?.trim()) return 'skipped'
    return grade?.verdict ?? 'pending'
  }
  if (answer?.choice == null) return 'skipped'
  return answer.choice === question.correct ? 'correct' : 'wrong'
}

export function givenAnswerText(question, answer) {
  if (question.type === 'open') return answer?.text?.trim() || ''
  return answer?.choice == null ? '' : question.options[answer.choice]
}

export function correctAnswerText(question) {
  return question.type === 'open' ? question.reference : question.options[question.correct]
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
