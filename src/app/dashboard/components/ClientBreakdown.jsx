'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const COLORS = ['#C4735B', '#D4A49A', '#B56549', '#8B5A4A', '#A67C6D', '#E8C4B8', '#9B7B6F', '#C9A598']

export default function ClientBreakdown({ data }) {
  const chartData = data.map((item, index) => ({
    name: item.company,
    value: item.totalEarnings,
    executions: item.executionCount,
    fill: COLORS[index % COLORS.length],
  }))

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-[#E0D6CC] p-3 rounded-lg shadow-lg">
          <p className="text-[#2D2D2D] font-medium">{payload[0]?.payload?.name}</p>
          <p className="text-[#C4735B] font-semibold">
            {payload[0]?.value?.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
          </p>
          <p className="text-[#8B5A4A]">
            {payload[0]?.payload?.executions?.toLocaleString('it-IT')} esecuzioni
          </p>
        </div>
      )
    }
    return null
  }

  const renderLegend = (props) => {
    const { payload } = props
    return (
      <ul className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry, index) => (
          <li key={`legend-${index}`} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[#6B6B6B] text-sm">{entry.value}</span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <Card className="bg-[var(--dashboard-card-bg)] border-[var(--dashboard-card-border)] shadow-sm">
      <CardHeader>
        <CardTitle className="text-[var(--dashboard-text)] font-serif">Distribuzione per Cliente</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={renderLegend} />
            </PieChart>
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
