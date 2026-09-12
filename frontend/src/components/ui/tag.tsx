import * as React from 'react'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Tag — étiquette compacte (ex. catégorie, couleur d'event), DS Graphite (`.mt-tag`).
 * `swatch` : couleur de la pastille (token event, ex. `var(--color-evt-sky)`).
 * `onRemove` : affiche le bouton de suppression (requiert `removeLabel` a11y).
 */
export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  swatch?: string
  onRemove?: () => void
  removeLabel?: string
}

const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className, swatch, onRemove, removeLabel = 'Retirer', children, ...props }, ref) => (
    <span ref={ref} className={cn('mt-tag', className)} {...props}>
      {swatch && (
        <span className="mt-tag__swatch" style={{ background: swatch }} aria-hidden="true" />
      )}
      {children}
      {onRemove && (
        <button type="button" className="mt-tag__x" onClick={onRemove} aria-label={removeLabel}>
          <X aria-hidden="true" />
        </button>
      )}
    </span>
  ),
)
Tag.displayName = 'Tag'

export { Tag }
