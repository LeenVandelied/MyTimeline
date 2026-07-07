import React, { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { loadMessages } from '../../i18n'
import { NetworkStatusProvider } from '@/contexts/NetworkStatusContext'
import { OfflineBanner } from '@/components/shared/OfflineBanner'

const locales = ['fr', 'en']

export function generateStaticParams() {
  return locales.map(locale => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode
  params: Promise<{ locale: string }>;
}) {
  const locale = (await params).locale || 'fr'
  
  if (!locales.includes(locale)) {
    notFound()
  }

  const messages = await loadMessages(locale)

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {/* #76 : bus réseau + bannière SOUS le provider i18n (useTranslations
          exige NextIntlClientProvider). QueryProvider (racine) reste ancêtre
          → useQueryClient du bus résout. */}
      <NetworkStatusProvider>
        <OfflineBanner />
        {children}
      </NetworkStatusProvider>
    </NextIntlClientProvider>
  )
}