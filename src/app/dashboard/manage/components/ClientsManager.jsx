'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClientAction, deleteClientAction } from '@/lib/supabase/actions'
import { Plus, Trash2, Users } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ClientsManager({ clients: initialClients }) {
  const [clients, setClients] = useState(initialClients)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return

    setLoading(true)
    const result = await createClientAction(newName.trim())
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Cliente creato')
      setClients([...clients, result.data])
      setNewName('')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo cliente?')) return

    const result = await deleteClientAction(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Cliente eliminato')
      setClients(clients.filter(c => c.id !== id))
    }
  }

  return (
    <Card className="bg-[var(--dashboard-card-bg)] border-[var(--dashboard-card-border)] shadow-sm">
      <CardHeader>
        <CardTitle className="text-[var(--dashboard-text)] font-serif flex items-center gap-2">
          <Users className="h-5 w-5 text-[var(--dashboard-accent)]" />
          Clienti
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            placeholder="Nome cliente..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-[var(--dashboard-bg)] border-[var(--dashboard-border)] text-[var(--dashboard-text)] placeholder:text-[var(--dashboard-text-muted)]"
          />
          <Button type="submit" disabled={loading} className="bg-[var(--dashboard-accent)] hover:bg-[var(--dashboard-accent-hover)] text-white">
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        <div className="space-y-2">
          {clients.length === 0 ? (
            <p className="text-[var(--dashboard-text-muted)] text-sm">Nessun cliente</p>
          ) : (
            clients.map((client) => (
              <div key={client.id} className="flex items-center justify-between p-3 bg-[var(--dashboard-bg-secondary)] rounded-lg">
                <span className="text-[var(--dashboard-text)]">{client.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(client.id)}
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
