import { createClient } from '@/lib/supabase/server'
import { listDocuments } from '@/lib/assistant/documents'
import AssistantClient from './AssistantClient'

export const metadata = {
  title: 'Assistente | Dashboard',
  description: 'Assistente di studio privato',
  robots: { index: false, follow: false },
}

export default async function AssistantPage() {
  const supabase = await createClient()
  const { data, error } = await listDocuments(supabase)

  return <AssistantClient initialDocuments={data ?? []} dbError={error?.message ?? null} />
}
