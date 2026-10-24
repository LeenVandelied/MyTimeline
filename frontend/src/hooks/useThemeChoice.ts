'use client'

import { createContext, useCallback, useContext, useSyncExternalStore } from 'react'
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
 * Ce module est désormais le SEUL appelant de `setTheme` hors tests (vérifiable
 * par `grep -rn "setTheme" src app`). Toute écriture d'un choix utilisateur
 * passe par `setThemeChoice` — y compris `toggle`, qui n'en est qu'un raccourci.
 * C'est là que #653 branche la persistance sur le compte (cf. pavé #653
 * ci-dessous) : aucune bascule ne peut la contourner.
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
 *
 * ────────────────────────────────────────────────────────────────────────────
 * #653 — PRÉFÉRENCE DE THÈME PORTÉE PAR LE COMPTE (ADR-010, BR-AUT-013).
 *
 * Deux chemins d'écriture, et deux seulement, tous deux dans ce module :
 *  - `setThemeChoice` (bascules, Réglages) : écrit localement PUIS confie le
 *    choix au persisteur de compte (`ThemePersistenceContext`) s'il y en a un ;
 *  - `useApplyAccountTheme` (réservé à `AuthProvider`) : applique localement la
 *    préférence LUE sur le compte à la connexion, SANS la réécrire sur le compte.
 *
 * Le persisteur est injecté par contexte, et non lu via `useAuth()` : les
 * bascules sont rendues hors `<AuthProvider>` dans les tests et Storybook, où
 * `useAuth` lève. Sans fournisseur (`null`), le thème reste purement local —
 * c'est le comportement d'avant #653.
 */

/**
 * Clé `localStorage` de next-themes. Imposée à `ThemeProvider`
 * (`components/theme-provider.tsx`) pour que la lecture de
 * `readStoredThemeChoice` et l'écriture de next-themes ne puissent pas diverger.
 */
export const THEME_STORAGE_KEY = 'theme'

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
  /** Point d'écriture du thème choisi par l'utilisateur : local, puis compte (#653). */
  setThemeChoice: (choice: ThemeChoice) => void
  /** Bascule clair ⇄ sombre à partir du thème effectif ; passe par `setThemeChoice`. */
  toggle: () => void
}

/**
 * Persisteur du choix sur le compte, fourni par `AuthProvider`. Il décide seul
 * s'il y a lieu d'écrire (utilisateur authentifié, valeur différente de celle
 * du compte) et tolère l'échec réseau : l'appelant n'attend rien.
 */
export type ThemeChoicePersister = (choice: ThemeChoice) => void

export const ThemePersistenceContext = createContext<ThemeChoicePersister | null>(null)

/**
 * Choix local EXPLICITE, ou `null`. next-themes n'écrit `localStorage` que sur
 * `setTheme` : une clé absente signifie « aucun choix fait sur cet appareil »
 * (le thème affiché est alors le défaut `system`, qui n'est PAS un choix).
 * Stockage indisponible (navigation privée stricte) : `null`.
 */
export function readStoredThemeChoice(): ThemeChoice | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeChoice(stored) ? stored : null
  } catch {
    return null
  }
}

/**
 * RÉSERVÉ À `AuthProvider` : applique localement une préférence lue sur le
 * compte, sans passer par le persisteur (elle en vient). Tout autre appelant
 * doit utiliser `setThemeChoice`, sans quoi son choix ne serait pas persisté.
 */
export function useApplyAccountTheme(): (choice: ThemeChoice) => void {
  const { setTheme } = useTheme()
  return useCallback((choice: ThemeChoice) => setTheme(choice), [setTheme])
}

const noopSubscribe = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

export function useThemeChoice(): ThemeChoiceState {
  const { theme: rawTheme, resolvedTheme: rawResolved, setTheme } = useTheme()
  const persist = useContext(ThemePersistenceContext)
  const mounted = useSyncExternalStore(noopSubscribe, clientSnapshot, serverSnapshot)

  const theme = mounted && isThemeChoice(rawTheme) ? rawTheme : undefined
  const resolvedTheme =
    mounted && (rawResolved === 'light' || rawResolved === 'dark') ? rawResolved : undefined
  const isDark = resolvedTheme === 'dark'

  // Local d'abord : l'affichage ne dépend jamais du réseau (#653 — un PUT en
  // échec laisse le thème choisi appliqué, sans retour arrière visuel).
  const setThemeChoice = useCallback(
    (choice: ThemeChoice) => {
      setTheme(choice)
      persist?.(choice)
    },
    [setTheme, persist],
  )

  // Lit la valeur BRUTE (non gardée) : un clic ne peut survenir qu'après
  // hydratation, et la destination doit refléter le thème réellement appliqué.
  const toggle = useCallback(
    () => setThemeChoice(rawResolved === 'dark' ? 'light' : 'dark'),
    [rawResolved, setThemeChoice],
  )

  return { mounted, isDark, theme, resolvedTheme, setThemeChoice, toggle }
}
