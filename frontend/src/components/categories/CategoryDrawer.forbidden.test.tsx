import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from '@/services/apiClient'
import type { Category } from '@/types/category'
import { CategoryDrawer } from './CategoryDrawer'

/**
 * #761 — 403 dans le drawer catégorie : UN SEUL signalement.
 *
 * Contrairement à `CategoryDrawer.test.tsx` (hooks mockés), ce fichier garde la
 * chaîne RÉELLE drawer → hook → service → `apiClient` → intercepteur. Seul le
 * transport HTTP est remplacé (adaptateur axios qui répond 403). Sans cela, le test
 * serait vacant : avec des hooks mockés, l'intercepteur ne s'exécute jamais et
 * `toast.error` n'est jamais appelé, opt-out ou pas.
 *
 * Le témoin (dernier test) prouve que l'intercepteur est bien câblé dans ce montage :
 * la même réponse 403 sur une requête SANS opt-out déclenche le toast.
 */

const toastErrorMock = vi.hoisted(() => vi.fn())
const toastSuccessMock = vi.hoisted(() => vi.fn())
// `CategoryDrawer` importe l'export par défaut, `apiClient` l'export nommé : même espion.
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
vi.mock('@/components/ui/popoverPicker', () => ({
  PopoverPicker: ({ children }: { children?: ReactNode }) => <>{children}</>,
}))
vi.mock('@/components/shared/DeleteConfirmDialog', () => ({
  DeleteConfirmDialog: () => null,
}))

const originalAdapter = apiClient.defaults.adapter

/** Adaptateur axios : toute requête reçoit un 403, comme le ferait `CategoryController`. */
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

const editableCategory: Category = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Véhicules',
  system: false,
  color: '#112233',
  description: null,
}

function renderDrawer(props: { mode: 'create' | 'edit'; category?: Category }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <CategoryDrawer open onOpenChange={() => {}} {...props} />
    </QueryClientProvider>,
  )
}

describe('CategoryDrawer — 403 signalé une seule fois (#761)', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    toastErrorMock.mockReset()
    toastSuccessMock.mockReset()
    apiClient.defaults.adapter = forbiddenAdapter
    // L'intercepteur journalise (assaini) chaque 403 : log attendu, pas une erreur de test.
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
    consoleErrorSpy.mockRestore()
  })

  it('création : 403 → errors.forbidden inline, AUCUN toast global', async () => {
    const user = userEvent.setup()
    renderDrawer({ mode: 'create' })

    await user.type(screen.getByTestId('category-name-input'), 'Assurance')
    await user.click(screen.getByTestId('category-submit'))

    expect(await screen.findByText('categories.drawer.errors.forbidden')).toBeInTheDocument()
    // L'intercepteur a bien vu le 403 (log assaini) mais s'est tu.
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Erreur 403 - Accès refusé:',
      expect.objectContaining({ url: '/categories' }),
    )
    expect(toastErrorMock).not.toHaveBeenCalled()
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })

  it('édition : 403 → errors.forbidden inline, AUCUN toast global', async () => {
    const user = userEvent.setup()
    renderDrawer({ mode: 'edit', category: editableCategory })

    const nameInput = screen.getByTestId('category-name-input')
    await user.clear(nameInput)
    await user.type(nameInput, 'Autos')
    await user.click(screen.getByTestId('category-submit'))

    expect(await screen.findByText('categories.drawer.errors.forbidden')).toBeInTheDocument()
    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  it('témoin : le même 403 sur une requête SANS opt-out déclenche le toast', async () => {
    await expect(apiClient.post('/categories', { name: 'X' })).rejects.toBeInstanceOf(AxiosError)
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledTimes(1))
  })
})
