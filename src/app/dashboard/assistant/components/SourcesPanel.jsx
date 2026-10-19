'use client'

import { useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  ListChecks,
  Loader2,
  Pencil,
  Sparkles,
  Target,
  Trash2,
  Upload,
} from 'lucide-react'
import { ACCEPTED_EXTENSIONS, FILE_TYPE_LABELS, formatBytes } from '@/lib/assistant/constants'
import AssistantSelect from './AssistantSelect'
import SelectCheck from './SelectCheck'

const ACCEPT = ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(',')

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]/40'

// Valore della select di spostamento per "nessuna cartella" (Radix non ammette stringhe vuote).
const ROOT_FOLDER = '__root__'

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

// Campo con suggerimenti: serve sia per il corso sia per la cartella di destinazione.
function CourseCombobox({ id, value, onChange, courses, placeholder, ariaLabel = 'Corso di destinazione', newLabel = 'Nuovo corso' }) {
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
        aria-label={ariaLabel}
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
              {newLabel}: &quot;{value.trim()}&quot;
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

// Riga di un documento: selezione, stato, figure ed eliminazione.
function DocumentRow({
  doc,
  selectMode,
  selected,
  selectDisabled,
  onToggleSelect,
  deleting,
  confirming,
  onConfirm,
  onCancel,
  onAskDelete,
  progress,
  error,
  onAnalyze,
}) {
  return (
    <li
      aria-busy={deleting}
      className={`group flex items-start gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-[var(--dashboard-bg)] ${
        deleting ? 'opacity-60' : ''
      }`}
    >
      {selectMode ? (
        <span className="mt-0.5 flex shrink-0">
          <SelectCheck
            state={selected ? 'all' : 'none'}
            onToggle={onToggleSelect}
            disabled={selectDisabled || deleting}
            label={`Seleziona ${doc.name}`}
          />
        </span>
      ) : (
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dashboard-text-muted)]" />
      )}
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
        {doc.status === 'error' && doc.error_msg && <p className="mt-0.5 text-xs text-red-600">{doc.error_msg}</p>}
        <FigureStatus doc={doc} progress={progress} error={error} onAnalyze={onAnalyze} />
      </div>
      {deleting ? (
        <span role="status" aria-label={`Eliminazione di ${doc.name}…`} className="shrink-0 p-1">
          <Loader2 className="h-4 w-4 animate-spin text-red-600" />
        </span>
      ) : confirming ? (
        <ConfirmDelete label={`Conferma eliminazione di ${doc.name}`} onConfirm={onConfirm} onCancel={onCancel} />
      ) : (
        <>
          <StatusIcon status={doc.status} title={doc.error_msg} />
          <button
            type="button"
            onClick={onAskDelete}
            aria-label={`Elimina ${doc.name}`}
            className={`shrink-0 cursor-pointer rounded p-1 text-[var(--dashboard-text-muted)] opacity-0 transition hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100 ${FOCUS_RING}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )}
    </li>
  )
}

// Campo per dare un nome a una cartella: nuova (sotto il corso) o da rinominare (al posto della riga).
function FolderNameForm({ initial = '', submitLabel = 'Crea', ariaLabel, existing, onSubmit, onClose, className }) {
  const [name, setName] = useState(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || busy) return
    if (trimmed === initial) return onClose()
    if (existing.some((item) => item !== initial && item.toLowerCase() === trimmed.toLowerCase())) {
      setError('Esiste già una cartella con questo nome')
      return
    }
    setBusy(true)
    const result = await onSubmit(trimmed)
    setBusy(false)
    if (result.ok) onClose()
    else setError(result.error)
  }

  return (
    <form onSubmit={submit} className={className}>
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setError('')
          }}
          onKeyDown={(event) => event.key === 'Escape' && onClose()}
          maxLength={100}
          placeholder="Nome cartella (es. Modulo 1)"
          aria-label={ariaLabel}
          aria-invalid={Boolean(error)}
          className="h-8 min-w-0 flex-1 rounded-lg border border-[var(--dashboard-border)] bg-white px-2.5 text-sm outline-none transition-colors placeholder:text-[var(--dashboard-text-muted)] focus:border-[var(--dashboard-accent)] focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]/25"
        />
        <button
          type="submit"
          disabled={!name.trim() || busy}
          className={`h-8 shrink-0 cursor-pointer rounded-lg bg-[var(--dashboard-accent)] px-3 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : submitLabel}
        </button>
        <button
          type="button"
          onClick={onClose}
          className={`h-8 shrink-0 cursor-pointer rounded-lg px-2 text-xs font-medium text-[var(--dashboard-text-secondary)] transition-colors hover:bg-[var(--dashboard-bg-secondary)] ${FOCUS_RING}`}
        >
          Annulla
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </form>
  )
}

export default function SourcesPanel({
  documents,
  folders,
  courses,
  course,
  onCourseChange,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
  onMoveDocuments,
  onFocusFolder,
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
  // Cartella di destinazione dell'upload (facoltativa), cartelle aperte e corso in cui se ne sta creando una.
  const [uploadFolder, setUploadFolder] = useState('')
  const [openFolders, setOpenFolders] = useState(() => new Set())
  const [creatingIn, setCreatingIn] = useState(null)
  // Cartella in rinomina: stessa chiave di openFolders.
  const [renaming, setRenaming] = useState(null)
  // Selezione multipla per spostare più documenti insieme (tutti dello stesso corso).
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [moveError, setMoveError] = useState('')
  const [moving, setMoving] = useState(false)

  function toggleIn(setter, key) {
    setter((current) => {
      const next = new Set(current)
      if (!next.delete(key)) next.add(key)
      return next
    })
  }
  const toggleCourse = (name) => toggleIn(setOpenCourses, name)
  const folderKey = (courseName, folderName) => `${courseName}\u0000${folderName}`

  const targetCourse = (uploadCourse || course).trim()
  const targetFolders = folders.filter((folder) => folder.course === targetCourse).map((folder) => folder.name)

  // Cambiando corso, la cartella scritta non vale più: finirebbe creata nel corso sbagliato.
  useEffect(() => {
    setUploadFolder('')
  }, [targetCourse])

  const visible = course ? documents.filter((doc) => doc.course === course) : documents
  const grouped = visible.reduce((acc, doc) => {
    ;(acc[doc.course] ??= []).push(doc)
    return acc
  }, {})
  const dropDisabled = !targetCourse || disabled

  function handleFiles(fileList) {
    const files = Array.from(fileList ?? [])
    if (!files.length || !targetCourse) return
    onUpload(files, targetCourse, uploadFolder.trim())
  }

  function confirmDelete(action) {
    setConfirming(null)
    action()
  }

  // Cartelle di un corso: quelle create più quelle citate dai documenti; "Modulo 2" prima di "Modulo 10".
  function folderNamesFor(courseName) {
    return [
      ...new Set([
        ...folders.filter((folder) => folder.course === courseName).map((folder) => folder.name),
        ...documents.filter((doc) => doc.course === courseName && doc.folder).map((doc) => doc.folder),
      ]),
    ].sort((a, b) => a.localeCompare(b, 'it', { numeric: true }))
  }

  // Selezione: si possono scegliere solo documenti dello stesso corso (le cartelle sono per corso).
  const selectedDocs = documents.filter((doc) => selectedIds.has(doc.id))
  const selectedCourse = selectedDocs[0]?.course ?? null
  const moveOptions = selectedCourse
    ? [
        { value: ROOT_FOLDER, label: 'Fuori dalle cartelle' },
        ...folderNamesFor(selectedCourse).map((name) => ({ value: name, label: name })),
      ]
    : []

  const isSelectable = (doc) => !selectedCourse || doc.course === selectedCourse
  const groupState = (docs) => {
    const count = docs.filter((doc) => selectedIds.has(doc.id)).length
    return count === 0 ? 'none' : count === docs.length ? 'all' : 'some'
  }

  function toggleSelectMode() {
    setSelectMode((current) => !current)
    setSelectedIds(new Set())
    setMoveError('')
  }

  // Aggiunge o toglie un gruppo di documenti: se sono già tutti selezionati li deseleziona.
  function toggleSelected(docs) {
    const eligible = docs.filter(isSelectable)
    setSelectedIds((current) => {
      const next = new Set(current)
      const allSelected = eligible.every((doc) => current.has(doc.id))
      for (const doc of eligible) {
        if (allSelected) next.delete(doc.id)
        else next.add(doc.id)
      }
      return next
    })
    setMoveError('')
  }

  async function moveSelected(target) {
    const folder = target === ROOT_FOLDER ? null : target
    setMoving(true)
    setMoveError('')
    const result = await onMoveDocuments(selectedDocs, folder)
    setMoving(false)
    if (!result.ok) {
      setMoveError(result.error)
      return
    }
    // Si mostra il risultato: corso e cartella di destinazione si aprono.
    setOpenCourses((current) => new Set(current).add(selectedCourse))
    if (folder) setOpenFolders((current) => new Set(current).add(folderKey(selectedCourse, folder)))
    setSelectedIds(new Set())
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
            Filtra l&apos;elenco e imposta il contesto della chat; per più corsi o cartelle usa il selettore sopra la chat.
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

          {targetCourse && (
            <CourseCombobox
              id="assistant-upload-folder"
              value={uploadFolder}
              onChange={setUploadFolder}
              courses={targetFolders}
              placeholder="Cartella (facoltativa, es. Modulo 1)"
              ariaLabel="Cartella di destinazione"
              newLabel="Nuova cartella"
            />
          )}

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
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className={`flex items-baseline gap-2 ${SECTION_TITLE}`}>
              Documenti
              <span className="text-sm font-normal tabular-nums text-[var(--dashboard-text-muted)]">{visible.length}</span>
            </h2>
            {visible.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectMode}
                aria-pressed={selectMode}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${FOCUS_RING} ${
                  selectMode
                    ? 'bg-[var(--dashboard-accent)] text-white hover:opacity-90'
                    : 'text-[var(--dashboard-text-secondary)] hover:bg-[var(--dashboard-bg-secondary)]'
                }`}
              >
                <ListChecks className="h-3.5 w-3.5" />
                {selectMode ? 'Fine' : 'Seleziona'}
              </button>
            )}
          </div>

          {selectMode && visible.length > 0 && (
            <div className="mb-3 space-y-2 rounded-xl bg-[var(--dashboard-bg)] p-2.5">
              <p aria-live="polite" className="text-xs text-[var(--dashboard-text-secondary)]">
                {selectedDocs.length === 0
                  ? 'Spunta i documenti (o un’intera cartella) da spostare.'
                  : `${selectedDocs.length} ${selectedDocs.length === 1 ? 'selezionato' : 'selezionati'} in ${selectedCourse}`}
              </p>
              {selectedDocs.length > 0 && (
                <AssistantSelect
                  value=""
                  onChange={moveSelected}
                  options={moveOptions}
                  placeholder={moving ? 'Spostamento…' : 'Sposta in…'}
                  disabled={moving}
                  aria-label="Sposta i documenti selezionati"
                />
              )}
              {moveError && (
                <p role="alert" className="text-xs text-red-600">
                  {moveError}
                </p>
              )}
            </div>
          )}

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

                const folderNames = folderNamesFor(courseName)
                const looseDocs = docs.filter((doc) => !doc.folder)

                const renderRow = (doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    selectMode={selectMode}
                    selected={selectedIds.has(doc.id)}
                    selectDisabled={!isSelectable(doc)}
                    onToggleSelect={() => toggleSelected([doc])}
                    deleting={deletingDocs.has(doc.id)}
                    confirming={confirming === `doc:${doc.id}`}
                    onAskDelete={() => setConfirming(`doc:${doc.id}`)}
                    onConfirm={() => confirmDelete(() => onDelete(doc))}
                    onCancel={() => setConfirming(null)}
                    progress={visualProgress[doc.id]}
                    error={visualErrors[doc.id]}
                    onAnalyze={() => onAnalyzeVisuals(doc)}
                  />
                )

                return (
                  <div key={courseName}>
                    <div className="group flex items-center gap-1 rounded-lg hover:bg-[var(--dashboard-bg)]">
                      {selectMode && (
                        <span className="flex shrink-0 pl-1.5">
                          <SelectCheck
                            state={groupState(docs)}
                            onToggle={() => toggleSelected(docs)}
                            disabled={!isSelectable(docs[0])}
                            label={`Seleziona tutti i documenti del corso ${courseName}`}
                          />
                        </span>
                      )}
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
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenCourses((current) => new Set(current).add(courseName))
                              setCreatingIn(courseName)
                            }}
                            aria-label={`Nuova cartella nel corso ${courseName}`}
                            title="Nuova cartella"
                            className={`shrink-0 cursor-pointer rounded p-1 text-[var(--dashboard-text-muted)] opacity-0 transition hover:text-[var(--dashboard-accent)] focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100 ${FOCUS_RING}`}
                          >
                            <FolderPlus className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirming(`course:${courseName}`)}
                            aria-label={`Elimina il corso ${courseName} e tutti i suoi documenti`}
                            className={`shrink-0 cursor-pointer rounded p-1 text-[var(--dashboard-text-muted)] opacity-0 transition hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100 ${FOCUS_RING}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>

                    {creatingIn === courseName && (
                      <FolderNameForm
                        className="mb-2 ml-3 mt-1 border-l border-[var(--dashboard-card-border)] pl-2"
                        ariaLabel={`Nome della nuova cartella in ${courseName}`}
                        existing={folderNames}
                        onSubmit={async (folderName) => {
                          const result = await onCreateFolder(courseName, folderName)
                          if (result.ok) setOpenFolders((current) => new Set(current).add(folderKey(courseName, folderName)))
                          return result
                        }}
                        onClose={() => setCreatingIn(null)}
                      />
                    )}

                    {isOpen && (
                      <div id={listId} className="mb-2 ml-3 mt-1 space-y-0.5 border-l border-[var(--dashboard-card-border)] pl-2">
                        {folderNames.map((folderName) => {
                          const key = folderKey(courseName, folderName)
                          const folderOpen = openFolders.has(key)
                          const folderDocs = docs.filter((doc) => doc.folder === folderName)
                          const readyDocs = folderDocs.filter((doc) => doc.status === 'ready').length
                          const folderConfirming = confirming === `folder:${key}`
                          const folderListId = `${listId}-folder-${folderNames.indexOf(folderName)}`
                          if (renaming === key) {
                            return (
                              <FolderNameForm
                                key={folderName}
                                className="py-1"
                                initial={folderName}
                                submitLabel="Salva"
                                ariaLabel={`Nuovo nome della cartella ${folderName}`}
                                existing={folderNames}
                                onSubmit={async (newName) => {
                                  const result = await onRenameFolder(courseName, folderName, newName)
                                  if (result.ok && folderOpen) {
                                    setOpenFolders((current) => new Set(current).add(folderKey(courseName, newName)))
                                  }
                                  return result
                                }}
                                onClose={() => setRenaming(null)}
                              />
                            )
                          }
                          return (
                            <div key={folderName}>
                              <div className="group flex items-center gap-1 rounded-lg hover:bg-[var(--dashboard-bg)]">
                                {selectMode && (
                                  <span className="flex shrink-0 pl-1.5">
                                    <SelectCheck
                                      state={folderDocs.length ? groupState(folderDocs) : 'none'}
                                      onToggle={() => toggleSelected(folderDocs)}
                                      disabled={folderDocs.length === 0 || !isSelectable(folderDocs[0])}
                                      label={`Seleziona tutti i documenti della cartella ${folderName}`}
                                    />
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => toggleIn(setOpenFolders, key)}
                                  aria-expanded={folderOpen}
                                  aria-controls={folderListId}
                                  className={`flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1 text-left ${FOCUS_RING}`}
                                >
                                  <ChevronDown
                                    className={`h-3.5 w-3.5 shrink-0 text-[var(--dashboard-text-muted)] transition-transform duration-200 ${
                                      folderOpen ? '' : '-rotate-90'
                                    }`}
                                  />
                                  <Folder className="h-4 w-4 shrink-0 text-[var(--dashboard-accent)]" />
                                  <span className="truncate text-sm font-medium text-[var(--dashboard-text)]" title={folderName}>
                                    {folderName}
                                  </span>
                                  <span className="shrink-0 text-xs tabular-nums text-[var(--dashboard-text-muted)]">
                                    {folderDocs.length}
                                  </span>
                                </button>
                                {folderConfirming ? (
                                  <ConfirmDelete
                                    label={`Conferma eliminazione della cartella ${folderName}: i documenti restano nel corso`}
                                    onConfirm={() => confirmDelete(() => onDeleteFolder(courseName, folderName))}
                                    onCancel={() => setConfirming(null)}
                                  />
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => onFocusFolder(courseName, folderName)}
                                      disabled={readyDocs === 0}
                                      aria-label={`Fai domande solo sulla cartella ${folderName}`}
                                      title="Fai domande solo su questa cartella"
                                      className={`shrink-0 cursor-pointer rounded p-1 text-[var(--dashboard-text-muted)] opacity-0 transition hover:text-[var(--dashboard-accent)] focus-visible:opacity-100 group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-0 max-lg:opacity-100 max-lg:disabled:opacity-40 ${FOCUS_RING}`}
                                    >
                                      <Target className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRenaming(key)}
                                      aria-label={`Rinomina la cartella ${folderName}`}
                                      title="Rinomina la cartella"
                                      className={`shrink-0 cursor-pointer rounded p-1 text-[var(--dashboard-text-muted)] opacity-0 transition hover:text-[var(--dashboard-accent)] focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100 ${FOCUS_RING}`}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirming(`folder:${key}`)}
                                      aria-label={`Elimina la cartella ${folderName} (i documenti restano nel corso)`}
                                      title="Elimina la cartella: i documenti restano nel corso"
                                      className={`shrink-0 cursor-pointer rounded p-1 text-[var(--dashboard-text-muted)] opacity-0 transition hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100 ${FOCUS_RING}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                              {folderOpen && (
                                <ul id={folderListId} className="mb-1 ml-3 mt-0.5 space-y-0.5 border-l border-[var(--dashboard-card-border)] pl-2">
                                  {folderDocs.length === 0 ? (
                                    <li className="px-1.5 py-1 text-xs text-[var(--dashboard-text-muted)]">
                                      Cartella vuota: carica qui un file o spostaci un documento.
                                    </li>
                                  ) : (
                                    folderDocs.map(renderRow)
                                  )}
                                </ul>
                              )}
                            </div>
                          )
                        })}
                        {looseDocs.length > 0 && (
                          <ul className="space-y-0.5">{looseDocs.map(renderRow)}</ul>
                        )}
                      </div>
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
