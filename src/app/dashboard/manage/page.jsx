import { createClient } from '@/lib/supabase/server'
import { getClients, getAutomations, getPricing } from '@/lib/supabase/queries'
import ClientsManager from './components/ClientsManager'
import AutomationsManager from './components/AutomationsManager'
import PricingManager from './components/PricingManager'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function ManagePage() {
  const supabase = await createClient()

  const [clients, automations, pricing] = await Promise.all([
    getClients(supabase),
    getAutomations(supabase),
    getPricing(supabase),
  ])

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-accent)] transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-semibold text-[var(--dashboard-text)]">
            Gestione
          </h1>
          <p className="text-[var(--dashboard-text-secondary)] mt-1">
            Gestisci clienti, automazioni e prezzi
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClientsManager clients={clients} />
        <AutomationsManager automations={automations} />
      </div>

      <PricingManager pricing={pricing} clients={clients} automations={automations} />
    </div>
  )
}
