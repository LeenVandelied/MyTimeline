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

let tooltipSeq = 0

const Tooltip = ({ content, children, className }: TooltipProps) => {
  const id = React.useMemo(() => `mt-tooltip-${++tooltipSeq}`, [])
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
