'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useMediaQuery } from '@/hooks/useMediaQuery'

/**
 * #592 — SIDEBAR de l'écran Vue Timeline (maquette `Vue Timeline.dc.html`, §A de
 * `docs/memory/sprints/sprint-85/maquette-vue-timeline.md`).
 *
 * Quatre blocs, dans l'ordre de la maquette :
 *  1. « Accordéons » — segmenté [Tout déplier | Tout plier] : pose `collapsed`
 *     pour TOUTES les catégories (état d'accordéon existant de `TimelineView`) ;
 *  2. « Catégories » — un filtre par catégorie : bascule `hiddenCats` (MASQUAGE,
 *     distinct du repli) ; pastille = couleur de catégorie, compteur = nombre
 *     d'ÉVÉNEMENTS de la catégorie (compté même masquée) ;
 *  3. « Légende » — les seules marques que la frise rend aujourd'hui
 *     (DEC-S85-002 : « Occurrence à venir » et « Récurrence » arriveront avec #595) ;
 *  4. pied « raccourcis » — remplace, sur cet écran, la bulle `?` de la barre
 *     d'outils (qui reste sur le dashboard et la fiche produit).
 *
 * Composant de PRÉSENTATION pur : tout l'état (masquage, repli, ouverture du
 * panneau) vit dans `TimelineView`. `React.memo` + props stables : la frise se
 * re-rend à chaque frame de scroll (#349), la sidebar ne doit pas suivre.
 *
 * ÉCARTS À LA MAQUETTE (mesurés, cf. `issue-592-done.md`) :
 *  - ligne masquée : la maquette pose `opacity:.4` sur TOUTE la ligne → libellé à
 *    2,52:1 (clair) / 3,43:1 (sombre), sous 4,5:1. On garde la pastille en
 *    CONTOUR (signal de la maquette), le libellé passe en `ink-muted` (6,11 /
 *    5,85) et est BARRÉ — l'état ne repose ni sur l'opacité ni sur la seule couleur
 *    (une catégorie sans couleur a une pastille en contour dans les deux états) ;
 *  - titres de bloc, compteurs et pied : `ink-faint` dans la maquette = 2,82:1 /
 *    2,99:1 (déjà consigné comme non conforme, `bugs-resolved.md`) → `ink-muted`.
 */

/** DEC-S85-004 — palier au-delà duquel la sidebar est permanente (`lg`). */
export const SIDEBAR_PERMANENT_QUERY = '(min-width: 1024px)'

export interface TimelineSidebarCategory {
  name: string
  /** Couleur de catégorie (`categoryColorsOf`) ; `null` = contour neutre. */
  color: string | null
  /** Nombre d'ÉVÉNEMENTS de la catégorie, masquée ou non. */
  eventCount: number
  hidden: boolean
}

export interface TimelineSidebarProps {
  /** Cible d'`aria-controls` du bouton « Filtres » de la barre d'outils. */
  id: string
  /** Panneau superposé ouvert (< 1024 px). Sans effet au-delà (CSS). */
  open: boolean
  categories: TimelineSidebarCategory[]
  onToggleCategory: (category: string) => void
  onCollapseAll: (collapsed: boolean) => void
  panelRef: React.RefObject<HTMLElement | null>
}

/**
 * Raccourcis de la frise : SOURCE UNIQUE pour la bulle `?` (dashboard, fiche
 * produit) et le pied de sidebar (écran Timeline). `t` est résolu sous
 * `dashboard.timeline`. « Plein écran » pour `F` : c'est le comportement actuel
 * (#597 le changera — la maquette annonce « recadrer », on ne le promet pas).
 */
export function buildTimelineShortcuts(t: (key: string) => string): Array<[string, string]> {
  return [
    ['T', t('help.today')],
    ['[  ]', t('help.period')],
    ['+  −', t('help.zoom')],
    ['F', t('help.fullscreen')],
    [t('help.escapeKey'), t('help.escape')],
  ]
}

/**
 * Ouverture du panneau superposé (< 1024 px, DEC-S85-004) : bouton « Filtres »
 * (`aria-expanded` + `aria-controls`), fermeture par Échap (appelée par le
 * gestionnaire clavier global de `TimelineView`, qui lui donne la PRIORITÉ) et
 * par clic extérieur ; le focus revient au bouton.
 *
 * `enabled=false` (layout `embedded`) : hook inerte, le panneau n'existe pas.
 */
export function useTimelineSidebarPanel(enabled: boolean) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const isPermanent = useMediaQuery(SIDEBAR_PERMANENT_QUERY)

  // Franchir le palier vers le haut referme le panneau : sinon un état « ouvert »
  // invisible survivrait et volerait la touche Échap au drawer.
  useEffect(() => {
    if (isPermanent) setOpen(false)
  }, [isPermanent])

  const toggle = useCallback(() => setOpen((v) => !v), [])

  const closeAndRestoreFocus = useCallback(() => {
    setOpen(false)
    buttonRef.current?.focus()
  }, [])

  // À l'ouverture, le focus entre dans le panneau : il PRÉCÈDE la barre d'outils
  // dans le DOM (ordre visuel ≥ 1024 px), un Tab depuis le bouton n'y mènerait pas.
  useEffect(() => {
    if (!open) return
    panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [open])

  // Clic extérieur. Le focus n'est rendu au bouton QUE s'il est perdu (clic sur
  // une zone non focalisable) : un clic sur une pastille doit garder son focus.
  useEffect(() => {
    if (!enabled || !open) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target
      if (!(target instanceof Node)) return
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setOpen(false)
      requestAnimationFrame(() => {
        const active = document.activeElement
        if (active === null || active === document.body) buttonRef.current?.focus()
      })
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [enabled, open])

  return { open: enabled && open, toggle, closeAndRestoreFocus, buttonRef, panelRef }
}

export const TimelineSidebar = React.memo<TimelineSidebarProps>(function TimelineSidebar({
  id,
  open,
  categories,
  onToggleCategory,
  onCollapseAll,
  panelRef,
}) {
  const t = useTranslations('dashboard.timeline')
  const shortcuts = buildTimelineShortcuts(t)

  return (
    <aside
      id={id}
      ref={panelRef}
      className="mt-tlv-side"
      data-open={open ? 'true' : 'false'}
      aria-label={t('sidebar.label')}
      data-testid="timeline-sidebar"
    >
      <div className="mt-tlv-side__body">
        <section className="mt-tlv-side__block" aria-labelledby={`${id}-accordions`}>
          <h2 id={`${id}-accordions`} className="mt-tlv-side__title">
            {t('sidebar.accordions')}
          </h2>
          <div className="mt-tlv-side__seg" role="group" aria-labelledby={`${id}-accordions`}>
            <button
              type="button"
              className="mt-tlv-side__seg-btn"
              onClick={() => onCollapseAll(false)}
              data-testid="timeline-sidebar-expand-all"
            >
              {t('sidebar.expandAll')}
            </button>
            <button
              type="button"
              className="mt-tlv-side__seg-btn"
              onClick={() => onCollapseAll(true)}
              data-testid="timeline-sidebar-collapse-all"
            >
              {t('sidebar.collapseAll')}
            </button>
          </div>
        </section>

        <section className="mt-tlv-side__block" aria-labelledby={`${id}-categories`}>
          <h2 id={`${id}-categories`} className="mt-tlv-side__title">
            {t('sidebar.categories')}
          </h2>
          <p id={`${id}-categories-hint`} className="sr-only">
            {t('sidebar.categoriesHint')}
          </p>
          <ul className="mt-tlv-side__filters" aria-describedby={`${id}-categories-hint`}>
            {categories.map((cat) => (
              <li key={cat.name}>
                <button
                  type="button"
                  className="mt-tlv-side__filter"
                  // Pressé = catégorie AFFICHÉE (état par défaut).
                  aria-pressed={!cat.hidden}
                  aria-label={t('sidebar.filterLabel', {
                    category: cat.name,
                    count: cat.eventCount,
                  })}
                  onClick={() => onToggleCategory(cat.name)}
                  data-testid="timeline-sidebar-filter"
                  data-category={cat.name}
                  data-hidden={cat.hidden ? 'true' : 'false'}
                >
                  <span
                    className="mt-tlv-side__swatch"
                    data-color={cat.color === null ? 'none' : 'set'}
                    // Maquette §A.2 : aplat + filet de la couleur ; masquée = filet
                    // seul. Sans couleur (DEC-S85-006) : AUCUN style inline, le CSS
                    // peint le contour neutre `rule-strong` dans les deux états.
                    style={
                      cat.color === null
                        ? undefined
                        : {
                            borderColor: cat.color,
                            backgroundColor: cat.hidden ? 'transparent' : cat.color,
                          }
                    }
                    aria-hidden="true"
                    data-testid="timeline-sidebar-swatch"
                  />
                  <span className="mt-tlv-side__filter-label" title={cat.name}>
                    {cat.name}
                  </span>
                  <span className="mt-tlv-side__count" aria-hidden="true">
                    {cat.eventCount}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-tlv-side__block" aria-labelledby={`${id}-legend`}>
          <h2 id={`${id}-legend`} className="mt-tlv-side__title">
            {t('sidebar.legend')}
          </h2>
          <ul className="mt-tlv-side__legend" data-testid="timeline-sidebar-legend">
            <li className="mt-tlv-side__legend-item">
              <span className="mt-tlv-side__legend-evt" aria-hidden="true" />
              {t('sidebar.legendEvent')}
            </li>
          </ul>
        </section>
      </div>

      <ul
        className="mt-tlv-side__keys"
        aria-label={t('help.label')}
        data-testid="timeline-sidebar-shortcuts"
      >
        {shortcuts.map(([key, desc]) => (
          <li key={key}>
            <kbd className="mt-tlv-side__kbd">{key}</kbd> {desc}
          </li>
        ))}
      </ul>
    </aside>
  )
})
