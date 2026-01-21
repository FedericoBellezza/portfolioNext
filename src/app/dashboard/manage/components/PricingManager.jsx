'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createPricingAction, deletePricingAction, updatePricingAction } from '@/lib/supabase/actions'
import { Plus, Trash2, Euro, Pencil, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PricingManager({ pricing: initialPricing, clients, automations }) {
  const [pricing, setPricing] = useState(initialPricing)
  const [selectedAutomation, setSelectedAutomation] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editPrice, setEditPrice] = useState('')

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!selectedAutomation || !selectedClient || !price) {
      toast.error('Compila tutti i campi')
      return
    }

    setLoading(true)
    const result = await createPricingAction(selectedAutomation, selectedClient, parseFloat(price))
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Prezzo assegnato')
      // Refresh page to get updated data with relations
      window.location.reload()
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo prezzo?')) return

    const result = await deletePricingAction(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Prezzo eliminato')
      setPricing(pricing.filter(p => p.id !== id))
    }
  }

  const handleEdit = (item) => {
    setEditingId(item.id)
    setEditPrice(item.price_per_execution.toString())
  }

  const handleUpdate = async (id) => {
    const result = await updatePricingAction(id, parseFloat(editPrice))
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Prezzo aggiornato')
      setPricing(pricing.map(p =>
        p.id === id ? { ...p, price_per_execution: parseFloat(editPrice) } : p
      ))
      setEditingId(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditPrice('')
  }

  return (
    <Card className="bg-[var(--dashboard-card-bg)] border-[var(--dashboard-card-border)] shadow-sm">
      <CardHeader>
        <CardTitle className="text-[var(--dashboard-text)] font-serif flex items-center gap-2">
          <Euro className="h-5 w-5 text-[var(--dashboard-accent)]" />
          Prezzi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Select value={selectedAutomation} onValueChange={setSelectedAutomation}>
              <SelectTrigger className="bg-[var(--dashboard-bg)] border-[var(--dashboard-border)] text-[var(--dashboard-text)]">
                <SelectValue placeholder="Automazione" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--dashboard-card-bg)] border-[var(--dashboard-border)]">
                {automations.map((auto) => (
                  <SelectItem key={auto.id} value={auto.id} className="text-[var(--dashboard-text)]">
                    {auto.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="bg-[var(--dashboard-bg)] border-[var(--dashboard-border)] text-[var(--dashboard-text)]">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--dashboard-card-bg)] border-[var(--dashboard-border)]">
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id} className="text-[var(--dashboard-text)]">
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                placeholder="Prezzo €"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="bg-[var(--dashboard-bg)] border-[var(--dashboard-border)] text-[var(--dashboard-text)] placeholder:text-[var(--dashboard-text-muted)]"
              />
              <Button type="submit" disabled={loading} className="bg-[var(--dashboard-accent)] hover:bg-[var(--dashboard-accent-hover)] text-white">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </form>

        <div className="space-y-2">
          {pricing.length === 0 ? (
            <p className="text-[var(--dashboard-text-muted)] text-sm">Nessun prezzo configurato</p>
          ) : (
            pricing.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-[var(--dashboard-bg-secondary)] rounded-lg">
                <div className="flex-1">
                  <span className="text-[var(--dashboard-text)] font-medium">{item.automations?.name}</span>
                  <span className="text-[var(--dashboard-text-muted)] mx-2">→</span>
                  <span className="text-[var(--dashboard-text-secondary)]">{item.clients?.name}</span>
                </div>

                {editingId === item.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-24 bg-[var(--dashboard-bg)] border-[var(--dashboard-border)] text-[var(--dashboard-text)] h-8"
                    />
                    <Button size="sm" variant="ghost" onClick={() => handleUpdate(item.id)} className="text-green-600 hover:bg-green-50">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="text-[var(--dashboard-text-muted)] hover:bg-[var(--dashboard-bg)]">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--dashboard-accent)] font-semibold">
                      €{Number(item.price_per_execution).toFixed(2)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(item)}
                      className="text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-bg)]"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
