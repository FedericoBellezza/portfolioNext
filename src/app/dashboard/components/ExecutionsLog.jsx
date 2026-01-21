'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { motion } from 'motion/react'
import { Calendar, Clock, User, Bot, Euro } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export default function ExecutionsLog({ executions }) {
  return (
    <Card className="bg-[var(--dashboard-card-bg)] border-[var(--dashboard-card-border)] shadow-sm">
      <CardHeader>
        <CardTitle className="text-[var(--dashboard-text)] font-serif flex items-center gap-2">
          <Clock className="h-5 w-5 text-[var(--dashboard-accent)]" />
          Log Esecuzioni ({executions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {executions.length === 0 ? (
          <div className="py-8 text-center text-[var(--dashboard-text-muted)]">
            Nessuna esecuzione nel periodo selezionato
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {executions.map((exec, index) => (
              <motion.div
                key={exec.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="p-4 bg-[var(--dashboard-bg-secondary)] rounded-lg border border-[var(--dashboard-border)]/50 hover:border-[var(--dashboard-accent)]/30 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-[var(--dashboard-accent)]" />
                      <span className="font-medium text-[var(--dashboard-text)]">
                        {exec.automation}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5 text-[var(--dashboard-text-secondary)]">
                        <User className="h-3.5 w-3.5" />
                        {exec.client}
                      </div>

                      <div className="flex items-center gap-1.5 text-[var(--dashboard-text-secondary)]">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(exec.executedAt), "d MMMM yyyy", { locale: it })}
                      </div>

                      <div className="flex items-center gap-1.5 text-[var(--dashboard-text-muted)]">
                        <Clock className="h-3.5 w-3.5" />
                        {format(new Date(exec.executedAt), "HH:mm")}
                      </div>
                    </div>

                    {exec.automationDescription && (
                      <p className="text-xs text-[var(--dashboard-text-muted)] mt-1">
                        {exec.automationDescription}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[var(--dashboard-accent)] font-semibold">
                    <Euro className="h-4 w-4" />
                    {exec.price.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
