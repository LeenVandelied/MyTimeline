import '../../src/styles/globals.css'
import '../../src/styles/landing.css'
import '../../src/styles/animations.css'
import React, { ReactNode, CSSProperties } from 'react'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { Toaster } from 'react-hot-toast'
import { loadMessages } from '../../i18n'
import { fontVariables } from '../fonts'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/contexts/AuthContext'
import { QueryProvider } from '@/contexts/QueryProvider'
import { NetworkStatusProvider } from '@/contexts/NetworkStatusContext'
import { OfflineBanner } from '@/components/shared/OfflineBanner'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, isSupportedLocale } from '@/i18n/locales'

/**
 * #413 — CE layout porte le `<html>` / `<body>` de l'application.
 *
 * Il a été DESCENDU depuis `app/layout.tsx` parce qu'il est le premier layout
 * de la branche à connaître `locale` : c'est la seule position d'où
 * `<html lang>` peut refléter la locale de la route DANS LE HTML SERVI (avant
 * hydratation), ce qu'exige WCAG 3.1.1. Ne pas le remonter.
 *
 * `generateStaticParams()` ci-dessous garde les 4 locales en rendu STATIQUE :
 * la locale vient des params de route, jamais d'une API dynamique (`headers()`,
 * `cookies()`) qui ferait basculer toute l'app en rendu dynamique.
 */
export function generateStaticParams() {
  return SUPPORTED_LOCALES.map(locale => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode
  params: Promise<{ locale: string }>;
}) {
  const locale = (await params).locale || DEFAULT_LOCALE

  if (!isSupportedLocale(locale)) {
    notFound()
  }

  const messages = await loadMessages(locale)

  return (
    <html
      lang={locale}
      // next-themes pose la classe de thème sur <html> côté client : l'écart
      // avec le HTML serveur est attendu, pas un bug d'hydratation.
      suppressHydrationWarning
      className={fontVariables}
      style={{ '--font-ui': 'var(--font-display)' } as CSSProperties}
    >
      <body>
        {/*
          Ordre des providers (imposé) : Theme (S6 #45) > Auth (S7 #40)
          > Query (S7 #48, inséré entre AuthProvider et {children}).
          #48 : envelopper {children} d'un <QueryClientProvider> ici, sous
          <AuthProvider>, sans déplacer Theme ni Auth.
        */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <QueryProvider>
              <NextIntlClientProvider locale={locale} messages={messages}>
                {/* #76 : bus réseau + bannière SOUS le provider i18n
                    (`OfflineBanner` appelle useTranslations('network'), qui
                    exige NextIntlClientProvider — sinon throw au prerender SSG,
                    cf. PIT-S26-001). QueryProvider reste ancêtre →
                    useQueryClient du bus résout. */}
                <NetworkStatusProvider>
                  <OfflineBanner />
                  {children}
                </NetworkStatusProvider>
              </NextIntlClientProvider>
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
