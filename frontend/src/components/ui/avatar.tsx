import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Avatar — vignette identité, DS Graphite (classes `.mt-avatar`).
 * Affiche `src` (image) sinon `initials` en mono. `round` pour un cercle.
 */
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string
  alt?: string
  initials?: string
  size?: 'sm' | 'md' | 'lg'
  round?: boolean
}

const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, src, alt = '', initials, size = 'md', round, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'mt-avatar',
        size === 'sm' && 'mt-avatar--sm',
        size === 'lg' && 'mt-avatar--lg',
        round && 'mt-avatar--round',
        className,
      )}
      {...props}
    >
      {src ? (
        // alt défaut '' = image décorative assumée (le sens est porté par le
        // contexte / le texte adjacent). Passer `alt` explicite si informative.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} />
      ) : (
        <span aria-hidden={!alt || undefined}>{initials}</span>
      )}
    </span>
  ),
)
Avatar.displayName = 'Avatar'

export { Avatar }
