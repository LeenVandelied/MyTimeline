import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * #53 — Spinner accessible pour les états « loading » des formulaires.
 * `role="status"` + `aria-label` + texte `sr-only` : annoncé aux lecteurs
 * d'écran (cf. context-pack frontend, a11y). Couleur via `currentColor` →
 * hérite du token du conteneur (aucune couleur hardcodée).
 */
export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Label annoncé aux lecteurs d'écran (déjà traduit). */
  label: string
}

export const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <span
        ref={ref}
        role="status"
        aria-live="polite"
        className={cn('inline-flex', className)}
        {...props}
      >
        <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="sr-only">{label}</span>
      </span>
    )
  },
)
Spinner.displayName = 'Spinner'
