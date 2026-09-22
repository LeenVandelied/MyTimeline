import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from '@/services/apiClient'
import type { Category } from '@/types/category'
import type { Product } from '@/types/product'
import { ProductDrawer } from './ProductDrawer'

/**
 * #761 — 403 dans le drawer produit : UN SEUL signalement.
 *
 * Même modèle que `CategoryDrawer.forbidden.test.tsx` : contrairement à
 * `ProductDrawer.test.tsx` (hooks de mutation mockés, où « aucun toast » serait
 * vacant), la chaîne drawer → `useCreateProduct`/`useUpdateProduct` →
 * `productService` → `apiClient` → intercepteur est RÉELLE. Seul l'adaptateur HTTP
 * est remplacé (403).
 *
 * `useCategories` et `useAuth` restent mockés : ce sont des lectures hors sujet. Les
 * laisser réelles ferait passer leur GET par l'adaptateur 403, donc par le toast
 * global — bruit sans rapport avec les mutations testées.
 *
 * Le témoin (dernier test) prouve que l'intercepteur est câblé dans ce montage.
 */

const toastErrorMock = vi.hoisted(() => vi.fn())
const toastSuccessMock = vi.hoisted(() => vi.fn())
// `ProductDrawer` importe l'export par défaut, `apiClient` l'export nommé : même espion.
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
vi.mock('@/components/shared/DeleteConfirmDialog', () => ({
  DeleteConfirmDialog: () => null,
}))

const originalAdapter = apiClient.defaults.adapter

/** Adaptateur axios : toute requête reçoit un 403, comme le ferait `ProductController`. */
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

function renderDrawer(props: { mode: 'create' | 'edit'; product?: Product }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <ProductDrawer open onOpenChange={() => {}} {...props} />
    </QueryClientProvider>,
  )
}

describe('ProductDrawer — 403 signalé une seule fois (#761)', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    toastErrorMock.mockReset()
    toastSuccessMock.mockReset()
    apiClient.defaults.adapter = forbiddenAdapter
    // L'intercepteur et `productService` journalisent (assaini) le 403 : log attendu.
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
    consoleErrorSpy.mockRestore()
  })

  it('création : 403 → errors.forbidden inline, AUCUN toast global', async () => {
    const user = userEvent.setup()
    renderDrawer({ mode: 'create' })

    await user.type(
      screen.getByPlaceholderText('products.drawer.fields.namePlaceholder'),
      'Voiture',
    )
    await user.click(screen.getByLabelText('products.drawer.fields.category'))
    await user.click(await screen.findByRole('option', { name: 'Véhicules' }))
    await user.click(screen.getByText('products.drawer.actions.create'))

    expect(await screen.findByText('products.drawer.errors.forbidden')).toBeInTheDocument()
    // L'intercepteur a bien vu le 403 (log assaini) mais s'est tu.
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Erreur 403 - Accès refusé:',
      expect.objectContaining({ url: '/users/user-1/products' }),
    )
    expect(toastErrorMock).not.toHaveBeenCalled()
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })

  it('édition : 403 → errors.forbidden inline, AUCUN toast global', async () => {
    const user = userEvent.setup()
    renderDrawer({ mode: 'edit', product })

    const nameInput = screen.getByPlaceholderText('products.drawer.fields.namePlaceholder')
    await user.clear(nameInput)
    await user.type(nameInput, 'Après')
    await user.click(screen.getByText('products.drawer.actions.save'))

    expect(await screen.findByText('products.drawer.errors.forbidden')).toBeInTheDocument()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Erreur 403 - Accès refusé:',
      expect.objectContaining({ url: '/users/user-1/products/p2' }),
    )
    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  it('témoin : le même 403 sur une requête SANS opt-out déclenche le toast', async () => {
    await expect(
      apiClient.post('/users/user-1/products', { name: 'X', category: CAT_A }),
    ).rejects.toBeInstanceOf(AxiosError)
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledTimes(1))
  })
})
