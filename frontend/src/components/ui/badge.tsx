import * as React from 'react'

import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'solid' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

/**
 * Badge — micro-label mono en capitales, aligné DS Graphite (classes `.mt-badge`).
 * `dot` affiche une pastille de statut ; `dashed` un contour pointillé.
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
  dashed?: boolean
}

const VARIANT_CLASS: Record<Exclude<BadgeVariant, 'default'>, string> = {
  solid: 'mt-badge--solid',
  accent: 'mt-badge--accent',
  success: 'mt-badge--success',
  warning: 'mt-badge--warning',
  danger: 'mt-badge--danger',
  info: 'mt-badge--info',
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', dot, dashed, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'mt-badge',
        variant !== 'default' && VARIANT_CLASS[variant],
        dashed && 'mt-badge--dashed',
        className,
      )}
      {...props}
    >
      {dot && <span className="mt-badge__dot" aria-hidden="true" />}
      {children}
    </span>
  ),
)
Badge.displayName = 'Badge'

export { Badge }
