'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/components/ui/input'
import { createAutomationAction, deleteAutomationAction } from '@/lib/supabase/actions'
import { Plus, Trash2, Bot } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AutomationsManager({ automations: initialAutomations }) {
  const [automations, setAutomations] = useState(initialAutomations)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return

    setLoading(true)
    const result = await createAutomationAction(newName.trim(), newDescription.trim())
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Automazione creata')
      setAutomations([...automations, result.data])
      setNewName('')
      setNewDescription('')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questa automazione?')) return

    const result = await deleteAutomationAction(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Automazione eliminata')
      setAutomations(automations.filter(a => a.id !== id))
    }
  }

  return (
    <Card className="bg-[var(--dashboard-card-bg)] border-[var(--dashboard-card-border)] shadow-sm">
      <CardHeader>
        <CardTitle className="text-[var(--dashboard-text)] font-serif flex items-center gap-2">
          <Bot className="h-5 w-5 text-[var(--dashboard-accent)]" />
          Automazioni
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleCreate} className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Nome automazione..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-[var(--dashboard-bg)] border-[var(--dashboard-border)] text-[var(--dashboard-text)] placeholder:text-[var(--dashboard-text-muted)]"
            />
            <Button type="submit" disabled={loading} className="bg-[var(--dashboard-accent)] hover:bg-[var(--dashboard-accent-hover)] text-white">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Input
            placeholder="Descrizione (opzionale)..."
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="bg-[var(--dashboard-bg)] border-[var(--dashboard-border)] text-[var(--dashboard-text)] placeholder:text-[var(--dashboard-text-muted)]"
          />
        </form>

        <div className="space-y-2">
          {automations.length === 0 ? (
            <p className="text-[var(--dashboard-text-muted)] text-sm">Nessuna automazione</p>
          ) : (
            automations.map((auto) => (
              <div key={auto.id} className="flex items-center justify-between p-3 bg-[var(--dashboard-bg-secondary)] rounded-lg">
                <div>
                  <span className="text-[var(--dashboard-text)] font-medium">{auto.name}</span>
                  {auto.description && (
                    <p className="text-[var(--dashboard-text-muted)] text-sm">{auto.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(auto.id)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
