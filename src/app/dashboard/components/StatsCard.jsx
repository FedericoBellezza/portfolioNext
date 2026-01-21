'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Euro, Activity, Users, Bot, TrendingUp, TrendingDown } from 'lucide-react'
import { motion } from 'motion/react'

const iconMap = {
  euro: Euro,
  activity: Activity,
  users: Users,
  bot: Bot,
}

export default function StatsCard({ title, value, icon, trend, delay = 0 }) {
  const Icon = iconMap[icon] || Activity

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="bg-[var(--dashboard-card-bg)] border-[var(--dashboard-card-border)] shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-[var(--dashboard-text-secondary)] uppercase tracking-wide">
            {title}
          </CardTitle>
          <Icon className="h-5 w-5 text-[var(--dashboard-accent)]" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-serif font-semibold text-[var(--dashboard-text)]">{value}</div>
          {trend !== undefined && trend !== null && (
            <div className={`flex items-center text-sm mt-1 ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {trend >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
              {Math.abs(trend).toFixed(1)}% vs periodo precedente
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
