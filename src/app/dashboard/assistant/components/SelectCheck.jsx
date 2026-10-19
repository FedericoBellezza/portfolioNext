'use client'

import { useEffect, useRef } from 'react'

// Casella di selezione; `state` 'some' = solo una parte degli elementi del gruppo (stato indeterminato).
export default function SelectCheck({ state, onToggle, label, disabled }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === 'some'
  }, [state])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={state === 'all'}
      disabled={disabled}
      onChange={onToggle}
      aria-label={label}
      className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--dashboard-accent)] disabled:cursor-not-allowed disabled:opacity-40"
    />
  )
}
