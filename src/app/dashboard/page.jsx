import { createClient } from '@/lib/supabase/server'
import { getEarningsData, aggregateByCompany, aggregateByAutomation, buildDateFilter } from '@/lib/supabase/queries'
import StatsCard from './components/StatsCard'
import EarningsChart from './components/EarningsChart'
import ClientBreakdown from './components/ClientBreakdown'
import AutomationBreakdown from './components/AutomationBreakdown'
import PeriodFilter from './components/PeriodFilter'

export default async function DashboardPage({ searchParams }) {
  const supabase = await createClient()
  const params = await searchParams

  // Get date filter from search params
  const { period, year, month } = params
  const dateFilter = buildDateFilter(period, year, month)

  // Fetch all earnings data
  let earningsData = []
  let error = null

  try {
    earningsData = await getEarningsData(supabase, dateFilter)
  } catch (e) {
    console.error('Error fetching earnings data:', e)
    error = e.message
  }

  // Calculate aggregations
  const totalEarnings = earningsData.reduce((sum, item) => sum + item.totalEarnings, 0)
  const totalExecutions = earningsData.reduce((sum, item) => sum + item.executionCount, 0)
  const byCompany = aggregateByCompany(earningsData)
  const byAutomation = aggregateByAutomation(earningsData)

  // Calculate average per execution
  const avgPerExecution = totalExecutions > 0 ? totalEarnings / totalExecutions : 0

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-semibold text-[var(--dashboard-text)]">
            Panoramica Guadagni
          </h1>
          <p className="text-[var(--dashboard-text-secondary)] mt-1">
            {period === 'month' && year && month !== undefined
              ? `${['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'][parseInt(month)]} ${year}`
              : period === 'year' && year
                ? `Anno ${year}`
                : 'Tutti i dati'}
          </p>
        </div>
        <PeriodFilter
          currentPeriod={period}
          currentYear={year}
          currentMonth={month}
        />
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-600">
          Errore nel caricamento dei dati: {error}
        </div>
      )}

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatsCard
          title="Guadagni Totali"
          value={totalEarnings.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
          icon="euro"
          delay={0}
        />
        <StatsCard
          title="Esecuzioni Totali"
          value={totalExecutions.toLocaleString('it-IT')}
          icon="activity"
          delay={0.1}
        />
        <StatsCard
          title="Clienti Attivi"
          value={byCompany.length}
          icon="users"
          delay={0.2}
        />
        <StatsCard
          title="Automazioni"
          value={byAutomation.length}
          icon="bot"
          delay={0.3}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EarningsChart data={earningsData} />
        <ClientBreakdown data={byCompany} />
      </div>

      {/* Detailed Breakdown */}
      <AutomationBreakdown data={earningsData} />
    </div>
  )
}
