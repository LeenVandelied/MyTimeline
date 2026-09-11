import { renderToString } from 'react-dom/server'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeToggle } from './theme-toggle'

/**
 * #642 (DEC-S82-009) — garde-fous de la bascule de thème exposée HORS CONNEXION.
 *
 * CE QUE CES TESTS PROUVENT.
 *  1. Le HTML **serveur** (renderToString) et le premier rendu client portent le
 *     MÊME nom accessible — le libellé générique. C'est la condition d'une
 *     hydratation propre sur les routes publiques, qui sont statiques
 *     (`generateStaticParams` de `app/[locale]/layout.tsx`).
 *  2. Les DEUX icônes sont dans le DOM quel que soit le thème résolu, et c'est
 *     la variante `dark:` qui en masque une. C'est ce qui évite qu'une icône
 *     saute après hydratation, comme le feraient les deux bascules applicatives
 *     préexistantes (`AppShell`, `MobileDrawer`), qui rendent `isDark ? … : …`.
 *  3. Après montage, le libellé annonce la DESTINATION et `aria-pressed` l'état.
 *  4. Le clic demande bien le thème opposé à `resolvedTheme`.
 *  5. Les trois points de montage publics (landing desktop, panneau mobile,
 *     4 pages d'auth) montent effectivement le composant.
 *
 * CE QUE CES TESTS NE PROUVENT PAS. **Rien de l'absence de flash**, ni du rendu.
 * jsdom n'exécute pas le script de pré-hydratation de next-themes, ne résout pas
 * `@custom-variant dark` (il ne compile aucun CSS Tailwind) et ne peint rien :
 * que `dark:hidden` masque réellement la lune en thème sombre ne se vérifie
 * qu'au navigateur. Ils ne prouvent pas non plus la cible tactile 44×44 du
 * pseudo-élément (PIT-S24-002), qu'aucune bounding box jsdom ne calcule.
 */

const setTheme = vi.fn()
let resolvedTheme: string | undefined = 'light'

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme, setTheme }),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

beforeEach(() => {
  setTheme.mockClear()
  resolvedTheme = 'light'
})

describe('ThemeToggle — hydratation', () => {
  it('rend le libellé GÉNÉRIQUE côté serveur (pas de destination devinée)', () => {
    resolvedTheme = undefined
    const html = renderToString(<ThemeToggle testId="t" />)

    expect(html).toContain('aria-label="theme.toggle"')
    expect(html).not.toContain('theme.toLight')
    expect(html).not.toContain('theme.toDark')
    // Pas d'état annoncé tant que le thème n'est pas résolu.
    expect(html).not.toContain('aria-pressed')
  })

  it('sert les DEUX icônes, avec la variante `dark:` pour trancher', () => {
    const html = renderToString(<ThemeToggle testId="t" />)

    expect(html).toContain('dark:block')
    expect(html).toContain('dark:hidden')
    expect(html.match(/<svg/g)).toHaveLength(2)
  })

  it.each(['light', 'dark', undefined])(
    'garde les deux icônes montées avec resolvedTheme=%s',
    (theme) => {
      resolvedTheme = theme
      const { container } = render(<ThemeToggle testId="t" />)

      expect(container.querySelectorAll('svg')).toHaveLength(2)
    },
  )
})

describe('ThemeToggle — nom accessible et état après montage', () => {
  it('annonce « passer au sombre » quand le thème courant est clair', () => {
    resolvedTheme = 'light'
    render(<ThemeToggle testId="t" />)

    const button = screen.getByTestId('t')
    expect(button).toHaveAttribute('aria-label', 'theme.toDark')
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('annonce « passer au clair » quand le thème courant est sombre', () => {
    resolvedTheme = 'dark'
    render(<ThemeToggle testId="t" />)

    const button = screen.getByTestId('t')
    expect(button).toHaveAttribute('aria-label', 'theme.toLight')
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('porte un nom accessible non vide (icône seule)', () => {
    render(<ThemeToggle testId="t" />)
    expect(screen.getByRole('button', { name: 'theme.toDark' })).toBeInTheDocument()
  })
})

describe('ThemeToggle — bascule', () => {
  it('demande le thème sombre depuis le clair', async () => {
    resolvedTheme = 'light'
    render(<ThemeToggle testId="t" />)

    await userEvent.click(screen.getByTestId('t'))
    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('demande le thème clair depuis le sombre', async () => {
    resolvedTheme = 'dark'
    render(<ThemeToggle testId="t" />)

    await userEvent.click(screen.getByTestId('t'))
    expect(setTheme).toHaveBeenCalledWith('light')
  })
})
