import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Radio — bouton radio natif habillé DS Graphite (classes `.mt-radio`).
 * L'input natif reste la source d'accessibilité ; l'habillage vit dans core.css.
 */
export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode
}

const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, ...props }, ref) => (
    <label className={cn('mt-radio', className)}>
      <input ref={ref} type="radio" {...props} />
      <span className="mt-radio__dot" aria-hidden="true" />
      {label != null && <span>{label}</span>}
    </label>
  ),
)
Radio.displayName = 'Radio'

export { Radio }
