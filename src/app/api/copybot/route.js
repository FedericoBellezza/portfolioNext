import { protectedRoute, readJson, fail } from '@/lib/server/api'
import { forwardToTraderWebhook } from '@/lib/server/traderWebhook'
import { COPY_COMMANDS } from '@/app/dashboard/copybot/commands'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// POST /api/copybot  { command }  (es. "copy-status")
// Stesso webhook n8n del primo bot: lì "copy-<x>" diventa `python -m copybot <x>` sul server.
export const POST = protectedRoute(async (request) => {
  const body = await readJson(request)
  const command = typeof body?.command === 'string' ? body.command : ''
  if (!COPY_COMMANDS.includes(command)) return fail(400, 'Comando non consentito')
  return forwardToTraderWebhook(command, 'api/copybot')
})
