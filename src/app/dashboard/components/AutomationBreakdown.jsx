'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { motion } from 'motion/react'

export default function AutomationBreakdown({ data }) {
  const totalExecutions = data.reduce((sum, item) => sum + item.executionCount, 0)
  const totalEarnings = data.reduce((sum, item) => sum + item.totalEarnings, 0)

  return (
    <Card className="bg-[var(--dashboard-card-bg)] border-[var(--dashboard-card-border)] shadow-sm">
      <CardHeader>
        <CardTitle className="text-[var(--dashboard-text)] font-serif">Dettaglio Automazioni</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--dashboard-border)]">
                <th className="text-left py-3 px-4 text-[var(--dashboard-text-secondary)] font-medium uppercase text-sm tracking-wide">Automazione</th>
                <th className="text-left py-3 px-4 text-[var(--dashboard-text-secondary)] font-medium uppercase text-sm tracking-wide">Cliente</th>
                <th className="text-right py-3 px-4 text-[var(--dashboard-text-secondary)] font-medium uppercase text-sm tracking-wide">Prezzo/Esec.</th>
                <th className="text-right py-3 px-4 text-[var(--dashboard-text-secondary)] font-medium uppercase text-sm tracking-wide">Esecuzioni</th>
                <th className="text-right py-3 px-4 text-[var(--dashboard-text-secondary)] font-medium uppercase text-sm tracking-wide">Totale</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((item, index) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-[var(--dashboard-border)]/50 hover:bg-[var(--dashboard-bg-secondary)] transition-colors"
                  >
                    <td className="py-3 px-4 text-[var(--dashboard-text)] font-medium">{item.automation}</td>
                    <td className="py-3 px-4 text-[var(--dashboard-text-secondary)]">{item.company}</td>
                    <td className="py-3 px-4 text-right text-[var(--dashboard-text-secondary)]">
                      {item.pricePerExecution.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--dashboard-text-secondary)]">
                      {item.executionCount.toLocaleString('it-IT')}
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--dashboard-accent)] font-semibold">
                      {item.totalEarnings.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[var(--dashboard-text-muted)]">
                    Nessuna automazione configurata
                  </td>
                </tr>
              )}
            </tbody>
            {data.length > 0 && (
              <tfoot>
                <tr className="bg-[var(--dashboard-bg-secondary)]">
                  <td colSpan={3} className="py-3 px-4 text-[var(--dashboard-text)] font-bold">Totale</td>
                  <td className="py-3 px-4 text-right text-[var(--dashboard-text)] font-bold">
                    {totalExecutions.toLocaleString('it-IT')}
                  </td>
                  <td className="py-3 px-4 text-right text-[var(--dashboard-accent)] font-bold">
                    {totalEarnings.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
