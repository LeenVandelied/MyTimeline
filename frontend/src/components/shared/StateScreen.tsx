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
  /**
   * #627 — Sur-titre mono au-dessus du titre (`.mt-eyebrow`), déjà traduit
   * (ex. « Erreur 404 »). Absent par défaut : aucun appelant existant n'en porte.
   */
  eyebrow?: string
  /**
   * #627 — Élément latéral (feuillet d'éphéméride du 404). Quand il est fourni,
   * la mise en page passe en « feuillet + texte » : colonne sur mobile, rangée à
   * partir de `sm`, texte aligné à gauche. L'appelant gère son accessibilité
   * (le feuillet se déclare lui-même `aria-hidden`). Dans cette variante, `icon`
   * et `code` ne sont PAS rendus : la maquette ne porte le code que dans le
   * sur-titre (`eyebrow`). Sans `aside`, le rendu est STRICTEMENT celui d'avant
   * #627 (écrans 500 / 403 inchangés).
   */
  aside?: React.ReactNode
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
  eyebrow,
  aside,
  className,
  testId = 'state-screen',
}: StateScreenProps) {
  const eyebrowNode = eyebrow ? (
    <p className="mt-eyebrow" data-testid="state-screen-eyebrow">
      {eyebrow}
    </p>
  ) : null

  if (aside) {
    // #627 — Variante « feuillet + texte » (maquette 404, `gap:28px`). Le titre
    // reste un `<h1>` : c'est le titre de la PAGE (le `h2` de la maquette est un
    // artefact de planche). Police display, graisse et `tracking-tight` viennent
    // déjà de la règle `h1` du DS (`ds/tokens/base.css`). Tailles au barème DS :
    // titre `text-lg` (27 px, maquette 25 px), paragraphe `text-xs` (15 px,
    // maquette 14 px) avec `leading-normal` explicite (1.5, maquette) contre le
    // `line-height` apparié à `text-*` (PIT-S53-001).
    return (
      <main
        data-testid={testId}
        className={cn(
          'bg-bg text-ink flex min-h-[100dvh] flex-col items-center justify-center px-6 py-16',
          className,
        )}
      >
        <div
          data-testid="state-screen-with-aside"
          className="flex w-full max-w-xl flex-col items-start gap-7 sm:flex-row sm:items-center"
        >
          {aside}
          <div className="flex min-w-0 flex-1 flex-col items-start text-left">
            {eyebrowNode ? <div className="mb-2.5">{eyebrowNode}</div> : null}
            <h1 className="text-ink mb-2.5 text-lg font-semibold text-balance">{title}</h1>
            {description ? (
              <p className="text-ink-muted text-xs leading-normal text-pretty">{description}</p>
            ) : null}
            {actions ? (
              <div className="mt-5 flex flex-wrap items-center justify-start gap-3">{actions}</div>
            ) : null}
          </div>
        </div>
      </main>
    )
  }

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
        {eyebrowNode}
        {/* #72 — `.mt-num` (DS i18n.css §7) : mono + tabular-nums (rendu identique)
            + `direction:ltr; unicode-bidi:isolate`, pour qu'un code ne se réordonne
            pas en contexte RTL. PAS d'`Intl.NumberFormat` ici : `code` est un
            IDENTIFIANT (`404`, `500`) typé `string`, pas une quantité — le formater
            insérerait un séparateur de milliers à partir de 1000. */}
        {code ? (
          <p
            className="text-ink-muted mt-num text-2xl font-semibold tracking-widest"
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
