// Chi può entrare nella dashboard privata e dove. Usato da middleware, layout, route API e server action:
// nessuna dipendenza, gira anche nell'Edge runtime del middleware.
//
// - owner (OWNER_EMAIL): tutta la dashboard.
// - fiscale: solo la sezione Fiscale (/dashboard/fiscale e /api/fiscale), con i propri dati
//   (il database separa già tutto per utente con RLS). L'account si crea in Supabase → Authentication.

const DEFAULT_OWNER_EMAIL = 'federico.bellezza.dev@gmail.com'

/**
 * Utenti della sola sezione Fiscale. Per cambiare l'email basta modificarla qui;
 * altre si possono aggiungere senza toccare il codice con FISCALE_USER_EMAILS (separate da virgola).
 */
const FISCALE_USERS = [
  'gabriele.bellezza1999@gmail.com', // Gabriele, fratello: partita IVA forfettaria propria
]

export const FISCALE_HOME = '/dashboard/fiscale'

const normalize = (email) => String(email ?? '').trim().toLowerCase()

export function ownerEmail() {
  return normalize(process.env.OWNER_EMAIL || DEFAULT_OWNER_EMAIL)
}

export function fiscaleEmails() {
  const extra = String(process.env.FISCALE_USER_EMAILS ?? '')
    .split(',')
    .map(normalize)
    .filter(Boolean)
  return [...new Set([...FISCALE_USERS.map(normalize), ...extra])]
}

/** 'owner', 'fiscale' or null (no access to the dashboard). */
export function accessOf(email) {
  const e = normalize(email)
  if (!e) return null
  if (e === ownerEmail()) return 'owner'
  if (fiscaleEmails().includes(e)) return 'fiscale'
  return null
}

/** Whether a page or API path is open to that kind of user. */
export function canAccessPath(access, pathname) {
  if (access === 'owner') return true
  if (access !== 'fiscale') return false
  const p = String(pathname ?? '')
  return [FISCALE_HOME, '/api/fiscale'].some((base) => p === base || p.startsWith(`${base}/`))
}

/** Where a user lands after login or when opening a page that is not theirs. */
export function homeOf(access) {
  return access === 'owner' ? '/dashboard' : FISCALE_HOME
}
