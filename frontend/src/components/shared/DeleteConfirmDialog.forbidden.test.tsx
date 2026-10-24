import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from '@/services/apiClient'
import type { Category } from '@/types/category'
import type { Product } from '@/types/product'
import { ProductDrawer } from '@/components/products/ProductDrawer'
import { CategoryDrawer } from '@/components/categories/CategoryDrawer'

/**
 * #766 — 403 sur la confirmation d'archivage d'un PRODUIT et de suppression d'une
 * CATÉGORIE : la cause explicite (`deleteDialog.errors.forbidden`) s'affiche dans le
 * dialog, et le toast global se tait (un seul signalement).
 *
 * La variante `event` est couverte par `TimelineEditHost.forbidden.test.tsx`.
 *
 * Modèle `ProductDrawer.forbidden.test.tsx` (PIT-S102-001) : drawer →
 * `DeleteConfirmDialog` RÉEL → `useArchiveProduct` / `useDeleteCategory` → service →
 * `apiClient` → intercepteur, seul l'adaptateur HTTP est remplacé (403). Les
 * `*.forbidden.test.tsx` des drawers stubbent `DeleteConfirmDialog` : ils ne voient
 * pas ce chemin.
 *
 * `useCategories` et `useAuth` restent mockés : lectures hors sujet, dont le GET
 * passerait sinon par l'adaptateur 403 et déclencherait un toast parasite.
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
}))
vi.mock('@/services/authService', () => ({
  refreshToken: vi.fn().mockResolvedValue(true),
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))
const CAT_A = '018f3a2b-0000-7000-8000-0000000000a1'
const CATEGORIES: Category[] = [{ id: CAT_A, name: 'Véhicules', system: false, color: '#112233' }]
vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({
    data: CATEGORIES,
    isPending: false,
    isSuccess: true,
    isError: false,
  }),
}))
vi.mock('@/components/ui/popoverPicker', () => ({
  PopoverPicker: ({ children }: { children?: ReactNode }) => <>{children}</>,
}))

const originalAdapter = apiClient.defaults.adapter

/** Adaptateur axios : toute requête reçoit un 403 (ownership refusée côté contrôleur). */
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

const product: Product = {
  id: 'p2',
  name: 'Avant',
  color: null,
  category: { id: CAT_A, name: 'Véhicules', color: '#112233' },
  events: [],
}

const category: Category = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Assurances',
  system: false,
  color: '#445566',
  description: null,
}

function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('DeleteConfirmDialog — 403 signalé une seule fois, avec sa cause (#766)', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    toastErrorMock.mockReset()
    toastSuccessMock.mockReset()
    apiClient.defaults.adapter = forbiddenAdapter
    // L'intercepteur et les services journalisent (assaini) le 403 : log attendu.
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
    consoleErrorSpy.mockRestore()
  })

  it('archivage produit : 403 → errors.forbidden dans le dialog, AUCUN toast', async () => {
    const user = userEvent.setup()
    renderWithClient(<ProductDrawer open onOpenChange={() => {}} mode="edit" product={product} />)

    await user.click(screen.getByTestId('product-drawer-archive'))
    await user.click(await screen.findByTestId('delete-confirm-button'))

    expect(await screen.findByText('common.deleteDialog.errors.forbidden')).toBeInTheDocument()
    expect(screen.queryByText('common.deleteDialog.errors.generic')).not.toBeInTheDocument()
    // L'intercepteur a bien vu le 403 du DELETE (log assaini) mais s'est tu.
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Erreur 403 - Accès refusé:',
      expect.objectContaining({ url: '/users/user-1/products/p2', method: 'delete' }),
    )
    expect(toastErrorMock).not.toHaveBeenCalled()
    expect(toastSuccessMock).not.toHaveBeenCalled()
    // Le dialog reste ouvert : rien n'a été archivé.
    expect(screen.getByTestId('delete-confirm-button')).toBeInTheDocument()
  })

  it('suppression catégorie : 403 → errors.forbidden dans le dialog, AUCUN toast', async () => {
    const user = userEvent.setup()
    renderWithClient(
      <CategoryDrawer open onOpenChange={() => {}} mode="edit" category={category} />,
    )

    await user.click(screen.getByTestId('category-delete-button'))
    await user.click(await screen.findByTestId('delete-confirm-button'))

    expect(await screen.findByText('common.deleteDialog.errors.forbidden')).toBeInTheDocument()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Erreur 403 - Accès refusé:',
      expect.objectContaining({ url: `/categories/${category.id}`, method: 'delete' }),
    )
    expect(toastErrorMock).not.toHaveBeenCalled()
    expect(screen.getByTestId('delete-confirm-button')).toBeInTheDocument()
  })

  it('témoin : les mêmes DELETE 403 SANS opt-out déclenchent le toast', async () => {
    await expect(apiClient.delete('/users/user-1/products/p2')).rejects.toBeInstanceOf(AxiosError)
    await expect(apiClient.delete(`/categories/${category.id}`)).rejects.toBeInstanceOf(AxiosError)
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledTimes(2))
  })
})
