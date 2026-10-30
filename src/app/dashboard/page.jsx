import { redirect } from 'next/navigation'

// La home della dashboard è la pagina del Trader AI (la sezione lead è stata rimossa).
export default function DashboardPage() {
  redirect('/dashboard/trader')
}
