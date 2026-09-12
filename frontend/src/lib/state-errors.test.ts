import { describe, expect, it } from 'vitest'

import { isForbiddenError } from './state-errors'

/** #57 — Détection 403 pour l'aiguillage error.tsx (branche « accès refusé »). */
describe('isForbiddenError', () => {
  it('null / undefined → false', () => {
    expect(isForbiddenError(null)).toBe(false)
    expect(isForbiddenError(undefined)).toBe(false)
  })

  it('erreur générique 500 → false', () => {
    expect(isForbiddenError(new Error('Something broke'))).toBe(false)
    expect(isForbiddenError({ message: 'network 500' })).toBe(false)
  })

  it('message contenant 403 → true', () => {
    expect(isForbiddenError(new Error('403 Forbidden'))).toBe(true)
    expect(isForbiddenError({ message: 'HTTP 403' })).toBe(true)
  })

  it('mot « forbidden » (insensible à la casse) → true', () => {
    expect(isForbiddenError({ message: 'Forbidden resource' })).toBe(true)
  })

  it('digest porteur du code (message masqué en prod) → true', () => {
    expect(isForbiddenError({ message: '', digest: 'forbidden:abc123' })).toBe(true)
  })

  it('4030 ne matche pas le mot 403 isolé (\\b)', () => {
    expect(isForbiddenError({ message: 'code 4030' })).toBe(false)
  })
})
