'use client';

import '../../src/styles/globals.css'
import '../../src/styles/calendar.css'
import '../../src/styles/landing.css'
import { ReactNode } from 'react'
import ClientOnly from '@/components/client-only'

interface LocaleLayoutProps {
  children: ReactNode
  params: {
    locale: string
  }
}

export default function LocaleLayout({ children, params }: LocaleLayoutProps) {
  return (
    <html lang={params.locale}>
      <body>
        <ClientOnly>
          {children}
        </ClientOnly>
      </body>
    </html>
  )
} 