'use client'

import { useMemo, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  ASSISTANT_BUCKET,
  MAX_FILE_BYTES,
  isAcceptedFile,
  sanitizeFileName,
} from '@/lib/assistant/constants'
import { buildBugReport, copyToClipboard } from '@/lib/assistant/bugReport'
import ChatPanel from './components/ChatPanel'
import SourcesPanel from './components/SourcesPanel'

function toInt(value) {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export default function AssistantClient({ initialDocuments, dbError }) {
  const [documents, setDocuments] = useState(initialDocuments)
  const [course, setCourse] = useState('')
  const [uploads, setUploads] = useState([])

  // Documenti e corsi in eliminazione: il pannello mostra uno spinner finché l'elenco non è aggiornato.
  const [deletingDocs, setDeletingDocs] = useState(() => new Set())
  const [deletingCourses, setDeletingCourses] = useState(() => new Set())

  // Analisi delle figure (grafici, schemi, immagini delle slide): costa qualche centesimo a documento.
  const [analyzeFigures, setAnalyzeFigures] = useState(true)
  const [visualProgress, setVisualProgress] = useState({})
  const [visualErrors, setVisualErrors] = useState({})
  const visualRunning = useRef(new Set())

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('ask')
  const [documentId, setDocumentId] = useState('')
  const [pageFrom, setPageFrom] = useState('')
  const [pageTo, setPageTo] = useState('')
  const [count, setCount] = useState('')

  const courses = useMemo(() => [...new Set(documents.map((doc) => doc.course))].sort(), [documents])
  const readyDocuments = useMemo(
    () => documents.filter((doc) => doc.status === 'ready' && (!course || doc.course === course)),
    [documents, course],
  )

  async function refreshDocuments() {
    const response = await fetch('/api/assistant/documents', { cache: 'no-store' })
    const data = await response.json().catch(() => null)
    if (response.ok && data?.ok) setDocuments(data.documents)
  }

  function changeCourse(next) {
    setCourse(next)
    // Un documento di un altro corso non è più selezionabile.
    const stillValid = documents.some((doc) => doc.id === documentId && (!next || doc.course === next))
    if (!stillValid) {
      setDocumentId('')
      setPageFrom('')
      setPageTo('')
    }
  }

  function changeDocument(next) {
    setDocumentId(next)
    setPageFrom('')
    setPageTo('')
  }

  function patchUpload(id, patch) {
    setUploads((current) => current.map((upload) => (upload.id === id ? { ...upload, ...patch } : upload)))
  }

  async function uploadFiles(files, targetCourse) {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // Uno alla volta: ogni ingestione può durare decine di secondi.
    for (const file of files) {
      const id = crypto.randomUUID()
      setUploads((current) => [{ id, name: file.name, status: 'working', message: 'Caricamento…' }, ...current])

      if (!isAcceptedFile(file.name)) {
        patchUpload(id, { status: 'error', message: 'Tipo di file non supportato' })
        continue
      }
      if (file.size > MAX_FILE_BYTES) {
        patchUpload(id, { status: 'error', message: 'File troppo grande (massimo 50 MB)' })
        continue
      }

      const path = `${user.id}/${id}/${sanitizeFileName(file.name)}`
      const { error: uploadError } = await supabase.storage
        .from(ASSISTANT_BUCKET)
        .upload(path, file, { contentType: file.type || 'application/octet-stream' })
      if (uploadError) {
        patchUpload(id, { status: 'error', message: `Upload fallito: ${uploadError.message}` })
        continue
      }

      patchUpload(id, { message: 'Estrazione del testo e indicizzazione…' })
      try {
        const response = await fetch('/api/assistant/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, name: file.name, course: targetCourse }),
        })
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.ok) throw new Error(data?.error ?? `Errore ${response.status}`)

        const ready = `Pronto · ${data.chunks} passaggi indicizzati`
        if (data.visualItems > 0 && analyzeFigures) {
          // Il testo è già utilizzabile: le figure si analizzano a lotti finché la pagina resta aperta.
          patchUpload(id, { message: `${ready}. Analisi figure…` })
          const outcome = await runVisuals({ id: data.documentId, visual_done: 0, visual_total: data.visualItems }, id)
          patchUpload(
            id,
            outcome.ok
              ? { status: 'done', message: `${ready} · ${outcome.added} figure descritte` }
              : { status: 'error', message: `${ready}. Figure non analizzate: ${outcome.error}` },
          )
        } else {
          patchUpload(id, {
            status: 'done',
            message: data.visualItems > 0 ? `${ready} · figure da analizzare` : ready,
          })
        }
      } catch (error) {
        patchUpload(id, { status: 'error', message: error.message })
      }
      await refreshDocuments()
    }
  }

  // Ogni richiesta analizza un lotto di pagine; si ripete fino a fine documento o al primo errore.
  // Se si interrompe, il server ricorda a che punto era e "Riprendi" continua da lì.
  async function runVisuals(doc, uploadId) {
    if (visualRunning.current.has(doc.id)) return { ok: true, added: 0 }
    visualRunning.current.add(doc.id)
    setVisualErrors((current) => ({ ...current, [doc.id]: null }))
    setVisualProgress((current) => ({
      ...current,
      [doc.id]: { done: doc.visual_done ?? 0, total: doc.visual_total ?? 0 },
    }))

    let added = 0
    let lastDone = doc.visual_done ?? 0
    try {
      for (;;) {
        const response = await fetch('/api/assistant/visuals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: doc.id }),
        })
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.ok) throw new Error(data?.error ?? `Errore ${response.status}`)

        added += data.added
        setVisualProgress((current) => ({ ...current, [doc.id]: { done: data.done, total: data.total } }))
        if (uploadId) patchUpload(uploadId, { message: `Analisi figure ${data.done}/${data.total}…` })
        if (data.status === 'done') return { ok: true, added }

        // Nessun avanzamento: meglio fermarsi che ripetere la stessa richiesta all'infinito.
        if (data.done <= lastDone) throw new Error('Analisi bloccata: nessun avanzamento')
        lastDone = data.done
      }
    } catch (error) {
      setVisualErrors((current) => ({ ...current, [doc.id]: error.message }))
      return { ok: false, added, error: error.message }
    } finally {
      visualRunning.current.delete(doc.id)
      setVisualProgress((current) => {
        const next = { ...current }
        delete next[doc.id]
        return next
      })
      await refreshDocuments()
    }
  }

  function setBusy(setter, keys, busy) {
    setter((current) => {
      const next = new Set(current)
      for (const key of keys) {
        if (busy) next.add(key)
        else next.delete(key)
      }
      return next
    })
  }

  async function deleteDocument(doc) {
    if (!window.confirm(`Eliminare "${doc.name}" e tutti i suoi passaggi indicizzati?`)) return
    setBusy(setDeletingDocs, [doc.id], true)
    try {
      const response = await fetch(`/api/assistant/documents?id=${doc.id}`, { method: 'DELETE' })
      if (response.ok) {
        if (doc.id === documentId) changeDocument('')
        await refreshDocuments()
      }
    } finally {
      setBusy(setDeletingDocs, [doc.id], false)
    }
  }

  // Elimina il corso con tutti i suoi documenti (file e passaggi indicizzati compresi).
  async function deleteCourse(courseName) {
    const ids = documents.filter((doc) => doc.course === courseName).map((doc) => doc.id)
    const label = ids.length === 1 ? '1 documento' : `${ids.length} documenti`
    if (!window.confirm(`Eliminare il corso "${courseName}" e tutti i suoi documenti (${label})?`)) return

    setBusy(setDeletingCourses, [courseName], true)
    setBusy(setDeletingDocs, ids, true)
    try {
      const response = await fetch(`/api/assistant/documents?course=${encodeURIComponent(courseName)}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        if (course === courseName) changeCourse('')
        if (ids.includes(documentId)) changeDocument('')
        await refreshDocuments()
      }
    } finally {
      setBusy(setDeletingCourses, [courseName], false)
      setBusy(setDeletingDocs, ids, false)
    }
  }

  async function openSource(source) {
    const supabase = createClient()
    const { data, error } = await supabase.storage.from(ASSISTANT_BUCKET).createSignedUrl(source.filePath, 600)
    if (error || !data?.signedUrl) return
    const url = source.fileType === 'pdf' && source.page ? `${data.signedUrl}#page=${source.page}` : data.signedUrl
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function copyBugReport() {
    const report = buildBugReport({
      messages,
      documents,
      filters: {
        mode,
        course,
        documentName: documents.find((doc) => doc.id === documentId)?.name,
        pageFrom,
        pageTo,
        count,
      },
    })
    return copyToClipboard(report)
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    // Il server accetta al massimo 8000 caratteri per messaggio di storia.
    const history = messages
      .filter((message) => !message.error)
      .slice(-10)
      .map((message) => ({ role: message.role, content: message.content.slice(0, 8000) }))

    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', content: text }])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          mode,
          course: course || null,
          documentId: documentId || null,
          pageFrom: toInt(pageFrom),
          pageTo: toInt(pageTo),
          count: toInt(count),
          history,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.ok) throw new Error(data?.error ?? `Errore ${response.status}`)

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.text,
          sources: data.sources,
          truncated: data.truncated,
          mode,
        },
      ])
    } catch (error) {
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: 'assistant', content: error.message, error: true },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-[var(--dashboard-text)] sm:text-4xl">
          Assistente di studio
        </h1>
        <p className="mt-1 text-[var(--dashboard-text-secondary)]">
          Interroga slide, trascrizioni e riassunti dei tuoi corsi. Risposte basate solo sui tuoi materiali, con le fonti.
        </p>
      </div>

      {dbError && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Database non pronto</p>
            <p className="mt-0.5">
              Applica <code>supabase/migrations/0001_assistant.sql</code> al progetto Supabase del portfolio (SQL editor).
              Dettaglio: {dbError}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <SourcesPanel
          documents={documents}
          courses={courses}
          course={course}
          onCourseChange={changeCourse}
          uploads={uploads}
          onUpload={uploadFiles}
          onDelete={deleteDocument}
          onDeleteCourse={deleteCourse}
          deletingDocs={deletingDocs}
          deletingCourses={deletingCourses}
          analyzeFigures={analyzeFigures}
          onAnalyzeFiguresChange={setAnalyzeFigures}
          visualProgress={visualProgress}
          visualErrors={visualErrors}
          onAnalyzeVisuals={(doc) => runVisuals(doc)}
          disabled={Boolean(dbError)}
        />
        <ChatPanel
          messages={messages}
          loading={loading}
          input={input}
          onInputChange={setInput}
          onSend={send}
          onReset={() => setMessages([])}
          mode={mode}
          onModeChange={setMode}
          course={course}
          readyDocuments={readyDocuments}
          documentId={documentId}
          onDocumentChange={changeDocument}
          pageFrom={pageFrom}
          pageTo={pageTo}
          count={count}
          onRangeChange={(from, to) => {
            setPageFrom(from)
            setPageTo(to)
          }}
          onCountChange={setCount}
          onOpenSource={openSource}
          onReportBug={copyBugReport}
          hasDocuments={readyDocuments.length > 0}
        />
      </div>
    </div>
  )
}
