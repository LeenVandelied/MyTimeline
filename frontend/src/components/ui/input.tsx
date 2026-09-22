import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      // #738 (DEC-S99-001) — `max-md:h-11` : cible tactile 44 px sous 768 px (bascule
      // mobile des réglages), 36 px inchangés au-dessus. `text-base md:text-sm` reste :
      // 16 px en mobile évite le zoom automatique d'iOS au focus.
      <input
        type={type}
        className={cn(
          'border-input file:text-foreground placeholder:text-muted-foreground flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50 max-md:h-11 md:text-sm',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
