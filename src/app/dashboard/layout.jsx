import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardNav from './components/DashboardNav'

export const metadata = {
  title: 'Dashboard | Federico Bellezza',
  description: 'Dashboard privata per la gestione delle automazioni',
}

export default async function DashboardLayout({ children }) {
  let user = null
  let connectionError = false

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    user = data?.user ?? null
    if (error && (error.name === 'AuthRetryableFetchError' || error.status === 0 || error.status >= 500)) {
      throw error
    }
  } catch (e) {
    console.error('Supabase unreachable in dashboard layout:', e?.message)
    connectionError = true
  }

  if (connectionError) {
    return (
      <div className="min-h-screen dashboard-theme bg-[var(--dashboard-bg)] flex items-center justify-center px-4">
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-600">
          Non è stato possibile collegarsi a Supabase
        </div>
      </div>
    )
  }

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
