import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Switch — interrupteur natif (checkbox) habillé DS Graphite (classes `.mt-switch`).
 * L'input checkbox natif porte l'état coché/focus ; l'habillage vit dans core.css.
 */
export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, ...props }, ref) => (
    <label className={cn('mt-switch', className)}>
      <input ref={ref} type="checkbox" role="switch" {...props} />
      <span className="mt-switch__track" aria-hidden="true">
        <span className="mt-switch__thumb" />
      </span>
      {label != null && <span>{label}</span>}
    </label>
  ),
)
Switch.displayName = 'Switch'

export { Switch }
