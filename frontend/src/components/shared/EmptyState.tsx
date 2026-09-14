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
 * Sprint 90 (review cycle 1) — la région `status` couvre le SEUL message (titre +
 * description), jamais `action` : une région live est atomique pour la plupart des
 * lecteurs d'écran, un CTA à l'intérieur ferait annoncer le libellé du bouton avec
 * le message. L'action est rendue en frère de la région. Le `testId` reste sur la
 * racine (specs et tests appelants le visent), qui ne porte plus de rôle.
 *
 * `compact` : variante inline discrète (ex. bloc « aucun produit » dans une
 * colonne du dashboard) vs plein bloc centré (page/section vide).
 *
 * #630 — `track` : frise vide en pointillés (handoff : l'état vide = instruction
 * éditoriale + CTA + frise vide pointillée, JAMAIS d'illustration ni d'emoji).
 * Pur décor (`aria-hidden`) : quelques lanes de hauteur `--lane-height`, chacune
 * traversée d'un trait pointillé. Couleur `--color-rule-emphasis`, même repli que
 * le connecteur pointillé de la frise (`.mt-evt-connector`, `timeline.css`) ;
 * ce token n'est pas inversé en sombre (`ds/readme.md` § Border tiers) et reste
 * donc lisible dans les deux thèmes sans variante `.dark`.
 *
 * `track` est IGNORÉ en `compact` : la variante compacte vit dans des colonnes
 * étroites (aside 280 px, carousel mobile) sous un titre de section ; trois lanes
 * de 46 px y écraseraient le contenu, et une lane unique réduite se lirait comme
 * un simple filet séparateur, pas comme une frise.
 */

/** Nombre de lanes de la piste vide (assez pour évoquer une frise, pas plus). */
const TRACK_LANES = 3

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
  /**
   * #630 — Rend une frise vide en pointillés au-dessus du titre (décorative).
   * Sans effet en `compact`.
   */
  track?: boolean
  className?: string
  /** `data-testid` de la racine. Défaut `empty-state`. La piste reçoit `${testId}-track`. */
  testId?: string
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  compact = false,
  track = false,
  className,
  testId = 'empty-state',
}: EmptyStateProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-1 py-4' : 'gap-3 py-12',
        className,
      )}
    >
      {track && !compact ? (
        <div
          className="mb-2 flex w-full max-w-md flex-col"
          aria-hidden="true"
          data-testid={`${testId}-track`}
        >
          {Array.from({ length: TRACK_LANES }, (_, index) => (
            <div key={index} className="flex items-center" style={{ height: 'var(--lane-height)' }}>
              <span className="border-rule-emphasis block h-0 w-full border-t-2 border-dashed" />
            </div>
          ))}
        </div>
      ) : null}
      {icon ? (
        <div
          className={cn('text-ink-faint', compact ? '[&_svg]:size-6' : '[&_svg]:size-10')}
          aria-hidden="true"
        >
          {icon}
        </div>
      ) : null}
      {/* Région live = message seul ; même `gap` que la racine, espacement inchangé. */}
      <div role="status" className={cn('flex flex-col items-center', compact ? 'gap-1' : 'gap-3')}>
        <p className={cn('text-ink font-medium', compact ? 'text-xs' : 'text-sm')}>{title}</p>
        {description ? (
          <p
            className={cn('text-ink-muted max-w-sm text-pretty', compact ? 'text-2xs' : 'text-xs')}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className={compact ? 'mt-1' : 'mt-2'}>{action}</div> : null}
    </div>
  )
}

export default EmptyState
