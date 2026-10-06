'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronDown, FileText, Loader2, Trash2, Upload } from 'lucide-react'
import { ACCEPTED_EXTENSIONS, FILE_TYPE_LABELS, formatBytes } from '@/lib/assistant/constants'

const ACCEPT = ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(',')

function StatusIcon({ status, title }) {
  if (status === 'ready') return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Pronto" />
  if (status === 'error') return <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-label={title ?? 'Errore'} />
  return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--dashboard-text-muted)]" aria-label="In elaborazione" />
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
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-[var(--dashboard-border)] bg-white py-1 text-sm shadow-md"
        >
          {matches.map((name, index) => (
            <li
              key={name}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              onClick={() => select(name)}
              onMouseEnter={() => setActive(index)}
              className={`cursor-pointer truncate px-3 py-1.5 text-[var(--dashboard-text)] ${
                index === active ? 'bg-[var(--dashboard-bg-secondary)]' : ''
              }`}
            >
              {name}
            </li>
          ))}
          {isNew && (
            <li role="presentation" className="truncate px-3 py-1.5 text-xs text-[var(--dashboard-text-muted)]">
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
  disabled,
}) {
  const [uploadCourse, setUploadCourse] = useState('')
  const [dragging, setDragging] = useState(false)

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
        <select
          id="assistant-course-filter"
          value={course}
          onChange={(event) => onCourseChange(event.target.value)}
          className="h-9 w-full rounded-md border border-[var(--dashboard-border)] bg-white px-2 text-sm text-[var(--dashboard-text)] outline-none focus:border-[var(--dashboard-accent)]"
        >
          <option value="">Tutti i corsi</option>
          {courses.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
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
          <div className="max-h-[22rem] space-y-4 overflow-y-auto pr-1">
            {Object.entries(grouped).map(([courseName, docs]) => (
              <div key={courseName}>
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--dashboard-text-secondary)]">
                  {courseName}
                </h3>
                <ul className="space-y-1">
                  {docs.map((doc) => (
                    <li
                      key={doc.id}
                      className="group flex items-start gap-2 rounded-md px-1.5 py-1.5 hover:bg-[var(--dashboard-bg)]"
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
                      </div>
                      <StatusIcon status={doc.status} title={doc.error_msg} />
                      <button
                        type="button"
                        onClick={() => onDelete(doc)}
                        aria-label={`Elimina ${doc.name}`}
                        className="shrink-0 rounded p-1 text-[var(--dashboard-text-muted)] opacity-0 transition hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </aside>
  )
}
