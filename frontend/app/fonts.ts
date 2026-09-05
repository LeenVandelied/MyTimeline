import type { CSSProperties } from 'react'
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

/**
 * DÉRIVÉE `--font-ui` — SOURCE UNIQUE, application ET Storybook (correctif de revue S77).
 *
 * `next/font` ne produit que `--font-display` (Archivo) et `--font-mono` (IBM Plex Mono) :
 * une variable par famille, et `variable:` ci-dessus est la seule façon de la nommer. Or
 * le DS « Graphite » attend une TROISIÈME variable, `--font-ui`, que `ds/tokens/base.css`
 * pose sur `body` (`font-family: var(--font-ui)`). Elle n'est pas une quatrième famille :
 * c'est un ALIAS d'Archivo, donc une dérivation — `--font-ui: var(--font-display)`.
 *
 * POURQUOI ELLE VIT ICI. Cette dérivation était ÉCRITE DEUX FOIS À LA MAIN : en style
 * inline dans `app/[locale]/layout.tsx` et, depuis #191, dans `.storybook/preview.ts`.
 * Aucune des deux ne connaissait l'autre et aucun test ne les comparait : changer l'une
 * aurait laissé l'autre dériver EN SILENCE, et les 80 stories se seraient rendues dans
 * une police différente de l'application — exactement le défaut que #191 venait de
 * corriger (avant lui, `--font-display`/`-ui`/`-mono` valaient la chaîne VIDE dans
 * Storybook et TOUT tombait en police système). Une garantie de parité qu'on décrit sans
 * l'écrire est pire que pas de garantie ([[PIT-S58-004]]) : ici elle n'est plus décrite,
 * elle est STRUCTURELLE — il n'existe qu'une seule dérivation, les deux côtés l'importent.
 *
 * ⚠ Ce module est chargé par DEUX builders : Next (`app/[locale]/layout.tsx`) et le
 * builder Vite de Storybook (`.storybook/preview.ts` l'importait déjà pour `archivo` /
 * `ibmPlexMono` avant ce correctif — c'est ce qui rend le partage sûr). N'y rien mettre
 * qui dépende de l'un des deux runtimes.
 */
export const FONT_UI_VARIABLE = '--font-ui'
export const FONT_UI_VALUE = 'var(--font-display)'

/**
 * La dérivation sous forme de style inline React, pour le `<html>` de l'application.
 * Le `as CSSProperties` est requis : `CSSProperties` ne déclare pas les propriétés
 * personnalisées `--*`. Il porte sur une clé littérale, pas sur une signature d'index.
 */
export const fontUiStyle = { [FONT_UI_VARIABLE]: FONT_UI_VALUE } as CSSProperties
