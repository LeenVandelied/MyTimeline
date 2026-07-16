import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import React from 'react'
import { AppShell } from './AppShell'

/**
 * #210 — Tests du shell applicatif (jsdom). next-intl / next-themes / navigation /
 * auth mockés → assertions locale-agnostiques (clés `ns.key`). Couvre : nav
 * persistante (3 items + a11y `aria-label`/`aria-current`), lien actif dérivé du
 * pathname, sélecteurs intégrés (langue / thème / réglages / profil / logout),
 * overlay Nouvel événement (Dialog), et délégation mobile (sidebar `lg`-gated,
 * aucune duplication de CompactRail/MobileDrawer). Contrats `data-testid` E2E.
 */
let mockPathname = '/fr/dashboard'
const push = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('next-intl', () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string) =>
      namespace ? `${namespace}.${key}` : key,
  useLocale: () => 'fr',
}))

const setTheme = vi.fn()
let mockResolvedTheme = 'light'
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: mockResolvedTheme, setTheme }),
}))

// #300 — le drawer réel monte TanStack Query + AuthContext + le formulaire complet ;
// hors périmètre de ce fichier (couvert par NewEventDrawer.test.tsx). Le mock respecte
// le contrat de props (`open` / `onClose`) pour verrouiller le câblage du shell.
// Le mock trace mount/unmount : le shell DOIT démonter le drawer à la fermeture (c'est
// ce démontage qui purge l'état interne — revue PR #313). Un mock qui se contenterait de
// rendre `null` ne distinguerait pas « démonté » de « monté mais invisible ».
const drawerLifecycle = vi.hoisted(() => vi.fn())
vi.mock('@/components/events/NewEventDrawer', () => ({
  NewEventDrawer: ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    React.useEffect(() => {
      drawerLifecycle('mount')
      return () => drawerLifecycle('unmount')
    }, [])
    return open ? (
      <div data-testid="shell-new-event-drawer">
        <button type="button" data-testid="mock-drawer-close" onClick={onClose}>
          close
        </button>
      </div>
    ) : null
  },
}))

const logout = vi.fn().mockResolvedValue(undefined)
const mockUser = {
  id: 'u1',
  name: 'Jane Doe',
  username: 'jane',
  email: 'jane@example.com',
  role: 'USER',
  avatarUrl: null,
}
// #210 — état d'auth mutable : le shell porte désormais sa propre garde
// (`useAuthGuard`, qui lit ce même mock). Permet de couvrir les cas anonyme
// (spinner + redirection) et restauration de session (spinner).
let mockAuthUser: typeof mockUser | null = mockUser
let mockAuthLoading = false
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    logout,
    loading: mockAuthLoading,
    login: vi.fn(),
    register: vi.fn(),
    refreshUser: vi.fn(),
  }),
}))

const renderShell = () =>
  render(
    <AppShell>
      <div data-testid="child-content">Contenu écran</div>
    </AppShell>,
  )

// Réinitialise l'état d'auth mutable + les spies avant chaque test (défaut : connecté).
beforeEach(() => {
  mockAuthUser = mockUser
  mockAuthLoading = false
  push.mockClear()
})

describe('AppShell — nav persistante', () => {
  beforeEach(() => {
    mockPathname = '/fr/dashboard'
    mockResolvedTheme = 'light'
    push.mockClear()
    setTheme.mockClear()
    logout.mockClear()
  })

  it('rend la sidebar avec la marque, le bouton Nouvel événement et 3 liens de nav', () => {
    renderShell()
    expect(screen.getByTestId('shell-sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('shell-sidebar-new-event-button')).toBeInTheDocument()
    expect(screen.getByTestId('shell-sidebar-nav-link-dashboard')).toBeInTheDocument()
    expect(screen.getByTestId('shell-sidebar-nav-link-timeline')).toBeInTheDocument()
    expect(screen.getByTestId('shell-sidebar-nav-link-products')).toBeInTheDocument()
  })

  it('expose une nav étiquetée (aria-label) — a11y', () => {
    renderShell()
    expect(screen.getByRole('navigation', { name: 'shell.nav.aria' })).toBeInTheDocument()
  })

  it('rend le contenu enfant dans le main', () => {
    renderShell()
    expect(screen.getByTestId('shell-main')).toContainElement(screen.getByTestId('child-content'))
  })
})

describe('AppShell — lien actif', () => {
  beforeEach(() => {
    mockResolvedTheme = 'light'
  })

  it('marque le lien du segment courant avec aria-current="page"', () => {
    mockPathname = '/fr/dashboard'
    renderShell()
    expect(screen.getByTestId('shell-sidebar-nav-link-dashboard')).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByTestId('shell-sidebar-nav-link-products')).not.toHaveAttribute(
      'aria-current',
    )
    expect(screen.getByTestId('shell-sidebar-nav-link-timeline')).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('bascule l’état actif selon le pathname (sous-route incluse)', () => {
    mockPathname = '/fr/products/abc'
    renderShell()
    expect(screen.getByTestId('shell-sidebar-nav-link-products')).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByTestId('shell-sidebar-nav-link-dashboard')).not.toHaveAttribute(
      'aria-current',
    )
  })

  // #301 — L'écran frise réel remplace le placeholder sous `/timeline` ; le lien
  // de nav « Timeline » doit être actif sur ce segment (critère d'acceptation).
  it('marque le lien Timeline actif sur le segment /timeline', () => {
    mockPathname = '/fr/timeline'
    renderShell()
    expect(screen.getByTestId('shell-sidebar-nav-link-timeline')).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByTestId('shell-sidebar-nav-link-dashboard')).not.toHaveAttribute(
      'aria-current',
    )
    expect(screen.getByTestId('shell-sidebar-nav-link-products')).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('applique la classe active calquée sur SettingsShell (accent, pas .is-active)', () => {
    mockPathname = '/fr/dashboard'
    renderShell()
    const active = screen.getByTestId('shell-sidebar-nav-link-dashboard')
    expect(active.className).toContain('bg-accent-soft')
    expect(active.className).toContain('text-accent')
    expect(active.className).not.toContain('is-active')
  })
})

describe('AppShell — sélecteurs intégrés', () => {
  beforeEach(() => {
    mockResolvedTheme = 'light'
    push.mockClear()
    setTheme.mockClear()
    logout.mockClear()
  })

  it('intègre langue, thème, réglages, profil et déconnexion', () => {
    renderShell()
    expect(screen.getByTestId('shell-sidebar-theme-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('shell-sidebar-settings-link')).toBeInTheDocument()
    expect(screen.getByTestId('shell-sidebar-avatar')).toBeInTheDocument()
    expect(screen.getByTestId('shell-sidebar-logout')).toBeInTheDocument()
  })

  it('l’avatar profil est carré (rounded-sm, jamais rounded-full)', () => {
    renderShell()
    const avatar = screen.getByTestId('shell-sidebar-avatar')
    expect(avatar.className).toContain('rounded-sm')
    expect(avatar.className).not.toContain('mt-avatar--round')
  })

  it('le toggle de thème appelle setTheme("dark") en mode clair', () => {
    renderShell()
    const toggle = screen.getByTestId('shell-sidebar-theme-toggle')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(toggle)
    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('la déconnexion appelle logout puis redirige vers /login localisé', async () => {
    renderShell()
    fireEvent.click(screen.getByTestId('shell-sidebar-logout'))
    expect(logout).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(push).toHaveBeenCalledWith('/fr/login'))
  })
})

// #300 — le Dialog placeholder (#210) est remplacé par le drawer de création réel.
// `NewEventDrawer` est mocké : son comportement propre est couvert par
// `NewEventDrawer.test.tsx` ; ici on ne verrouille QUE le câblage du shell
// (ouverture/fermeture pilotées par le bouton de la sidebar).
describe('AppShell — overlay Nouvel événement', () => {
  it('ouvre le drawer de création au clic sur Nouvel événement', async () => {
    mockResolvedTheme = 'light'
    renderShell()
    // Fermé au montage.
    expect(screen.queryByTestId('shell-new-event-drawer')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('shell-sidebar-new-event-button'))
    await waitFor(() => expect(screen.getByTestId('shell-new-event-drawer')).toBeInTheDocument())
  })

  // Non-régression (revue PR #313) : le shell doit DÉMONTER le drawer à la fermeture,
  // pas seulement le rendre invisible. C'est le démontage qui purge l'état interne
  // (produit choisi, erreur produit, état de la mutation) ; sans lui, une erreur de
  // soumission réapparaissait à la réouverture suivante sur un formulaire vierge.
  it('démonte le drawer à la fermeture (purge de son état interne)', async () => {
    mockResolvedTheme = 'light'
    renderShell()
    drawerLifecycle.mockClear()

    fireEvent.click(screen.getByTestId('shell-sidebar-new-event-button'))
    await waitFor(() => expect(screen.getByTestId('shell-new-event-drawer')).toBeInTheDocument())
    expect(drawerLifecycle).toHaveBeenCalledWith('mount')

    fireEvent.click(screen.getByTestId('mock-drawer-close'))
    await waitFor(() => expect(drawerLifecycle).toHaveBeenCalledWith('unmount'))

    // Réouverture = instance NEUVE (donc état vierge), pas la précédente ressuscitée.
    drawerLifecycle.mockClear()
    fireEvent.click(screen.getByTestId('shell-sidebar-new-event-button'))
    await waitFor(() => expect(drawerLifecycle).toHaveBeenCalledWith('mount'))
  })

  it('ne rend plus le Dialog placeholder #210', () => {
    mockResolvedTheme = 'light'
    renderShell()
    fireEvent.click(screen.getByTestId('shell-sidebar-new-event-button'))
    expect(screen.queryByTestId('shell-new-event-dialog')).not.toBeInTheDocument()
  })

  it('referme le drawer via onClose', async () => {
    mockResolvedTheme = 'light'
    renderShell()
    fireEvent.click(screen.getByTestId('shell-sidebar-new-event-button'))
    await waitFor(() => expect(screen.getByTestId('shell-new-event-drawer')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('mock-drawer-close'))
    await waitFor(() =>
      expect(screen.queryByTestId('shell-new-event-drawer')).not.toBeInTheDocument(),
    )
  })
})

describe('AppShell — délégation mobile', () => {
  it('la sidebar est réservée au desktop (hidden lg:flex) et ne duplique pas la nav mobile', () => {
    mockResolvedTheme = 'light'
    renderShell()
    const sidebar = screen.getByTestId('shell-sidebar')
    expect(sidebar.className).toContain('hidden')
    expect(sidebar.className).toContain('lg:flex')
    expect(sidebar.className).toContain('w-sidebar')
    // Le shell ne rend PAS CompactRail / MobileDrawer : la nav mobile reste
    // déléguée à l'écran enveloppé (zéro duplication).
    expect(screen.queryByTestId('dashboard-rail')).not.toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-mobile-drawer')).not.toBeInTheDocument()
  })
})

describe('AppShell — garde auth (anti-flash anonyme, #210)', () => {
  it('anonyme (user=null) : rend un spinner, jamais la chrome authentifiée', () => {
    mockAuthUser = null
    mockAuthLoading = false
    renderShell()
    // Spinner plein écran a11y (role="status"), aucune sidebar / contenu enfant.
    expect(screen.getByTestId('app-shell-loading')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByTestId('shell-sidebar')).not.toBeInTheDocument()
    expect(screen.queryByTestId('shell-main')).not.toBeInTheDocument()
    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument()
  })

  it('anonyme : redirige vers /login localisé (garde au niveau du shell)', async () => {
    mockAuthUser = null
    mockAuthLoading = false
    renderShell()
    await waitFor(() => expect(push).toHaveBeenCalledWith('/fr/login'))
  })

  it('session en cours de restauration (loading) : rend un spinner, pas de flash', () => {
    mockAuthUser = null
    mockAuthLoading = true
    renderShell()
    expect(screen.getByTestId('app-shell-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('shell-sidebar')).not.toBeInTheDocument()
    // Pas de redirection tant que la session se restaure.
    expect(push).not.toHaveBeenCalled()
  })
})
