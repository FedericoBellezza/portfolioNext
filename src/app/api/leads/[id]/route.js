import {
  protectedRoute,
  getAdminClient,
  json,
  fail,
  readJson,
} from '@/lib/leads/server'
import { isUuid, validatePatch } from '@/lib/leads/validation'

export const dynamic = 'force-dynamic'

// PATCH /api/leads/:id  — solo i campi in whitelist (vedi validatePatch)
export const PATCH = protectedRoute(async (request, { params }) => {
  const { id } = await params
  if (!isUuid(id)) return fail(400, 'ID non valido')

  const body = await readJson(request)
  const res = validatePatch(body)
  if (!res.ok) return fail(422, res.error)

  const { data, error } = await getAdminClient()
    .from('leads')
    .update(res.data)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return fail(404, 'Lead non trovato')
  return json({ lead: data })
})

// DELETE /api/leads/:id
export const DELETE = protectedRoute(async (_request, { params }) => {
  const { id } = await params
  if (!isUuid(id)) return fail(400, 'ID non valido')

  const { data, error } = await getAdminClient()
    .from('leads')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return fail(404, 'Lead non trovato')
  return json({ ok: true })
})
