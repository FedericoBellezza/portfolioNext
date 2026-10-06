import LeadsApp from './components/leads/LeadsApp'

// Autenticazione: middleware + layout di /dashboard (sessione Supabase, solo OWNER_EMAIL).
// I dati passano esclusivamente dalle API protette /api/leads, mai dal browser verso Supabase.
export default function DashboardPage() {
  return <LeadsApp />
}
