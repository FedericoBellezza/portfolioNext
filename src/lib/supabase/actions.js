'use server'

import { createClient } from './server'
import { revalidatePath } from 'next/cache'

// ============ CLIENTS ============

export async function getClientsAction() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name')

  if (error) return { error: error.message }
  return { data }
}

export async function createClientAction(name) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .insert({ name })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { data }
}

export async function deleteClientAction(id) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}

// ============ AUTOMATIONS ============

export async function getAutomationsAction() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('automations')
    .select('*')
    .order('name')

  if (error) return { error: error.message }
  return { data }
}

export async function createAutomationAction(name, description = '') {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('automations')
    .insert({ name, description })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { data }
}

export async function deleteAutomationAction(id) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('automations')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}

// ============ PRICING ============

export async function getPricingAction() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pricing')
    .select(`
      *,
      automations (id, name),
      clients (id, name)
    `)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { data }
}

export async function createPricingAction(automationId, clientId, pricePerExecution) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pricing')
    .insert({
      automation_id: automationId,
      client_id: clientId,
      price_per_execution: pricePerExecution
    })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { data }
}

export async function updatePricingAction(id, pricePerExecution) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pricing')
    .update({ price_per_execution: pricePerExecution })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { data }
}

export async function deletePricingAction(id) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('pricing')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}

// ============ EXECUTIONS ============

export async function createExecutionAction(automationId, clientId, metadata = {}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('executions')
    .insert({
      automation_id: automationId,
      client_id: clientId,
      metadata
    })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { data }
}
