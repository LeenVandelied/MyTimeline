import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { TimelineEditHost } from './TimelineEditHost'
import type { TimelineResponsiveProps } from './TimelineResponsive'
import type { PositionedEvent } from './zoom'
import { AuthProvider } from '@/contexts/AuthContext'
import { deleteEvent } from '@/services/eventService'
import { queryKeys } from '@/lib/query-keys'

/**
 * #review S42 (MINEUR) — INVARIANT provider de TimelineEditHost.
 *
 * `TimelineEditHost` monte `useEventEditConflict`, qui appelle `useAuth()` → LÈVE hors
 * d'un `<AuthProvider>`. Ce test verrouille l'invariant : monté SOUS un AuthProvider réel,
 * le host se rend sans lever. `TimelineResponsive` (frise lourde) est stubbé — on isole le
 * câblage host/hook. `authService` mocké pour que la restauration de session au montage
 * (fetchUser → /me) se résolve sans réseau.
 *
 * #309 — le stub expose un déclencheur `mobile-delete-trigger` qui invoque
 * `onDeleteEvent(event)` comme le ferait `TimelineActionSheet` (mobile), SANS passer
 * par `onEditEvent` (contrairement au chemin desktop `EventEditForm` → `editing`).
 *
 * #review S46 (MAJEUR) — le chemin mobile passe désormais par `DeleteConfirmDialog`
 * (hard-delete serveur : pas de corbeille) et l'échec de `deleteEvent` doit être
 * remonté à l'utilisateur au lieu de finir en unhandled rejection.
 *
 * next-intl mocké en chemin de clé (`namespace.key`) : `DeleteConfirmDialog` traduit
 * ses libellés, on assert sur les clés (indépendant de la locale).
 */

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  useLocale: () => 'fr',
}))

vi.mock('./TimelineResponsive', () => {
  const positionedEvent = (id: string, title: string, archived = false): PositionedEvent => ({
    id,
    title,
    start: '2026-01-01',
    end: '2026-01-02',
    allDay: false,
    resourceId: 'product-1',
    extendedProps: {
      productId: 'product-1',
      productName: 'Produit',
      category: 'cat',
      type: 'single',
      archived,
    },
    leftPx: 0,
    widthPx: 0,
    status: 'upcoming',
  })

  return {
    TimelineResponsive: (props: TimelineResponsiveProps) => (
      <div data-testid="timeline-responsive-stub">
        <button
          type="button"
          data-testid="mobile-delete-trigger"
          onClick={() => props.onDeleteEvent?.(positionedEvent('evt-mobile', 'Mobile event'))}
        >
          delete
        </button>
        {/* Chemin DESKTOP : `EventDrawer` ouvre l'éditeur (`editing`), la suppression part
            ensuite d'`EventEditForm` → `DeleteConfirmDialog` → `deleteEditing`. */}
        <button
          type="button"
          data-testid="desktop-edit-trigger"
          onClick={() => props.onEditEvent?.(positionedEvent('evt-desktop', 'Desktop event'))}
        >
          edit
        </button>
        {/* #188 / BR-EVE-013 — événement archivé, pour prouver le pré-remplissage
            `defaultValues.archived` (porté depuis `EventContent.test.tsx` avant #634). */}
        <button
          type="button"
          data-testid="desktop-edit-trigger-archived"
          onClick={() =>
            props.onEditEvent?.(
              positionedEvent('evt-desktop-archived', 'Desktop archived event', true),
            )
          }
        >
          edit archived
        </button>
      </div>
    ),
  }
})

vi.mock('@/services/authService', () => ({
  getUserProfile: vi.fn().mockResolvedValue({ id: 'user-1', name: 'Test', email: 't@e.st' }),
  login: vi.fn(),
  logout: vi.fn(),
  registerUser: vi.fn(),
}))

vi.mock('@/services/eventService', () => ({
  deleteEvent: vi.fn(),
}))

/**
 * Rend le host sous un `QueryClientProvider` RÉEL (pas de mock de `@tanstack/react-query` :
 * `AuthProvider` s'en sert aussi). `invalidateQueries` est espionné sur l'instance pour
 * prouver l'invalidation de cache après suppression (absorption S46).
 */
function renderUnderAuth(resources: TimelineResponsiveProps['resources'] = []) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
  return {
    ...render(<TimelineEditHost events={[]} resources={resources} locale="fr" />, { wrapper }),
    invalidateQueries,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TimelineEditHost — invariant AuthProvider (#review S42)', () => {
  it('monté sous <AuthProvider> : se rend sans lever (useEventEditConflict → useAuth OK)', async () => {
    expect(() => renderUnderAuth()).not.toThrow()
    // Le host rend TimelineResponsive (stub) ; le dialog d'édition reste fermé (editing=null).
    expect(screen.getByTestId('timeline-responsive-stub')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByTestId('timeline-edit-dialog')).not.toBeInTheDocument(),
    )
  })
})

// #188 / BR-EVE-013 — pré-remplissage `defaultValues.archived` (`editing.extendedProps?.archived
// ?? false`, TimelineEditHost.tsx). Comportement porté depuis `EventContent.test.tsx` (supprimé
// #634, seule surface à couvrir la mapping event → defaultValues.archived sur un chemin vivant :
// `EventEditForm.test.tsx` ne teste que le RENDU d'un `defaultValues` déjà fourni en prop).
describe('TimelineEditHost — pré-remplissage archived (#188 / BR-EVE-013)', () => {
  it('event archived=true → toggle event-form-archived-toggle pré-coché', async () => {
    renderUnderAuth()
    fireEvent.click(screen.getByTestId('desktop-edit-trigger-archived'))
    expect(await screen.findByTestId('event-form-archived-toggle')).toBeChecked()
  })

  it('event non archivé → toggle event-form-archived-toggle décoché (fallback)', async () => {
    renderUnderAuth()
    fireEvent.click(screen.getByTestId('desktop-edit-trigger'))
    expect(await screen.findByTestId('event-form-archived-toggle')).not.toBeChecked()
  })
})

// #617 (DEC-S86-001) — catégorie de l'événement édité = celle de son produit, en lecture
// seule, premier bloc du corps. Couleur lue via `categoryColorsOf(resources)`.
describe('TimelineEditHost — catégorie dérivée du produit (#617)', () => {
  it('affiche la catégorie de l’événement avec la couleur de sa ressource', async () => {
    renderUnderAuth([
      { id: 'product-1', title: 'Produit', category: 'cat', categoryColor: '#3E8BD6' },
    ])
    fireEvent.click(screen.getByTestId('desktop-edit-trigger'))

    const field = await screen.findByTestId('timeline-edit-dialog-category')
    expect(field).toHaveAttribute('data-empty', 'false')
    expect(field).toHaveTextContent('cat')
    expect(field).not.toHaveTextContent('products.eventCategory.unknown')
    expect(screen.getByTestId('timeline-edit-dialog-category-swatch').style.backgroundColor).toBe(
      'rgb(62, 139, 214)',
    )
    // Premier bloc du corps : AVANT le formulaire, hors du formulaire.
    const form = screen.getByTestId('event-form')
    expect(form.contains(field)).toBe(false)
    expect(field.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('ressource sans couleur : pastille en contour neutre (aucun style inline)', async () => {
    renderUnderAuth([{ id: 'product-1', title: 'Produit', category: 'cat', categoryColor: null }])
    fireEvent.click(screen.getByTestId('desktop-edit-trigger'))

    await screen.findByTestId('timeline-edit-dialog-category')
    const swatch = screen.getByTestId('timeline-edit-dialog-category-swatch')
    expect(swatch).toHaveAttribute('data-color', 'none')
    expect(swatch.getAttribute('style')).toBeNull()
  })
})

describe('TimelineEditHost — suppression mobile (#309)', () => {
  it('onDeleteEvent (TimelineActionSheet mobile) ARME la confirmation sans supprimer', async () => {
    renderUnderAuth()

    fireEvent.click(screen.getByTestId('mobile-delete-trigger'))

    // #review S46 MAJEUR : hard-delete serveur → aucun appel réseau au tap.
    await waitFor(() => expect(screen.getByTestId('delete-confirm-button')).toBeInTheDocument())
    expect(deleteEvent).not.toHaveBeenCalled()
    // Même dialog que le desktop, variante event.
    expect(screen.getByText('common.deleteDialog.event.title')).toBeInTheDocument()

    // La suppression mobile ne passe jamais par `editing` → le dialog d'édition desktop
    // ne doit à aucun moment s'ouvrir.
    expect(screen.queryByTestId('timeline-edit-dialog')).not.toBeInTheDocument()
  })

  it('confirmation → supprime l’event ciblé et referme le dialog', async () => {
    vi.mocked(deleteEvent).mockResolvedValue(undefined)
    renderUnderAuth()

    fireEvent.click(screen.getByTestId('mobile-delete-trigger'))
    fireEvent.click(await screen.findByTestId('delete-confirm-button'))

    // Réutilise l'unique chemin `deleteEvent` du host (pas de second callback → pas de
    // divergence d'invalidation de cache desktop/mobile, cf. plan d'implémentation).
    await waitFor(() => expect(deleteEvent).toHaveBeenCalledWith('evt-mobile'))
    expect(deleteEvent).toHaveBeenCalledTimes(1)
    await waitFor(() =>
      expect(screen.queryByTestId('delete-confirm-button')).not.toBeInTheDocument(),
    )
  })

  it('annulation → ne supprime rien et referme le dialog', async () => {
    renderUnderAuth()

    fireEvent.click(screen.getByTestId('mobile-delete-trigger'))
    fireEvent.click(await screen.findByText('common.deleteDialog.cancel'))

    await waitFor(() =>
      expect(screen.queryByTestId('delete-confirm-button')).not.toBeInTheDocument(),
    )
    expect(deleteEvent).not.toHaveBeenCalled()
  })
})

describe('TimelineEditHost — échec de suppression (#review S46 MAJEUR)', () => {
  it('403 : erreur affichée à l’utilisateur, dialog maintenu ouvert (pas d’unhandled rejection)', async () => {
    // Rejet typé axios-like : `DeleteConfirmDialog` lit `error.response.status`.
    vi.mocked(deleteEvent).mockRejectedValue({ response: { status: 403 } })
    renderUnderAuth()

    fireEvent.click(screen.getByTestId('mobile-delete-trigger'))
    fireEvent.click(await screen.findByTestId('delete-confirm-button'))

    await waitFor(() => expect(deleteEvent).toHaveBeenCalledWith('evt-mobile'))
    // Feedback inline (mécanisme déjà en place sur le chemin desktop).
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('common.deleteDialog.errors.generic')
    // Le dialog NE se referme PAS : l'utilisateur voit que rien n'a été supprimé.
    expect(screen.getByTestId('delete-confirm-button')).toBeInTheDocument()
  })

  it('404 : message dédié (contrat d’erreur du dialog partagé)', async () => {
    vi.mocked(deleteEvent).mockRejectedValue({ response: { status: 404 } })
    renderUnderAuth()

    fireEvent.click(screen.getByTestId('mobile-delete-trigger'))
    fireEvent.click(await screen.findByTestId('delete-confirm-button'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'common.deleteDialog.errors.notFound',
    )
  })
})

/**
 * Absorption S46 — sans invalidation, la frise (`useProductsWithEvents`) gardait l'event
 * supprimé à l'écran jusqu'à navigation. `runDelete` étant le point d'appel UNIQUE de
 * `deleteEvent`, les deux chemins (mobile `confirmDeleteTarget`, desktop `deleteEditing`)
 * doivent en bénéficier — et AUCUN chemin d'erreur (PAT-S46-002).
 */
describe('TimelineEditHost — invalidation du cache après suppression', () => {
  it('mobile : succès → invalide le préfixe products (couvre products.withEvents)', async () => {
    vi.mocked(deleteEvent).mockResolvedValue(undefined)
    const { invalidateQueries } = renderUnderAuth()

    fireEvent.click(screen.getByTestId('mobile-delete-trigger'))
    fireEvent.click(await screen.findByTestId('delete-confirm-button'))

    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.products.all }),
    )
  })

  it('desktop : succès via l’éditeur → même invalidation (point d’appel unique)', async () => {
    vi.mocked(deleteEvent).mockResolvedValue(undefined)
    const { invalidateQueries } = renderUnderAuth()

    fireEvent.click(screen.getByTestId('desktop-edit-trigger'))
    // Le dialog d'édition monte `EventEditForm`, dont le bouton supprimer ouvre le même
    // `DeleteConfirmDialog` (#65) branché sur `deleteEditing`.
    fireEvent.click(await screen.findByTestId('event-form-delete'))
    fireEvent.click(await screen.findByTestId('delete-confirm-button'))

    await waitFor(() => expect(deleteEvent).toHaveBeenCalledWith('evt-desktop'))
    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.products.all }),
    )
  })

  it('échec serveur → AUCUNE invalidation (le cache n’est pas touché sur rejet)', async () => {
    vi.mocked(deleteEvent).mockRejectedValue({ response: { status: 403 } })
    const { invalidateQueries } = renderUnderAuth()

    fireEvent.click(screen.getByTestId('mobile-delete-trigger'))
    fireEvent.click(await screen.findByTestId('delete-confirm-button'))

    await screen.findByRole('alert')
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: queryKeys.products.all })
  })
})

/**
 * #495 — APERÇU ÉPINGLÉ sur la surface d'ÉDITION (extension de `PAT-S70-001`, posé au
 * S70 côté création). Deux choses sont vérifiées ici, et une troisième ne l'est PAS :
 *
 *  1. le bloc d'aperçu SORT du formulaire et atterrit dans le nœud d'en-tête, sans
 *     duplication de markup (`toHaveLength(1)` — un second `event-form-preview`
 *     casserait les sélecteurs des E2E existants) ;
 *  2. la BASCULE DE CLASSE du libellé « Aperçu » sur cette surface — c'est le défaut
 *     MAJEUR attrapé par la review du S70 (le reclassement fuyait vers toutes les
 *     surfaces sans mandat), l'issue exige donc une couverture PAR SURFACE ;
 *  3. ⚠ NON VÉRIFIÉ ICI : que l'aperçu reste RÉELLEMENT visible pendant le défilement.
 *     jsdom ne met rien en page et n'applique pas `position:sticky`
 *     ([[jsdom-scroll-tests-prove-nothing]]). Ces tests prouvent l'ARBRE DOM et la
 *     CLASSE, rien de la géométrie peinte — cf. le done.md, la preuve manque.
 *
 * `matchMedia` est piloté par test, et ÉVALUE la requête contre une largeur simulée.
 * #618 — l'ancien mock rendait `matches` identique pour TOUTE requête : il ne tenait
 * que parce que la surface d'édition interrogeait `(min-width: 640px)`. La coque
 * partagée interroge `(max-width: 1023px)` (seuil de la création) — un booléen
 * global y aurait inversé le sens de chaque test.
 */
function mockViewportWidth(width: number) {
  const evaluate = (query: string): boolean => {
    const min = /min-width:\s*(\d+)px/.exec(query)
    const max = /max-width:\s*(\d+)px/.exec(query)
    if (min && width < Number(min[1])) return false
    if (max && width > Number(max[1])) return false
    return Boolean(min || max)
  }
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: evaluate(query),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  })
}

const DESKTOP_WIDTH = 1280
/** 800px : l'ancien panneau latéral 480px (>= 640) — désormais sheet, comme la création. */
const COMPACT_WIDTH = 800

describe('TimelineEditHost — #495 aperçu épinglé (surface d’édition)', () => {
  it('>= lg : l’aperçu est PORTALISÉ dans l’en-tête et SORT du formulaire', async () => {
    mockViewportWidth(DESKTOP_WIDTH)
    renderUnderAuth()

    fireEvent.click(screen.getByTestId('desktop-edit-trigger'))

    const host = await screen.findByTestId('timeline-edit-dialog-preview')
    const preview = await screen.findByTestId('event-form-preview')

    await waitFor(() => expect(host).toContainElement(preview))
    expect(screen.getByTestId('event-form')).not.toContainElement(preview)
    // Aucun aperçu résiduel en flux : une seule mini-frise à synchroniser.
    expect(screen.getAllByTestId('event-form-preview')).toHaveLength(1)
  })

  it('>= lg : le libellé « Aperçu » bascule sur `.mt-drawer__label` (bascule VOULUE)', async () => {
    mockViewportWidth(DESKTOP_WIDTH)
    renderUnderAuth()

    fireEvent.click(screen.getByTestId('desktop-edit-trigger'))

    const host = await screen.findByTestId('timeline-edit-dialog-preview')
    const label = await screen.findByText('products.details.preview')

    await waitFor(() => expect(host).toContainElement(label))
    expect(label).toHaveClass('mt-drawer__label', 'mb-2')
    expect(label).not.toHaveClass('text-sm')
  })

  it('< lg (bottom sheet) : aperçu EN FLUX + classe HISTORIQUE (PAT-S44-001)', async () => {
    mockViewportWidth(COMPACT_WIDTH)
    renderUnderAuth()

    fireEvent.click(screen.getByTestId('desktop-edit-trigger'))

    await waitFor(() => expect(screen.getByTestId('timeline-edit-dialog')).toHaveClass('mt-sheet'))
    const preview = await screen.findByTestId('event-form-preview')
    expect(screen.getByTestId('event-form')).toContainElement(preview)
    // #618 — comme la création : AUCUN hôte d'aperçu sur la sheet (plus d'hôte vide
    // masqué par `empty:hidden`), donc aucun liseré possible.
    expect(screen.queryByTestId('timeline-edit-dialog-preview')).not.toBeInTheDocument()

    const label = screen.getByText('products.details.preview')
    expect(label).toHaveClass('text-ink', 'mb-2', 'text-sm')
    expect(label).not.toHaveClass('mt-drawer__label')
  })
})

/**
 * #618 — UNE seule surface de formulaire. Ces tests prouvent que l'édition consomme la
 * MÊME coque que la création (`EventFormDrawer`) : classes DS au token, fermeture
 * identique, pied sticky en sheet. Ils ne prouvent RIEN de la géométrie peinte (largeur
 * réelle 452px, animation) : c'est `sprint-71-edit-preview-pinned.spec.ts`.
 */
describe('TimelineEditHost — #618 surface unifiée avec la création', () => {
  it('>= lg : drawer `.mt-drawer--form` (token), aucune largeur arbitraire, dialog étiqueté', async () => {
    mockViewportWidth(DESKTOP_WIDTH)
    renderUnderAuth()

    fireEvent.click(screen.getByTestId('desktop-edit-trigger'))

    const panel = await screen.findByTestId('timeline-edit-dialog')
    await waitFor(() => expect(panel).toHaveClass('mt-drawer', 'mt-drawer--form'))
    expect(panel.className).not.toMatch(/w-\[\d+px\]/)
    expect(panel).toHaveAttribute('role', 'dialog')
    expect(panel).toHaveAttribute('aria-modal', 'true')
    expect(panel).toHaveAttribute('aria-label', 'products.edit.title')
    // L'événement ciblé reste nommé dans l'en-tête (sous-titre).
    expect(panel).toHaveTextContent('Desktop event')
  })

  it('ferme via la croix, le scrim et la touche Échap (comme la création)', async () => {
    mockViewportWidth(DESKTOP_WIDTH)
    renderUnderAuth()

    fireEvent.click(screen.getByTestId('desktop-edit-trigger'))
    fireEvent.click(await screen.findByTestId('timeline-edit-dialog-close'))
    await waitFor(() =>
      expect(screen.queryByTestId('timeline-edit-dialog')).not.toBeInTheDocument(),
    )

    fireEvent.click(screen.getByTestId('desktop-edit-trigger'))
    fireEvent.click(await screen.findByTestId('timeline-edit-dialog-overlay'))
    await waitFor(() =>
      expect(screen.queryByTestId('timeline-edit-dialog')).not.toBeInTheDocument(),
    )

    fireEvent.click(screen.getByTestId('desktop-edit-trigger'))
    await screen.findByTestId('timeline-edit-dialog')
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() =>
      expect(screen.queryByTestId('timeline-edit-dialog')).not.toBeInTheDocument(),
    )
  })

  it('Échap dans la confirmation de suppression ne ferme QUE la confirmation', async () => {
    mockViewportWidth(DESKTOP_WIDTH)
    renderUnderAuth()

    fireEvent.click(screen.getByTestId('desktop-edit-trigger'))
    fireEvent.click(await screen.findByTestId('event-form-delete'))
    const confirm = await screen.findByTestId('delete-confirm-button')

    // Radix ferme sa couche et marque l'événement (`preventDefault`) : le focus-trap du
    // drawer DOIT l'ignorer, sinon une seule frappe referme les deux surfaces.
    fireEvent.keyDown(confirm, { key: 'Escape' })

    await waitFor(() =>
      expect(screen.queryByTestId('delete-confirm-button')).not.toBeInTheDocument(),
    )
    expect(screen.getByTestId('timeline-edit-dialog')).toBeInTheDocument()
    expect(deleteEvent).not.toHaveBeenCalled()
  })

  it('< lg : bottom sheet avec pied sticky portant les actions (Supprimer inclus)', async () => {
    mockViewportWidth(COMPACT_WIDTH)
    renderUnderAuth()

    fireEvent.click(screen.getByTestId('desktop-edit-trigger'))

    const footer = await screen.findByTestId('timeline-edit-dialog-footer')
    await waitFor(() => expect(footer).toContainElement(screen.getByTestId('event-form-submit')))
    expect(footer).toContainElement(screen.getByTestId('event-form-delete'))
    expect(footer).toHaveClass('mt-sheet__footer')
    expect(screen.getByTestId('timeline-edit-dialog-close')).toHaveClass('mt-drawer__close--touch')
  })
})
