'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// Radix non ammette item con value "": l'opzione "tutti" usa un sentinella.
const ALL = '__all__'

const ITEM = 'cursor-pointer focus:bg-[var(--dashboard-bg-secondary)] focus:text-[var(--dashboard-text)]'

/**
 * Select shadcn con la palette della dashboard.
 * - options: [{ value, label }]
 * - value '' = nessuna scelta (mostra `allLabel` se c'è, altrimenti il placeholder)
 * - `size`, `id`, `aria-label` ecc. vanno al trigger
 */
export default function AssistantSelect({
  value,
  onChange,
  options,
  allLabel,
  placeholder,
  className,
  ...rest
}) {
  const triggerRef = useRef(null)
  const [container, setContainer] = useState(null)

  // Montato in <body> il dropdown perderebbe le variabili --dashboard-*: lo si monta nel tema.
  useEffect(() => {
    setContainer(triggerRef.current?.closest('.dashboard-theme') ?? null)
  }, [])

  const current = !value && allLabel ? ALL : (value ?? '')

  return (
    <Select value={current} onValueChange={(next) => onChange(next === ALL ? '' : next)}>
      <SelectTrigger
        ref={triggerRef}
        className={cn(
          'w-full border-[var(--dashboard-border)] bg-white text-[var(--dashboard-text)] shadow-none hover:bg-white focus-visible:border-[var(--dashboard-accent)] focus-visible:ring-0 dark:bg-white dark:hover:bg-white',
          className,
        )}
        {...rest}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        position="popper"
        sideOffset={4}
        container={container}
        className="max-w-[min(22rem,var(--radix-select-content-available-width))] border-[var(--dashboard-border)] bg-[var(--dashboard-card-bg)] text-[var(--dashboard-text)]"
      >
        {allLabel && (
          <SelectItem value={ALL} className={ITEM}>
            {allLabel}
          </SelectItem>
        )}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className={ITEM}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
