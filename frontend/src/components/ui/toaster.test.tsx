import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, render, screen } from '@testing-library/react'
import toast from 'react-hot-toast'
import { afterEach, describe, expect, it } from 'vitest'

import { AppToaster, TOASTER_CONTAINER_STYLE, toastVariantOf } from './toaster'

/**
 * #621 — `AppToaster` : react-hot-toast = moteur, `ui/toast` (DS) = rendu de TOUS les toasts.
 *
 * Ce que ces tests prouvent : un appel `toast.success/error/toast()` INCHANGÉ (forme des 15
 * appels existants) rend le composant DS, avec la bonne variante, un seul `role="status"`
 * (pas de `ToastBar` résiduel en doublon), et le conteneur `#_rht_toaster` conservé.
 * Ce qu'ils NE prouvent PAS (jsdom : aucun layout, aucune cascade CSS) : la position peinte,
 * la pile réelle au-dessus d'un drawer, l'annonce effective par un lecteur d'écran —
 * `e2e/sprint-92-business-toasts.spec.ts` couvre les deux premiers.
 */

afterEach(() => {
  act(() => {
    toast.remove()
  })
})

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

  it('toast non bloquant : pointer-events none (ne capte pas les clics de ce qu’il couvre)', async () => {
    render(<AppToaster />)
    act(() => {
      toast.success('Deux')
    })
    const status = await screen.findByRole('status')
    expect(status.style.pointerEvents).toBe('none')
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

  it('toastVariantOf : success→success, error→danger, blank/loading/custom→info', () => {
    expect(toastVariantOf('success')).toBe('success')
    expect(toastVariantOf('error')).toBe('danger')
    expect(toastVariantOf('blank')).toBe('info')
    expect(toastVariantOf('loading')).toBe('info')
    expect(toastVariantOf('custom')).toBe('info')
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
