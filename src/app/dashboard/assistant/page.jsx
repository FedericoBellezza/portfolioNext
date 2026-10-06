import { createClient } from '@/lib/supabase/server'
import { DOCUMENT_COLUMNS } from '@/lib/assistant/constants'
import AssistantClient from './AssistantClient'

export const metadata = {
  title: 'Assistente | Dashboard',
  description: 'Assistente di studio privato',
  robots: { index: false, follow: false },
}

export default async function AssistantPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assistant_documents')
    .select(DOCUMENT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(500)

  return <AssistantClient initialDocuments={data ?? []} dbError={error?.message ?? null} />
}
