import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * IconButton — bouton carré icône seule, aligné DS Graphite (classes `.mt-iconbtn`).
 * Un `aria-label` est requis (icône seule) — l'absence de libellé visible impose
 * un nom accessible.
 */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string
  size?: 'sm' | 'md'
  variant?: 'default' | 'ghost'
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = 'md', variant = 'default', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'mt-iconbtn',
        size === 'sm' && 'mt-iconbtn--sm',
        variant === 'ghost' && 'mt-iconbtn--ghost',
        className,
      )}
      {...props}
    />
  ),
)
IconButton.displayName = 'IconButton'

export { IconButton }
