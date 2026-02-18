'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
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

  const inputClass =
    "w-full px-4 py-3 bg-transparent border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-amber-600 focus:outline-none transition-colors duration-300"

  return (
    <div className="bg-black text-white min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-zinc-900 p-8 border border-zinc-800">
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl text-white mb-2">
              Dashboard Login
            </h1>
            <div className="w-12 h-px bg-amber-600 mx-auto mt-4 mb-4" />
            <p className="text-zinc-400">
              Accedi per visualizzare le statistiche
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-zinc-500 text-xs uppercase tracking-wide"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="email@esempio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-zinc-500 text-xs uppercase tracking-wide"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 border border-red-500/50 text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 flex items-center justify-center uppercase tracking-widest text-sm font-medium transition-all duration-300 cursor-pointer ${
                loading
                  ? "bg-zinc-950 text-zinc-500 cursor-not-allowed border border-zinc-800"
                  : "border border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-black"
              }`}
            >
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-zinc-500 hover:text-amber-600 text-sm transition-colors uppercase tracking-wide"
            >
              Torna al Portfolio
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
