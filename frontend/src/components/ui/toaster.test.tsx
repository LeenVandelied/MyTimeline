import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, fireEvent, render, screen } from '@testing-library/react'
import toast from 'react-hot-toast'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppToaster, TOASTER_CONTAINER_STYLE, TOASTER_TOP_OFFSET, toastVariantOf } from './toaster'

/**
 * #621 — `AppToaster` : react-hot-toast = moteur, `ui/toast` (DS) = rendu de TOUS les toasts.
 *
 * Ce que ces tests prouvent : un appel `toast.success/error/toast()` INCHANGÉ (forme des 15
 * appels existants) rend le composant DS, avec la bonne variante, un seul `role="status"`
 * (pas de `ToastBar` résiduel en doublon), et le conteneur `#_rht_toaster` conservé ;
 * la durée est suspendue au survol et au focus (WCAG 2.2.1), sans vol de focus.
 * Ce qu'ils NE prouvent PAS (jsdom : aucun layout, aucune cascade CSS, aucun hit-testing) :
 * la position peinte, la pile réelle au-dessus d'un drawer, que la carte capte VRAIMENT le
 * pointeur (`fireEvent` ignore `pointer-events`), la police réellement appliquée au titre,
 * l'annonce effective par un lecteur d'écran — `e2e/sprint-92-business-toasts.spec.ts`
 * couvre les deux premiers.
 */

afterEach(() => {
  act(() => {
    toast.remove()
  })
  vi.useRealTimers()
})

/** Affiche un succès (durée 4 s) et renvoie la carte DS. */
function showSuccess(message = 'Événement créé'): HTMLElement {
  act(() => {
    toast.success(message)
  })
  return screen.getByRole('status')
}

/** Affiche un succès et renvoie son identifiant et sa carte DS (plusieurs toasts à la fois). */
function showToastWithId(message: string): { id: string; card: HTMLElement } {
  const holder: { id: string } = { id: '' }
  act(() => {
    holder.id = toast.success(message)
  })
  const card = screen
    .getAllByRole('status')
    .find((el) => el.querySelector('.mt-toast__title')?.textContent === message)
  if (!card) throw new Error(`toast « ${message} » introuvable`)
  return { id: holder.id, card }
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe('AppToaster — rendu DS des toasts react-hot-toast (#621)', () => {
  it('toast.success(msg) : composant DS, variante success, message en titre', async () => {
    render(<AppToaster />)
    act(() => {
      toast.success('Événement créé')
    })

    const status = await screen.findByRole('status')
    expect(status).toHaveClass('mt-toast', 'mt-toast--success')
    expect(status).toHaveAttribute('data-testid', 'app-toast')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status.querySelector('.mt-toast__title')).toHaveTextContent('Événement créé')
    // Sobre : une seule ligne, pas de message secondaire.
    expect(status.querySelector('.mt-toast__msg')).toBeNull()
  })

  it('toast.error(msg) : variante danger', async () => {
    render(<AppToaster />)
    act(() => {
      toast.error('Erreur serveur')
    })
    const status = await screen.findByRole('status')
    expect(status).toHaveClass('mt-toast--danger')
    expect(status).not.toHaveClass('mt-toast--success')
  })

  it('toast(msg) (blank) : variante info, sans modificateur de couleur', async () => {
    render(<AppToaster />)
    act(() => {
      toast('Information')
    })
    const status = await screen.findByRole('status')
    expect(status).toHaveClass('mt-toast')
    expect(status.className).not.toMatch(/mt-toast--/)
  })

  it('un seul role="status" par toast : aucun ToastBar par défaut ne subsiste', async () => {
    render(<AppToaster />)
    act(() => {
      toast.success('Un')
    })
    await screen.findByRole('status')
    expect(screen.getAllByRole('status')).toHaveLength(1)
    // Aucun rendu hors DS : tout nœud de toast porte `.mt-toast`.
    expect(document.querySelectorAll('#_rht_toaster [role="status"]:not(.mt-toast)')).toHaveLength(
      0,
    )
  })

  it('conteneur `#_rht_toaster` conservé (masqué par sprint-77-theme-visual) et piloté par --z-toast', async () => {
    render(<AppToaster />)
    act(() => {
      toast.success('Trois')
    })
    await screen.findByRole('status')
    const container = document.getElementById('_rht_toaster')
    expect(container).not.toBeNull()
    expect(TOASTER_CONTAINER_STYLE.zIndex).toBe('var(--z-toast)')
  })

  it('position : haut-droite, décalé SOUS la zone des contrôles par jetons DS (arbitrage 2026-09-15)', async () => {
    // Déclaration seulement : jsdom ne résout ni `var()` ni `env()` et ne peint rien. La
    // non-intersection peinte avec la croix du drawer / le hamburger est l'oracle E2E
    // (`sprint-92-business-toasts.spec.ts`).
    render(<AppToaster />)
    const card = showSuccess('Quatre')
    await screen.findByRole('status')
    expect(TOASTER_CONTAINER_STYLE.top).toBe(TOASTER_TOP_OFFSET)
    expect(TOASTER_TOP_OFFSET).toBe(
      'calc(var(--space-5) + var(--space-11) + var(--space-2) + env(safe-area-inset-top, 0px))',
    )
    // Plus de littéral 16px (ancienne position, qui recouvrait la croix des drawers).
    expect(TOASTER_TOP_OFFSET).not.toMatch(/\b16px\b/)
    // Ligne d'empilement de la bibliothèque : alignée à droite (`top-right`).
    expect(card.parentElement?.style.justifyContent).toBe('flex-end')
  })

  it('toastVariantOf : success→success, error→danger, blank/loading/custom→info', () => {
    expect(toastVariantOf('success')).toBe('success')
    expect(toastVariantOf('error')).toBe('danger')
    expect(toastVariantOf('blank')).toBe('info')
    expect(toastVariantOf('loading')).toBe('info')
    expect(toastVariantOf('custom')).toBe('info')
  })
})

describe('AppToaster — pause au survol et au focus (WCAG 2.2.1, revue Designer #621)', () => {
  it('carte visible : pointer-events auto et focusable ; conteneur plein écran non bloquant ; en sortie : none', () => {
    render(<AppToaster />)
    const card = showSuccess()
    // Ancre de non-régression : l'ancien `none` rendait le survol impossible. jsdom ne
    // fait aucun hit-testing — ceci vérifie la déclaration, pas la captation peinte.
    expect(card.style.pointerEvents).toBe('auto')
    expect(card).toHaveAttribute('tabindex', '0')
    expect(document.getElementById('_rht_toaster')?.style.pointerEvents).toBe('none')

    act(() => {
      toast.dismiss()
    })
    expect(card).toHaveAttribute('data-visible', 'false')
    expect(card.style.pointerEvents).toBe('none')
    expect(card).toHaveAttribute('tabindex', '-1')
  })

  it('survol : la durée ne s’écoule pas pendant le survol, reprend à la sortie', () => {
    vi.useFakeTimers()
    render(<AppToaster />)
    const card = showSuccess()

    act(() => {
      fireEvent.mouseEnter(card)
    })
    advance(10_000)
    expect(card).toHaveAttribute('data-visible', 'true')

    act(() => {
      fireEvent.mouseLeave(card)
    })
    advance(3_900)
    expect(card).toHaveAttribute('data-visible', 'true')
    advance(200)
    expect(card).toHaveAttribute('data-visible', 'false')
  })

  it('focus clavier : focusin suspend, focusout reprend', () => {
    vi.useFakeTimers()
    render(<AppToaster />)
    const card = showSuccess()

    act(() => {
      fireEvent.focusIn(card)
    })
    advance(10_000)
    expect(card).toHaveAttribute('data-visible', 'true')

    act(() => {
      fireEvent.focusOut(card)
    })
    advance(3_900)
    expect(card).toHaveAttribute('data-visible', 'true')
    advance(200)
    expect(card).toHaveAttribute('data-visible', 'false')
  })

  it('souris sortie mais focus toujours sur le toast : reste en pause (la bibliothèque relance sur mouseleave)', () => {
    vi.useFakeTimers()
    render(<AppToaster />)
    const card = showSuccess()

    act(() => {
      fireEvent.focusIn(card)
    })
    act(() => {
      fireEvent.mouseEnter(card)
    })
    act(() => {
      fireEvent.mouseLeave(card)
    })
    advance(10_000)
    expect(card).toHaveAttribute('data-visible', 'true')

    act(() => {
      fireEvent.focusOut(card)
    })
    advance(4_100)
    expect(card).toHaveAttribute('data-visible', 'false')
  })

  it('focus sorti mais pointeur toujours dessus : reste en pause', () => {
    vi.useFakeTimers()
    render(<AppToaster />)
    const card = showSuccess()

    act(() => {
      fireEvent.mouseEnter(card)
    })
    act(() => {
      fireEvent.focusIn(card)
    })
    act(() => {
      fireEvent.focusOut(card)
    })
    advance(10_000)
    expect(card).toHaveAttribute('data-visible', 'true')

    act(() => {
      fireEvent.mouseLeave(card)
    })
    advance(4_100)
    expect(card).toHaveAttribute('data-visible', 'false')
  })

  it('toast retiré pendant le focus (sans focusout) : la pause est levée pour les toasts suivants', () => {
    vi.useFakeTimers()
    render(<AppToaster />)
    const first = showSuccess('Premier')
    act(() => {
      fireEvent.focusIn(first)
    })
    act(() => {
      toast.remove()
    })

    const second = showSuccess('Second')
    advance(4_100)
    expect(second).toHaveAttribute('data-visible', 'false')
  })

  it('2 toasts, focus sur le 1er puis 1er retiré (dismiss) : le 2e reprend son décompte (cycle 2)', () => {
    vi.useFakeTimers()
    render(<AppToaster />)
    const first = showToastWithId('Premier')
    const second = showToastWithId('Second')

    act(() => {
      fireEvent.focusIn(first.card)
    })
    advance(10_000)
    expect(second.card).toHaveAttribute('data-visible', 'true')

    // Retrait HORS minuterie du toast focalisé, sans focusout : l'autre reste visible.
    act(() => {
      toast.dismiss(first.id)
    })
    advance(3_900)
    expect(second.card).toHaveAttribute('data-visible', 'true')
    advance(200)
    expect(second.card).toHaveAttribute('data-visible', 'false')
  })

  it('2 toasts, survol du 1er puis 1er retiré (dismiss) : le 2e reprend son décompte', () => {
    vi.useFakeTimers()
    render(<AppToaster />)
    const first = showToastWithId('Premier')
    const second = showToastWithId('Second')

    act(() => {
      fireEvent.mouseEnter(first.card)
    })
    advance(10_000)
    expect(second.card).toHaveAttribute('data-visible', 'true')

    act(() => {
      toast.dismiss(first.id)
    })
    advance(3_900)
    expect(second.card).toHaveAttribute('data-visible', 'true')
    advance(200)
    expect(second.card).toHaveAttribute('data-visible', 'false')
  })

  it('toast focalisé retiré : le focus est rendu à l’élément qui l’avait avant (cycle 2)', () => {
    vi.useFakeTimers()
    render(
      <>
        <button type="button">Enregistrer</button>
        <AppToaster />
      </>,
    )
    const trigger = screen.getByRole('button', { name: 'Enregistrer' })
    trigger.focus()
    const { id, card } = showToastWithId('Événement créé')

    act(() => {
      card.focus()
    })
    expect(card).toHaveFocus()
    advance(10_000)
    expect(card).toHaveAttribute('data-visible', 'true')

    act(() => {
      toast.dismiss(id)
    })
    expect(trigger).toHaveFocus()
  })

  it('toast focalisé retiré, élément précédent sorti du DOM : aucun focus volé', () => {
    vi.useFakeTimers()
    render(
      <>
        <button type="button">Autre contrôle</button>
        <AppToaster />
      </>,
    )
    // Nœud hors React : on peut le retirer sans perturber le démontage.
    const detached = document.createElement('button')
    detached.textContent = 'Déclencheur éphémère'
    document.body.appendChild(detached)
    detached.focus()
    const { id, card } = showToastWithId('Événement créé')

    act(() => {
      card.focus()
    })
    detached.remove()
    act(() => {
      toast.dismiss(id)
    })

    expect(document.activeElement).not.toBe(detached)
    expect(screen.getByRole('button', { name: 'Autre contrôle' })).not.toHaveFocus()
    // Rien n'a été fait : le focus reste où il était (la carte en sortie).
    expect(document.activeElement).toBe(card)
  })

  it('le toast ne prend JAMAIS le focus à son apparition', () => {
    render(
      <>
        <button type="button">Enregistrer</button>
        <AppToaster />
      </>,
    )
    const trigger = screen.getByRole('button', { name: 'Enregistrer' })
    trigger.focus()
    const card = showSuccess()

    expect(document.activeElement).toBe(trigger)
    expect(card).not.toHaveFocus()
  })
})

describe('.mt-toast__title — police display (revue Designer #621)', () => {
  // Lecture STATIQUE de la source CSS : prouve la déclaration, pas la police calculée
  // (jsdom n'applique pas la cascade ni next/font).
  it('le titre du toast déclare --font-display, comme .mt-dialog__title', () => {
    const css = readFileSync(
      join(process.cwd(), 'src', 'styles', 'ds', 'components', 'core.css'),
      'utf8',
    )
    const rule = css.match(/\.mt-toast__title\{([^}]*)\}/)
    expect(rule).not.toBeNull()
    expect(rule?.[1]).toContain('font-family:var(--font-display)')
  })
})

describe('--z-toast — place dans la pile du DS (#621, ferme #460)', () => {
  const css = readFileSync(
    join(process.cwd(), 'src', 'styles', 'ds', 'tokens', 'spacing.css'),
    'utf8',
  )
  const layer = (name: string): number => {
    const match = css.match(new RegExp(`--${name}:\\s*(\\d+)`))
    if (!match) throw new Error(`jeton --${name} introuvable dans spacing.css`)
    return Number(match[1])
  }

  it('au-dessus des drawers / sheets / modales et des overlays portalisés', () => {
    expect(layer('z-toast')).toBeGreaterThan(layer('z-modal'))
    expect(layer('z-toast')).toBeGreaterThan(layer('z-popover-over-modal'))
  })

  it('sous la bannière réseau (#76), qui reste au-dessus de tout', () => {
    expect(layer('z-toast')).toBeLessThan(layer('z-netbanner'))
  })
})
