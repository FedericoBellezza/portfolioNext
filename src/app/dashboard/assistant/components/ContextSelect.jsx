'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Popover } from 'radix-ui'
import { ChevronDown, FileText, Folder, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import SelectCheck from './SelectCheck'

const collator = new Intl.Collator('it', { numeric: true })
const byName = (a, b) => collator.compare(a, b)

const ROW = 'flex min-w-0 flex-1 items-center gap-2 rounded-sm px-1.5 py-1.5 text-left text-xs hover:bg-[var(--dashboard-bg-secondary)]'

/**
 * Contesto della chat: si scelgono corsi, cartelle e documenti, anche mescolati.
 * - documents: documenti pronti ({ id, name, course, folder })
 * - scope: { courses: [nome], folders: [{ course, name }], documentIds: [id] }; tutto vuoto = tutti i materiali
 * Scegliere un corso o una cartella comprende tutto ciò che contiene: i figli compaiono spuntati e
 * bloccati, per togliere un solo documento si toglie prima il gruppo.
 */
export default function ContextSelect({ documents, scope, onChange, allLabel, className, ...rest }) {
  const triggerRef = useRef(null)
  const [container, setContainer] = useState(null)
  const [expanded, setExpanded] = useState(() => new Set())

  // Montato in <body> il popover perderebbe le variabili --dashboard-*: lo si monta nel tema.
  useEffect(() => {
    setContainer(triggerRef.current?.closest('.dashboard-theme') ?? null)
  }, [])

  // Albero: corso > { cartelle > documenti, documenti sciolti }
  const tree = useMemo(() => {
    const courses = new Map()
    for (const doc of documents) {
      if (!courses.has(doc.course)) courses.set(doc.course, { name: doc.course, folders: new Map(), loose: [], count: 0 })
      const entry = courses.get(doc.course)
      entry.count += 1
      if (doc.folder) {
        if (!entry.folders.has(doc.folder)) entry.folders.set(doc.folder, [])
        entry.folders.get(doc.folder).push(doc)
      } else {
        entry.loose.push(doc)
      }
    }
    return [...courses.values()].sort((a, b) => byName(a.name, b.name))
  }, [documents])

  const selectedCourses = new Set(scope.courses)
  const selectedFolders = new Set(scope.folders.map((folder) => `${folder.course}\u0000${folder.name}`))
  const selectedDocs = new Set(scope.documentIds)
  const folderKey = (course, name) => `${course}\u0000${name}`

  const total = scope.courses.length + scope.folders.length + scope.documentIds.length
  const label = triggerLabel(scope, documents, allLabel)

  function toggleExpanded(key) {
    setExpanded((current) => {
      const next = new Set(current)
      if (!next.delete(key)) next.add(key)
      return next
    })
  }

  // Scegliere un gruppo assorbe ciò che contiene: niente selezioni sovrapposte.
  function toggleCourse(course) {
    if (selectedCourses.has(course.name)) {
      onChange({ ...scope, courses: scope.courses.filter((name) => name !== course.name) })
      return
    }
    const insideIds = new Set([...course.loose, ...[...course.folders.values()].flat()].map((doc) => doc.id))
    onChange({
      courses: [...scope.courses, course.name],
      folders: scope.folders.filter((folder) => folder.course !== course.name),
      documentIds: scope.documentIds.filter((id) => !insideIds.has(id)),
    })
  }

  function toggleFolder(course, name, docs) {
    if (selectedFolders.has(folderKey(course, name))) {
      onChange({ ...scope, folders: scope.folders.filter((folder) => !(folder.course === course && folder.name === name)) })
      return
    }
    const insideIds = new Set(docs.map((doc) => doc.id))
    onChange({
      ...scope,
      folders: [...scope.folders, { course, name }],
      documentIds: scope.documentIds.filter((id) => !insideIds.has(id)),
    })
  }

  function toggleDocument(id) {
    onChange({
      ...scope,
      documentIds: selectedDocs.has(id) ? scope.documentIds.filter((item) => item !== id) : [...scope.documentIds, id],
    })
  }

  function renderDocument(doc, inherited, depth) {
    const checked = inherited || selectedDocs.has(doc.id)
    return (
      <li key={doc.id} style={{ paddingLeft: `${depth * 1}rem` }} className="flex items-center gap-1">
        <span className="w-4 shrink-0" />
        <label className={cn(ROW, inherited ? 'cursor-default opacity-70' : 'cursor-pointer')}>
          <SelectCheck
            state={checked ? 'all' : 'none'}
            onToggle={() => toggleDocument(doc.id)}
            disabled={inherited}
            label={doc.name}
          />
          <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--dashboard-text-muted)]" />
          <span className="min-w-0 flex-1 truncate" title={doc.name}>
            {doc.name}
          </span>
        </label>
      </li>
    )
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          ref={triggerRef}
          type="button"
          title={label}
          className={cn(
            'flex h-8 cursor-pointer items-center justify-between gap-2 rounded-md border border-[var(--dashboard-border)] bg-white px-2 text-xs text-[var(--dashboard-text)] outline-none transition-colors hover:bg-white focus-visible:border-[var(--dashboard-accent)] data-[state=open]:border-[var(--dashboard-accent)]',
            className,
          )}
          {...rest}
        >
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[var(--dashboard-text-muted)]" />
          <span className="min-w-0 flex-1 truncate text-left">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </Popover.Trigger>
      <Popover.Portal container={container}>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[min(24rem,var(--radix-popover-content-available-width))] overflow-hidden rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-card-bg)] text-[var(--dashboard-text)] shadow-md"
        >
          <div className="flex items-center justify-between border-b border-[var(--dashboard-card-border)] px-3 py-1.5 text-xs text-[var(--dashboard-text-muted)]">
            <span>{total ? summary(scope) : allLabel}</span>
            <button
              type="button"
              onClick={() => onChange({ courses: [], folders: [], documentIds: [] })}
              disabled={!total}
              className="cursor-pointer font-medium text-[var(--dashboard-accent)] transition-opacity hover:underline disabled:pointer-events-none disabled:opacity-40"
            >
              Deseleziona tutti
            </button>
          </div>
          <ul className="max-h-72 space-y-0.5 overflow-y-auto p-1">
            {tree.map((course) => {
              const courseChecked = selectedCourses.has(course.name)
              const courseOpen = expanded.has(course.name)
              const folderNames = [...course.folders.keys()].sort(byName)
              const partial =
                !courseChecked &&
                (scope.folders.some((folder) => folder.course === course.name) ||
                  [...course.loose, ...[...course.folders.values()].flat()].some((doc) => selectedDocs.has(doc.id)))
              return (
                <li key={course.name}>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(course.name)}
                      aria-expanded={courseOpen}
                      aria-label={`${courseOpen ? 'Chiudi' : 'Apri'} il corso ${course.name}`}
                      className="shrink-0 cursor-pointer rounded p-0.5 text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]/40"
                    >
                      <ChevronDown className={cn('h-4 w-4 transition-transform', !courseOpen && '-rotate-90')} />
                    </button>
                    <label className={cn(ROW, 'cursor-pointer font-medium')}>
                      <SelectCheck
                        state={courseChecked ? 'all' : partial ? 'some' : 'none'}
                        onToggle={() => toggleCourse(course)}
                        label={`Corso ${course.name}`}
                      />
                      <span className="min-w-0 flex-1 truncate" title={course.name}>
                        {course.name}
                      </span>
                      <span className="shrink-0 tabular-nums text-[var(--dashboard-text-muted)]">{course.count}</span>
                    </label>
                  </div>

                  {courseOpen && (
                    <ul className="space-y-0.5">
                      {folderNames.map((folderName) => {
                        const docs = course.folders.get(folderName)
                        const key = folderKey(course.name, folderName)
                        const folderChecked = courseChecked || selectedFolders.has(key)
                        const folderOpen = expanded.has(key)
                        const folderPartial = !folderChecked && docs.some((doc) => selectedDocs.has(doc.id))
                        return (
                          <li key={folderName}>
                            <div className="flex items-center gap-1 pl-4">
                              <button
                                type="button"
                                onClick={() => toggleExpanded(key)}
                                aria-expanded={folderOpen}
                                aria-label={`${folderOpen ? 'Chiudi' : 'Apri'} la cartella ${folderName}`}
                                className="shrink-0 cursor-pointer rounded p-0.5 text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]/40"
                              >
                                <ChevronDown className={cn('h-4 w-4 transition-transform', !folderOpen && '-rotate-90')} />
                              </button>
                              <label className={cn(ROW, courseChecked ? 'cursor-default opacity-70' : 'cursor-pointer')}>
                                <SelectCheck
                                  state={folderChecked ? 'all' : folderPartial ? 'some' : 'none'}
                                  onToggle={() => toggleFolder(course.name, folderName, docs)}
                                  disabled={courseChecked}
                                  label={`Cartella ${folderName}`}
                                />
                                <Folder className="h-3.5 w-3.5 shrink-0 text-[var(--dashboard-accent)]" />
                                <span className="min-w-0 flex-1 truncate" title={folderName}>
                                  {folderName}
                                </span>
                                <span className="shrink-0 tabular-nums text-[var(--dashboard-text-muted)]">{docs.length}</span>
                              </label>
                            </div>
                            {folderOpen && (
                              <ul className="space-y-0.5">
                                {[...docs]
                                  .sort((a, b) => byName(a.name, b.name))
                                  .map((doc) => renderDocument(doc, folderChecked, 2))}
                              </ul>
                            )}
                          </li>
                        )
                      })}
                      {[...course.loose]
                        .sort((a, b) => byName(a.name, b.name))
                        .map((doc) => renderDocument(doc, courseChecked, 1.25))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`
}

// "2 corsi · 1 cartella · 3 documenti"
function summary({ courses, folders, documentIds }) {
  return [
    courses.length ? plural(courses.length, 'corso', 'corsi') : null,
    folders.length ? plural(folders.length, 'cartella', 'cartelle') : null,
    documentIds.length ? plural(documentIds.length, 'documento', 'documenti') : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

// Una sola scelta: il suo nome. Più scelte: il riepilogo.
function triggerLabel(scope, documents, allLabel) {
  const total = scope.courses.length + scope.folders.length + scope.documentIds.length
  if (total === 0) return allLabel
  if (total > 1) return summary(scope)
  if (scope.courses.length) return scope.courses[0]
  if (scope.folders.length) return `${scope.folders[0].course} / ${scope.folders[0].name}`
  return documents.find((doc) => doc.id === scope.documentIds[0])?.name ?? summary(scope)
}
