import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConflictDialog } from './ConflictDialog'

/**
 * #77 — Tests ConflictDialog (Dialog DS partagé, 409 optimistic locking).
 *
 * next-intl mocké → assertions locale-agnostiques sur les clés `namespace.key`.
 * Contrat 409 réel (#200) = corps plat sans version → une seule action
 * « recharger » (pas de diff serveur/local).
 */

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('ConflictDialog', () => {
  it('fermé (open=false) : rien de monté', () => {
    render(<ConflictDialog open={false} onOpenChange={vi.fn()} onReload={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ouvert : dialog accessible (role=dialog) + titre + description + action recharger', () => {
    render(<ConflictDialog open onOpenChange={vi.fn()} onReload={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('conflictDialog.title')).toBeInTheDocument()
    expect(screen.getByText('conflictDialog.description')).toBeInTheDocument()
    expect(screen.getByTestId('conflict-dialog-reload')).toBeInTheDocument()
  })

  it('testId personnalisable (préservation event-form-conflict)', () => {
    render(
      <ConflictDialog open onOpenChange={vi.fn()} onReload={vi.fn()} testId="event-form-conflict" />,
    )
    expect(screen.getByTestId('event-form-conflict')).toBeInTheDocument()
  })

  it('clic recharger : appelle onReload puis ferme (onOpenChange false)', async () => {
    const onReload = vi.fn()
    const onOpenChange = vi.fn()
    render(<ConflictDialog open onOpenChange={onOpenChange} onReload={onReload} />)
    await userEvent.click(screen.getByTestId('conflict-dialog-reload'))
    expect(onReload).toHaveBeenCalledOnce()
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('clic annuler : ferme sans recharger', async () => {
    const onReload = vi.fn()
    const onOpenChange = vi.fn()
    render(<ConflictDialog open onOpenChange={onOpenChange} onReload={onReload} />)
    await userEvent.click(screen.getByText('conflictDialog.dismiss'))
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    expect(onReload).not.toHaveBeenCalled()
  })

  it('Échap : ferme le dialog sans recharger (a11y Radix)', async () => {
    const onReload = vi.fn()
    const onOpenChange = vi.fn()
    render(<ConflictDialog open onOpenChange={onOpenChange} onReload={onReload} />)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(onReload).not.toHaveBeenCalled()
  })
})
