import { render } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import { DensityRibbon } from './DensityRibbon'
import dashboardMessages from '../../../public/locales/fr/dashboard.json'

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
      <DensityRibbon events={[evt('a', '2026-07-15')]} now={NOW} locale="fr" rangeDays={30} {...props} />
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
