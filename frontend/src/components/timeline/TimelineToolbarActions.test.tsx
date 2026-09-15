import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import frDashboard from '../../../public/locales/fr/dashboard.json'
import enDashboard from '../../../public/locales/en/dashboard.json'
import esDashboard from '../../../public/locales/es/dashboard.json'
import deDashboard from '../../../public/locales/de/dashboard.json'
import frCommon from '../../../public/locales/fr/common.json'
import enCommon from '../../../public/locales/en/common.json'
import esCommon from '../../../public/locales/es/common.json'
import deCommon from '../../../public/locales/de/common.json'
import frShell from '../../../public/locales/fr/shell.json'
import enShell from '../../../public/locales/en/shell.json'
import esShell from '../../../public/locales/es/shell.json'
import deShell from '../../../public/locales/de/shell.json'
import type { FullCalendarEvent } from '@/types/event'
import { CreateEventProvider } from '@/components/layout/CreateEventContext'
import type { Resource } from './lib'
import { TimelineView } from './TimelineView'

/**
 * #602 — Boutons « Aujourd'hui » / « Nouvel événement » de la barre d'outils
 * `screen`, rendus avec les VRAIS messages des 4 locales (PIT-S63-006) : le mock
 * `${ns}.${key}` de `TimelineView.test.tsx` rendrait un namespace faux (le bouton
 * lit `shell.newEvent` depuis la frise, dont tout le reste vit sous `dashboard`)
 * indiscernable d'un juste. `onError` collecte toute `IntlError` : la liste doit
 * rester vide.
 */

const MESSAGES = {
  fr: { dashboard: frDashboard, common: frCommon, shell: frShell },
  en: { dashboard: enDashboard, common: enCommon, shell: enShell },
  es: { dashboard: esDashboard, common: esCommon, shell: esShell },
  de: { dashboard: deDashboard, common: deCommon, shell: deShell },
}
type Locale = keyof typeof MESSAGES

beforeEach(() => {
  Element.prototype.requestFullscreen = vi.fn().mockResolvedValue(undefined)
  document.exitFullscreen = vi.fn().mockResolvedValue(undefined)
})

const EVENTS: FullCalendarEvent[] = [
  {
    id: 'e1',
    title: 'Event e1',
    start: '2026-07-10',
    end: '2026-07-10',
    allDay: true,
    resourceId: 'p1',
    color: '#3B62D4',
    extendedProps: { productId: 'p1', productName: 'Prod 1', category: 'Cat A', type: 'single' },
  },
]
const RESOURCES: Resource[] = [{ id: 'p1', title: 'Prod 1', category: 'Cat A' }]

function renderToolbar(locale: Locale) {
  const errors: string[] = []
  render(
    <NextIntlClientProvider
      locale={locale}
      timeZone="Europe/Paris"
      messages={MESSAGES[locale]}
      onError={(error) => errors.push(error.message)}
    >
      <CreateEventProvider onOpenCreate={vi.fn()}>
        <TimelineView
          events={EVENTS}
          resources={RESOURCES}
          locale="fr-FR"
          today={new Date(2026, 6, 15)}
          layout="screen"
        />
      </CreateEventProvider>
    </NextIntlClientProvider>,
  )
  return errors
}

describe('#602 — libellés traduits des boutons de la barre d’outils', () => {
  const CASES: [Locale, string, string][] = [
    ['fr', "Aujourd'hui", 'Nouvel événement'],
    ['en', 'Today', 'New event'],
    ['es', 'Hoy', 'Nuevo evento'],
    ['de', 'Heute', 'Neues Ereignis'],
  ]

  it.each(CASES)('%s : « %s » et « %s », aucune erreur i18n', (locale, today, create) => {
    const errors = renderToolbar(locale)
    expect(screen.getByTestId('timeline-today-button')).toHaveAccessibleName(today)
    expect(screen.getByTestId('timeline-new-event')).toHaveAccessibleName(create)
    expect(errors).toEqual([])
  })
})
