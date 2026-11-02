import { protectedRoute, readJson, fail } from '@/lib/server/api'
import { forwardToTraderWebhook } from '@/lib/server/traderWebhook'
import { COMMANDS } from '@/app/dashboard/trader/format'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// POST /api/trader  { command }
// Inoltra il comando al webhook n8n "Trader AI - Comandi Dashboard", che lo esegue sul server
// Hetzner via SSH (python -m trader <command>). URL e segreto solo lato server.
export const POST = protectedRoute(async (request) => {
  const body = await readJson(request)
  const command = typeof body?.command === 'string' ? body.command : ''
  if (!COMMANDS.includes(command)) return fail(400, 'Comando non consentito')
  return forwardToTraderWebhook(command, 'api/trader')
})
