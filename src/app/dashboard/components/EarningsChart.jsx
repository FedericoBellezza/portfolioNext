'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#C4735B', '#D4A49A', '#B56549', '#8B5A4A', '#A67C6D', '#E8C4B8']

export default function EarningsChart({ data }) {
  const chartData = data.map((item, index) => ({
    name: `${item.automation}`,
    company: item.company,
    guadagni: item.totalEarnings,
    esecuzioni: item.executionCount,
    fill: COLORS[index % COLORS.length],
  }))

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-[#E0D6CC] p-3 rounded-lg shadow-lg">
          <p className="text-[#2D2D2D] font-medium">{label}</p>
          <p className="text-[#6B6B6B] text-sm">Cliente: {payload[0]?.payload?.company}</p>
          <p className="text-[#C4735B] font-semibold">
            Guadagni: {payload[0]?.value?.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
          </p>
          <p className="text-[#8B5A4A]">Esecuzioni: {payload[0]?.payload?.esecuzioni?.toLocaleString('it-IT')}</p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="bg-[var(--dashboard-card-bg)] border-[var(--dashboard-card-border)] shadow-sm">
      <CardHeader>
        <CardTitle className="text-[var(--dashboard-text)] font-serif">Guadagni per Automazione</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0D6CC" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#6B6B6B', fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis
                tick={{ fill: '#6B6B6B' }}
                tickFormatter={(value) => `${value.toLocaleString('it-IT')}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="guadagni" fill="#C4735B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-[var(--dashboard-text-muted)]">
            Nessun dato disponibile
          </div>
        )}
      </CardContent>
    </Card>
  )
}
