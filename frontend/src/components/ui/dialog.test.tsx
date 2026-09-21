import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog'

/**
 * #732/#740 — garde-fou STRUCTUREL de l'ancre de la croix de `DialogContent`.
 *
 * jsdom ne fait pas de layout : ce test ne prouve PAS que la croix reste dans le
 * viewport (c'est `e2e/sprint-100-dialog-close-reachable.spec.ts` qui le mesure).
 * Il fige le COUPLAGE que la géométrie suppose, et qu'aucune spec ne signalerait
 * clairement s'il était défait :
 *   - `Content` en `flex flex-col gap-4` — en `grid`, l'ancre `sticky` de hauteur
 *     nulle ne glisse jamais (sa zone de grille est son bloc conteneur) ;
 *   - ancre `sticky top-0 order-first -mb-4 h-0` : `-mb-4` n'annule QUE `gap-4` ;
 *     changer l'un sans l'autre décale le contenu des 7 consommateurs ;
 *   - ancre DERNIER enfant du DOM et croix DERNIER focusable : le focus initial
 *     de Radix (premier focusable) ne doit pas passer sur la croix.
 */
function renderOpenDialog() {
  render(
    <Dialog open>
      <DialogContent>
        <DialogTitle>Titre</DialogTitle>
        <DialogDescription>Description</DialogDescription>
        <input aria-label="premier champ" />
      </DialogContent>
    </Dialog>,
  )
  const content = screen.getByRole('dialog')
  const close = screen.getByRole('button', { name: 'Close' })
  return { content, close }
}

describe('DialogContent — ancre de la croix (#732/#740)', () => {
  it('le conteneur est une colonne flex avec gap-4 (condition du sticky et du -mb-4)', () => {
    const { content } = renderOpenDialog()
    expect(content).toHaveClass('flex', 'flex-col', 'gap-4')
    expect(content).not.toHaveClass('grid')
  })

  it("l'ancre sticky de hauteur nulle est le dernier enfant et annule exactement le gap", () => {
    const { content, close } = renderOpenDialog()
    const anchor = close.parentElement
    expect(anchor).not.toBeNull()
    expect(anchor?.parentElement).toBe(content)
    expect(content.lastElementChild).toBe(anchor)
    expect(anchor).toHaveClass('sticky', 'top-0', 'z-10', 'order-first', '-mb-4', 'h-0')
  })

  it('la croix est le dernier focusable : le focus initial Radix reste sur le contenu', () => {
    const { content, close } = renderOpenDialog()
    const focusables = content.querySelectorAll(
      'button, input, a[href], [tabindex]:not([tabindex="-1"])',
    )
    expect(focusables[focusables.length - 1]).toBe(close)
    expect(close).not.toHaveFocus()
  })
})
