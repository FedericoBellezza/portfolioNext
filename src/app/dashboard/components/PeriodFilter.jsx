'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/app/components/ui/button'
import { X } from 'lucide-react'

const months = [
  { value: '0', label: 'Gennaio' },
  { value: '1', label: 'Febbraio' },
  { value: '2', label: 'Marzo' },
  { value: '3', label: 'Aprile' },
  { value: '4', label: 'Maggio' },
  { value: '5', label: 'Giugno' },
  { value: '6', label: 'Luglio' },
  { value: '7', label: 'Agosto' },
  { value: '8', label: 'Settembre' },
  { value: '9', label: 'Ottobre' },
  { value: '10', label: 'Novembre' },
  { value: '11', label: 'Dicembre' },
]

export default function PeriodFilter({ currentPeriod, currentYear, currentMonth }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentYearNum = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYearNum - i)

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    // Reset year/month when changing period
    if (key === 'period') {
      if (value === 'all' || !value) {
        params.delete('year')
        params.delete('month')
      } else if (value === 'year') {
        params.delete('month')
        if (!params.get('year')) {
          params.set('year', currentYearNum.toString())
        }
      } else if (value === 'month') {
        if (!params.get('year')) {
          params.set('year', currentYearNum.toString())
        }
        if (!params.get('month')) {
          params.set('month', new Date().getMonth().toString())
        }
      }
    }

    router.push(`${pathname}?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push(pathname)
  }

  const hasFilters = currentPeriod && currentPeriod !== 'all'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={currentPeriod || 'all'} onValueChange={(v) => updateFilter('period', v)}>
        <SelectTrigger className="w-36 bg-[var(--dashboard-card-bg)] border-[var(--dashboard-border)] text-[var(--dashboard-text)]">
          <SelectValue placeholder="Periodo" />
        </SelectTrigger>
        <SelectContent className="bg-[var(--dashboard-card-bg)] border-[var(--dashboard-border)]">
          <SelectItem value="all" className="text-[var(--dashboard-text)] hover:bg-[var(--dashboard-bg-secondary)]">Tutto</SelectItem>
          <SelectItem value="month" className="text-[var(--dashboard-text)] hover:bg-[var(--dashboard-bg-secondary)]">Mese</SelectItem>
          <SelectItem value="year" className="text-[var(--dashboard-text)] hover:bg-[var(--dashboard-bg-secondary)]">Anno</SelectItem>
        </SelectContent>
      </Select>

      {(currentPeriod === 'year' || currentPeriod === 'month') && (
        <Select value={currentYear || currentYearNum.toString()} onValueChange={(v) => updateFilter('year', v)}>
          <SelectTrigger className="w-28 bg-[var(--dashboard-card-bg)] border-[var(--dashboard-border)] text-[var(--dashboard-text)]">
            <SelectValue placeholder="Anno" />
          </SelectTrigger>
          <SelectContent className="bg-[var(--dashboard-card-bg)] border-[var(--dashboard-border)]">
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()} className="text-[var(--dashboard-text)] hover:bg-[var(--dashboard-bg-secondary)]">
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {currentPeriod === 'month' && (
        <Select value={currentMonth ?? new Date().getMonth().toString()} onValueChange={(v) => updateFilter('month', v)}>
          <SelectTrigger className="w-36 bg-[var(--dashboard-card-bg)] border-[var(--dashboard-border)] text-[var(--dashboard-text)]">
            <SelectValue placeholder="Mese" />
          </SelectTrigger>
          <SelectContent className="bg-[var(--dashboard-card-bg)] border-[var(--dashboard-border)]">
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value} className="text-[var(--dashboard-text)] hover:bg-[var(--dashboard-bg-secondary)]">
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-accent)] hover:bg-[var(--dashboard-bg-secondary)]"
        >
          <X className="h-4 w-4 mr-1" />
          Rimuovi filtri
        </Button>
      )}
    </div>
  )
}
