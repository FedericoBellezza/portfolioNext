import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardNav from './components/DashboardNav'

export const metadata = {
  title: 'Dashboard | Federico Bellezza',
  description: 'Dashboard privata per la gestione delle automazioni',
}

export default async function DashboardLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen dashboard-theme bg-[var(--dashboard-bg)]">
      <DashboardNav user={user} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
