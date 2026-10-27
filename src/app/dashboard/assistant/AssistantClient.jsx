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
  QUIZ_BATCH_SIZE,
  QUIZ_MAX_QUESTIONS,
  isAcceptedFile,
  sanitizeFileName,
} from '@/lib/assistant/constants'
import { quizToText } from '@/lib/assistant/quiz'
import { buildBugReport, copyToClipboard } from '@/lib/assistant/bugReport'
import ChatPanel from './components/ChatPanel'
import SourcesPanel from './components/SourcesPanel'

const EMPTY_SCOPE = { courses: [], folders: [], documentIds: [] }

function toInt(value) {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

// 30 domande → blocchi da 8, 8, 7, 7: della stessa taglia, per non finire con un blocco da una domanda sola.
function splitQuizBatches(total) {
  const parts = Math.ceil(total / QUIZ_BATCH_SIZE)
  const base = Math.floor(total / parts)
  const extra = total % parts
  return Array.from({ length: parts }, (_, index) => base + (index < extra ? 1 : 0))
}

// Ogni blocco numera le sue domande da q1 e le sue fonti da F1: si rendono uniche e la fonte si porta con la domanda.
function prepareQuizQuestions(data, batchIndex) {
  return data.quiz.questions.map((question) => ({
    ...question,
    id: `b${batchIndex}-${question.id}`,
    sourceInfo: data.sources.find((source) => source.n === question.source) ?? null,
  }))
}

export default function AssistantClient({ initialDocuments, initialFolders, dbError }) {
  const [documents, setDocuments] = useState(initialDocuments)
  // Cartelle create dall'utente: [{ course, name }]. Un documento con `folder` ne indica l'appartenenza.
  const [folders, setFolders] = useState(initialFolders)
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
  // Quiz lunghi in generazione a blocchi: messageId -> stato del lavoro. `epoch` annulla quelli di una chat azzerata.
  const quizJobs = useRef(new Map())
  const quizEpoch = useRef(0)

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('ask')
  // Contesto della chat: corsi, cartelle e documenti, anche mescolati. Tutto vuoto = tutti i materiali.
  const [scope, setScope] = useState(EMPTY_SCOPE)
  const [count, setCount] = useState('')

  // Allegati del prossimo messaggio: { id, name, size, status: 'uploading' | 'ready' | 'error', path?, message? }
  const [attachments, setAttachments] = useState([])

  const courses = useMemo(() => [...new Set(documents.map((doc) => doc.course))].sort(), [documents])
  const readyDocuments = useMemo(() => documents.filter((doc) => doc.status === 'ready'), [documents])

  // Corsi, cartelle e documenti spariti (eliminati, spostati, ancora in elaborazione) escono dal contesto.
  useEffect(() => {
    setScope((current) => {
      const ids = new Set(readyDocuments.map((doc) => doc.id))
      const courseNames = new Set(readyDocuments.map((doc) => doc.course))
      const folderKeys = new Set(readyDocuments.filter((doc) => doc.folder).map((doc) => JSON.stringify([doc.course, doc.folder])))
      const next = {
        courses: current.courses.filter((name) => courseNames.has(name)),
        folders: current.folders.filter((folder) => folderKeys.has(JSON.stringify([folder.course, folder.name]))),
        documentIds: current.documentIds.filter((id) => ids.has(id)),
      }
      const same =
        next.courses.length === current.courses.length &&
        next.folders.length === current.folders.length &&
        next.documentIds.length === current.documentIds.length
      return same ? current : next
    })
  }, [readyDocuments])

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
    if (response.ok && data?.ok) {
      setDocuments(data.documents)
      setFolders(data.folders ?? [])
    }
  }

  async function createFolder(courseName, name) {
    try {
      const response = await fetch('/api/assistant/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course: courseName, name }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.ok) return { ok: false, error: data?.error ?? `Errore ${response.status}` }
      await refreshDocuments()
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error.message }
    }
  }

  // I documenti della cartella non si cancellano: tornano direttamente nel corso.
  async function deleteFolder(courseName, name) {
    const response = await fetch(
      `/api/assistant/folders?course=${encodeURIComponent(courseName)}&name=${encodeURIComponent(name)}`,
      { method: 'DELETE' },
    )
    if (response.ok) await refreshDocuments()
  }

  async function renameFolder(courseName, name, newName) {
    try {
      const response = await fetch('/api/assistant/folders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course: courseName, name, newName }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.ok) return { ok: false, error: data?.error ?? `Errore ${response.status}` }
      // La cartella rinominata resta nel contesto con il nuovo nome.
      setScope((current) => ({
        ...current,
        folders: current.folders.map((folder) =>
          folder.course === courseName && folder.name === name ? { ...folder, name: newName } : folder,
        ),
      }))
      await refreshDocuments()
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error.message }
    }
  }

  // Sposta uno o più documenti (dello stesso corso) in una cartella; folder null = fuori da ogni cartella.
  async function moveDocuments(docs, folder) {
    try {
      const response = await fetch('/api/assistant/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: docs.map((doc) => doc.id), folder }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.ok) return { ok: false, error: data?.error ?? `Errore ${response.status}` }
      await refreshDocuments()
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error.message }
    }
  }

  // "Chiedi solo qui": il contesto della chat diventa questa cartella.
  function focusFolder(courseName, folderName) {
    setCourse(courseName)
    setScope({ courses: [], folders: [{ course: courseName, name: folderName }], documentIds: [] })
  }

  // Il filtro del pannello imposta anche il contesto: un corso, oppure tutti i materiali.
  function changeCourse(next) {
    setCourse(next)
    setScope(next ? { courses: [next], folders: [], documentIds: [] } : EMPTY_SCOPE)
  }

  function patchUpload(id, patch) {
    setUploads((current) => current.map((upload) => (upload.id === id ? { ...upload, ...patch } : upload)))
  }

  async function uploadFiles(files, targetCourse, targetFolder) {
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
          body: JSON.stringify({ path, name: file.name, course: targetCourse, folder: targetFolder || null }),
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

  // Un documento dell'elenco si apre come una fonte citata, dalla prima pagina.
  function openDocument(doc) {
    return openSource({ filePath: doc.file_path, fileType: doc.file_type })
  }

  function copyBugReport() {
    const report = buildBugReport({
      messages,
      documents,
      filters: {
        mode,
        course: [...scope.courses, ...scope.folders.map((folder) => `${folder.course} / ${folder.name}`)].join(', '),
        documentNames: scope.documentIds.map((id) => documents.find((doc) => doc.id === id)?.name).filter(Boolean),
        count,
      },
    })
    return copyToClipboard(report)
  }

  // Il risultato di un quiz entra nel testo del messaggio (in testa, il server legge solo l'inizio di ogni turno):
  // così un "spiegami la 3" successivo sa com'è andato.
  function finishQuiz(messageId, summary) {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId ? { ...message, content: `${summary}\n\n${quizToText(message.quiz.questions)}` } : message,
      ),
    )
  }

  function updateQuiz(messageId, patch) {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId && message.quiz ? { ...message, quiz: { ...message.quiz, ...patch } } : message,
      ),
    )
  }

  async function requestChat(body) {
    const response = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.ok) throw new Error(data?.error ?? `Errore ${response.status}`)
    return data
  }

  // Un quiz lungo si genera a blocchi: il primo arriva con la risposta di `send`, gli altri qui, uno alla volta,
  // mentre l'utente risponde. Un errore ferma la sequenza e si riprende da dove era con `retryQuiz`.
  async function runQuizJob(messageId) {
    const job = quizJobs.current.get(messageId)
    if (!job || job.running) return
    const epoch = quizEpoch.current
    job.running = true
    updateQuiz(messageId, { pending: true, error: null })

    try {
      while (job.next < job.batches.length) {
        const data = await requestChat({
          ...job.base,
          count: job.batches[job.next],
          quizPart: { index: job.next, total: job.batches.length },
          // Le domande già fatte, perché i blocchi non si ripetano.
          exclude: job.questions.map((item) => item.question.slice(0, 120)).slice(-60),
        })
        if (quizEpoch.current !== epoch) return
        job.questions = [...job.questions, ...prepareQuizQuestions(data, job.next)]
        job.next += 1
        updateQuiz(messageId, { questions: job.questions, pending: job.next < job.batches.length })
      }
    } catch (error) {
      if (quizEpoch.current === epoch) updateQuiz(messageId, { pending: false, error: error.message })
    } finally {
      job.running = false
    }
  }

  function retryQuiz(messageId) {
    runQuizJob(messageId)
  }

  // "Nuova chat" ferma anche i quiz ancora in generazione.
  function resetChat() {
    quizEpoch.current += 1
    quizJobs.current.clear()
    setMessages([])
  }

  // `request` serve alle richieste che partono da un pulsante (es. "Spiegami gli errori"):
  // niente casella di testo né allegati, e sempre in modalità domanda anche se la scheda attiva è un'altra.
  async function send(request) {
    const fromButton = typeof request?.text === 'string'
    const text = (fromButton ? request.text : input).trim()
    const sendMode = fromButton ? request.mode ?? 'ask' : mode
    if (!text || loading || (!fromButton && attachments.some((item) => item.status === 'uploading'))) return

    // Gli allegati con errore non partono: restano solo quelli caricati.
    const sent = fromButton ? [] : attachments.filter((item) => item.status === 'ready')

    // Il server accetta al massimo 8000 caratteri per messaggio di storia. Degli allegati dei turni
    // precedenti resta solo il nome: il testo è stato letto una volta e non viene rimandato.
    const history = messages
      .filter((message) => !message.error)
      .slice(-10)
      .map((message) => {
        const files = message.attachments?.length ? `[Allegati: ${message.attachments.map((a) => a.name).join(', ')}]\n` : ''
        // Il contenuto dei file generati non torna al modello: nella storia resta solo il loro nome.
        const generated = message.files?.length ? `\n[File generati: ${message.files.map((f) => f.name).join(', ')}]` : ''
        return { role: message.role, content: `${files}${message.content}${generated}`.slice(0, 8000) }
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
    if (!fromButton) {
      setInput('')
      setAttachments([])
    }
    setLoading(true)

    try {
      const base = {
        message: text,
        mode: sendMode,
        courses: scope.courses,
        folders: scope.folders,
        documentIds: scope.documentIds,
        history,
      }
      const attachmentsPayload = sent.map((item) => ({ path: item.path, name: item.name }))

      // Per un quiz `count` è il totale: sopra la dimensione di un blocco si divide in più richieste.
      // Gli allegati si leggono una sola volta, quindi con un allegato il quiz resta in un solo blocco.
      const wanted = toInt(count) ?? QUIZ_BATCH_SIZE
      const total = sendMode === 'quiz' ? Math.min(wanted, sent.length ? QUIZ_BATCH_SIZE : QUIZ_MAX_QUESTIONS) : null
      const batches = sendMode === 'quiz' ? splitQuizBatches(total) : []

      const data = await requestChat(
        sendMode === 'quiz'
          ? {
              ...base,
              count: batches[0],
              attachments: attachmentsPayload,
              ...(batches.length > 1 ? { quizPart: { index: 0, total: batches.length } } : {}),
            }
          : { ...base, count: toInt(count), attachments: attachmentsPayload },
      )

      const messageId = crypto.randomUUID()
      const questions = data.quiz ? prepareQuizQuestions(data, 0) : null
      setMessages((current) => [
        ...current,
        {
          id: messageId,
          role: 'assistant',
          content: data.text,
          // Un quiz si compila nell'interfaccia: `content` resta la sua versione testuale per cronologia e copia.
          ...(questions ? { quiz: { questions, expected: total, pending: batches.length > 1, error: null } } : {}),
          sources: data.sources,
          files: data.files ?? [],
          truncated: data.truncated,
          mode: sendMode,
        },
      ])

      if (questions && batches.length > 1) {
        quizJobs.current.set(messageId, { base, batches, next: 1, questions, running: false })
        runQuizJob(messageId)
      }
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
          {/* <p className="mt-1 text-pretty text-sm leading-relaxed text-[var(--dashboard-text-secondary)]">
            Interroga slide, trascrizioni e riassunti dei tuoi corsi, con le fonti.
          </p> */}
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
          folders={folders}
          courses={courses}
          course={course}
          onCourseChange={changeCourse}
          onCreateFolder={createFolder}
          onDeleteFolder={deleteFolder}
          onRenameFolder={renameFolder}
          onMoveDocuments={moveDocuments}
          onFocusFolder={focusFolder}
          uploads={uploads}
          onUpload={uploadFiles}
          onDelete={deleteDocument}
          onOpenDocument={openDocument}
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
          onSend={() => send()}
          onAsk={(text) => send({ text, mode: 'ask' })}
          onQuizFinish={finishQuiz}
          onQuizRetry={retryQuiz}
          onReset={resetChat}
          mode={mode}
          onModeChange={setMode}
          readyDocuments={readyDocuments}
          scope={scope}
          onScopeChange={setScope}
          count={count}
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
