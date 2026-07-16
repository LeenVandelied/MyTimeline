import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { NewEventDrawer } from './NewEventDrawer'
import type { Product } from '@/types/product'

/**
 * #300 — Tests du drawer de création d'événement (jsdom).
 *
 * Couvre : ouverture/fermeture, largeur 452px (variante DS, PAS `.mt-drawer` seul),
 * sélection de produit, garde `productId` requis (BR-EVE-002), payload EXACT envoyé
 * au service (renommages title→name / startDate→date, durée neutre sur `single`,
 * champs PATCH-only jetés — BR-EVE-013/014), récurrence (BR-EVE-006), aperçu,
 * invalidation TanStack, états loading/vide/erreur.
 *
 * `createEvent` (service) est mocké : on assert le PAYLOAD, pas le transport.
 */
const createEventMock = vi.hoisted(() => vi.fn())
vi.mock('@/services/eventService', () => ({
  createEvent: createEventMock,
}))

const mockProducts: Product[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Produit Alpha',
    color: '#112233',
    category: { id: 'c1', name: 'Cat A', color: null },
    events: [],
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Produit Beta',
    color: null,
    category: { id: 'c2', name: 'Cat B', color: null },
    events: [],
  },
]

let mockProductsData: Product[] = mockProducts
let mockProductsLoading = false
vi.mock('@/hooks/useProductsWithEvents', () => ({
  useProductsWithEvents: () => ({
    data: mockProductsData,
    isLoading: mockProductsLoading,
    isError: false,
  }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Jane' }, loading: false }),
}))

vi.mock('next-intl', () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string) =>
      namespace ? `${namespace}.${key}` : key,
  useLocale: () => 'fr',
}))

// `useMediaQuery` renvoie false par défaut (mock matchMedia de vitest.setup) →
// variante DESKTOP (drawer). La variante compacte est couverte via override.
let mockIsCompact = false
vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: () => mockIsCompact,
  default: () => mockIsCompact,
}))

vi.mock('@/contexts/NetworkStatusContext', () => ({
  useNetworkStatus: () => ({ isOnline: true }),
}))

const onClose = vi.fn()

const renderDrawer = (open = true) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <NewEventDrawer open={open} onClose={onClose} />
    </QueryClientProvider>,
  )
  return { ...utils, invalidateSpy }
}

/**
 * Sélectionne une option dans un Select Radix (ouvre le trigger puis clique l'option).
 * `role=option` (et PAS `findByText`) : Radix rend AUSSI un `<select>` natif caché pour
 * la compat formulaire → le texte matche 2 nœuds. La requête par rôle ignore le natif
 * (`aria-hidden`). Même pattern que `ProductDrawer.test.tsx`.
 */
const selectOption = async (triggerTestId: string, name: string) => {
  await userEvent.click(screen.getByTestId(triggerTestId))
  await userEvent.click(await screen.findByRole('option', { name }))
}

const selectProduct = (name: string) =>
  selectOption('shell-new-event-drawer-product-trigger', name)

beforeEach(() => {
  createEventMock.mockReset()
  createEventMock.mockResolvedValue({ id: 'new-event' })
  onClose.mockClear()
  mockProductsData = mockProducts
  mockProductsLoading = false
  mockIsCompact = false
})

describe('NewEventDrawer — ouverture / surface', () => {
  it('ne rend rien quand `open` est faux', () => {
    renderDrawer(false)
    expect(screen.queryByTestId('shell-new-event-drawer')).not.toBeInTheDocument()
  })

  it('rend un dialog modal étiqueté quand `open` est vrai', () => {
    renderDrawer()
    const panel = screen.getByTestId('shell-new-event-drawer')
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveAttribute('role', 'dialog')
    expect(panel).toHaveAttribute('aria-modal', 'true')
    expect(panel).toHaveAttribute('aria-label', 'shell.createDrawer.title')
  })

  it('desktop : applique la variante 452px `.mt-drawer--form` (token DS), pas une largeur arbitraire', () => {
    renderDrawer()
    const panel = screen.getByTestId('shell-new-event-drawer')
    expect(panel.className).toContain('mt-drawer')
    expect(panel.className).toContain('mt-drawer--form')
    // Garde-fou anti-régression : pas de largeur Tailwind arbitraire (PAT-S40-002).
    expect(panel.className).not.toMatch(/w-\[\d+px\]/)
  })

  it('compact (< lg) : bascule en bottom sheet `.mt-sheet` + fermer tactile 44×44', () => {
    mockIsCompact = true
    renderDrawer()
    const panel = screen.getByTestId('shell-new-event-drawer')
    expect(panel.className).toContain('mt-sheet')
    // Le drawer 452px ne doit PAS être appliqué en compact (pas de plein écran 452px).
    expect(panel.className).not.toContain('mt-drawer--form')
    expect(screen.getByTestId('shell-new-event-drawer-close').className).toContain(
      'mt-drawer__close--touch',
    )
  })

  it('ferme via le bouton fermer, l’overlay et la touche Échap', async () => {
    renderDrawer()
    await userEvent.click(screen.getByTestId('shell-new-event-drawer-close'))
    expect(onClose).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByTestId('shell-new-event-drawer-overlay'))
    expect(onClose).toHaveBeenCalledTimes(2)

    // Échap : mutualisé via `useFocusTrap` (#63), pas redupliqué ici.
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(3)
  })
})

describe('NewEventDrawer — sélecteur de produit (BR-EVE-002)', () => {
  it('liste les produits de l’utilisateur', async () => {
    renderDrawer()
    await userEvent.click(screen.getByTestId('shell-new-event-drawer-product-trigger'))
    expect(await screen.findByText('Produit Alpha')).toBeInTheDocument()
    expect(screen.getByText('Produit Beta')).toBeInTheDocument()
  })

  it('affiche un état de chargement des produits', () => {
    mockProductsLoading = true
    renderDrawer()
    expect(screen.getByTestId('shell-new-event-drawer-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('event-form')).not.toBeInTheDocument()
  })

  it('aucun produit : explique le prérequis au lieu d’un formulaire condamné à échouer', () => {
    mockProductsData = []
    renderDrawer()
    expect(screen.getByTestId('shell-new-event-drawer-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('event-form')).not.toBeInTheDocument()
  })

  it('submit sans produit : erreur inline, AUCUN appel réseau (pas de 400 backend)', async () => {
    renderDrawer()
    await userEvent.type(screen.getByTestId('event-form-title-input'), 'Sans produit')
    await userEvent.click(screen.getByTestId('event-form-submit'))

    await waitFor(() =>
      expect(screen.getByTestId('shell-new-event-drawer-product-error')).toBeInTheDocument(),
    )
    expect(createEventMock).not.toHaveBeenCalled()
  })

  it('l’erreur produit disparaît dès qu’un produit est choisi', async () => {
    renderDrawer()
    await userEvent.type(screen.getByTestId('event-form-title-input'), 'Titre')
    await userEvent.click(screen.getByTestId('event-form-submit'))
    await waitFor(() =>
      expect(screen.getByTestId('shell-new-event-drawer-product-error')).toBeInTheDocument(),
    )

    await selectProduct('Produit Alpha')
    expect(screen.queryByTestId('shell-new-event-drawer-product-error')).not.toBeInTheDocument()
  })
})

describe('NewEventDrawer — champs gouvernés par le contrat create', () => {
  it('masque les champs PATCH-only (archived / endDate / recurrenceEndDate)', async () => {
    renderDrawer()
    // BR-EVE-013 : un event ne peut pas naître archivé.
    expect(screen.queryByTestId('event-form-archived-toggle')).not.toBeInTheDocument()
    // BR-EVE-003 : endDate est CALCULÉE backend à la création.
    expect(screen.queryByTestId('event-form-end-date')).not.toBeInTheDocument()
    // BR-EVE-012 : recurrenceEndDate hors DTO create (même récurrence activée).
    await userEvent.click(screen.getByTestId('event-form-recurring-toggle'))
    await waitFor(() =>
      expect(screen.getByTestId('event-form-recurrence-trigger')).toBeInTheDocument(),
    )
    expect(screen.queryByTestId('event-form-recurrence-end-date')).not.toBeInTheDocument()
  })

  it('offre startDate (BR-EVE-005) pré-remplie et l’aperçu live', () => {
    renderDrawer()
    expect(screen.getByTestId('event-form-start-date')).toHaveValue(
      new Date().toLocaleDateString('sv-SE'), // YYYY-MM-DD local
    )
    expect(screen.getByTestId('event-form-preview')).toBeInTheDocument()
  })
})

describe('NewEventDrawer — soumission (payload ↔ EventCreationRequest)', () => {
  it('type=duration : envoie le payload exact (title→name, startDate→date) et referme', async () => {
    const { invalidateSpy } = renderDrawer()
    await selectProduct('Produit Alpha')
    await userEvent.type(screen.getByTestId('event-form-title-input'), 'Lancement')
    await userEvent.clear(screen.getByTestId('event-form-duration-value'))
    await userEvent.type(screen.getByTestId('event-form-duration-value'), '3')
    fireEvent.change(screen.getByTestId('event-form-start-date'), {
      target: { value: '2026-08-01' },
    })
    await userEvent.click(screen.getByTestId('event-form-submit'))

    await waitFor(() => expect(createEventMock).toHaveBeenCalledTimes(1))
    expect(createEventMock).toHaveBeenCalledWith({
      name: 'Lancement', // BR-EVE-001 — le DTO attend `name`, pas `title`.
      type: 'duration',
      durationValue: 3,
      durationUnit: 'days',
      isRecurring: false,
      recurrenceUnit: undefined,
      date: '2026-08-01', // BR-EVE-005 — le DTO attend `date`, pas `startDate`.
      color: '#6366f1',
      productId: '11111111-1111-4111-8111-111111111111',
    })
    // Aucun champ PATCH-only ne doit fuir dans le payload (BR-EVE-012/013/015).
    const payload = createEventMock.mock.calls[0][0]
    expect(payload).not.toHaveProperty('archived')
    expect(payload).not.toHaveProperty('endDate')
    expect(payload).not.toHaveProperty('recurrenceEndDate')
    expect(payload).not.toHaveProperty('version')
    expect(payload).not.toHaveProperty('title')

    // L'event créé doit apparaître dans la frise → invalidation par PRÉFIXE `products`.
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['products'] }),
    )
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('type=single : envoie une durée NEUTRE (le DTO l’exige, le calcul l’ignore)', async () => {
    renderDrawer()
    await selectProduct('Produit Alpha')
    await userEvent.type(screen.getByTestId('event-form-title-input'), 'Jalon')

    // Bascule le type sur « ponctuel » → les champs de durée disparaissent du form.
    await selectOption('event-form-type-trigger', 'products.add.event.types.single')
    await waitFor(() =>
      expect(screen.queryByTestId('event-form-duration-value')).not.toBeInTheDocument(),
    )

    await userEvent.click(screen.getByTestId('event-form-submit'))

    await waitFor(() => expect(createEventMock).toHaveBeenCalledTimes(1))
    const payload = createEventMock.mock.calls[0][0]
    expect(payload.type).toBe('single')
    // `EventCreationRequest.durationValue` est @NotNull et `durationUnit` @NotBlank
    // MÊME pour un event ponctuel : les omettre = 400. Valeurs neutres, sans effet
    // (Utils.calculateEndDate court-circuite sur type!=duration → endDate=startDate).
    expect(payload.durationValue).toBe(0)
    expect(payload.durationUnit).toBe('days')
  })

  it('récurrence : envoie recurrenceUnit quand isRecurring=true (BR-EVE-006)', async () => {
    renderDrawer()
    await selectProduct('Produit Beta')
    await userEvent.type(screen.getByTestId('event-form-title-input'), 'Revue')
    await userEvent.click(screen.getByTestId('event-form-recurring-toggle'))

    // Parité avec l'édition : WEEK/MONTH/YEAR (l'hebdo est offert, cf. divergence
    // assumée vs le mock §6 qui ne montre qu'Aucune/Mensuelle/Annuelle).
    await screen.findByTestId('event-form-recurrence-trigger')
    await selectOption('event-form-recurrence-trigger', 'products.add.event.units.weeks')

    // L'aperçu simple reflète la récurrence (scope réduit acté : pas de mini-frise).
    await waitFor(() =>
      expect(screen.getByTestId('event-form-preview-recurrence')).toBeInTheDocument(),
    )

    await userEvent.click(screen.getByTestId('event-form-submit'))
    await waitFor(() => expect(createEventMock).toHaveBeenCalledTimes(1))
    const payload = createEventMock.mock.calls[0][0]
    expect(payload.isRecurring).toBe(true)
    expect(payload.recurrenceUnit).toBe('WEEK')
  })

  it('erreur backend : message inline, drawer maintenu ouvert (saisie préservée)', async () => {
    createEventMock.mockRejectedValue({ response: { status: 500 } })
    renderDrawer()
    await selectProduct('Produit Alpha')
    await userEvent.type(screen.getByTestId('event-form-title-input'), 'Boom')
    await userEvent.click(screen.getByTestId('event-form-submit'))

    await waitFor(() => expect(screen.getByTestId('event-form-error')).toBeInTheDocument())
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByTestId('shell-new-event-drawer')).toBeInTheDocument()
  })

  it('titre vide : bloque la soumission côté client (BR-EVE-001)', async () => {
    renderDrawer()
    await selectProduct('Produit Alpha')
    await userEvent.click(screen.getByTestId('event-form-submit'))

    await waitFor(() => expect(screen.getByTestId('event-form-title-error')).toBeInTheDocument())
    expect(createEventMock).not.toHaveBeenCalled()
  })
})
