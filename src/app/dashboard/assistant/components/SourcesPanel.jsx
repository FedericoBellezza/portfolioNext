'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronDown, FileText, Loader2, Sparkles, Trash2, Upload } from 'lucide-react'
import { ACCEPTED_EXTENSIONS, FILE_TYPE_LABELS, formatBytes } from '@/lib/assistant/constants'
import AssistantSelect from './AssistantSelect'

const ACCEPT = ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(',')

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
    return (
      <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--dashboard-text-muted)]">
        <Loader2 className="h-3 w-3 animate-spin" />
        Figure: {progress.done}/{progress.total}
      </p>
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
        className="inline-flex items-center gap-1 text-[var(--dashboard-accent)] hover:underline"
      >
        <Sparkles className="h-3 w-3" />
        {done > 0 ? `Riprendi analisi figure (${done}/${total})` : `Analizza figure (${total})`}
      </button>
    </div>
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
        className="h-9 w-full rounded-md border border-[var(--dashboard-border)] bg-white pl-3 pr-8 text-sm outline-none focus:border-[var(--dashboard-accent)]"
      />
      <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-[var(--dashboard-text-muted)]" />

      {showList && (
        // onMouseDown evita che l'input perda il focus (e chiuda la lista) prima del click
        <ul
          id={listId}
          role="listbox"
          onMouseDown={(event) => event.preventDefault()}
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-card-bg)] p-1 text-sm shadow-md"
        >
          {matches.map((name, index) => (
            <li
              key={name}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              onClick={() => select(name)}
              onMouseEnter={() => setActive(index)}
              className={`cursor-pointer truncate rounded-sm px-2 py-1.5 text-[var(--dashboard-text)] ${
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
  const [openCourses, setOpenCourses] = useState(() => new Set())

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

  function handleFiles(fileList) {
    const files = Array.from(fileList ?? [])
    if (!files.length || !targetCourse) return
    onUpload(files, targetCourse)
  }

  return (
    <aside className="order-2 space-y-4 lg:order-1">
      <section className="rounded-xl border border-[var(--dashboard-card-border)] bg-[var(--dashboard-card-bg)] p-4">
        <label htmlFor="assistant-course-filter" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--dashboard-text-secondary)]">
          Corso
        </label>
        <AssistantSelect
          id="assistant-course-filter"
          value={course}
          onChange={onCourseChange}
          options={courses.map((name) => ({ value: name, label: name }))}
          allLabel="Tutti i corsi"
        />
        <p className="mt-1.5 text-xs text-[var(--dashboard-text-muted)]">
          Le domande cercano solo nel corso scelto; con &quot;Tutti i corsi&quot; cercano ovunque.
        </p>
      </section>

      <section className="rounded-xl border border-[var(--dashboard-card-border)] bg-[var(--dashboard-card-bg)] p-4">
        <h2 className="mb-3 font-serif text-lg font-semibold">Carica materiali</h2>

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
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            handleFiles(event.dataTransfer.files)
          }}
          className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-5 text-center text-sm transition-colors ${
            !targetCourse || disabled
              ? 'cursor-not-allowed border-[var(--dashboard-border)] text-[var(--dashboard-text-muted)]'
              : dragging
                ? 'border-[var(--dashboard-accent)] bg-[var(--dashboard-bg-secondary)]'
                : 'border-[var(--dashboard-border)] text-[var(--dashboard-text-secondary)] hover:border-[var(--dashboard-accent)]'
          }`}
        >
          <Upload className="h-5 w-5" />
          <span>{targetCourse ? 'Trascina qui i file o clicca' : 'Indica prima il corso'}</span>
          <span className="text-xs text-[var(--dashboard-text-muted)]">
            PDF, PPTX, DOCX, TXT, MD, SRT/VTT, immagini · max 50 MB
          </span>
          <input
            type="file"
            multiple
            accept={ACCEPT}
            disabled={!targetCourse || disabled}
            className="sr-only"
            onChange={(event) => {
              handleFiles(event.target.files)
              event.target.value = ''
            }}
          />
        </label>

        <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-[var(--dashboard-text-secondary)]">
          <input
            type="checkbox"
            checked={analyzeFigures}
            onChange={(event) => onAnalyzeFiguresChange(event.target.checked)}
            className="mt-0.5 accent-[var(--dashboard-accent)]"
          />
          <span>
            Analizza anche grafici, schemi e immagini delle slide
            <span className="block text-[var(--dashboard-text-muted)]">
              Usa la vision di OpenAI (pochi centesimi a documento): tieni aperta la pagina finché finisce.
            </span>
          </span>
        </label>

        {uploads.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {uploads.map((upload) => (
              <li key={upload.id} className="flex items-start gap-2 text-xs">
                {upload.status === 'error' ? (
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                ) : upload.status === 'done' ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                ) : (
                  <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-[var(--dashboard-text-muted)]" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-[var(--dashboard-text)]">{upload.name}</span>
                  <span className={upload.status === 'error' ? 'text-red-600' : 'text-[var(--dashboard-text-muted)]'}>
                    {upload.message}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-[var(--dashboard-card-border)] bg-[var(--dashboard-card-bg)] p-4">
        <h2 className="mb-3 font-serif text-lg font-semibold">
          Documenti <span className="text-sm font-normal text-[var(--dashboard-text-muted)]">({visible.length})</span>
        </h2>

        {visible.length === 0 ? (
          <p className="text-sm text-[var(--dashboard-text-muted)]">Nessun documento caricato.</p>
        ) : (
          <div className="max-h-[22rem] space-y-1 overflow-y-auto pr-1">
            {Object.entries(grouped).map(([courseName, docs], index) => {
              const isOpen = openCourses.has(courseName)
              const courseDeleting = deletingCourses.has(courseName)
              const listId = `assistant-course-docs-${index}`
              return (
                <div key={courseName}>
                  <div className="group flex items-center gap-1 rounded-md hover:bg-[var(--dashboard-bg)]">
                    <button
                      type="button"
                      onClick={() => toggleCourse(courseName)}
                      aria-expanded={isOpen}
                      aria-controls={listId}
                      className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left"
                    >
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-[var(--dashboard-text-muted)] transition-transform ${
                          isOpen ? '' : '-rotate-90'
                        }`}
                      />
                      <span
                        className="truncate text-xs font-semibold uppercase tracking-wide text-[var(--dashboard-text-secondary)]"
                        title={courseName}
                      >
                        {courseName}
                      </span>
                      <span className="shrink-0 text-xs text-[var(--dashboard-text-muted)]">({docs.length})</span>
                    </button>
                    {courseDeleting ? (
                      <span role="status" aria-label={`Eliminazione di ${courseName}…`} className="shrink-0 p-1">
                        <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onDeleteCourse(courseName)}
                        aria-label={`Elimina il corso ${courseName} e tutti i suoi documenti`}
                        className="shrink-0 rounded p-1 text-[var(--dashboard-text-muted)] opacity-0 transition hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {isOpen && (
                    <ul id={listId} className="mb-2 mt-1 space-y-1 pl-3">
                      {docs.map((doc) => {
                        const deleting = deletingDocs.has(doc.id)
                        return (
                          <li
                            key={doc.id}
                            aria-busy={deleting}
                            className={`group flex items-start gap-2 rounded-md px-1.5 py-1.5 hover:bg-[var(--dashboard-bg)] ${
                              deleting ? 'opacity-60' : ''
                            }`}
                          >
                            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dashboard-text-muted)]" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-[var(--dashboard-text)]" title={doc.name}>
                                {doc.name}
                              </p>
                              <p className="text-xs text-[var(--dashboard-text-muted)]">
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
                            ) : (
                              <>
                                <StatusIcon status={doc.status} title={doc.error_msg} />
                                <button
                                  type="button"
                                  onClick={() => onDelete(doc)}
                                  aria-label={`Elimina ${doc.name}`}
                                  className="shrink-0 rounded p-1 text-[var(--dashboard-text-muted)] opacity-0 transition hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
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
    </aside>
  )
}
