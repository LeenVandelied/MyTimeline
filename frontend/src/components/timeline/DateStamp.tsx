import React from 'react'
import { formatDayParts } from './lib'

/**
 * #47 — DateStamp : une cellule de jour dans l'en-tête (Ruler).
 * Libellé dérivé de la locale, highlight `bg-accent-soft` quand le jour
 * correspond à `now`, sinon `bg-surface-2`. Purement présentationnel.
 *
 * #191 — DÉBORDEMENT CORRIGÉ, et arbitrage de charte assumé ici.
 *
 * Le libellé `formatDay` (« dim. 5 ») contient un mot INSÉCABLE de ~30 px. Or
 * `Ruler` répartit ses jours en `repeat(N, minmax(0, 1fr))` : la piste rétrécit
 * sans plancher, et rien n'arrêtait le texte. Mesuré avant correctif, sur
 * `timeline-ruler--thirty-days`, identique en clair et en sombre :
 * 30/30 cellules débordaient à 800 px (piste 22 px) et 21/30 à 1024 px (27 px),
 * le jeton « dim. » se peignant sur les cellules voisines. `overflow: visible`
 * et `white-space: normal` : le mot passait à la ligne mais restait plus large
 * que sa piste.
 *
 * ARBITRAGE — trois options écartées, une retenue :
 *  - `truncate` : amputerait le NUMÉRO du jour, seul jeton réellement porteur
 *    (« ven… » ne dit plus quel jour c'est) ;
 *  - abréviation plus courte : c'est ICU qui décide, pas nous — la coder en dur
 *    casserait les 4 locales du produit (`fr/en/es/de`) ;
 *  - plancher `min-w` + défilement horizontal : `Ruler` est une règle SANS
 *    scroller propre, et son seul consommateur applicatif (mini-frise de
 *    `EventPreviewTimeline`) vit dans un drawer de 452 px où un défilement
 *    horizontal serait un régression d'usage.
 *
 * RETENU — dégradation par REQUÊTE DE CONTENEUR : la cellule s'adapte à SA
 * propre largeur, pas au viewport. C'est la seule qui reste juste pour les deux
 * consommateurs à la fois, puisqu'ils n'ont pas du tout la même échelle : 6
 * graduations larges pour la mini-frise, N jours étroits pour une règle longue.
 * Sous le seuil (52 px), le jour de semaine sort du flux VISUEL uniquement (`sr-only`) :
 * il reste dans l'arbre d'accessibilité à toutes les largeurs, donc aucune perte
 * pour les technologies d'assistance — contrairement à un `display:none`.
 * `overflow-hidden` est le filet de sécurité : quoi qu'il arrive, une cellule ne
 * peint plus jamais hors de sa piste.
 *
 * ⚠ Le conteneur de requête doit être un ANCÊTRE de l'élément interrogé — un
 * élément ne peut pas se requêter lui-même. D'où le `@container` sur la cellule
 * et les variantes `@min-[...]:*` sur l'enveloppe interne, pas sur la même.
 *
 * SEUILS — MESURÉS, PAS CHOISIS À VUE (cycle 2 de revue #191).
 *
 * La 1ʳᵉ passe révélait le jour de semaine dès 34 px : entre 34 et ~50 px il
 * réapparaissait SANS avoir la place et se faisait rogner par l'`overflow-hidden`
 * ci-dessous — un glyphe coupé en deux, soit exactement le défaut qu'on corrige
 * (mesuré : −15 px sur « sam. » à 1280 px). La bande était invisible aux 4
 * largeurs testées (800/1024/1280/1600) car la sonde lisait des BOÎTES DE LIGNE,
 * bornées à la boîte de contenu : un mot insécable plus large que sa boîte n'y
 * apparaît jamais. La sonde correcte est `scrollWidth - clientWidth` sur CETTE
 * enveloppe.
 *
 * Jour de semaine le plus large, Archivo 500 à 15 px, sur les 4 locales du
 * produit : fr `sam.` = 33,3 px (la contrainte), en `Wed` = 30,4, es `dom` = 30,3,
 * de `Mo.` = 25,8. Avec `px-2` (16 px) il faut donc ≥ 49,3 px → seuil **52 px**,
 * qui garde ~2,7 px de marge de rendu et vaut pour les 4 locales (un seuil
 * calibré sur `de` seul serait faux en `fr` : 26 px d'écart de besoin).
 * Le palier 34 px ne règle QUE la typo et le padding : le numéro à 2 chiffres
 * fait 17,2 px à 15 px de fonte, soit 33,2 px avec `px-2` — il tient dès 34 px.
 * Tout changement de fonte, de graisse ou de `px-*` invalide ces seuils.
 */
export interface DateStampProps {
  day: Date
  locale: string
  /** Date de référence pour le highlight « aujourd'hui ». */
  now: Date
}

export const DateStamp: React.FC<DateStampProps> = ({ day, locale, now }) => {
  const isToday = day.toDateString() === now.toDateString()
  const { weekday, day: dayNumber } = formatDayParts(day, locale)

  return (
    <div
      className={`@container text-ink border-rule border-r ${
        isToday ? 'bg-accent-soft' : 'bg-surface-2'
      }`}
    >
      <div className="text-2xs @min-[34px]:text-xs overflow-hidden px-0.5 py-2 text-center font-medium @min-[34px]:px-2">
        {/* L'espace vit DANS le span : masqué avec lui, et sécable — le libellé
            doit pouvoir passer à la ligne entre les deux jetons plutôt que de
            déborder (une espace insécable rétablirait le défaut corrigé ici). */}
        <span className="sr-only @min-[52px]:not-sr-only">{`${weekday} `}</span>
        {dayNumber}
      </div>
    </div>
  )
}

export default DateStamp
