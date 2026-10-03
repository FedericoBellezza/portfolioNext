import { protectedRoute, getAdminClient, json } from '@/lib/leads/server'
import { todayRome } from '@/lib/leads/validation'
import { STATI } from '@/lib/leads/constants'

export const dynamic = 'force-dynamic'

// Contatori per stato + follow-up scaduti o di oggi. Conteggi esatti lato database
// (head: true), così non dipendono dal limite di righe per risposta.
export const GET = protectedRoute(async () => {
  const db = getAdminClient()
  const today = todayRome()

  const count = async (build) => {
    const { count: n, error } = await build(
      db.from('leads').select('id', { count: 'exact', head: true })
    )
    if (error) throw new Error(error.message)
    return n ?? 0
  }

  const [perStato, followup, total] = await Promise.all([
    Promise.all(STATI.map((s) => count((q) => q.eq('stato', s)))),
    count((q) => q.lte('data_followup', today).neq('stato', 'scartato')),
    count((q) => q),
  ])

  return json({
    total,
    followup,
    today,
    stati: Object.fromEntries(STATI.map((s, i) => [s, perStato[i]])),
  })
})
