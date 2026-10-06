import { protectedRoute, getAdminClient, json } from '@/lib/leads/server'

export const dynamic = 'force-dynamic'

// POST /api/leads/riprova-falliti
// Riporta in stato "nuovo" tutti i lead con analisi fallita (errore_analisi),
// così il prossimo "Avvia analisi" li rielabora.
export const POST = protectedRoute(async () => {
  const { data, error } = await getAdminClient()
    .from('leads')
    .update({ stato: 'nuovo' })
    .eq('stato', 'errore_analisi')
    .select('id')

  if (error) throw new Error(error.message)
  return json({ ok: true, updated: data?.length ?? 0 })
})
