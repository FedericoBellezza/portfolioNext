// Riferimenti alle fonti nel testo dell'assistente: [F1], ma anche [F1, F3] o [F2][F5].
// Il modello non le scrive sempre in modo uniforme, quindi si accetta ogni parentesi che inizia con F<numero>.
const CITATION = /\[(F\d+[^\]\[]*)\]/g
const FENCE = /(```[\s\S]*?```)/g

function numbersIn(inner) {
  return [...inner.matchAll(/F(\d+)/g)].map((match) => Number(match[1]))
}

export function citedNumbers(text) {
  const cited = new Set()
  for (const match of text.matchAll(CITATION)) numbersIn(match[1]).forEach((n) => cited.add(n))
  return cited
}

// Fuori dai blocchi di codice, ogni riferimento diventa uno o più link #fonte-N.
export function linkCitations(text) {
  return text
    .split(FENCE)
    .map((part) =>
      part.startsWith('```')
        ? part
        : part.replace(CITATION, (_, inner) =>
            numbersIn(inner)
              .map((n) => `[F${n}](#fonte-${n})`)
              .join(' '),
          ),
    )
    .join('')
}

// Dentro i blocchi di codice (flashcard) i riferimenti sono solo rumore.
export function stripCitationsInFences(text) {
  return text.replace(FENCE, (block) => block.replace(/[ \t]*\[F\d+[^\]\[]*\]/g, ''))
}

export function stripCitations(text) {
  return text.replace(/[ \t]*\[F\d+[^\]\[]*\]/g, '')
}
