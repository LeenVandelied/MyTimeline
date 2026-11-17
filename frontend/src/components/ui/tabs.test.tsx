import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Tabs, type TabItem } from './tabs'

/**
 * #815 — Tabs du DS : le focus SUIT la sélection au clavier (APG « tablist à
 * activation automatique »). Avant le correctif, ←/→/Home/End changeaient
 * `aria-selected` sans `.focus()` : le focus restait sur l'onglet précédent, devenu
 * `tabIndex=-1` et non sélectionné (PIT-S107-001, mesuré 8/8 au S107 #524).
 *
 * Chaque cas vérifie donc les TROIS faces ensemble : focus DOM sur l'onglet
 * nouvellement sélectionné, `aria-selected`, et `tabIndex` itinérant (un seul 0).
 *
 * CE QUE LE TEST NE PROUVE PAS : que `:focus-visible` reste armé après le `.focus()`
 * programmatique (jsdom n'implémente pas l'heuristique) — c'est
 * `e2e/sprint-114-tabs-focus-follows.spec.ts` qui le mesure dans Chromium, sur les
 * deux consommateurs réels (`/products` et la fiche produit).
 */

const ITEMS: TabItem[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
  { value: 'c', label: 'Charlie' },
]

/** Consommateur contrôlé, câblé comme `/products` et `ProductDetailView`. */
function Controlled({
  initial = 'a',
  onChange,
}: {
  initial?: string
  onChange?: (v: string) => void
}) {
  const [value, setValue] = React.useState(initial)
  return (
    <Tabs
      items={ITEMS}
      value={value}
      onValueChange={(v) => {
        setValue(v)
        onChange?.(v)
      }}
      aria-label="Vues"
    />
  )
}

function tab(name: string) {
  return screen.getByRole('tab', { name })
}

/** Le seul onglet sélectionné, focalisé et en `tabIndex=0` est `name`. */
function expectActive(name: string) {
  const active = tab(name)
  expect(active).toHaveFocus()
  expect(active).toHaveAttribute('aria-selected', 'true')
  expect(active).toHaveAttribute('tabindex', '0')
  for (const other of screen.getAllByRole('tab').filter((t) => t !== active)) {
    expect(other).toHaveAttribute('aria-selected', 'false')
    expect(other).toHaveAttribute('tabindex', '-1')
  }
}

describe('Tabs — le focus suit la sélection au clavier (#815)', () => {
  describe.each([
    ['contrôlé', () => render(<Controlled />)],
    ['non contrôlé', () => render(<Tabs items={ITEMS} defaultValue="a" aria-label="Vues" />)],
  ])('%s', (_mode, setup) => {
    it('Tab entre sur l’onglet sélectionné (tabIndex itinérant)', async () => {
      const user = userEvent.setup()
      setup()
      await user.tab()
      expectActive('Alpha')
    })

    it('→ déplace sélection ET focus sur l’onglet suivant', async () => {
      const user = userEvent.setup()
      setup()
      await user.tab()
      await user.keyboard('{ArrowRight}')
      expectActive('Bravo')
      await user.keyboard('{ArrowRight}')
      expectActive('Charlie')
    })

    it('← déplace sélection ET focus sur l’onglet précédent', async () => {
      const user = userEvent.setup()
      setup()
      await user.tab()
      await user.keyboard('{End}')
      await user.keyboard('{ArrowLeft}')
      expectActive('Bravo')
    })

    it('→ sur le dernier boucle sur le premier ; ← sur le premier boucle sur le dernier', async () => {
      const user = userEvent.setup()
      setup()
      await user.tab()
      await user.keyboard('{ArrowLeft}')
      expectActive('Charlie')
      await user.keyboard('{ArrowRight}')
      expectActive('Alpha')
    })

    it('End puis Home : focus sur le dernier puis le premier', async () => {
      const user = userEvent.setup()
      setup()
      await user.tab()
      await user.keyboard('{End}')
      expectActive('Charlie')
      await user.keyboard('{Home}')
      expectActive('Alpha')
    })

    it('une autre touche ne déplace ni la sélection ni le focus', async () => {
      const user = userEvent.setup()
      setup()
      await user.tab()
      await user.keyboard('{ArrowDown}')
      expectActive('Alpha')
    })
  })

  it('notifie onValueChange une fois par navigation clavier, avec la valeur cible', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Controlled onChange={onChange} />)
    await user.tab()
    await user.keyboard('{ArrowRight}{End}{Home}')
    expect(onChange.mock.calls).toEqual([['b'], ['c'], ['a']])
  })

  it('le clic sélectionne et focalise sans toucher aux autres onglets', async () => {
    const user = userEvent.setup()
    render(<Controlled />)
    await user.click(tab('Charlie'))
    expectActive('Charlie')
  })

  it('deux tablists sur la page : la flèche ne focalise que dans SA tablist', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Tabs items={ITEMS} defaultValue="a" aria-label="Première" />
        <Tabs
          items={[
            { value: 'x', label: 'Xray' },
            { value: 'y', label: 'Yankee' },
          ]}
          defaultValue="x"
          aria-label="Seconde"
        />
      </>,
    )
    await user.tab()
    await user.tab()
    expect(tab('Xray')).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(tab('Yankee')).toHaveFocus()
    expect(tab('Alpha')).toHaveAttribute('aria-selected', 'true')
  })
})
