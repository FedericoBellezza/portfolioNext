import CopyBotApp from './CopyBotApp'

export const metadata = {
  title: 'Copy Bot | Dashboard',
  description: 'Secondo bot di paper trading: copia un fondo (13F) e le operazioni dichiarate dal Congresso USA',
  robots: { index: false, follow: false },
}

// Autenticazione: middleware + layout di /dashboard (solo OWNER_EMAIL).
// I comandi passano da /api/copybot (protectedRoute) → stesso webhook n8n del Trader AI → SSH sul server.
export default function CopyBotPage() {
  return <CopyBotApp />
}
