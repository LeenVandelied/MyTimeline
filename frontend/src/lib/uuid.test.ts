import { describe, expect, it } from 'vitest'
import { isUuid } from './uuid'

describe('isUuid', () => {
  it.each([
    ['d4b0e1a2-7c3f-4e5a-9b6d-1a2b3c4d5e6f', true],
    ['D4B0E1A2-7C3F-4E5A-9B6D-1A2B3C4D5E6F', true],
    ['p-arch', false],
    ['', false],
    ['d4b0e1a2-7c3f-4e5a-9b6d-1a2b3c4d5e6f-extra', false],
    ['../d4b0e1a2-7c3f-4e5a-9b6d-1a2b3c4d5e6f', false],
  ])('isUuid(%j) vaut %s', (value, expected) => {
    expect(isUuid(value)).toBe(expected)
  })
})
