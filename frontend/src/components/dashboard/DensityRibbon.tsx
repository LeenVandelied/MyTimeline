'use client'

import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TOUCH_TARGET_HITBOX } from '@/lib/touchTarget'
import { cn } from '@/lib/utils'
import { buildDensityBuckets, type DensityBucket } from '@/components/timeline'
import type { FullCalendarEvent } from '@/types/event'
import {
  addCalendarDays,
  clampViewportStart,
  dayToPct,
  dragViewportStart,
  keyToViewportStart,
  maxViewportStart,
  rulerTicks,
  viewportDays,
  type TickAnchor,
} from './densityWindow'

/**
 * #80 — Ruban de densité (hero, spec Designer §3). Densité = HAUTEUR de barre ∝
 * events/jour (PAS gradient). Couleur barre = couleur event du jour (`--evt-*`,
 * BR-EVE-009), jour vide = filet neutre. Ligne TODAY = `--color-accent`. Réutilise
 * `buildDensityBuckets` (lib.ts). Largeur fluide, `rangeDays` paramétrable (#83/#85).
 *
 * #83 — Mode `scrollable` (mobile portrait) : sur un écran étroit, 30 barres à
 * `flex-1` deviennent illisibles. Le mode scrollable donne à chaque barre une
 * largeur MINIMALE fixe (`minBarWidth`) et rend le rail scrollable horizontalement
 * (`overflow-x:auto`), avec un indicateur de scroll visible (dégradé de bord + hint
 * textuel). Aucun scroll horizontal CACHÉ (réserve Designer). Desktop inchangé.
 *
 * #623 (DEC-S108-003, maquette `Dashboard.dc.html` § Hero) :
 *  - fenêtre = les `rangeDays` PROCHAINS jours : aujourd'hui = jour 0 = bord GAUCHE
 *    (avant : les 30 DERNIERS jours, aujourd'hui à droite) ;
 *  - RÈGLE au-dessus des barres, un libellé tous les 5 jours (« Auj. » puis date
 *    courte Intl), sans trait ;
 *  - VIEWPORT de 9 jours déplaçable (pointeur : souris, stylet, toucher ; clavier :
 *    `role="slider"`) qui ne pilote QUE le libellé « Fenêtre · … » de l'en-tête — le
 *    tableau de bord ne rend aucune frise, il n'y a rien à synchroniser ;
 *  - en mode `scrollable`, PAS de viewport : le défilement natif du rail est la
 *    navigation, la règle défile avec les barres et le libellé montre la fenêtre
 *    complète ;
 *  - l'histogramme de densité est CONSERVÉ (les barres d'événements empilées de la
 *    maquette sont hors périmètre S108).
 * Géométrie (px → jours, bornes, clavier) : fonctions pures de `densityWindow.ts`.
 */
export interface DensityRibbonProps {
  events: FullCalendarEvent[]
  rangeDays?: number
  now?: Date
  locale: string
  /** #83 — Rend le rail scrollable-x avec barres à largeur mini fixe (mobile). */
  scrollable?: boolean
  /** #83 — Largeur mini d'une barre en mode scrollable (px). Défaut 12. */
  minBarWidth?: number
  /**
   * #624 — Route de l'écran frise dédié (déjà localisée, ex. `/fr/timeline`). Fournie :
   * rend le lien « Ouvrir la frise » dans l'en-tête du ruban. Absente : aucun lien.
   */
  timelineHref?: string
}

const ANCHOR_CLASS: Record<TickAnchor, string> = {
  start: '',
  center: '-translate-x-1/2',
  end: '-translate-x-full',
}

/** Une barre du ruban (hauteur ∝ densité) ; le 1er jour porte le trait TODAY. */
function Bar({
  bucket,
  title,
  className,
  style,
}: {
  bucket: DensityBucket
  title: string
  className: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={cn('relative h-full', className)}
      style={style}
      data-testid={bucket.isToday ? 'dashboard-density-today' : undefined}
      title={title}
    >
      <div
        className="absolute bottom-0 w-full rounded-xs"
        style={{
          height: `${Math.max(bucket.count > 0 ? 8 : 2, bucket.height * 100)}%`,
          background: bucket.color ?? 'var(--color-rule-strong)',
        }}
      />
      {/* #623 — trait TODAY au bord GAUCHE de la piste (maquette : `left:0; width:2px`),
          aujourd'hui étant le jour 0 de la fenêtre. */}
      {bucket.isToday && (
        <div className="bg-accent pointer-events-none absolute inset-y-0 left-0 w-0.5" />
      )}
    </div>
  )
}

export const DensityRibbon: React.FC<DensityRibbonProps> = ({
  events,
  rangeDays = 30,
  now = new Date(),
  locale,
  scrollable = false,
  minBarWidth = 12,
  timelineHref,
}) => {
  const t = useTranslations('dashboard.density')
  const tm = useTranslations('dashboard.mobile')

  // #623 — Fenêtre FUTURE : jour 0 = aujourd'hui (minuit local). Mémoïsée sur le jour
  // CIVIL, pas sur la référence `now` (recréée à chaque rendu par le défaut) : le
  // glisser re-rend le composant à chaque mouvement.
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  const from = useMemo(() => new Date(y, m, d), [y, m, d])

  // `now = from` : `isToday` compare des dates civiles (`toDateString`), le 1er bucket
  // est donc aujourd'hui. Contrat de `buildDensityBuckets` inchangé.
  const buckets = useMemo(
    () => buildDensityBuckets(events, from, from, rangeDays),
    [events, from, rangeDays],
  )

  const fmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }),
    [locale],
  )
  // #72 — Le `title` des barres expose un compteur d'événements : quantité →
  // séparateur de milliers localisé. C'est un ATTRIBUT texte : aucune classe DS
  // (`.mt-num`) n'y est applicable, seul le formatage joue.
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale])

  const ticks = useMemo(() => rulerTicks(rangeDays), [rangeDays])
  const vpDays = viewportDays(rangeDays)
  const vpMax = maxViewportStart(rangeDays)

  // --- Viewport (desktop uniquement) -------------------------------------------
  const [vpStart, setVpStart] = useState(0)
  const [dragging, setDragging] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  // `pointerId` : seul le pointeur qui a saisi le viewport le pilote — un 2e doigt
  // (multi-touch accidentel) ne doit ni le déplacer ni terminer le glisser.
  const dragRef = useRef<{ pointerId: number; x0: number; origin: number } | null>(null)
  const start = clampViewportStart(vpStart, rangeDays)
  const startDay = Math.round(start)

  // Plage lisible : pour le libellé d'en-tête ET l'`aria-valuetext` du slider.
  // `formatRange` localise le séparateur et fusionne le mois commun (« 3–12 oct. »).
  const formatDays = (a: number, b: number) =>
    fmt.formatRange(addCalendarDays(from, a), addCalendarDays(from, b))
  const shownRange = scrollable ? formatDays(0, rangeDays) : formatDays(startDay, startDay + vpDays)

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== e.pointerId) return
    dragRef.current = null
    setDragging(false)
    // Fin du glisser : on se cale sur le jour affiché par le libellé.
    setVpStart((v) => Math.round(v))
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (dragRef.current) return
      e.currentTarget.setPointerCapture?.(e.pointerId)
      dragRef.current = { pointerId: e.pointerId, x0: e.clientX, origin: start }
      setDragging(true)
    },
    [start],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== e.pointerId) return
      const trackWidthPx = trackRef.current?.getBoundingClientRect().width ?? 0
      setVpStart(
        dragViewportStart({
          originStart: drag.origin,
          deltaPx: e.clientX - drag.x0,
          trackWidthPx,
          rangeDays,
        }),
      )
    },
    [rangeDays],
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const next = keyToViewportStart(e.key, start, rangeDays)
      if (next === null) return
      e.preventDefault()
      setVpStart(next)
    },
    [start, rangeDays],
  )

  const barTitle = (b: DensityBucket) => `${fmt.format(b.date)} · ${nf.format(b.count)}`

  // Règle : libellés seuls (pas de trait), `.mt-eyebrow` = mono 10 px `ink-muted`,
  // capitales, `nowrap` — le plus petit pas typographique mono du DS (la maquette dit
  // 9 px ; l'échelle `--text-*` commence à 13 px). `aria-hidden` : information
  // visuelle, la plage est exposée par l'en-tête et le slider.
  const ruler = (
    <div
      className="relative h-4.5 shrink-0"
      aria-hidden="true"
      data-testid="dashboard-density-ruler"
    >
      {ticks.map((tick) => (
        <span
          key={tick.day}
          className={cn('mt-eyebrow absolute top-1', ANCHOR_CLASS[tick.anchor])}
          style={{ left: `${tick.pct}%` }}
          data-testid="dashboard-density-tick"
        >
          {tick.day === 0 ? t('today') : fmt.format(addCalendarDays(from, tick.day))}
        </span>
      ))}
    </div>
  )

  return (
    <section
      className="bg-surface border-rule flex flex-col gap-2 rounded-lg border p-4"
      data-testid="dashboard-density-ribbon"
      aria-label={t('label', { days: rangeDays })}
    >
      {/* #575 — Ce `<span>` eyebrow était le SEUL intitulé de la section : le ruban
          n'avait aucun titre. La maquette le nomme « Aperçu de la frise » (display
          gras) : on restaure un `h2` et on garde l'eyebrow AU-DESSUS, motif de
          `GreetingHeader`, parce qu'il porte une information (la fenêtre en jours).
          L'eyebrow passe par `.mt-eyebrow` (DS i18n.css §2 : 10px, `ink-muted`,
          espacement détendu en allemand) — aucune utilitaire de taille/couleur à
          côté : la classe est HORS layer et les battrait.
          `flex-wrap` : en `de` à 375 px, titre + plage ne tiennent pas sur une
          ligne ; la plage passe dessous plutôt que de déborder le ruban. */}
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="mt-eyebrow" data-testid="dashboard-density-eyebrow">
            {t('eyebrow', { days: rangeDays })}
          </p>
          <h2
            className="text-ink font-display text-sm font-semibold"
            data-testid="dashboard-density-title"
          >
            {t('title')}
          </h2>
        </div>
        {/* #624 — « Ouvrir la frise » : le ruban est l'APERÇU compact de la frise
            (handoff), l'écran dédié `/timeline` en est le détail. Le lien vit DANS
            la rangée d'en-tête, pas dans une rangée à lui : `size="sm"` (32 px) tient
            dans la hauteur eyebrow + titre, donc aucun titre de section du dashboard
            ne descend sous la ligne de flottaison à 1280×800
            (`e2e/sprint-84-section-titles.spec.ts`). `flex-wrap` : en `de` à 375 px,
            plage et lien passent dessous plutôt que de déborder. Rendu seulement si
            `timelineHref` est fourni : le composant reste utilisable sans navigation.
            #754 — sous 768 px la zone TACTILE passe à 44×44 par pseudo-élément
            (`TOUCH_TARGET_HITBOX`) : la boîte visible, donc la flottaison, ne bouge pas. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {/* #623 — « Fenêtre · {plage} » : suit le viewport (desktop) ou montre la
              fenêtre complète (scrollable). Reste le 1er `span.font-mono` du ruban :
              `sprint-84-section-titles` y lit la police mono de référence. */}
          <span className="text-ink-muted text-2xs font-mono" data-testid="dashboard-density-range">
            {t('window', { range: shownRange })}
          </span>
          {timelineHref && (
            <Button asChild variant="outline" size="sm" className={TOUCH_TARGET_HITBOX}>
              <Link href={timelineHref} data-testid="dashboard-open-timeline">
                <span>{t('openTimeline')}</span>
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      </div>
      {/* #623 — Budget vertical INCHANGÉ : règle (18 px) + marge (4 px) + barres
          tiennent dans l'ancien `h-24` (96 px) des seules barres, pour que la carte ne
          grandisse pas à 1280×800 (`sprint-84-section-titles`, `sprint-108-density-ribbon`). */}
      {scrollable ? (
        // Rail scrollable-x : barres à largeur mini fixe, indicateur de scroll
        // (dégradé de bord droit + hint texte). Pas de scroll horizontal caché.
        // La règle est DANS le rail : elle défile avec les barres.
        <div className="relative">
          <div
            className="scrollbar-none flex h-24 overflow-x-auto pr-6"
            role="img"
            aria-label={t('label', { days: rangeDays })}
            data-testid="dashboard-density-ribbon-scroll"
          >
            <div
              className="flex h-full shrink-0 flex-col"
              style={{ width: `${rangeDays * minBarWidth + Math.max(0, rangeDays - 1)}px` }}
            >
              {ruler}
              <div
                className="mt-1 flex min-h-0 flex-1 items-end gap-px"
                data-testid="dashboard-density-track"
              >
                {buckets.map((b, i) => (
                  <Bar
                    key={i}
                    bucket={b}
                    title={barTitle(b)}
                    className="shrink-0"
                    style={{ width: `${minBarWidth}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
          {/* Dégradé de bord droit = indicateur visuel « il reste du contenu ». */}
          <div
            className="from-surface pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l to-transparent"
            aria-hidden="true"
          />
          <span className="text-ink-muted text-2xs mt-1 flex items-center justify-end gap-1 font-mono">
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            {tm('scrollHint')}
          </span>
        </div>
      ) : (
        <div className="flex h-24 flex-col" data-testid="dashboard-density-plot">
          {ruler}
          {/* Piste : les barres (`role="img"`) et le viewport sont FRÈRES — un
              contrôle placé DANS un `role="img"` serait présentationnel. */}
          <div
            ref={trackRef}
            className="relative mt-1 min-h-0 flex-1"
            data-testid="dashboard-density-track"
          >
            <div
              className="flex h-full items-end gap-px"
              role="img"
              aria-label={t('label', { days: rangeDays })}
            >
              {buckets.map((b, i) => (
                <Bar key={i} bucket={b} title={barTitle(b)} className="flex-1" />
              ))}
            </div>
            {vpDays > 0 && (
              // Viewport (maquette) : bord 1,5 px `accent` (contraste non textuel
              // ≥ 3:1, 1.4.11), fond accent ~9 %, déborde la piste de 4 px en haut et
              // en bas. `touch-none` sur LUI SEUL : le toucher le fait glisser sans
              // bloquer le défilement de la page ailleurs. Focus : contour DS global
              // (`:focus-visible`, `@layer base`), aucune classe `outline-*` ici.
              <div
                role="slider"
                tabIndex={0}
                aria-label={t('viewport', { days: vpDays })}
                aria-valuemin={0}
                aria-valuemax={vpMax}
                aria-valuenow={startDay}
                aria-valuetext={formatDays(startDay, startDay + vpDays)}
                aria-orientation="horizontal"
                className={cn(
                  'border-accent bg-accent/9 absolute -top-1 -bottom-1 z-10 touch-none rounded-sm border-[1.5px] select-none',
                  dragging ? 'cursor-grabbing' : 'cursor-grab',
                )}
                style={{
                  left: `${dayToPct(start, rangeDays)}%`,
                  width: `${dayToPct(vpDays, rangeDays)}%`,
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onLostPointerCapture={endDrag}
                onKeyDown={onKeyDown}
                data-testid="dashboard-density-viewport"
                data-dragging={dragging ? 'true' : undefined}
              />
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default DensityRibbon
