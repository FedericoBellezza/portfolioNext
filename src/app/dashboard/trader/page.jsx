import TraderApp from './TraderApp'

export const metadata = {
  title: 'Trader AI | Dashboard',
  description: 'Stato, previsioni e comandi del bot di paper trading',
  robots: { index: false, follow: false },
}

// Autenticazione: middleware + layout di /dashboard (solo OWNER_EMAIL).
// I comandi passano da /api/trader (protectedRoute) → webhook n8n → SSH sul server Hetzner.
export default function TraderPage() {
  return <TraderApp />
}
