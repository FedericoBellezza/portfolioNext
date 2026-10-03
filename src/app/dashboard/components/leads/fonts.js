import { Fraunces } from 'next/font/google'

// Serif con carattere per titoli e numeri grandi della dashboard lead.
export const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-ld-display',
  display: 'swap',
})
