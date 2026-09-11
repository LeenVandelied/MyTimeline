import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'

import { EVENT_PALETTE, type EventPaletteRole } from '@/lib/event-palette'
import { PaletteColorPicker, type PaletteColorPickerProps } from './palette-color-picker'
import frCategories from '../../../public/locales/fr/categories.json'
import enCategories from '../../../public/locales/en/categories.json'
import deCategories from '../../../public/locales/de/categories.json'
import esCategories from '../../../public/locales/es/categories.json'

/**
 * #577 — `PaletteColorPicker` rendu SANS mock : vrai `PopoverPicker` (Radix), vrais
 * messages next-intl (4 locales) avec collecteur `onError` — les clés
 * `roles.<role>` sont DYNAMIQUES, aucune analyse statique ne les vérifie
 * (motif `DeleteConfirmDialog.intl.test.tsx`, #441).
 *
 * ⚠ CE QUE CES TESTS NE PROUVENT PAS : la couleur peinte (jsdom ne résout pas
 * `var(--evt-*)`) ni le contour de focus. Cf. E2E `sprint-73-model-vs-rendered`
 * et `sprint-84-palette`.
 */

/**
 * Hex d'un rôle, lu dans le miroir : ce fichier ne recopie PAS la palette (le
 * fil-piège de `event-palette.test.ts` refuse toute liste de ≥ 6 couleurs).
 */
const hexOf = (role: EventPaletteRole): string => {
  const entry = EVENT_PALETTE.find((e) => e.role === role)
  if (!entry) throw new Error(`rôle ${role} absent de EVENT_PALETTE`)
  return entry.hex
}
const RED = hexOf('red')
const ORANGE = hexOf('orange')
const TEAL = hexOf('teal')
const COBALT = hexOf('cobalt')
const ORCHID = hexOf('orchid')
const GRAPHITE = hexOf('graphite')

const MESSAGES = {
  fr: frCategories,
  en: enCategories,
  de: deCategories,
  es: esCategories,
} as const

type Locale = keyof typeof MESSAGES

function renderPicker(props: Partial<PaletteColorPickerProps> = {}, locale: Locale = 'fr') {
  const errors: string[] = []
  const onChange = vi.fn()
  const utils = render(
    <NextIntlClientProvider
      locale={locale}
      timeZone="Europe/Paris"
      messages={{ categories: MESSAGES[locale] }}
      onError={(error) => errors.push(error.message)}
    >
      <PaletteColorPicker
        value={null}
        onChange={onChange}
        label="Couleur"
        testIdPrefix="t"
        {...props}
      />
    </NextIntlClientProvider>,
  )
  return { ...utils, errors, onChange }
}

describe('PaletteColorPicker — i18n réelle (4 locales)', () => {
  it.each(Object.keys(MESSAGES) as Locale[])(
    '%s : 12 noms de rôle + « Personnalisé » traduits, aucune IntlError',
    (locale) => {
      const { errors } = renderPicker({}, locale)
      const roles = MESSAGES[locale].palette.roles
      const names = screen.getAllByRole('radio').map((r) => r.getAttribute('aria-label'))
      expect(names).toEqual(EVENT_PALETTE.map((e) => roles[e.role]))
      expect(screen.getByTestId('t-color-custom')).toHaveTextContent(
        MESSAGES[locale].palette.custom,
      )
      expect(errors).toEqual([])
    },
  )
})

describe('PaletteColorPicker — état et non-réécriture (DEC-S84-001)', () => {
  it('valeur vide : rien de coché, « Personnalisé » inactif, rien émis', () => {
    const { onChange } = renderPicker({ value: '' })
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toHaveAttribute('aria-checked', 'false')
    }
    expect(screen.getByTestId('t-color-custom')).toHaveAttribute('aria-pressed', 'false')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('valeur de la palette (casse quelconque) : SA pastille cochée, et elle seule', () => {
    renderPicker({ value: COBALT.toLowerCase() })
    const checked = screen
      .getAllByRole('radio')
      .filter((r) => r.getAttribute('aria-checked') === 'true')
    expect(checked.map((r) => r.getAttribute('data-testid'))).toEqual([`t-swatch-${COBALT}`])
    expect(screen.getByTestId('t-color-custom')).toHaveAttribute('aria-pressed', 'false')
  })

  it('valeur hors palette : « Personnalisé » actif, AUCUN onChange au montage', () => {
    const { onChange } = renderPicker({ value: '#E5691E' })
    expect(screen.getByTestId('t-color-custom')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('clic sur une pastille : émet le hex CANONIQUE de la palette', async () => {
    const user = userEvent.setup()
    const { onChange } = renderPicker()
    await user.click(screen.getByTestId(`t-swatch-${ORCHID}`))
    expect(onChange).toHaveBeenCalledExactlyOnceWith(ORCHID)
  })

  it('« Personnalisé » ouvre le picker libre (popover Radix réel)', async () => {
    const user = userEvent.setup()
    renderPicker({ value: '#E5691E' })
    const custom = screen.getByTestId('t-color-custom')
    expect(custom).toHaveAttribute('aria-expanded', 'false')
    await user.click(custom)
    expect(custom).toHaveAttribute('aria-expanded', 'true')
    // `react-colorful` expose un slider ARIA par dimension (teinte, saturation).
    expect(screen.getAllByRole('slider').length).toBeGreaterThan(0)
  })

  it('disabled : 12 pastilles ET « Personnalisé » inertes', async () => {
    const user = userEvent.setup()
    const { onChange } = renderPicker({ value: '#E5691E', disabled: true })
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
    const custom = screen.getByTestId('t-color-custom')
    expect(custom).toBeDisabled()
    await user.click(custom)
    expect(screen.queryAllByRole('slider')).toHaveLength(0)
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('PaletteColorPicker — clavier (radiogroup APG)', () => {
  it('un seul arrêt de tabulation : la pastille cochée', () => {
    renderPicker({ value: TEAL })
    const tabbable = screen.getAllByRole('radio').filter((r) => r.tabIndex === 0)
    expect(tabbable.map((r) => r.getAttribute('data-testid'))).toEqual([`t-swatch-${TEAL}`])
  })

  it('sans pastille cochée (vide ou personnalisé) : la première porte l’arrêt', () => {
    renderPicker({ value: '#123456' })
    const tabbable = screen.getAllByRole('radio').filter((r) => r.tabIndex === 0)
    expect(tabbable.map((r) => r.getAttribute('data-testid'))).toEqual([`t-swatch-${RED}`])
  })

  it('flèches : déplacent le focus ET sélectionnent, avec bouclage', async () => {
    const user = userEvent.setup()
    const { onChange } = renderPicker({ value: RED })
    screen.getByTestId(`t-swatch-${RED}`).focus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByTestId(`t-swatch-${ORANGE}`)).toHaveFocus()
    expect(onChange).toHaveBeenLastCalledWith(ORANGE)

    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    // Bouclage : depuis la 2e, deux crans à gauche → la dernière (graphite).
    expect(screen.getByTestId(`t-swatch-${GRAPHITE}`)).toHaveFocus()
    expect(onChange).toHaveBeenLastCalledWith(GRAPHITE)

    await user.keyboard('{Home}')
    expect(screen.getByTestId(`t-swatch-${RED}`)).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByTestId(`t-swatch-${GRAPHITE}`)).toHaveFocus()
  })

  it('Tab sort du groupe vers « Personnalisé » (bouton hors radiogroup)', async () => {
    const user = userEvent.setup()
    renderPicker({ value: RED })
    screen.getByTestId(`t-swatch-${RED}`).focus()
    await user.tab()
    expect(screen.getByTestId('t-color-custom')).toHaveFocus()
  })
})
