import { Fraunces } from 'next/font/google'

// Serif con carattere per titoli e numeri grandi della dashboard.
export const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-dashboard-display',
  display: 'swap',
})
