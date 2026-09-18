import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * Test smoke trivial — prouve que le runner Vitest + RTL + jsdom + jest-dom
 * fonctionne de bout en bout. À supprimer dès qu'un vrai test composant existe.
 */
describe('infra test frontend', () => {
  it('rend un élément et le trouve dans le DOM', () => {
    render(<button type="button">ping</button>)
    expect(screen.getByRole('button', { name: 'ping' })).toBeInTheDocument()
  })
})
