'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Radix non ammette item con value "": l'opzione "tutti/nessuno" usa un sentinella.
const ALL = '__all__'

/**
 * Select shadcn con la palette della dashboard lead.
 * - value '' = nessuna scelta (mostra `allLabel` se c'è, altrimenti il placeholder)
 * - `container`: elemento .ld in cui montare il dropdown (palette ereditata e sopra al drawer)
 */
export default function LdSelect({
  value,
  onChange,
  options,
  allLabel,
  placeholder,
  container,
  isSet = false,
  ...rest
}) {
  const current = !value && allLabel ? ALL : (value ?? '')

  return (
    <Select value={current} onValueChange={(v) => onChange(v === ALL ? '' : v)}>
      <SelectTrigger className={`ld-trigger ${isSet ? 'is-set' : ''}`} {...rest}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        position="popper"
        sideOffset={4}
        container={container}
        className="ld-select-content"
      >
        {allLabel && (
          <SelectItem value={ALL} className="ld-select-item">
            {allLabel}
          </SelectItem>
        )}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="ld-select-item">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
