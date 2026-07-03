'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Tooltip — infobulle au survol / focus clavier, DS Graphite (classes `.mt-tooltip`).
 * Le CSS révèle la bulle sur `:hover` ET `:focus-within` (a11y clavier). Le
 * `content` est lié au déclencheur via `aria-describedby`.
 */
export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactElement<{ 'aria-describedby'?: string }>
  className?: string
}

const Tooltip = ({ content, children, className }: TooltipProps) => {
  // `useId` : id stable SSR/CSR (React 18.3.1) — évite le mismatch d'hydratation
  // que provoquait un compteur module-level incrémenté au render.
  const id = React.useId()
  return (
    <span className={cn('mt-tooltip', className)}>
      {React.cloneElement(children, { 'aria-describedby': id })}
      <span role="tooltip" id={id} className="mt-tooltip__pop">
        {content}
      </span>
    </span>
  )
}
Tooltip.displayName = 'Tooltip'

export { Tooltip }
