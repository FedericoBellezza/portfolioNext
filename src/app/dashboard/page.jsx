import { redirect } from 'next/navigation'

// La home della dashboard è la pagina dell'Assistente (Trader AI e Copy Bot sono stati rimossi).
export default function DashboardPage() {
  redirect('/dashboard/assistant')
}
