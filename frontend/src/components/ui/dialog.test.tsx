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

/**
 * #754 — cible tactile de la croix : 44×44 sous 768 px, coin haut-droit ANCRÉ.
 * jsdom ne met pas en page : la taille rendue et le « desktop inchangé » (16×16)
 * sont mesurés par `e2e/sprint-101-touch-targets.spec.ts`. Ici on fige le couplage :
 * la boîte grandit par `max-md:` seulement, et `-top-2 -right-2` reste l'ancre (le
 * bord haut et le bord droit restent à 16 px du dialog, cf. sprint-100/sprint-95).
 */
describe('DialogContent — cible tactile de la croix (#754)', () => {
  it('44×44 en mobile seulement, coin haut-droit ancré, icône centrée', () => {
    const { close } = renderOpenDialog()
    expect(close).toHaveClass('max-md:h-11', 'max-md:w-11', '-top-2', '-right-2', 'absolute')
    expect(close).toHaveClass('flex', 'items-center', 'justify-center')
    // Aucune taille hors `max-md:` : au-dessus de 768 px la boîte reste celle de l'icône.
    const unprefixedSize = [...close.classList].filter((c) => /^(h|w|size)-/.test(c))
    expect(unprefixedSize).toEqual([])
  })
})

/**
 * #757 — la croix porte son propre fond OPAQUE et une encre à pleine opacité : le
 * contenu défile SOUS l'ancre sticky. Le contraste réel (clair/sombre, repos/survol,
 * sheet défilée) est MESURÉ par `e2e/sprint-101-dialog-close-contrast.spec.ts` ; ici on
 * fige les deux décisions qu'une retouche de classes déferait sans bruit :
 *   - aucune opacité réduite sur la croix (elle rendrait aussi le fond translucide) ;
 *   - le survol ne change que la surface, jamais l'encre (PIT-S49-001).
 */
describe('DialogContent — lisibilité de la croix sur contenu défilé (#757)', () => {
  it('fond opaque du DS, encre atténuée, aucune opacité réduite', () => {
    const { close } = renderOpenDialog()
    expect(close).toHaveClass('bg-background', 'text-muted-foreground', 'rounded-full')
    const opacityClasses = [...close.classList].filter((c) => /(^|:)opacity-/.test(c))
    expect(opacityClasses).toEqual([])
  })

  it('le survol ne change que la surface', () => {
    const { close } = renderOpenDialog()
    expect(close).toHaveClass('hover:bg-accent-soft')
    const hoverInk = [...close.classList].filter((c) => /^hover:text-/.test(c))
    expect(hoverInk).toEqual([])
  })
})
