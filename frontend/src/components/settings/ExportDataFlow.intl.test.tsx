import { render, screen, cleanup } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { UseExportFlowResult } from '@/hooks/useExportFlow'
import { ExportDataFlow } from './ExportDataFlow'
import frExport from '../../../public/locales/fr/export.json'
import enExport from '../../../public/locales/en/export.json'
import esExport from '../../../public/locales/es/export.json'
import deExport from '../../../public/locales/de/export.json'

/**
 * #518 — Intégration next-intl RÉELLE du message `export.ready.expiresAt`.
 *
 * POURQUOI CE FICHIER EN PLUS DE `ExportDataFlow.test.tsx` : ce dernier mocke
 * `next-intl` (il renvoie `clé:{params}`), donc il ne peut RIEN prouver du passage
 * de `t()` à `t.rich()`. Or #518 a ajouté une balise `<expiry>` aux QUATRE messages
 * pour envelopper la seule date d'un `<time datetime>` sans casser l'ordre des mots
 * (l'allemand place « ab » APRÈS la date). Deux défauts ne se voient qu'ici :
 *  - une balise présente dans un message SANS gestionnaire côté code → next-intl
 *    lève une `IntlError` à chaque rendu (défaut de la famille FU6) ;
 *  - une locale où la balise a été oubliée / réécrite → la date se rend en texte
 *    nu, et l'on perd la sémantique dans CETTE langue seulement.
 *
 * Le `onError` collecteur ET l'assertion sur le `<time>` par locale couvrent les
 * deux. Rien n'est prouvé ici de la TENUE visuelle (jsdom n'applique pas le DS).
 */
const EXPIRES_AT = '2999-01-01T10:00:00'

const MESSAGES = { fr: frExport, en: enExport, es: esExport, de: deExport } as const
const LOCALES = Object.keys(MESSAGES) as Array<keyof typeof MESSAGES>

const readyFlow: UseExportFlowResult = {
  format: 'CSV',
  setFormat: vi.fn(),
  phase: 'ready',
  jobStatus: null,
  completedJob: {
    jobId: 'job-1',
    format: 'CSV',
    status: 'COMPLETED',
    downloadUrl: '/api/export/job-1',
    expiresAt: EXPIRES_AT,
  },
  errorKey: null,
  isBusy: false,
  start: vi.fn(),
  downloadCompleted: vi.fn(),
  reset: vi.fn(),
}

vi.mock('@/hooks/useExportFlow', () => ({
  useExportFlow: () => readyFlow,
}))

afterEach(cleanup)

describe('#518 — `export.ready.expiresAt` rendu par t.rich sur les 4 locales', () => {
  function renderIn(locale: keyof typeof MESSAGES) {
    const errors: string[] = []
    render(
      <NextIntlClientProvider
        locale={locale}
        timeZone="Europe/Paris"
        messages={{ export: MESSAGES[locale] }}
        onError={(error) => errors.push(error.message)}
      >
        <ExportDataFlow />
      </NextIntlClientProvider>,
    )
    return errors
  }

  it.each(LOCALES)('%s : aucune IntlError (la balise <expiry> a son gestionnaire)', (locale) => {
    expect(renderIn(locale)).toEqual([])
  })

  it.each(LOCALES)('%s : la date est balisée <time datetime=instant>', (locale) => {
    renderIn(locale)
    const time = screen.getByTestId('export-expiry').querySelector('time')
    expect(time).not.toBeNull()
    expect(time?.getAttribute('datetime')).toBe(new Date(`${EXPIRES_AT}Z`).toISOString())
    // Le libellé visible reste celui d'`Intl` dans la locale demandée.
    expect((time?.textContent ?? '').length).toBeGreaterThan(0)
  })

  it('la phrase entière reste lisible : la date est DANS le message, pas à côté', () => {
    renderIn('de')
    const p = screen.getByTestId('export-expiry')
    const time = p.querySelector('time')
    // L'allemand postpose « ab » : du texte doit subsister APRÈS le <time>.
    expect(p.textContent?.trimEnd().endsWith(time?.textContent ?? '')).toBe(false)
  })
})
