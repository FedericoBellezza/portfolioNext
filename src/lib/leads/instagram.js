// Estrae gli handle Instagram da testo incollato (link, @handle, handle nudi).
// Nessuna chiamata a Instagram: è solo parsing di testo. Usato sia dal server (fonte di
// verità) sia dal client (solo per l'anteprima del conteggio).

const HOSTS = new Set(['instagram.com', 'instagr.am', 'ig.me'])

// Primo segmento di percorso → motivo del rifiuto. Qualsiasi altro valore è un profilo.
const NOT_A_PROFILE = {
  p: 'Link a un post, non a un profilo',
  tv: 'Link a un video IGTV, non a un profilo',
  reel: 'Link a un reel, non a un profilo',
  reels: 'Link ai reel, non a un profilo',
  stories: 'Link a una storia, non a un profilo',
  story: 'Link a una storia, non a un profilo',
  explore: 'Pagina Esplora, non un profilo',
  accounts: 'Pagina account/accesso, non un profilo',
}
const OTHER_PAGES = new Set([
  'direct', 'about', 'legal', 'developer', 'directory', 'web', 'privacy', 'terms',
  'help', 'press', 'api', 'challenge', 'oauth', 'login', 'ar', 'audio',
  'locations', 'tags', 'shop', 'share', 'invites',
])

const SEPARATORS = /[\s,;]+/

/** @returns {string|null} motivo dell'invalidità, null se l'handle è valido */
function handleProblem(h) {
  if (!h) return 'Handle vuoto'
  if (h.length > 30) return 'Handle troppo lungo (max 30 caratteri)'
  if (!/^[a-z0-9._]+$/.test(h)) {
    return 'Handle non valido: ammessi solo lettere, numeri, punto e underscore'
  }
  if (h.startsWith('.') || h.endsWith('.')) return 'Handle non valido: non può iniziare o finire con un punto'
  if (h.includes('..')) return 'Handle non valido: non può avere due punti consecutivi'
  return null
}

/**
 * @param {string} raw una singola voce (senza spazi)
 * @returns {{ok: true, handle: string} | {ok: false, reason: string}}
 */
export function parseInstagramHandle(raw) {
  // via apici, parentesi e punteggiatura finale attorno al link incollato
  const s = String(raw ?? '')
    .trim()
    .replace(/^[<("'“‘[]+|[>)"'”’\]]+$/g, '')
  if (!s) return { ok: false, reason: 'Voce vuota' }

  let candidate

  if (/[/?#]/.test(s) || /^[a-z][a-z0-9+.-]*:\/\//i.test(s)) {
    // sembra un URL (ha slash, query o hash, oppure uno schema)
    let url
    try {
      const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(s)
        ? s
        : s.startsWith('//')
          ? `https:${s}`
          : `https://${s}`
      url = new URL(withScheme)
    } catch {
      return { ok: false, reason: 'URL non valido' }
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return { ok: false, reason: 'URL non valido' }
    }
    const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '')
    if (!HOSTS.has(host)) {
      return { ok: false, reason: 'Non è un link Instagram' }
    }
    const segments = url.pathname.split('/').filter(Boolean)
    if (segments.length === 0) {
      return { ok: false, reason: 'Il link non contiene un profilo' }
    }
    const first = segments[0].toLowerCase()
    // aperture app: instagram.com/_u/handle, ig.me/m/handle
    if ((first === '_u' || first === 'm') && segments[1]) {
      candidate = segments[1]
    } else if (NOT_A_PROFILE[first]) {
      return { ok: false, reason: NOT_A_PROFILE[first] }
    } else if (OTHER_PAGES.has(first)) {
      return { ok: false, reason: 'Pagina di Instagram che non è un profilo' }
    } else {
      candidate = segments[0]
    }
    try {
      candidate = decodeURIComponent(candidate)
    } catch {
      return { ok: false, reason: 'URL non valido' }
    }
  } else {
    candidate = s
  }

  const handle = candidate.replace(/^@+/, '').toLowerCase()
  const problem = handleProblem(handle)
  if (problem) return { ok: false, reason: problem }
  return { ok: true, handle }
}

/**
 * Divide il testo su spazi, a capo, virgole e punto e virgola (anche mescolati),
 * ignora le voci vuote e rimuove i duplicati.
 * @param {string} text
 * @returns {{handles: string[], invalid: {input: string, reason: string}[]}}
 */
export function parseInstagramInput(text) {
  const handles = []
  const seen = new Set()
  const invalid = []
  const seenInvalid = new Set()

  for (const token of String(text ?? '').split(SEPARATORS)) {
    if (!token) continue
    const res = parseInstagramHandle(token)
    if (res.ok) {
      if (!seen.has(res.handle)) {
        seen.add(res.handle)
        handles.push(res.handle)
      }
    } else if (!seenInvalid.has(token)) {
      seenInvalid.add(token)
      invalid.push({ input: token.slice(0, 200), reason: res.reason })
    }
  }
  return { handles, invalid }
}
