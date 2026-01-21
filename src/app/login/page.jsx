'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion } from 'motion/react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 dashboard-theme bg-[var(--dashboard-bg)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-[var(--dashboard-card-bg)] p-8 rounded-2xl shadow-lg border border-[var(--dashboard-card-border)]">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-serif font-semibold text-[var(--dashboard-text)] mb-2">
              Dashboard Login
            </h1>
            <p className="text-[var(--dashboard-text-secondary)]">Accedi per visualizzare le statistiche</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[var(--dashboard-text-secondary)]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@esempio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-[var(--dashboard-bg)] border-[var(--dashboard-border)] text-[var(--dashboard-text)] placeholder:text-[var(--dashboard-text-muted)] focus:border-[var(--dashboard-accent)] focus:ring-[var(--dashboard-accent)]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[var(--dashboard-text-secondary)]">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-[var(--dashboard-bg)] border-[var(--dashboard-border)] text-[var(--dashboard-text)] placeholder:text-[var(--dashboard-text-muted)] focus:border-[var(--dashboard-accent)] focus:ring-[var(--dashboard-accent)]"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm"
              >
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--dashboard-accent)] hover:bg-[var(--dashboard-accent-hover)] text-white font-medium rounded-full py-3"
            >
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-accent)] text-sm transition-colors">
              Torna al Portfolio
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
