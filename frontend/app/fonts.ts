import { Archivo, IBM_Plex_Mono } from 'next/font/google'

/**
 * Polices self-hostées via next/font (zéro requête Google en prod).
 * On expose les variables CSS attendues par le DS « Graphite » :
 *   --font-display / --font-ui = Archivo ; --font-mono = IBM Plex Mono.
 *
 * #413 — extrait de `app/layout.tsx` : le `<html>` a été descendu sous
 * `app/[locale]/layout.tsx` (attribut `lang` localisé, WCAG 3.1.1), et
 * `app/global-error.tsx` rend SON PROPRE `<html>` — hors de tout layout.
 * Les deux ont besoin des mêmes variables de police ; une seule déclaration
 * évite deux instances divergentes de la même famille.
 */
export const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-display',
})

export const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-mono',
})

/** Classes des variables de police à poser sur le `<html>`. */
export const fontVariables = `${archivo.variable} ${ibmPlexMono.variable}`
