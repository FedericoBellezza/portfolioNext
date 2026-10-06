import { protectedRoute, getAdminClient, json } from '@/lib/leads/server'

export const dynamic = 'force-dynamic'

// POST /api/leads/riattiva-scartati
// Riporta in stato "nuovo" tutti i lead scartati.
export const POST = protectedRoute(async () => {
  const { data, error } = await getAdminClient()
    .from('leads')
    .update({ stato: 'nuovo' })
    .eq('stato', 'scartato')
    .select('id')

  if (error) throw new Error(error.message)
  return json({ ok: true, updated: data?.length ?? 0 })
})
