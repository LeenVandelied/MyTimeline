import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import { DensityRibbon } from './DensityRibbon'
import dashboardMessages from '../../../public/locales/fr/dashboard.json'
import enDashboard from '../../../public/locales/en/dashboard.json'
import esDashboard from '../../../public/locales/es/dashboard.json'
import deDashboard from '../../../public/locales/de/dashboard.json'

/**
 * #FU6 — Régression console : `aria-label={t('label')}` était appelé SANS le
 * paramètre `{days}` alors que la clé `dashboard.density.label` l'exige dans
 * les 4 locales (`"Densité des événements sur {days} jours"`). Résultat :
 * next-intl loggait une `IntlError FORMATTING_ERROR` à CHAQUE rendu du
 * dashboard (observé en dev, Sprint 57 FU6).
 *
 * Le mock `next-intl` de dashboard-components.test.tsx (retourne `ns.key`
 * sans jamais résoudre ni valider les placeholders — cf. son en-tête) ne
 * peut PAS détecter ce genre de bug : ce fichier utilise le VRAI
 * `NextIntlClientProvider` + les VRAIS messages `fr` pour forcer la
 * résolution réelle des `{days}` et capter toute `IntlError` via `onError`.
 */
const NOW = new Date(2026, 6, 15, 9, 0, 0) // mer. 15 juil. 2026, 9h

const evt = (id: string, start: string): FullCalendarEvent => ({
  id,
  title: `Event ${id}`,
  start,
  end: start,
  allDay: true,
  resourceId: 'p1',
  color: '#3E8BD6',
  extendedProps: { productId: 'p1', productName: 'Produit A', category: 'Cat', type: 'single' },
})

function renderWithRealIntl(props: Partial<Parameters<typeof DensityRibbon>[0]> = {}) {
  const errors: string[] = []
  render(
    <NextIntlClientProvider
      locale="fr"
      timeZone="Europe/Paris"
      messages={{ dashboard: dashboardMessages }}
      onError={(error) => errors.push(error.message)}
    >
      <DensityRibbon
        events={[evt('a', '2026-07-15')]}
        now={NOW}
        locale="fr"
        rangeDays={30}
        {...props}
      />
    </NextIntlClientProvider>,
  )
  return errors
}

describe('DensityRibbon — intégration next-intl réelle (anti-régression FU6)', () => {
  it('ne lève aucune IntlError au rendu desktop (tous les t() reçoivent leurs params)', () => {
    expect(renderWithRealIntl()).toEqual([])
  })

  it('ne lève aucune IntlError au rendu mobile scrollable', () => {
    expect(renderWithRealIntl({ scrollable: true })).toEqual([])
  })
})

/**
 * #624 — Lien « Ouvrir la frise ». Rendu avec les VRAIS messages des 4 locales : une
 * clé `dashboard.density.openTimeline` absente d'une locale lève `MISSING_MESSAGE`
 * (capté par `onError`) et afficherait le chemin de clé brut — ce que le mock
 * `ns.key` des autres tests ne peut pas voir.
 */
const LOCALE_MESSAGES = {
  fr: { messages: dashboardMessages, label: 'Ouvrir la frise' },
  en: { messages: enDashboard, label: 'Open timeline' },
  es: { messages: esDashboard, label: 'Abrir la cronología' },
  de: { messages: deDashboard, label: 'Zeitachse öffnen' },
} as const

describe('DensityRibbon — lien « Ouvrir la frise » (#624)', () => {
  it.each(Object.keys(LOCALE_MESSAGES) as (keyof typeof LOCALE_MESSAGES)[])(
    'libellé résolu sans IntlError, href transmis · %s',
    (locale) => {
      const { messages, label } = LOCALE_MESSAGES[locale]
      const errors: string[] = []
      render(
        <NextIntlClientProvider
          locale={locale}
          timeZone="Europe/Paris"
          messages={{ dashboard: messages }}
          onError={(error) => errors.push(error.message)}
        >
          <DensityRibbon
            events={[]}
            now={NOW}
            locale={locale}
            timelineHref={`/${locale}/timeline`}
          />
        </NextIntlClientProvider>,
      )
      expect(errors).toEqual([])
      const link = screen.getByTestId('dashboard-open-timeline')
      expect(link).toHaveAttribute('href', `/${locale}/timeline`)
      expect(link).toHaveTextContent(label)
    },
  )

  it('sans `timelineHref`, aucun lien', () => {
    renderWithRealIntl()
    expect(screen.queryByTestId('dashboard-open-timeline')).not.toBeInTheDocument()
  })
})
