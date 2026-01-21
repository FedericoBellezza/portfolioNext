// Fetch all clients
export async function getClients(supabase) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name')

  if (error) {
    console.error('[ERROR] getClients:', error.message)
    return []
  }
  return data || []
}

// Fetch all automations
export async function getAutomations(supabase) {
  const { data, error } = await supabase
    .from('automations')
    .select('*')
    .order('name')

  if (error) {
    console.error('[ERROR] getAutomations:', error.message)
    return []
  }
  return data || []
}

// Fetch all pricing with automation and client info
export async function getPricing(supabase) {
  const { data, error } = await supabase
    .from('pricing')
    .select(`
      *,
      automations (id, name),
      clients (id, name)
    `)

  if (error) {
    console.error('[ERROR] getPricing:', error.message)
    return []
  }
  return data || []
}

// Get execution counts grouped by automation and client
export async function getExecutionCounts(supabase, dateFilter = null) {
  let query = supabase
    .from('executions')
    .select('automation_id, client_id, executed_at')

  if (dateFilter) {
    query = query.gte('executed_at', dateFilter.start).lte('executed_at', dateFilter.end)
  }

  const { data, error } = await query

  if (error) {
    console.error('[ERROR] getExecutionCounts:', error.message)
    return {}
  }

  // Group by automation_id + client_id
  const counts = {}
  for (const exec of data || []) {
    const key = `${exec.automation_id}-${exec.client_id}`
    counts[key] = (counts[key] || 0) + 1
  }

  return counts
}

// Get all earnings data
export async function getEarningsData(supabase, dateFilter = null) {
  console.log('[DEBUG] Fetching earnings data...')

  // Get pricing with relations
  const pricing = await getPricing(supabase)
  console.log('[DEBUG] Pricing:', pricing)

  // Get execution counts
  const executionCounts = await getExecutionCounts(supabase, dateFilter)
  console.log('[DEBUG] Execution counts:', executionCounts)

  // Combine data
  const earningsData = pricing.map((p) => {
    const key = `${p.automation_id}-${p.client_id}`
    const executionCount = executionCounts[key] || 0
    const pricePerExecution = Number(p.price_per_execution) || 0

    return {
      id: p.id,
      automation: p.automations?.name || 'N/A',
      automationId: p.automation_id,
      company: p.clients?.name || 'N/A',
      clientId: p.client_id,
      pricePerExecution,
      executionCount,
      totalEarnings: executionCount * pricePerExecution,
      createdAt: p.created_at,
    }
  })

  console.log('[DEBUG] Earnings data:', earningsData)
  return earningsData
}

// Aggregate earnings by company
export function aggregateByCompany(earningsData) {
  return earningsData.reduce((acc, item) => {
    const existing = acc.find((a) => a.company === item.company)
    if (existing) {
      existing.totalEarnings += item.totalEarnings
      existing.executionCount += item.executionCount
    } else {
      acc.push({
        company: item.company,
        clientId: item.clientId,
        totalEarnings: item.totalEarnings,
        executionCount: item.executionCount,
      })
    }
    return acc
  }, [])
}

// Aggregate earnings by automation type
export function aggregateByAutomation(earningsData) {
  return earningsData.reduce((acc, item) => {
    const existing = acc.find((a) => a.automation === item.automation)
    if (existing) {
      existing.totalEarnings += item.totalEarnings
      existing.executionCount += item.executionCount
    } else {
      acc.push({
        automation: item.automation,
        automationId: item.automationId,
        totalEarnings: item.totalEarnings,
        executionCount: item.executionCount,
      })
    }
    return acc
  }, [])
}

// Build date filter from period, year, month
export function buildDateFilter(period, year, month) {
  if (!period || period === 'all') return null

  const now = new Date()
  const currentYear = year ? parseInt(year) : now.getFullYear()
  const currentMonth = month !== undefined ? parseInt(month) : now.getMonth()

  if (period === 'month') {
    const start = new Date(currentYear, currentMonth, 1)
    const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
    return { start: start.toISOString(), end: end.toISOString() }
  }

  if (period === 'year') {
    const start = new Date(currentYear, 0, 1)
    const end = new Date(currentYear, 11, 31, 23, 59, 59, 999)
    return { start: start.toISOString(), end: end.toISOString() }
  }

  return null
}
