'use client'

/**
 * Frise horizontale animée du Hero (#56).
 *
 * ISOLÉ À DESSEIN — l'issue le demande explicitement : cette animation n'est PAS
 * spécifiée au design system, elle sera probablement remplacée. Elle tient donc dans
 * un composant + un fichier CSS dédiés (`src/styles/hero-timeline.css`) : la retirer,
 * c'est supprimer deux fichiers et un import, sans toucher au Hero.
 *
 * CSS PUR, PAS `framer-motion` — bien que la dépendance soit déclarée
 * (`package.json`), elle n'est importée NULLE PART dans le code aujourd'hui (vérifié
 * par recherche sur `app/` et `src/`). L'utiliser ici la ferait entrer pour la
 * première fois dans le bundle client pour une animation décorative de trois
 * keyframes. `animations.css` couvre déjà ce besoin en CSS.
 *
 * SOBRIÉTÉ GRAPHITE — quasi-monochrome : le rail et les jalons passés/futurs sont sur
 * les tiers neutres (`rule`, `rule-emphasis`, `surface`), et l'accent bleu est réservé
 * au marqueur « aujourd'hui » et à la progression, conformément à la charte (l'accent
 * signale *today/active*, rien d'autre).
 *
 * A11Y — `aria-hidden` : la frise ne porte aucune information que le texte du Hero ne
 * donne pas déjà, elle est purement illustrative. La donner aux lecteurs d'écran
 * ajouterait du bruit sans contenu. Le respect de `prefers-reduced-motion` est traité
 * dans la feuille CSS (état statique lisible, pas de suppression du visuel).
 */

/** Jalons de la frise. L'avant-dernier porte le marqueur « aujourd'hui ». */
const NODES = [0, 1, 2, 3, 4] as const
const TODAY_INDEX = 3

export function HeroTimelineAnimation() {
  return (
    <div className="hero-timeline relative mt-12 h-10 w-full" aria-hidden="true">
      {/* Rail complet — décoratif, donc tier `rule`. */}
      <div className="bg-rule absolute top-1/2 right-0 left-0 h-px" />

      {/* Progression animée par-dessus le rail. */}
      <div className="hero-timeline__progress bg-accent absolute top-1/2 right-0 left-0 h-px origin-left" />

      {/* Jalons répartis sur toute la largeur. */}
      <div className="absolute top-1/2 right-0 left-0 flex -translate-y-1/2 items-center justify-between">
        {NODES.map((node) =>
          node === TODAY_INDEX ? (
            <span
              key={node}
              className="hero-timeline__today bg-accent block h-3.5 w-3.5 rounded-full"
            />
          ) : (
            <span
              key={node}
              className="bg-surface border-rule-emphasis block h-2.5 w-2.5 rounded-full border"
            />
          ),
        )}
      </div>
    </div>
  )
}
