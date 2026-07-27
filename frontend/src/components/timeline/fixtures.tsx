import type { ComponentType } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import type { FullCalendarEvent } from '@/types/event'
import { EventWithComputedPosition, Resource } from './lib'
import { PositionedEvent } from './zoom'
import commonMessages from '../../../public/locales/fr/common.json'
import dashboardMessages from '../../../public/locales/fr/dashboard.json'

/**
 * #47 — Fixtures partagées par les stories Timeline.
 * Données statiques minimales (aucune dépendance runtime) pour rendre les
 * sous-composants isolément en Storybook.
 */

/** Jours factices contigus à partir d'une base fixe (rendu déterministe). */
export function makeDays(count: number, base = new Date(2026, 6, 1)): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    return d
  })
}

export const sampleResource: Resource = {
  id: 'prod-1',
  title: 'Lait entier bio',
  category: 'Produits frais',
}

/** Event factice positionné + statut, sans passer par `buildEventsByResource`. */
export function makeEvent(
  overrides: Partial<EventWithComputedPosition> = {},
): EventWithComputedPosition {
  return {
    id: 'evt-1',
    title: 'Péremption',
    start: '2026-07-05T00:00:00.000Z',
    end: '2026-07-10T00:00:00.000Z',
    allDay: true,
    resourceId: 'prod-1',
    color: '#6366f1',
    extendedProps: {
      productId: 'prod-1',
      productName: 'Lait entier bio',
      category: 'Produits frais',
      type: 'duration',
    },
    leftPercent: 12,
    widthPercent: 18,
    status: 'upcoming',
    ...overrides,
  }
}

/**
 * #192 — Event positionné en px (échelle de la frise continue #55), sans passer
 * par `positionEvents`. Sert aux stories/tests d'`EventPill`.
 */
export function makePositionedEvent(overrides: Partial<PositionedEvent> = {}): PositionedEvent {
  return {
    id: 'evt-1',
    title: 'Péremption',
    start: '2026-07-05T00:00:00.000Z',
    end: '2026-07-10T00:00:00.000Z',
    allDay: true,
    resourceId: 'prod-1',
    color: '#6366f1',
    extendedProps: {
      productId: 'prod-1',
      productName: 'Lait entier bio',
      category: 'Produits frais',
      type: 'duration',
    },
    leftPx: 40,
    widthPx: 120,
    status: 'upcoming',
    ...overrides,
  }
}

/**
 * Stub de contenu d'EventBar pour Storybook : évite les dépendances next-intl /
 * auth / services de `EventContent`. Reproduit l'aspect compact (titre tronqué).
 */
export function stubEventContent(event: EventWithComputedPosition) {
  return (
    <span className="text-ink block truncate px-2 py-1 text-xs font-medium">{event.title}</span>
  )
}

/* -------------------------------------------------------------------------- */
/* #205 — Fixtures des vues mobiles (portrait #63 / paysage #64)               */
/* -------------------------------------------------------------------------- */

/**
 * Les vues mobiles consomment des `FullCalendarEvent` BRUTS (elles positionnent
 * elles-mêmes via `useTimelineMobileState` → `positionEvents`), contrairement à
 * `EventBar`/`EventPill` qui reçoivent des events DÉJÀ positionnés. D'où un jeu
 * de fixtures distinct de `makeEvent`/`makePositionedEvent` ci-dessus.
 */

/** « Aujourd'hui » figé : rend les statuts (expiré/en cours/à venir) déterministes. */
export const STORY_TODAY = new Date(2026, 6, 15)

/** Locale de formatage des règles/dates dans les stories. */
export const STORY_LOCALE = 'fr-FR'

/** Trois events couvrant les trois statuts, sur deux catégories. */
export const mobileEvents: FullCalendarEvent[] = [
  {
    id: 'evt-ongoing',
    title: 'Péremption lait entier bio (titre long à tronquer)',
    start: '2026-07-10',
    end: '2026-07-20',
    allDay: true,
    resourceId: 'prod-1',
    color: '#3B62D4',
    extendedProps: {
      productId: 'prod-1',
      productName: 'Lait entier bio',
      category: 'Produits frais',
      type: 'duration',
    },
  },
  {
    id: 'evt-expired',
    title: 'Retrait yaourts',
    start: '2026-07-01',
    end: '2026-07-05',
    allDay: true,
    resourceId: 'prod-2',
    color: '#C2410C',
    extendedProps: {
      productId: 'prod-2',
      productName: 'Yaourts nature',
      category: 'Produits frais',
      type: 'duration',
    },
  },
  {
    id: 'evt-upcoming',
    title: 'Livraison pain',
    start: '2026-07-22',
    end: '2026-07-22',
    allDay: true,
    resourceId: 'prod-3',
    color: '#4FA459',
    extendedProps: {
      productId: 'prod-3',
      productName: 'Pain de campagne',
      category: 'Boulangerie',
      type: 'single',
    },
  },
]

/** Une lane par produit, groupées en deux catégories (rend les `timeline-group`). */
export const mobileResources: Resource[] = [
  { id: 'prod-1', title: 'Lait entier bio', category: 'Produits frais' },
  { id: 'prod-2', title: 'Yaourts nature', category: 'Produits frais' },
  { id: 'prod-3', title: 'Pain de campagne', category: 'Boulangerie' },
]

/**
 * Décorateur i18n des stories Timeline mobiles.
 *
 * Contrairement à `EventBar`/`EventPill` (isolés de next-intl par
 * `stubEventContent`), `TimelineMobilePortrait`/`Landscape` appellent
 * `useTranslations()` SANS namespace et lisent des clés pleinement qualifiées
 * (`dashboard.timeline.zoom.*`, `common.buttons.today`…). Sans provider, la
 * story crashe au montage.
 *
 * Les messages sont les VRAIS fichiers de `public/locales/fr/` (mêmes namespaces
 * que `i18n.ts`, qui indexe par nom de fichier) : une clé renommée casse la story,
 * ce qui est le comportement voulu. `timeZone` figé → rendu déterministe.
 */
export function withTimelineIntl(Story: ComponentType) {
  return (
    <NextIntlClientProvider
      locale="fr"
      timeZone="Europe/Paris"
      messages={{ common: commonMessages, dashboard: dashboardMessages }}
    >
      <Story />
    </NextIntlClientProvider>
  )
}
