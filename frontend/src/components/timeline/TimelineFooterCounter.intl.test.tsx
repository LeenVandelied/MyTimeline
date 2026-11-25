import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import type { Resource } from './lib'
import TimelineView from './TimelineView'
import frCommon from '../../../public/locales/fr/common.json'
import enCommon from '../../../public/locales/en/common.json'
import deCommon from '../../../public/locales/de/common.json'
import esCommon from '../../../public/locales/es/common.json'
import frDashboard from '../../../public/locales/fr/dashboard.json'
import enDashboard from '../../../public/locales/en/dashboard.json'
import deDashboard from '../../../public/locales/de/dashboard.json'
import esDashboard from '../../../public/locales/es/dashboard.json'
import frShell from '../../../public/locales/fr/shell.json'
import enShell from '../../../public/locales/en/shell.json'
import deShell from '../../../public/locales/de/shell.json'
import esShell from '../../../public/locales/es/shell.json'

/**
 * #673 — Compteur du pied de frise avec les VRAIS messages des quatre langues. Le mock
 * `next-intl` de `TimelineView.test.tsx` ne rend que le français : un pluriel ICU faux
 * en de, en ou es (catégories de pluriel, `#` absent) n'y serait pas vu. Ici le vrai
 * `NextIntlClientProvider` résout le message et `onError` collecte toute erreur d'intl.
 */
const MESSAGES = {
  fr: { common: frCommon, dashboard: frDashboard, shell: frShell },
  en: { common: enCommon, dashboard: enDashboard, shell: enShell },
  de: { common: deCommon, dashboard: deDashboard, shell: deShell },
  es: { common: esCommon, dashboard: esDashboard, shell: esShell },
}

const mk = (
  id: string,
  resourceId: string,
  category: string,
  start: string,
): FullCalendarEvent => ({
  id,
  title: `Event ${id}`,
  start,
  end: start,
  allDay: true,
  resourceId,
  color: '#3B62D4',
  extendedProps: { productId: resourceId, productName: resourceId, category, type: 'single' },
})

const ONE: [FullCalendarEvent[], Resource[]] = [
  [mk('a1', 'pa', 'Cat A', '2026-07-10')],
  [{ id: 'pa', title: 'Prod A', category: 'Cat A' }],
]
const MANY: [FullCalendarEvent[], Resource[]] = [
  [
    mk('a1', 'pa', 'Cat A', '2026-07-10'),
    mk('a2', 'pa', 'Cat A', '2026-07-11'),
    mk('b1', 'pb', 'Cat B', '2026-07-18'),
  ],
  [
    { id: 'pa', title: 'Prod A', category: 'Cat A' },
    { id: 'pb', title: 'Prod B', category: 'Cat B' },
  ],
]

// Libellés attendus : un événement et un produit, puis 3 événements et 2 produits.
const EXPECTED: Record<keyof typeof MESSAGES, { one: string; many: string }> = {
  fr: { one: '1 événement · 1 produit', many: '3 événements · 2 produits' },
  en: { one: '1 event · 1 product', many: '3 events · 2 products' },
  de: { one: '1 Ereignis · 1 Produkt', many: '3 Ereignisse · 2 Produkte' },
  es: { one: '1 evento · 1 producto', many: '3 eventos · 2 productos' },
}

function renderCounter(locale: keyof typeof MESSAGES, [events, resources]: typeof ONE) {
  const errors: string[] = []
  render(
    <NextIntlClientProvider
      locale={locale}
      timeZone="Europe/Paris"
      messages={MESSAGES[locale]}
      onError={(error) => errors.push(error.message)}
    >
      <TimelineView
        events={events}
        resources={resources}
        locale={locale}
        today={new Date(2026, 6, 15)}
        layout="screen"
      />
    </NextIntlClientProvider>,
  )
  return { errors, text: screen.getByTestId('timeline-footer-counter').textContent?.trim() }
}

describe('#673 compteur du pied : vrais messages des quatre langues', () => {
  for (const locale of Object.keys(MESSAGES) as (keyof typeof MESSAGES)[]) {
    it(`${locale}: singular and plural forms, no intl error`, () => {
      const one = renderCounter(locale, ONE)
      expect(one.text).toBe(EXPECTED[locale].one)
      expect(one.errors).toEqual([])
    })

    it(`${locale}: plural forms for several events and products`, () => {
      const many = renderCounter(locale, MANY)
      expect(many.text).toBe(EXPECTED[locale].many)
      expect(many.errors).toEqual([])
    })
  }
})
