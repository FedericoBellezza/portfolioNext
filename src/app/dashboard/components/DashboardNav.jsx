'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/app/components/ui/button'
import { LogOut, Home, LayoutDashboard, Settings } from 'lucide-react'

export default function DashboardNav({ user }) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="bg-[var(--dashboard-card-bg)] border-b border-[var(--dashboard-border)] px-6 py-4 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xl font-serif font-semibold text-[var(--dashboard-text)] flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-[var(--dashboard-accent)]" />
            Dashboard
          </Link>
          <Link href="/dashboard/manage" className="text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-accent)] transition-colors flex items-center gap-1 uppercase text-sm tracking-wide">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Gestione</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[var(--dashboard-text-muted)] text-sm hidden sm:block">{user.email}</span>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-accent)] hover:bg-[var(--dashboard-bg-secondary)]">
              <Home className="h-4 w-4 mr-2" />
              Portfolio
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="border-[var(--dashboard-border)] text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-accent)] hover:bg-[var(--dashboard-bg-secondary)] hover:border-[var(--dashboard-accent)]"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  )
}
