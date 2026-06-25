import '../src/styles/globals.css'
import '../src/styles/landing.css'
import '../src/styles/animations.css'
import { ReactNode, CSSProperties } from 'react'
import { Archivo, IBM_Plex_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'

/**
 * Polices self-hostées via next/font (zéro requête Google en prod).
 * On expose les variables CSS attendues par le DS « Graphite » :
 *   --font-display / --font-ui = Archivo ; --font-mono = IBM Plex Mono.
 */
const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-display',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-mono',
})

export const metadata = {
  title: 'Ma Timeline',
  description: 'Application de gestion de temps et événements',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${archivo.variable} ${ibmPlexMono.variable}`}
      style={{ '--font-ui': 'var(--font-display)' } as CSSProperties}
    >
      <body>
        {/* Ordre providers : Theme > Auth (S7 #40) > Query (S7 #48). */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
