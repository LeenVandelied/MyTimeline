'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps, ReactNode } from 'react'
import { THEME_STORAGE_KEY } from '@/hooks/useThemeChoice'

type ThemeProviderProps = Omit<ComponentProps<typeof NextThemesProvider>, 'storageKey'> & {
  children: ReactNode
}

/**
 * Wrapper client de next-themes.
 * Cible la classe `.dark` sur <html> (le DS « Graphite » écoute `.dark`
 * ET [data-theme="dark"] ; `attribute="class"` suffit donc).
 * Ordre providers imposé (layout root) : Theme > Auth (S7) > Query (S7).
 *
 * #653 — `storageKey` est IMPOSÉ (et retiré des props) : l'arbitrage de la
 * préférence de compte à la connexion lit le choix local explicite sous cette
 * même clé (`readStoredThemeChoice`). Une clé divergente ferait passer tout
 * choix local pour « aucun choix » — et le compte ne l'adopterait jamais.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props} storageKey={THEME_STORAGE_KEY}>
      {children}
    </NextThemesProvider>
  )
}
