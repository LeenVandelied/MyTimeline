import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RestoreProductDialog } from './RestoreProductDialog'

/**
 * #711 — Dialog de désarchivage : non destructif, attente pendant l'appel, erreur INLINE sur
 * rejet (404 dédié / générique), fermeture seulement au succès.
 * next-intl mocké → assertions sur les clés (le rendu traduit est dans `*.intl.test.tsx`).
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string, values?: Record<string, string>) =>
    values ? `${namespace}.${key}:${JSON.stringify(values)}` : `${namespace}.${key}`,
}))

function renderDialog(onConfirm: () => Promise<void>, onOpenChange = vi.fn()) {
  render(
    <RestoreProductDialog
      open
      onOpenChange={onOpenChange}
      productName="Vélo"
      onConfirm={onConfirm}
    />,
  )
  return { onOpenChange }
}

describe('RestoreProductDialog', () => {
  it('affiche titre, description nommant le produit, et un bouton de confirmation NON destructif', () => {
    renderDialog(() => Promise.resolve())

    expect(screen.getByText('products.restoreDialog.title')).toBeInTheDocument()
    expect(
      screen.getByText('products.restoreDialog.description:{"name":"Vélo"}'),
    ).toBeInTheDocument()
    const confirm = screen.getByTestId('product-restore-confirm-button')
    expect(confirm).toHaveTextContent('products.restoreDialog.confirm')
    expect(confirm.className).not.toMatch(/destructive/)
  })

  it('succès : appelle onConfirm puis ferme le dialog, sans erreur', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn(() => Promise.resolve())
    const { onOpenChange } = renderDialog(onConfirm)

    await user.click(screen.getByTestId('product-restore-confirm-button'))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('product-restore-error')).not.toBeInTheDocument()
  })

  it('rejet 404 : message « notFound » inline, dialog laissé ouvert', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog(() => Promise.reject({ response: { status: 404 } }))

    await user.click(screen.getByTestId('product-restore-confirm-button'))

    const error = await screen.findByTestId('product-restore-error')
    expect(error).toHaveAttribute('data-kind', 'notFound')
    expect(error).toHaveTextContent('products.restoreDialog.errors.notFound')
    expect(error).toHaveAttribute('role', 'alert')
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('rejet autre (500) : message générique inline', async () => {
    const user = userEvent.setup()
    renderDialog(() => Promise.reject({ response: { status: 500 } }))

    await user.click(screen.getByTestId('product-restore-confirm-button'))

    expect(await screen.findByTestId('product-restore-error')).toHaveAttribute(
      'data-kind',
      'generic',
    )
  })

  it('attente : boutons désactivés et libellé d’attente, annulation ignorée', async () => {
    const user = userEvent.setup()
    let resolve: () => void = () => {}
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((r) => {
          resolve = r
        }),
    )
    const { onOpenChange } = renderDialog(onConfirm)

    await user.click(screen.getByTestId('product-restore-confirm-button'))

    expect(await screen.findByText('products.restoreDialog.confirming')).toBeInTheDocument()
    expect(screen.getByTestId('product-restore-confirm-button')).toBeDisabled()
    expect(screen.getByTestId('product-restore-cancel')).toBeDisabled()
    expect(onOpenChange).not.toHaveBeenCalled()

    resolve()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('annuler : ferme sans appeler onConfirm', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn(() => Promise.resolve())
    const { onOpenChange } = renderDialog(onConfirm)

    await user.click(screen.getByTestId('product-restore-cancel'))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
