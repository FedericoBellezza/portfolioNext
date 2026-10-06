'use client'

import { useEffect, useRef, useState } from 'react'
import { Popover } from 'radix-ui'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Selezione multipla con la palette della dashboard.
 * - options: [{ value, label }]
 * - value: array di valori selezionati; [] = nessun filtro (mostra `allLabel`)
 */
export default function AssistantMultiSelect({ value, onChange, options, allLabel, className, ...rest }) {
  const triggerRef = useRef(null)
  const [container, setContainer] = useState(null)

  // Montato in <body> il popover perderebbe le variabili --dashboard-*: lo si monta nel tema.
  useEffect(() => {
    setContainer(triggerRef.current?.closest('.dashboard-theme') ?? null)
  }, [])

  const selected = new Set(value)
  const label =
    value.length === 0
      ? allLabel
      : value.length === 1
        ? (options.find((option) => option.value === value[0])?.label ?? allLabel)
        : `${value.length} documenti`

  function toggle(optionValue) {
    onChange(selected.has(optionValue) ? value.filter((item) => item !== optionValue) : [...value, optionValue])
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
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </Popover.Trigger>
      <Popover.Portal container={container}>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[min(22rem,var(--radix-popover-content-available-width))] overflow-hidden rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-card-bg)] text-[var(--dashboard-text)] shadow-md"
        >
          <div className="flex items-center justify-between border-b border-[var(--dashboard-card-border)] px-3 py-1.5 text-xs text-[var(--dashboard-text-muted)]">
            <span>{value.length ? `${value.length} selezionati` : allLabel}</span>
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={!value.length}
              className="cursor-pointer font-medium text-[var(--dashboard-accent)] transition-opacity hover:underline disabled:pointer-events-none disabled:opacity-40"
            >
              Deseleziona tutti
            </button>
          </div>
          <ul role="listbox" aria-multiselectable="true" className="max-h-64 overflow-y-auto p-1">
            {options.map((option) => {
              const checked = selected.has(option.value)
              return (
                <li key={option.value} role="option" aria-selected={checked}>
                  <button
                    type="button"
                    onClick={() => toggle(option.value)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs outline-none hover:bg-[var(--dashboard-bg-secondary)] focus-visible:bg-[var(--dashboard-bg-secondary)]"
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                        checked
                          ? 'border-[var(--dashboard-accent)] bg-[var(--dashboard-accent)] text-white'
                          : 'border-[var(--dashboard-border)] bg-white',
                      )}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate" title={option.label}>
                      {option.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
