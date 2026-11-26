import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NextIntlClientProvider } from 'next-intl'
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from '@/services/apiClient'
import frProducts from '../../../public/locales/fr/products.json'
import enProducts from '../../../public/locales/en/products.json'
import deProducts from '../../../public/locales/de/products.json'
import esProducts from '../../../public/locales/es/products.json'
import { CategorySuggestions } from './CategorySuggestions'

/**
 * #638 (revue P1, P2) — VRAI hook, VRAI apiClient (adaptateur factice), VRAIS messages.
 * Un échec de création doit produire un retour visible, et un seul : l'intercepteur
 * toaste 400/403/500, ce composant prend le reste (409, 404, absence de réponse).
 */
const toastError = vi.hoisted(() => vi.fn())
vi.mock('react-hot-toast', () => {
  const toast = { error: toastError, success: vi.fn() }
  return { default: toast, toast }
})

const MESSAGES = { fr: frProducts, en: enProducts, de: deProducts, es: esProducts } as const

let handler: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>
const originalAdapter = apiClient.defaults.adapter

function reply(status: number, config: InternalAxiosRequestConfig, data: unknown = {}) {
  const response = { status, data, statusText: '', headers: {}, config } as AxiosResponse
  if (status < 400) return Promise.resolve(response)
  const error = Object.assign(new Error(`HTTP ${status}`), {
    isAxiosError: true,
    config,
    response,
  })
  return Promise.reject(error)
}

function renderSuggestions(locale: keyof typeof MESSAGES = 'fr', onChoose?: () => void) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale={locale} messages={{ products: MESSAGES[locale] }}>
        <CategorySuggestions onChoose={onChoose} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  )
  return { invalidate }
}

beforeEach(() => {
  vi.clearAllMocks()
  apiClient.defaults.adapter = ((config: InternalAxiosRequestConfig) =>
    handler(config)) as AxiosAdapter
})
afterEach(() => {
  cleanup()
  apiClient.defaults.adapter = originalAdapter
})

describe('#638 — retour d erreur de la création depuis une suggestion', () => {
  it('shows one translated toast on a 409 and unlocks the buttons', async () => {
    handler = (config) => reply(409, config)
    renderSuggestions('en')
    await userEvent.setup().click(screen.getByTestId('categories-suggestion-vehicles'))
    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1))
    expect(toastError).toHaveBeenCalledWith(
      enProducts.categories.suggestionConflict.replace(
        '{name}',
        enProducts.categories.suggestions.vehicles,
      ),
    )
    await waitFor(() => expect(screen.getByTestId('categories-suggestion-food')).toBeEnabled())
  })

  it('shows a generic toast when the request gets no response', async () => {
    handler = () =>
      Promise.reject(Object.assign(new Error('Network Error'), { isAxiosError: true }))
    renderSuggestions('fr')
    await userEvent.setup().click(screen.getByTestId('categories-suggestion-health'))
    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1))
    expect(toastError).toHaveBeenCalledWith(
      frProducts.categories.suggestionError.replace(
        '{name}',
        frProducts.categories.suggestions.health,
      ),
    )
  })

  it.each([400, 403, 500])(
    'adds no second message on a %i, the interceptor signals it',
    async (status) => {
      handler = (config) => reply(status, config)
      renderSuggestions('fr')
      await userEvent.setup().click(screen.getByTestId('categories-suggestion-vehicles'))
      await waitFor(() => expect(screen.getByTestId('categories-suggestion-food')).toBeEnabled())
      // Un seul toast au total : celui de l'intercepteur, pas le nôtre.
      expect(toastError).toHaveBeenCalledTimes(1)
      const text = toastError.mock.calls[0][0] as string
      expect(text).not.toContain(frProducts.categories.suggestions.vehicles)
    },
  )

  it.each(['fr', 'en', 'de', 'es'] as const)('has both error messages in %s', (locale) => {
    const { suggestionConflict, suggestionError } = MESSAGES[locale].categories
    for (const message of [suggestionConflict, suggestionError]) {
      expect(message).toBeTruthy()
      expect(message).toContain('{name}')
    }
  })
})

describe('#638 — verrou des boutons jusqu au rechargement', () => {
  it('keeps every button disabled after success and creates once on a second click', async () => {
    let posts = 0
    handler = (config) => {
      posts += 1
      return reply(201, config, { id: 'c1', name: 'Véhicules', system: false })
    }
    const user = userEvent.setup()
    const { invalidate } = renderSuggestions('fr')
    await user.click(screen.getByTestId('categories-suggestion-vehicles'))
    await waitFor(() => expect(invalidate).toHaveBeenCalled())
    // La requête et l'invalidation sont finies : la liste (parent) démonterait ce composant.
    for (const id of ['vehicles', 'food', 'travel']) {
      expect(screen.getByTestId(`categories-suggestion-${id}`)).toBeDisabled()
    }
    await user.click(screen.getByTestId('categories-suggestion-food'))
    await user.click(screen.getByTestId('categories-suggestion-vehicles'))
    expect(posts).toBe(1)
  })

  it('ignores a double click fired in the same tick', async () => {
    let posts = 0
    handler = (config) => {
      posts += 1
      return reply(201, config, { id: 'c1', name: 'Véhicules', system: false })
    }
    renderSuggestions('fr')
    const button = screen.getByTestId('categories-suggestion-vehicles')
    button.click()
    button.click()
    await waitFor(() => expect(posts).toBe(1))
  })
})
