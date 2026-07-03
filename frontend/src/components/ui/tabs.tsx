'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

export interface TabItem {
  value: string
  label: React.ReactNode
}

/**
 * Tabs — navigation par onglets, DS Graphite (classes `.mt-tabs` / `.mt-tab`).
 * Pattern ARIA tablist : `role`, `aria-selected`, navigation clavier ←/→.
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

    const select = (next: string) => {
      if (value === undefined) setInternal(next)
      onValueChange?.(next)
    }

    // Navigation clavier WAI-ARIA APG tablist : ←/→ cyclique + Home/End.
    // NB : le câblage aria-controls / panneaux associés est à la charge du consommateur.
    const onKeyDown = (e: React.KeyboardEvent, index: number) => {
      let next: TabItem | undefined
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const dir = e.key === 'ArrowRight' ? 1 : -1
        next = items[(index + dir + items.length) % items.length]
      } else if (e.key === 'Home') {
        next = items[0]
      } else if (e.key === 'End') {
        next = items[items.length - 1]
      } else {
        return
      }
      e.preventDefault()
      if (next) select(next.value)
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
