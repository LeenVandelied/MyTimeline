import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Textarea — champ multiligne aligné DS Graphite (classe `.mt-textarea`).
 * `invalid` bascule la bordure danger (état géré côté core.css).
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn('mt-textarea', invalid && 'mt-textarea--invalid', className)}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export { Textarea }
