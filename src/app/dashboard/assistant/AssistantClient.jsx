'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  ASSISTANT_BUCKET,
  ATTACHMENT_FOLDER,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
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

  // Allegati del prossimo messaggio: { id, name, size, status: 'uploading' | 'ready' | 'error', path?, message? }
  const [attachments, setAttachments] = useState([])

  const courses = useMemo(() => [...new Set(documents.map((doc) => doc.course))].sort(), [documents])
  const readyDocuments = useMemo(
    () => documents.filter((doc) => doc.status === 'ready' && (!course || doc.course === course)),
    [documents, course],
  )

  // Chat a tutta pagina: nasconde intestazione e pannello dei materiali. Si ricorda tra le visite.
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    try {
      setExpanded(localStorage.getItem('assistant-expanded') === '1')
    } catch {}
  }, [])
  function toggleExpanded() {
    setExpanded((current) => {
      try {
        localStorage.setItem('assistant-expanded', current ? '0' : '1')
      } catch {}
      return !current
    })
  }

  const readyCount = documents.filter((doc) => doc.status === 'ready').length
  const processingCount = documents.filter((doc) => doc.status !== 'ready' && doc.status !== 'error').length

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
    // La conferma è inline nel pannello dei materiali.
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

  function patchAttachment(id, patch) {
    setAttachments((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  // I file vanno subito su Storage in una cartella temporanea: la route di chat li legge e li cancella.
  async function attachFiles(files) {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    let slots = MAX_ATTACHMENTS - attachments.filter((item) => item.status !== 'error').length
    for (const file of files) {
      const id = crypto.randomUUID()
      const entry = { id, name: file.name, size: file.size, status: 'uploading' }

      const problem = !isAcceptedFile(file.name)
        ? 'Tipo di file non supportato'
        : file.size > MAX_ATTACHMENT_BYTES
          ? 'File troppo grande (massimo 10 MB)'
          : slots <= 0
            ? `Massimo ${MAX_ATTACHMENTS} allegati`
            : null
      if (problem) {
        setAttachments((current) => [...current, { ...entry, status: 'error', message: problem }])
        continue
      }

      slots -= 1
      setAttachments((current) => [...current, entry])
      const path = `${user.id}/${ATTACHMENT_FOLDER}/${id}/${sanitizeFileName(file.name)}`
      const { error } = await supabase.storage
        .from(ASSISTANT_BUCKET)
        .upload(path, file, { contentType: file.type || 'application/octet-stream' })
      patchAttachment(id, error ? { status: 'error', message: `Upload fallito: ${error.message}` } : { status: 'ready', path })
    }
  }

  function removeAttachment(id) {
    const item = attachments.find((entry) => entry.id === id)
    setAttachments((current) => current.filter((entry) => entry.id !== id))
    if (item?.path) createClient().storage.from(ASSISTANT_BUCKET).remove([item.path])
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
    if (!text || loading || attachments.some((item) => item.status === 'uploading')) return

    // Gli allegati con errore non partono: restano solo quelli caricati.
    const sent = attachments.filter((item) => item.status === 'ready')

    // Il server accetta al massimo 8000 caratteri per messaggio di storia. Degli allegati dei turni
    // precedenti resta solo il nome: il testo è stato letto una volta e non viene rimandato.
    const history = messages
      .filter((message) => !message.error)
      .slice(-10)
      .map((message) => {
        const files = message.attachments?.length ? `[Allegati: ${message.attachments.map((a) => a.name).join(', ')}]\n` : ''
        return { role: message.role, content: `${files}${message.content}`.slice(0, 8000) }
      })

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        attachments: sent.map((item) => ({ name: item.name })),
      },
    ])
    setInput('')
    setAttachments([])
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
          attachments: sent.map((item) => ({ path: item.path, name: item.name })),
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
      <header className={`flex flex-wrap items-end justify-between gap-x-8 gap-y-2 ${expanded ? 'lg:hidden' : ''}`}>
        <div className="max-w-2xl">
          <h1 className="text-balance font-serif text-2xl font-semibold tracking-tight text-[var(--dashboard-text)] sm:text-3xl">
            Assistente di studio
          </h1>
          <p className="mt-1 text-pretty text-sm leading-relaxed text-[var(--dashboard-text-secondary)]">
            Interroga slide, trascrizioni e riassunti dei tuoi corsi, con le fonti.
          </p>
        </div>
        {documents.length > 0 && (
          <p className="pb-0.5 text-sm tabular-nums text-[var(--dashboard-text-muted)]">
            <span className="font-medium text-[var(--dashboard-text-secondary)]">{readyCount}</span>{' '}
            {readyCount === 1 ? 'documento pronto' : 'documenti pronti'} in{' '}
            <span className="font-medium text-[var(--dashboard-text-secondary)]">{courses.length}</span>{' '}
            {courses.length === 1 ? 'corso' : 'corsi'}
            {processingCount > 0 && ` · ${processingCount} in elaborazione`}
          </p>
        )}
      </header>

      {dbError && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
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

      <div
        className={`grid items-start gap-6 ${
          expanded ? 'lg:grid-cols-1' : 'lg:grid-cols-[21rem_minmax(0,1fr)] xl:grid-cols-[23rem_minmax(0,1fr)]'
        }`}
      >
        <div className={expanded ? 'contents lg:hidden' : 'contents'}>
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
        </div>
        <ChatPanel
          expanded={expanded}
          onToggleExpand={toggleExpanded}
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
          attachments={attachments}
          onAttach={attachFiles}
          onRemoveAttachment={removeAttachment}
          hasDocuments={readyDocuments.length > 0}
        />
      </div>
    </div>
  )
}
