'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

export interface TabItem {
  value: string
  label: React.ReactNode
}

/**
 * Tabs — navigation par onglets, DS Graphite (classes `.mt-tabs` / `.mt-tab`).
 * Pattern ARIA tablist : `role`, `aria-selected`, navigation clavier ←/→/Home/End
 * à activation automatique — le focus DOM suit la sélection (#815).
 * Contrôlé (`value` + `onValueChange`) ou non contrôlé (`defaultValue`).
 */
export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items: TabItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  'aria-label'?: string
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (
    { className, items, value, defaultValue, onValueChange, 'aria-label': ariaLabel, ...props },
    ref,
  ) => {
    const [internal, setInternal] = React.useState(defaultValue ?? items[0]?.value)
    const current = value ?? internal
    // #815 — une ref par onglet (indexée comme `items`), scopée à CETTE tablist :
    // jamais de `document.querySelector`, deux tablists peuvent coexister.
    const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([])

    const select = (next: string) => {
      if (value === undefined) setInternal(next)
      onValueChange?.(next)
    }

    // Navigation clavier WAI-ARIA APG tablist : ←/→ cyclique + Home/End.
    // NB : le câblage aria-controls / panneaux associés est à la charge du consommateur.
    // #815 — APG « activation automatique » : le focus SUIT la sélection. Sans le
    // `.focus()`, il restait sur l'onglet quitté, devenu `tabIndex=-1` et non
    // sélectionné (PIT-S107-001). Focus posé dans le gestionnaire (pas dans un effet sur
    // `current`) : un changement de valeur au CLIC ou venu du parent ne doit pas voler
    // le focus. Pas d'option `focusVisible` : un `.focus()` déclenché par une touche
    // garde `:focus-visible` dans Chromium (heuristique « dernière interaction clavier »).
    const onKeyDown = (e: React.KeyboardEvent, index: number) => {
      let nextIndex: number
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const dir = e.key === 'ArrowRight' ? 1 : -1
        nextIndex = (index + dir + items.length) % items.length
      } else if (e.key === 'Home') {
        nextIndex = 0
      } else if (e.key === 'End') {
        nextIndex = items.length - 1
      } else {
        return
      }
      e.preventDefault()
      const next = items[nextIndex]
      if (!next) return
      select(next.value)
      tabRefs.current[nextIndex]?.focus()
    }

    return (
      <div
        ref={ref}
        role="tablist"
        aria-label={ariaLabel}
        className={cn('mt-tabs', className)}
        {...props}
      >
        {items.map((item, i) => {
          const selected = item.value === current
          return (
            <button
              key={item.value}
              ref={(el) => {
                tabRefs.current[i] = el
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              className="mt-tab"
              onClick={() => select(item.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    )
  },
)
Tabs.displayName = 'Tabs'

export { Tabs }
