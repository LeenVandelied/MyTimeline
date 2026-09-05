import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MAX_KEEP_MINE_ATTEMPTS, useEventEditConflict } from './useEventEditConflict'
import type { EventEditFormValues } from '@/types/event'

/**
 * #310 — GARDE ANTI-BOUCLE sur « garder mes modifications » (409 répétés).
 *
 * Ce que ces tests PROUVENT (et pas seulement exécutent) :
 *  1. sous 409 permanents, le nombre d'appels réseau est BORNÉ à
 *     1 (soumission initiale) + MAX_KEEP_MINE_ATTEMPTS (re-soumissions), et `onKeepMine`
 *     devient inerte ensuite (`keepMineExhausted`) ;
 *  2. un succès intercalé REMET le compteur à zéro — sans quoi la garde punirait un
 *     utilisateur légitime qui traverse plusieurs conflits successifs ;
 *  3. une soumission INITIALE en 409 n'est pas comptée comme une re-soumission.
 *
 * ⚠ Pièges d'outillage respectés ici :
 *  - PIT-S69-001 : `useAuth` et `useQueryClient` sont MOCKÉS AU NIVEAU DU HOOK ; on
 *    n'enveloppe pas d'un `QueryClientProvider` (on testerait TanStack, pas la garde).
 *  - PIT-S61-001 : le mock de module partagé rend des promesses REJETÉES ; on RECRÉE un
 *    `vi.fn()` à chaque test au lieu de `mockReset()`/`mockClear()`, qui feraient
 *    rapporter le rejet TRAITÉ comme un échec de test.
 *  - Aucune horloge : la garde est un PLAFOND, pas un backoff (cf. PIT-S54-001).
 */

let updateEventMock = vi.fn()
const invalidateQueriesMock = vi.fn()

vi.mock('@/services/eventService', () => ({
  updateEvent: (...args: unknown[]) => updateEventMock(...args),
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}))

/** Corps 409 ENRICHI (#231) : c'est lui qui fait naître l'état `conflict`. */
function conflictError(serverVersion: number) {
  return {
    response: {
      status: 409,
      data: {
        error: 'conflict',
        serverVersion,
        serverEvent: {
          id: 'evt-1',
          title: 'Titre serveur',
          type: 'duration',
          durationValue: 2,
          durationUnit: 'days',
          isRecurring: false,
          recurrenceUnit: null,
          recurrenceEndDate: null,
          startDate: '2026-05-01',
          endDate: '2026-05-02',
          productId: 'prod-1',
          isAllDay: false,
          color: '#222222',
          archived: false,
          version: serverVersion,
        },
      },
    },
  }
}

const localValues = {
  title: 'Mon titre',
  type: 'duration',
  durationValue: 3,
  durationUnit: 'days',
  isRecurring: false,
  recurrenceUnit: null,
  recurrenceEndDate: null,
  startDate: '2026-05-01',
  endDate: '2026-05-03',
  color: '#111111',
  archived: false,
  version: 1,
} as unknown as EventEditFormValues

describe('useEventEditConflict — garde anti-boucle keep-mine (#310)', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    updateEventMock = vi.fn()
    invalidateQueriesMock.mockClear()
    // Le hook logue l'erreur interceptée : bruit stderr attendu, pas un échec.
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('borne les re-soumissions à MAX_KEEP_MINE_ATTEMPTS sous 409 permanents', async () => {
    // Le serveur reste en contention : la version renvoyée BOUGE à chaque fois, donc
    // le ré-alignement de version d'`onKeepMine` ne suffit pas — c'est exactement le
    // cas que la garde doit borner (un tiers réécrit entre le 409 et la re-soumission).
    let serverVersion = 2
    updateEventMock.mockImplementation(() => Promise.reject(conflictError(serverVersion++)))

    const { result } = renderHook(() => useEventEditConflict('evt-1'))

    await act(async () => {
      await result.current.onSubmit(localValues)
    })
    await waitFor(() => expect(result.current.submitState).toBe('conflict'))
    expect(updateEventMock).toHaveBeenCalledTimes(1)
    expect(result.current.keepMineExhausted).toBe(false)

    // On INSISTE bien au-delà du plafond : les clics supplémentaires doivent être inertes.
    for (let i = 0; i < MAX_KEEP_MINE_ATTEMPTS + 4; i += 1) {
      await act(async () => {
        result.current.onKeepMine()
      })
    }

    await waitFor(() => expect(result.current.keepMineExhausted).toBe(true))
    // 1 soumission initiale + MAX re-soumissions, PAS PLUS malgré 4 clics de trop.
    expect(updateEventMock).toHaveBeenCalledTimes(1 + MAX_KEEP_MINE_ATTEMPTS)
    // Le dialog reste ouvert (état terminal `conflict`) pour porter le message.
    expect(result.current.submitState).toBe('conflict')
    expect(result.current.conflict).not.toBeNull()
  })

  it('un succès intercalé remet le compteur à zéro', async () => {
    let serverVersion = 2
    updateEventMock.mockImplementation(() => Promise.reject(conflictError(serverVersion++)))

    const { result } = renderHook(() => useEventEditConflict('evt-1'))

    await act(async () => {
      await result.current.onSubmit(localValues)
    })
    await waitFor(() => expect(result.current.submitState).toBe('conflict'))

    // Deux re-soumissions en 409 : le compteur monte sans atteindre le plafond.
    for (let i = 0; i < MAX_KEEP_MINE_ATTEMPTS - 1; i += 1) {
      await act(async () => {
        result.current.onKeepMine()
      })
    }
    expect(result.current.keepMineExhausted).toBe(false)
    expect(updateEventMock).toHaveBeenCalledTimes(MAX_KEEP_MINE_ATTEMPTS)

    // Succès : l'épisode de contention est clos.
    updateEventMock.mockImplementation(() => Promise.resolve({}))
    await act(async () => {
      result.current.onKeepMine()
    })
    await waitFor(() => expect(result.current.submitState).toBe('idle'))
    const callsAfterSuccess = updateEventMock.mock.calls.length

    // Nouvel épisode : le budget complet est de nouveau disponible (sinon la garde
    // punirait un utilisateur légitime qui traverse plusieurs conflits successifs).
    updateEventMock.mockImplementation(() => Promise.reject(conflictError(serverVersion++)))
    await act(async () => {
      await result.current.onSubmit(localValues)
    })
    await waitFor(() => expect(result.current.submitState).toBe('conflict'))
    expect(result.current.keepMineExhausted).toBe(false)

    for (let i = 0; i < MAX_KEEP_MINE_ATTEMPTS + 2; i += 1) {
      await act(async () => {
        result.current.onKeepMine()
      })
    }
    await waitFor(() => expect(result.current.keepMineExhausted).toBe(true))
    expect(updateEventMock).toHaveBeenCalledTimes(
      callsAfterSuccess + 1 + MAX_KEEP_MINE_ATTEMPTS,
    )
  })

  it("une soumission initiale en 409 n'entame pas le budget de re-soumissions", async () => {
    let serverVersion = 2
    updateEventMock.mockImplementation(() => Promise.reject(conflictError(serverVersion++)))

    const { result } = renderHook(() => useEventEditConflict('evt-1'))

    // Deux soumissions INITIALES successives (l'utilisateur re-soumet le formulaire) :
    // on compte les 409 des RE-soumissions, pas ceux-ci.
    await act(async () => {
      await result.current.onSubmit(localValues)
    })
    await act(async () => {
      await result.current.onSubmit(localValues)
    })
    await waitFor(() => expect(result.current.submitState).toBe('conflict'))
    expect(result.current.keepMineExhausted).toBe(false)
    expect(updateEventMock).toHaveBeenCalledTimes(2)

    for (let i = 0; i < MAX_KEEP_MINE_ATTEMPTS; i += 1) {
      await act(async () => {
        result.current.onKeepMine()
      })
    }
    await waitFor(() => expect(result.current.keepMineExhausted).toBe(true))
    expect(updateEventMock).toHaveBeenCalledTimes(2 + MAX_KEEP_MINE_ATTEMPTS)
  })

  it("abandonner le flux (onConflictDismiss) libère le budget", async () => {
    let serverVersion = 2
    updateEventMock.mockImplementation(() => Promise.reject(conflictError(serverVersion++)))

    const { result } = renderHook(() => useEventEditConflict('evt-1'))
    await act(async () => {
      await result.current.onSubmit(localValues)
    })
    for (let i = 0; i < MAX_KEEP_MINE_ATTEMPTS; i += 1) {
      await act(async () => {
        result.current.onKeepMine()
      })
    }
    await waitFor(() => expect(result.current.keepMineExhausted).toBe(true))

    act(() => {
      result.current.onConflictDismiss()
    })
    expect(result.current.keepMineExhausted).toBe(false)
    expect(result.current.submitState).toBe('idle')
  })
})
