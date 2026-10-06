'use client'

import { useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FileText,
  FolderOpen,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import { ACCEPTED_EXTENSIONS, FILE_TYPE_LABELS, formatBytes } from '@/lib/assistant/constants'
import AssistantSelect from './AssistantSelect'

const ACCEPT = ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(',')

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]/40'

const SECTION_TITLE = 'font-serif text-lg font-semibold tracking-tight text-[var(--dashboard-text)]'

function StatusIcon({ status, title }) {
  if (status === 'ready') return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Pronto" />
  if (status === 'error') return <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-label={title ?? 'Errore'} />
  return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--dashboard-text-muted)]" aria-label="In elaborazione" />
}

// Stato dell'analisi delle figure di un documento (grafici, schemi, immagini): in corso, finita,
// da avviare o da riprendere. Il testo del documento è usabile anche prima che finisca.
function FigureStatus({ doc, progress, error, onAnalyze }) {
  const total = doc.visual_total ?? 0
  if (doc.status !== 'ready' || !total) return null

  if (progress) {
    const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0
    return (
      <div className="mt-1.5">
        <p className="flex items-center gap-1 text-xs tabular-nums text-[var(--dashboard-text-muted)]">
          <Loader2 className="h-3 w-3 animate-spin" />
          Figure: {progress.done}/{progress.total}
        </p>
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Avanzamento analisi figure"
          className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--dashboard-bg-secondary)]"
        >
          <div
            className="h-full rounded-full bg-[var(--dashboard-accent)] transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    )
  }
  if (doc.visual_status === 'done') {
    return (
      <p className="mt-0.5 flex items-center gap-1 text-xs text-emerald-700">
        <Sparkles className="h-3 w-3" />
        Figure analizzate ({total})
      </p>
    )
  }

  const failure = error ?? (doc.visual_status === 'error' ? doc.visual_error : null)
  const done = doc.visual_done ?? 0
  return (
    <div className="mt-0.5 text-xs">
      {failure && <p className="text-red-600">{failure}</p>}
      <button
        type="button"
        onClick={onAnalyze}
        className={`inline-flex cursor-pointer items-center gap-1 rounded text-[var(--dashboard-accent)] hover:underline ${FOCUS_RING}`}
      >
        <Sparkles className="h-3 w-3" />
        {done > 0 ? `Riprendi analisi figure (${done}/${total})` : `Analizza figure (${total})`}
      </button>
    </div>
  )
}

// Conferma inline al posto del dialogo del browser: "Elimina?  Sì  No".
function ConfirmDelete({ label, onConfirm, onCancel }) {
  return (
    <span role="group" aria-label={label} className="flex shrink-0 items-center gap-1 text-xs">
      <span className="text-[var(--dashboard-text-secondary)]">Elimina?</span>
      <button
        type="button"
        autoFocus
        onClick={onConfirm}
        className={`cursor-pointer rounded bg-red-600 px-2 py-0.5 font-medium text-white transition-colors hover:bg-red-700 active:scale-95 ${FOCUS_RING}`}
      >
        Sì
      </button>
      <button
        type="button"
        onClick={onCancel}
        className={`cursor-pointer rounded px-2 py-0.5 font-medium text-[var(--dashboard-text-secondary)] transition-colors hover:bg-[var(--dashboard-bg-secondary)] active:scale-95 ${FOCUS_RING}`}
      >
        No
      </button>
    </span>
  )
}

function CourseCombobox({ id, value, onChange, courses, placeholder }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const query = value.trim().toLowerCase()
  const matches = query ? courses.filter((name) => name.toLowerCase().includes(query)) : courses
  const isNew = Boolean(query) && !courses.some((name) => name.toLowerCase() === query)
  const showList = open && (matches.length > 0 || isNew)
  const listId = `${id}-list`
  const optionId = (index) => `${id}-option-${index}`

  useEffect(() => {
    if (active >= 0) document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  function select(name) {
    onChange(name)
    setOpen(false)
    setActive(-1)
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((i) => (matches.length ? (i + 1) % matches.length : -1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActive((i) => (matches.length ? (i <= 0 ? matches.length - 1 : i - 1) : -1))
    } else if (event.key === 'Enter' && showList && active >= 0) {
      event.preventDefault()
      select(matches[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative mb-3">
      <input
        id={id}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={100}
        aria-label="Corso di destinazione"
        className="h-9 w-full rounded-lg border border-[var(--dashboard-border)] bg-white pl-3 pr-8 text-sm outline-none transition-colors placeholder:text-[var(--dashboard-text-muted)] focus:border-[var(--dashboard-accent)] focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]/25"
      />
      <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-[var(--dashboard-text-muted)]" />

      {showList && (
        // onMouseDown evita che l'input perda il focus (e chiuda la lista) prima del click
        <ul
          id={listId}
          role="listbox"
          onMouseDown={(event) => event.preventDefault()}
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-card-bg)] p-1 text-sm shadow-[0_12px_24px_-12px_rgba(120,80,60,0.35)]"
        >
          {matches.map((name, index) => (
            <li
              key={name}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              onClick={() => select(name)}
              onMouseEnter={() => setActive(index)}
              className={`cursor-pointer truncate rounded-md px-2 py-1.5 text-[var(--dashboard-text)] ${
                index === active ? 'bg-[var(--dashboard-bg-secondary)]' : ''
              }`}
            >
              {name}
            </li>
          ))}
          {isNew && (
            <li role="presentation" className="truncate px-2 py-1.5 text-xs text-[var(--dashboard-text-muted)]">
              Nuovo corso: &quot;{value.trim()}&quot;
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

export default function SourcesPanel({
  documents,
  courses,
  course,
  onCourseChange,
  uploads,
  onUpload,
  onDelete,
  onDeleteCourse,
  deletingDocs,
  deletingCourses,
  analyzeFigures,
  onAnalyzeFiguresChange,
  visualProgress,
  visualErrors,
  onAnalyzeVisuals,
  disabled,
}) {
  const [uploadCourse, setUploadCourse] = useState('')
  const [dragging, setDragging] = useState(false)
  // I gruppi partono chiusi: si tengono quelli aperti dall'utente.
  const [openCourses, setOpenCourses] = useState(() => new Set())
  // Elemento in attesa di conferma di eliminazione: 'doc:<id>' o 'course:<nome>'.
  const [confirming, setConfirming] = useState(null)

  function toggleCourse(name) {
    setOpenCourses((current) => {
      const next = new Set(current)
      if (!next.delete(name)) next.add(name)
      return next
    })
  }

  const targetCourse = (uploadCourse || course).trim()
  const visible = course ? documents.filter((doc) => doc.course === course) : documents
  const grouped = visible.reduce((acc, doc) => {
    ;(acc[doc.course] ??= []).push(doc)
    return acc
  }, {})
  const dropDisabled = !targetCourse || disabled

  function handleFiles(fileList) {
    const files = Array.from(fileList ?? [])
    if (!files.length || !targetCourse) return
    onUpload(files, targetCourse)
  }

  function confirmDelete(action) {
    setConfirming(null)
    action()
  }

  return (
    <aside id="assistant-sources" aria-label="Materiali di studio" className="order-2 scroll-mt-24 lg:order-1">
      <div className="divide-y divide-[var(--dashboard-card-border)] rounded-2xl border border-[var(--dashboard-card-border)] bg-[var(--dashboard-card-bg)] shadow-[0_1px_2px_rgba(120,80,60,0.05)]">
        <section className="p-4">
          <label htmlFor="assistant-course-filter" className="mb-1.5 block text-sm font-medium text-[var(--dashboard-text)]">
            Corso
          </label>
          <AssistantSelect
            id="assistant-course-filter"
            value={course}
            onChange={onCourseChange}
            options={courses.map((name) => ({ value: name, label: name }))}
            allLabel="Tutti i corsi"
          />
          <p className="mt-1.5 text-pretty text-xs leading-relaxed text-[var(--dashboard-text-muted)]">
            Le domande cercano solo nel corso scelto; con &quot;Tutti i corsi&quot; cercano ovunque.
          </p>
        </section>

        <section className="p-4">
          <h2 className={`mb-3 ${SECTION_TITLE}`}>Carica materiali</h2>

          <CourseCombobox
            id="assistant-upload-course"
            value={uploadCourse}
            onChange={setUploadCourse}
            courses={courses}
            placeholder={course ? `Corso (default: ${course})` : 'Corso (es. Economia aziendale)'}
          />

          <label
            onDragOver={(event) => {
              event.preventDefault()
              if (!dropDisabled) setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              handleFiles(event.dataTransfer.files)
            }}
            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-3 py-5 text-center text-sm transition-all focus-within:ring-2 focus-within:ring-[var(--dashboard-accent)]/40 ${
              dropDisabled
                ? 'cursor-not-allowed border-[var(--dashboard-border)] bg-[var(--dashboard-bg)]/50 text-[var(--dashboard-text-muted)]'
                : dragging
                  ? 'cursor-pointer border-[var(--dashboard-accent)] bg-[var(--dashboard-accent)]/5 text-[var(--dashboard-accent)]'
                  : 'cursor-pointer border-[var(--dashboard-border)] text-[var(--dashboard-text-secondary)] hover:border-[var(--dashboard-accent)] hover:bg-[var(--dashboard-bg)]/60'
            }`}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                dragging ? 'bg-[var(--dashboard-accent)] text-white' : 'bg-[var(--dashboard-bg-secondary)]'
              }`}
            >
              <Upload className="h-4 w-4" />
            </span>
            <span className="font-medium">
              {disabled ? 'Database non disponibile' : targetCourse ? 'Trascina qui i file o clicca' : 'Indica prima il corso'}
            </span>
            <span className="text-xs text-[var(--dashboard-text-muted)]">
              PDF, PPTX, DOCX, TXT, MD, SRT/VTT, immagini · max 50 MB
            </span>
            <input
              type="file"
              multiple
              accept={ACCEPT}
              disabled={dropDisabled}
              className="sr-only"
              onChange={(event) => {
                handleFiles(event.target.files)
                event.target.value = ''
              }}
            />
          </label>

          <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm text-[var(--dashboard-text-secondary)]">
            <input
              type="checkbox"
              checked={analyzeFigures}
              onChange={(event) => onAnalyzeFiguresChange(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--dashboard-accent)]"
            />
            <span>
              Analizza anche grafici, schemi e immagini delle slide
              <span className="mt-0.5 block text-pretty text-xs leading-relaxed text-[var(--dashboard-text-muted)]">
                Usa la vision di OpenAI (pochi centesimi a documento): tieni aperta la pagina finché finisce.
              </span>
            </span>
          </label>

          {uploads.length > 0 && (
            <ul aria-live="polite" className="mt-3 space-y-2 rounded-xl bg-[var(--dashboard-bg)] p-2.5">
              {uploads.map((upload) => (
                <li key={upload.id} className="flex items-start gap-2 text-xs">
                  {upload.status === 'error' ? (
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                  ) : upload.status === 'done' ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  ) : (
                    <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-[var(--dashboard-accent)]" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-[var(--dashboard-text)]">{upload.name}</span>
                    <span className={upload.status === 'error' ? 'text-red-600' : 'text-[var(--dashboard-text-muted)]'}>
                      {upload.message}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="p-4">
          <h2 className={`mb-3 flex items-baseline gap-2 ${SECTION_TITLE}`}>
            Documenti
            <span className="text-sm font-normal tabular-nums text-[var(--dashboard-text-muted)]">{visible.length}</span>
          </h2>

          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--dashboard-border)] px-4 py-6 text-center">
              <FolderOpen className="h-5 w-5 text-[var(--dashboard-text-muted)]" />
              <p className="text-sm font-medium text-[var(--dashboard-text-secondary)]">Nessun documento</p>
              <p className="text-pretty text-xs leading-relaxed text-[var(--dashboard-text-muted)]">
                {course
                  ? `Il corso "${course}" è vuoto. Carica i primi file qui sopra.`
                  : 'Indica un corso e carica slide, trascrizioni o riassunti per iniziare.'}
              </p>
            </div>
          ) : (
            <div className="max-h-[24rem] space-y-1 overflow-y-auto pr-1">
              {Object.entries(grouped).map(([courseName, docs], index) => {
                const isOpen = openCourses.has(courseName)
                const courseDeleting = deletingCourses.has(courseName)
                const courseConfirming = confirming === `course:${courseName}`
                const listId = `assistant-course-docs-${index}`
                return (
                  <div key={courseName}>
                    <div className="group flex items-center gap-1 rounded-lg hover:bg-[var(--dashboard-bg)]">
                      <button
                        type="button"
                        onClick={() => toggleCourse(courseName)}
                        aria-expanded={isOpen}
                        aria-controls={listId}
                        className={`flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-left ${FOCUS_RING}`}
                      >
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-[var(--dashboard-text-muted)] transition-transform duration-200 ${
                            isOpen ? '' : '-rotate-90'
                          }`}
                        />
                        <span
                          className="truncate text-sm font-semibold text-[var(--dashboard-text)]"
                          title={courseName}
                        >
                          {courseName}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-[var(--dashboard-text-muted)]">
                          {docs.length}
                        </span>
                      </button>
                      {courseDeleting ? (
                        <span role="status" aria-label={`Eliminazione di ${courseName}…`} className="shrink-0 p-1">
                          <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                        </span>
                      ) : courseConfirming ? (
                        <ConfirmDelete
                          label={`Conferma eliminazione del corso ${courseName}`}
                          onConfirm={() => confirmDelete(() => onDeleteCourse(courseName))}
                          onCancel={() => setConfirming(null)}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirming(`course:${courseName}`)}
                          aria-label={`Elimina il corso ${courseName} e tutti i suoi documenti`}
                          className={`shrink-0 cursor-pointer rounded p-1 text-[var(--dashboard-text-muted)] opacity-0 transition hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100 ${FOCUS_RING}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {isOpen && (
                      <ul id={listId} className="mb-2 mt-1 space-y-0.5 border-l border-[var(--dashboard-card-border)] pl-2 ml-3">
                        {docs.map((doc) => {
                          const deleting = deletingDocs.has(doc.id)
                          const docConfirming = confirming === `doc:${doc.id}`
                          return (
                            <li
                              key={doc.id}
                              aria-busy={deleting}
                              className={`group flex items-start gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-[var(--dashboard-bg)] ${
                                deleting ? 'opacity-60' : ''
                              }`}
                            >
                              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dashboard-text-muted)]" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm text-[var(--dashboard-text)]" title={doc.name}>
                                  {doc.name}
                                </p>
                                <p className="text-xs tabular-nums text-[var(--dashboard-text-muted)]">
                                  {[
                                    FILE_TYPE_LABELS[doc.file_type] ?? doc.file_type,
                                    doc.page_count ? `${doc.page_count} pag.` : null,
                                    formatBytes(doc.file_size),
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </p>
                                {doc.status === 'error' && doc.error_msg && (
                                  <p className="mt-0.5 text-xs text-red-600">{doc.error_msg}</p>
                                )}
                                <FigureStatus
                                  doc={doc}
                                  progress={visualProgress[doc.id]}
                                  error={visualErrors[doc.id]}
                                  onAnalyze={() => onAnalyzeVisuals(doc)}
                                />
                              </div>
                              {deleting ? (
                                <span role="status" aria-label={`Eliminazione di ${doc.name}…`} className="shrink-0 p-1">
                                  <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                                </span>
                              ) : docConfirming ? (
                                <ConfirmDelete
                                  label={`Conferma eliminazione di ${doc.name}`}
                                  onConfirm={() => confirmDelete(() => onDelete(doc))}
                                  onCancel={() => setConfirming(null)}
                                />
                              ) : (
                                <>
                                  <StatusIcon status={doc.status} title={doc.error_msg} />
                                  <button
                                    type="button"
                                    onClick={() => setConfirming(`doc:${doc.id}`)}
                                    aria-label={`Elimina ${doc.name}`}
                                    className={`shrink-0 cursor-pointer rounded p-1 text-[var(--dashboard-text-muted)] opacity-0 transition hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100 ${FOCUS_RING}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </aside>
  )
}
