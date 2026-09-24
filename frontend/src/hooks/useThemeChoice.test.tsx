import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { renderToString } from 'react-dom/server'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isThemeChoice, useThemeChoice, type ThemeChoiceState } from './useThemeChoice'

/**
 * #655 — `useThemeChoice`, point d'écriture UNIQUE du thème.
 *
 * CE QUE CES TESTS PROUVENT.
 *  1. La garde `mounted` : au rendu serveur, `mounted` est faux et AUCUNE valeur
 *     dépendant du thème ne fuit (`isDark` faux, `theme`/`resolvedTheme`
 *     indéfinis) même si next-themes en fournit une ; au rendu client, `mounted`
 *     est vrai dès le premier rendu.
 *  2. `setThemeChoice` et `toggle` écrivent via `setTheme` de next-themes.
 *  3. Le contrat « un seul écrivain » : hors tests, aucun fichier de `src/` ni
 *     d'`app/` n'appelle `setTheme` en dehors de ce hook. C'est ce qui garantit
 *     que la persistance serveur de #653, branchée ici, ne peut pas être
 *     contournée par une bascule.
 *
 * CE QU'ILS NE PROUVENT PAS : le comportement d'hydratation réel (bascule de
 * l'instantané serveur au client) — `useSyncExternalStore` y est exercé par
 * React lui-même, pas par jsdom. Le garde-fou 3 est un balayage TEXTUEL : un
 * appel indirect (`const { setTheme: s } = useTheme()`) lui échapperait ; il
 * vérifie donc aussi qu'aucun autre fichier n'importe `useTheme`.
 */

const setTheme = vi.fn()
let theme: string | undefined = 'system'
let resolvedTheme: string | undefined = 'light'

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme, resolvedTheme, setTheme }),
}))

beforeEach(() => {
  setTheme.mockClear()
  theme = 'system'
  resolvedTheme = 'light'
})

function captureServerState(): ThemeChoiceState {
  let captured: ThemeChoiceState | undefined
  function Probe() {
    captured = useThemeChoice()
    return null
  }
  renderToString(<Probe />)
  if (!captured) throw new Error('le hook n’a pas été rendu')
  return captured
}

describe('useThemeChoice — garde de montage', () => {
  it('au rendu serveur : non monté, aucune valeur de thème exposée', () => {
    theme = 'dark'
    resolvedTheme = 'dark'
    const state = captureServerState()

    expect(state.mounted).toBe(false)
    expect(state.isDark).toBe(false)
    expect(state.theme).toBeUndefined()
    expect(state.resolvedTheme).toBeUndefined()
  })

  it('au rendu client : monté dès le premier rendu, valeurs exposées', () => {
    theme = 'dark'
    resolvedTheme = 'dark'
    const { result } = renderHook(() => useThemeChoice())

    expect(result.current.mounted).toBe(true)
    expect(result.current.isDark).toBe(true)
    expect(result.current.theme).toBe('dark')
    expect(result.current.resolvedTheme).toBe('dark')
  })

  it('ignore une valeur de next-themes hors du domaine light/dark/system', () => {
    theme = 'sepia'
    resolvedTheme = 'sepia'
    const { result } = renderHook(() => useThemeChoice())

    expect(result.current.theme).toBeUndefined()
    expect(result.current.resolvedTheme).toBeUndefined()
    expect(result.current.isDark).toBe(false)
  })
})

describe('useThemeChoice — écriture', () => {
  it.each(['light', 'dark', 'system'] as const)('setThemeChoice(%s) écrit le choix', (choice) => {
    const { result } = renderHook(() => useThemeChoice())
    act(() => result.current.setThemeChoice(choice))
    expect(setTheme).toHaveBeenCalledWith(choice)
  })

  it.each([
    ['light', 'dark'],
    ['dark', 'light'],
  ])('toggle depuis le thème effectif %s demande %s', (from, to) => {
    theme = 'system'
    resolvedTheme = from
    const { result } = renderHook(() => useThemeChoice())
    act(() => result.current.toggle())
    expect(setTheme).toHaveBeenCalledWith(to)
  })

  it('isThemeChoice ne retient que les 3 choix', () => {
    expect(['light', 'dark', 'system'].every(isThemeChoice)).toBe(true)
    expect(isThemeChoice('sepia')).toBe(false)
    expect(isThemeChoice(undefined)).toBe(false)
  })
})

describe('useThemeChoice — seul écrivain du thème', () => {
  // Même ancrage que `AppShell.test.tsx` : vitest tourne depuis `frontend/`.
  const frontendRoot = process.cwd()
  const HOOK = 'src/hooks/useThemeChoice.ts'

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) return sourceFiles(full)
      if (!/\.(ts|tsx)$/.test(name)) return []
      if (/\.test\.(ts|tsx)$/.test(name) || full.includes('__tests__')) return []
      return [full]
    })
  }

  const files = [
    ...sourceFiles(join(frontendRoot, 'src')),
    ...sourceFiles(join(frontendRoot, 'app')),
  ]

  it('balaye bien des fichiers (auto-contrôle)', () => {
    expect(files.length).toBeGreaterThan(50)
    expect(files.map((f) => relative(frontendRoot, f))).toContain(HOOK)
  })

  it('aucun fichier hors du hook n’appelle setTheme ni n’importe useTheme', () => {
    const offenders = files
      .map((f) => [relative(frontendRoot, f), readFileSync(f, 'utf8')] as const)
      .filter(([rel]) => rel !== HOOK)
      .filter(
        ([, source]) =>
          /\bsetTheme\s*\(/.test(source) ||
          /import\s*\{[^}]*\buseTheme\b[^}]*\}\s*from\s*'next-themes'/.test(source),
      )
      .map(([rel]) => rel)

    expect(offenders).toEqual([])
  })
})
