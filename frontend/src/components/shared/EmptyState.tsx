import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * #57 — État vide réutilisable (listes vides : timeline sans événement, aucun
 * produit, aucune catégorie…). Présentationnel PUR et piloté par props : les
 * libellés sont déjà traduits par l'appelant (next-intl), le composant ne
 * hardcode aucun texte ni clé i18n → réutilisable dans tous les contextes.
 *
 * `role="status"` : l'apparition d'un état vide est annoncée poliment aux
 * lecteurs d'écran. Couleurs/espacements via tokens Graphite (clair + sombre).
 *
 * `compact` : variante inline discrète (ex. bloc « aucun produit » dans une
 * colonne du dashboard) vs plein bloc centré (page/section vide).
 */

export interface EmptyStateProps {
  /** Message principal, déjà traduit. */
  title: string
  /** Précision optionnelle, déjà traduite. */
  description?: string
  /** Icône décorative optionnelle (lucide-react). */
  icon?: React.ReactNode
  /** Action optionnelle (ex. bouton « Ajouter »), déjà traduite. */
  action?: React.ReactNode
  /** Variante inline discrète (moins d'espacement, typo plus petite). */
  compact?: boolean
  className?: string
  /** `data-testid` de la racine. Défaut `empty-state`. */
  testId?: string
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  compact = false,
  className,
  testId = 'empty-state',
}: EmptyStateProps) {
  return (
    <div
      data-testid={testId}
      role="status"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-1 py-4' : 'gap-3 py-12',
        className,
      )}
    >
      {icon ? (
        <div
          className={cn('text-ink-faint', compact ? '[&_svg]:size-6' : '[&_svg]:size-10')}
          aria-hidden="true"
        >
          {icon}
        </div>
      ) : null}
      <p className={cn('text-ink font-medium', compact ? 'text-xs' : 'text-sm')}>{title}</p>
      {description ? (
        <p className={cn('text-ink-muted max-w-sm text-pretty', compact ? 'text-2xs' : 'text-xs')}>
          {description}
        </p>
      ) : null}
      {action ? <div className={compact ? 'mt-1' : 'mt-2'}>{action}</div> : null}
    </div>
  )
}

export default EmptyState
