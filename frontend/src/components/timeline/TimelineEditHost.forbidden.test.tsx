import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from '@/services/apiClient'
import { TimelineEditHost } from './TimelineEditHost'
import type { TimelineResponsiveProps } from './TimelineResponsive'
import type { PositionedEvent } from './zoom'

/**
 * #766 — 403 sur l'ÉDITION et la SUPPRESSION d'un événement : UN SEUL signalement,
 * et c'est la cause explicite (`forbidden`) qui s'affiche dans l'écran, pas le
 * message générique.
 *
 * Modèle `ProductDrawer.forbidden.test.tsx` (PIT-S102-001) : la chaîne host →
 * `useEventEditConflict` / `runDelete` → `eventService` → `apiClient` → intercepteur
 * est RÉELLE. Seul l'adaptateur HTTP est remplacé (403). Avec `eventService` mocké
 * (cf. `TimelineEditHost.test.tsx`), « aucun toast » serait vacant : la requête ne
 * partirait jamais.
 *
 * Restent mockés, hors sujet : la frise (`TimelineResponsive`, stub à déclencheurs),
 * `useAuth` (sinon la restauration `/me` passerait par l'adaptateur 403 → toast parasite)
 * et `useRecurrencePreview` (GET réseau, même raison).
 *
 * Le témoin (dernier test) prouve que l'intercepteur est câblé dans ce montage.
 */

const toastErrorMock = vi.hoisted(() => vi.fn())
const toastSuccessMock = vi.hoisted(() => vi.fn())
vi.mock('react-hot-toast', () => ({
  default: { success: toastSuccessMock, error: toastErrorMock },
  toast: { success: toastSuccessMock, error: toastErrorMock },
}))
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  useLocale: () => 'fr',
}))
vi.mock('@/services/authService', () => ({
  refreshToken: vi.fn().mockResolvedValue(true),
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))
vi.mock('@/hooks/useRecurrencePreview', () => ({
  useRecurrencePreview: () => ({ data: undefined }),
}))

vi.mock('./TimelineResponsive', () => {
  const positionedEvent = (id: string, title: string): PositionedEvent => ({
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
      archived: false,
    },
    leftPx: 0,
    widthPx: 0,
    status: 'upcoming',
  })

  return {
    TimelineResponsive: (props: TimelineResponsiveProps) => (
      <div data-testid="timeline-responsive-stub">
        {/* Chemin MOBILE : `TimelineActionSheet` arme directement la confirmation. */}
        <button
          type="button"
          data-testid="mobile-delete-trigger"
          onClick={() => props.onDeleteEvent?.(positionedEvent('evt-mobile', 'Mobile event'))}
        >
          delete
        </button>
        {/* Chemin DESKTOP : éditeur ouvert, PATCH ou suppression depuis `EventEditForm`. */}
        <button
          type="button"
          data-testid="desktop-edit-trigger"
          onClick={() => props.onEditEvent?.(positionedEvent('evt-desktop', 'Desktop event'))}
        >
          edit
        </button>
      </div>
    ),
  }
})

const originalAdapter = apiClient.defaults.adapter

/** Adaptateur axios : toute requête reçoit un 403, comme le ferait `EventController`. */
const forbiddenAdapter = (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  const response: AxiosResponse = {
    data: { message: 'Forbidden' },
    status: 403,
    statusText: 'Forbidden',
    headers: {},
    config,
  }
  return Promise.reject(
    new AxiosError(
      'Request failed with status code 403',
      'ERR_BAD_REQUEST',
      config,
      null,
      response,
    ),
  )
}

function renderHost() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <TimelineEditHost events={[]} resources={[]} locale="fr" />
    </QueryClientProvider>,
  )
}

describe('TimelineEditHost — 403 signalé une seule fois, avec sa cause (#766)', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    toastErrorMock.mockReset()
    toastSuccessMock.mockReset()
    apiClient.defaults.adapter = forbiddenAdapter
    // L'intercepteur et `eventService` journalisent (assaini) le 403 : log attendu.
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
    consoleErrorSpy.mockRestore()
  })

  it('édition : 403 → validation.event.forbidden inline (pas le générique), AUCUN toast', async () => {
    renderHost()
    fireEvent.click(screen.getByTestId('desktop-edit-trigger'))
    const title = await screen.findByTestId('event-form-title-input')
    fireEvent.change(title, { target: { value: 'Titre modifié' } })
    fireEvent.click(screen.getByTestId('event-form-submit'))

    const error = await screen.findByTestId('event-form-error')
    expect(error).toHaveTextContent('validation.event.forbidden')
    expect(screen.queryByText('validation.event.submitError')).not.toBeInTheDocument()
    // L'intercepteur a bien vu le 403 du PATCH (log assaini) mais s'est tu.
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Erreur 403 - Accès refusé:',
      expect.objectContaining({ url: '/events/evt-desktop', method: 'patch' }),
    )
    expect(toastErrorMock).not.toHaveBeenCalled()
    expect(toastSuccessMock).not.toHaveBeenCalled()
    // L'éditeur reste ouvert : rien n'a été enregistré.
    expect(screen.getByTestId('timeline-edit-dialog')).toBeInTheDocument()
  })

  it('suppression (mobile) : 403 → deleteDialog.errors.forbidden inline, AUCUN toast', async () => {
    renderHost()
    fireEvent.click(screen.getByTestId('mobile-delete-trigger'))
    fireEvent.click(await screen.findByTestId('delete-confirm-button'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'common.deleteDialog.errors.forbidden',
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Erreur 403 - Accès refusé:',
      expect.objectContaining({ url: '/events/evt-mobile', method: 'delete' }),
    )
    expect(toastErrorMock).not.toHaveBeenCalled()
    // Le dialog reste ouvert : l'utilisateur voit que rien n'a été supprimé.
    expect(screen.getByTestId('delete-confirm-button')).toBeInTheDocument()
  })

  it('suppression (desktop, depuis l’éditeur) : 403 → deleteDialog.errors.forbidden, AUCUN toast', async () => {
    renderHost()
    fireEvent.click(screen.getByTestId('desktop-edit-trigger'))
    fireEvent.click(await screen.findByTestId('event-form-delete'))
    fireEvent.click(await screen.findByTestId('delete-confirm-button'))

    await waitFor(() =>
      expect(
        screen
          .getAllByRole('alert')
          .some((node) => node.textContent === 'common.deleteDialog.errors.forbidden'),
      ).toBe(true),
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Erreur 403 - Accès refusé:',
      expect.objectContaining({ url: '/events/evt-desktop', method: 'delete' }),
    )
    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  it('témoin : les mêmes 403 sur des requêtes SANS opt-out déclenchent le toast', async () => {
    await expect(apiClient.patch('/events/evt-x', { title: 'X' })).rejects.toBeInstanceOf(
      AxiosError,
    )
    await expect(apiClient.delete('/events/evt-x')).rejects.toBeInstanceOf(AxiosError)
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledTimes(2))
  })
})
