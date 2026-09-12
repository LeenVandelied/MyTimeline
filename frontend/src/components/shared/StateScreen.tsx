import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * #57 — Coquille de présentation partagée pour les écrans d'état plein page
 * (404 / 403 / 500). Composant PUR (aucun hook, aucune dépendance i18n) : il
 * est donc réutilisable aussi bien depuis un Server Component (`not-found.tsx`)
 * que depuis un Client Component (`[locale]/error.tsx`, `app/global-error.tsx`).
 *
 * Couleurs / espacements / typo : UNIQUEMENT via les tokens Graphite exposés à
 * Tailwind (`bg-bg`, `text-ink`, `text-ink-muted`, `text-ink-faint`…). Aucune
 * valeur hex/px hardcodée → clair ET sombre suivent `next-themes` sans effort.
 *
 * L'appelant fournit les libellés déjà traduits (next-intl côté appelant) et les
 * actions (liens de retour préfixés locale, bouton `reset`). Les libellés ne
 * sont jamais hardcodés ici.
 */

export interface StateScreenProps {
  /** Code HTTP affiché en gros (`404`, `403`, `500`). Non localisé. */
  code?: string
  /** Titre principal, déjà traduit. */
  title: string
  /** Description optionnelle, déjà traduite. */
  description?: string
  /** Icône décorative (lucide-react). `aria-hidden` est appliqué au conteneur. */
  icon?: React.ReactNode
  /** Actions (liens/bouton). Déjà traduites et préfixées locale par l'appelant. */
  actions?: React.ReactNode
  className?: string
  /** `data-testid` de la racine. Défaut `state-screen`. */
  testId?: string
}

/**
 * Classes d'action partagées (accent Graphite). Exportées pour que les écrans
 * appelants stylent leurs `<Link>` / `<button>` de manière cohérente sans
 * dupliquer la charte. Aucune utilitaire de focus ici : l'indicateur est le
 * contour `:focus-visible` du DS (`ds/tokens/base.css`, #383).
 */
export const stateActionPrimary = cn(
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
  'bg-accent text-accent-ink transition-colors hover:bg-accent-hover',
)

export const stateActionSecondary = cn(
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
  'border border-rule-emphasis text-ink transition-colors hover:bg-surface-2',
)

export function StateScreen({
  code,
  title,
  description,
  icon,
  actions,
  className,
  testId = 'state-screen',
}: StateScreenProps) {
  return (
    <main
      data-testid={testId}
      className={cn(
        'bg-bg text-ink flex min-h-[100dvh] flex-col items-center justify-center px-6 py-16 text-center',
        className,
      )}
    >
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        {icon ? (
          <div className="text-ink-muted [&_svg]:size-10" aria-hidden="true">
            {icon}
          </div>
        ) : null}
        {/* #72 — `.mt-num` (DS i18n.css §7) : mono + tabular-nums (rendu identique)
            + `direction:ltr; unicode-bidi:isolate`, pour qu'un code ne se réordonne
            pas en contexte RTL. PAS d'`Intl.NumberFormat` ici : `code` est un
            IDENTIFIANT (`404`, `500`) typé `string`, pas une quantité — le formater
            insérerait un séparateur de milliers à partir de 1000. */}
        {code ? (
          <p
            className="text-ink-faint mt-num text-2xl font-semibold tracking-widest"
            data-testid="state-screen-code"
          >
            {code}
          </p>
        ) : null}
        <h1 className="text-ink text-2xl font-semibold text-balance">{title}</h1>
        {description ? <p className="text-ink-muted text-sm text-pretty">{description}</p> : null}
        {actions ? (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{actions}</div>
        ) : null}
      </div>
    </main>
  )
}

export default StateScreen
