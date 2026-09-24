'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { THEME_OPTIONS, type ThemeOption } from '@/types/settings'

/**
 * #655 — POINT D'ÉCRITURE UNIQUE du thème de l'application.
 *
 * Avant #655, quatre composants appelaient `setTheme` de next-themes en direct :
 * la bascule publique (`ui/theme-toggle.tsx`), la bascule du shell
 * (`layout/AppShell.tsx`), celle du tiroir mobile (`dashboard/MobileDrawer.tsx`)
 * et le sélecteur des Réglages (`settings/PreferencesSection.tsx`). Deux d'entre
 * eux lisaient `resolvedTheme` sans garde de montage.
 *
 * Ce hook est désormais le SEUL appelant de `setTheme` hors tests (vérifiable
 * par `grep -rn "setTheme" src app`). Toute écriture du thème passe par
 * `setThemeChoice` — y compris `toggle`, qui n'en est qu'un raccourci. C'est
 * l'endroit où #653 (préférence de thème persistée sur le compte) branchera la
 * persistance serveur : un seul site à modifier, et aucune bascule ne peut la
 * contourner.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * LA GARDE `mounted`.
 *
 * next-themes ne connaît le thème que côté client (`theme` et `resolvedTheme`
 * valent `undefined` au rendu serveur). Tout rendu qui en dépend doit donc être
 * identique au HTML serveur pendant l'hydratation, sous peine d'écart. `mounted`
 * vaut `false` au rendu serveur ET pendant l'hydratation, `true` ensuite.
 *
 * Il est obtenu par `useSyncExternalStore` (instantané serveur `false`,
 * instantané client `true`) et non par le couple `useState(false)` +
 * `useEffect(() => setMounted(true))` :
 *  - à l'HYDRATATION, React utilise l'instantané serveur puis re-rend avec
 *    l'instantané client — même garantie que le couple `useEffect` ;
 *  - à un montage PUREMENT CLIENT (le tiroir mobile, monté à l'ouverture, bien
 *    après l'hydratation), `mounted` vaut `true` dès le premier rendu : pas de
 *    rendu intermédiaire au libellé générique à chaque ouverture.
 *
 * `isDark` est gardé (`mounted && resolvedTheme === 'dark'`) : un consommateur
 * qui l'utilise pour choisir un libellé ne peut pas, par construction, rendre
 * côté serveur une valeur que le client contredirait.
 */

export type ThemeChoice = ThemeOption

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === 'string' && (THEME_OPTIONS as readonly string[]).includes(value)
}

export interface ThemeChoiceState {
  /** `false` au rendu serveur et pendant l'hydratation, `true` ensuite. */
  mounted: boolean
  /** Thème effectif sombre — toujours `false` avant montage. */
  isDark: boolean
  /** Choix enregistré (`light` / `dark` / `system`) — `undefined` avant montage. */
  theme: ThemeChoice | undefined
  /** Thème effectivement appliqué (`system` résolu) — `undefined` avant montage. */
  resolvedTheme: 'light' | 'dark' | undefined
  /** SEUL point d'écriture du thème (cf. pavé : #653 s'y branche). */
  setThemeChoice: (choice: ThemeChoice) => void
  /** Bascule clair ⇄ sombre à partir du thème effectif ; passe par `setThemeChoice`. */
  toggle: () => void
}

const noopSubscribe = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

export function useThemeChoice(): ThemeChoiceState {
  const { theme: rawTheme, resolvedTheme: rawResolved, setTheme } = useTheme()
  const mounted = useSyncExternalStore(noopSubscribe, clientSnapshot, serverSnapshot)

  const theme = mounted && isThemeChoice(rawTheme) ? rawTheme : undefined
  const resolvedTheme =
    mounted && (rawResolved === 'light' || rawResolved === 'dark') ? rawResolved : undefined
  const isDark = resolvedTheme === 'dark'

  const setThemeChoice = useCallback((choice: ThemeChoice) => setTheme(choice), [setTheme])

  // Lit la valeur BRUTE (non gardée) : un clic ne peut survenir qu'après
  // hydratation, et la destination doit refléter le thème réellement appliqué.
  const toggle = useCallback(
    () => setThemeChoice(rawResolved === 'dark' ? 'light' : 'dark'),
    [rawResolved, setThemeChoice],
  )

  return { mounted, isDark, theme, resolvedTheme, setThemeChoice, toggle }
}
