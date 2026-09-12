import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ComponentProps } from 'react'
import { describe, expect, it } from 'vitest'

import frProducts from '../../../public/locales/fr/products.json'
import enProducts from '../../../public/locales/en/products.json'
import esProducts from '../../../public/locales/es/products.json'
import deProducts from '../../../public/locales/de/products.json'
import { EventCategoryField } from './EventCategoryField'

/**
 * #617 — Champ Catégorie (lecture seule, DEC-S86-001) rendu avec les VRAIS messages
 * (PIT-S63-006) : un mock `${ns}.${key}` rendrait un namespace faux indiscernable d'un
 * juste. `onError` collecte toute `IntlError` (clé ou namespace manquant).
 */

const MESSAGES = { fr: frProducts, en: enProducts, es: esProducts, de: deProducts }
type Locale = keyof typeof MESSAGES

function renderField(
  props: Partial<ComponentProps<typeof EventCategoryField>> = {},
  locale: Locale = 'fr',
) {
  const errors: string[] = []
  const utils = render(
    <NextIntlClientProvider
      locale={locale}
      timeZone="Europe/Paris"
      messages={{ products: MESSAGES[locale] }}
      onError={(error) => errors.push(error.message)}
    >
      <EventCategoryField name="Véhicules" color="#3E8BD6" testId="cat-field" {...props} />
    </NextIntlClientProvider>,
  )
  return { ...utils, errors }
}

describe('EventCategoryField (#617)', () => {
  it('rend un groupe étiqueté « Catégorie » portant le nom de la catégorie', () => {
    const { errors } = renderField()
    const group = screen.getByRole('group', { name: 'Catégorie' })
    expect(group).toHaveTextContent('Véhicules')
    expect(group).toHaveAttribute('data-empty', 'false')
    expect(errors).toEqual([])
  })

  it('pastille : couleur du DTO posée telle quelle (aplat + filet)', () => {
    renderField({ color: '#3E8BD6' })
    const swatch = screen.getByTestId('cat-field-swatch')
    expect(swatch).toHaveAttribute('data-color', 'set')
    expect(swatch).toHaveAttribute('aria-hidden', 'true')
    expect(swatch.style.backgroundColor).toBe('rgb(62, 139, 214)')
    expect(swatch.style.borderColor).toBe('rgb(62, 139, 214)')
  })

  it('couleur `null` : AUCUN style inline (le CSS peint le contour neutre, DEC-S85-006)', () => {
    renderField({ color: null })
    const swatch = screen.getByTestId('cat-field-swatch')
    expect(swatch).toHaveAttribute('data-color', 'none')
    expect(swatch.getAttribute('style')).toBeNull()
  })

  it('état vide (création) : invite à choisir un produit, sans pastille', () => {
    const { errors } = renderField({ name: null, color: null })
    const group = screen.getByRole('group', { name: 'Catégorie' })
    expect(group).toHaveTextContent("Choisissez d'abord un produit")
    expect(group).toHaveAttribute('data-empty', 'true')
    expect(screen.queryByTestId('cat-field-swatch')).not.toBeInTheDocument()
    expect(errors).toEqual([])
  })

  it('état vide (édition) : « Catégorie inconnue », jamais « choisissez un produit »', () => {
    renderField({ name: '', color: null, emptyReason: 'unknown' })
    const group = screen.getByRole('group', { name: 'Catégorie' })
    expect(group).toHaveTextContent('Catégorie inconnue')
    expect(group).not.toHaveTextContent("Choisissez d'abord un produit")
  })

  it('ne rend AUCUN élément focalisable (pas de contrôle inerte, PIT-S62-008)', () => {
    const { container } = renderField()
    expect(
      container.querySelectorAll('button, input, select, [tabindex], [role="combobox"]'),
    ).toHaveLength(0)
  })

  it.each(['en', 'es', 'de'] as const)(
    '%s : libellés traduits sans erreur ni retour au FR',
    (locale) => {
      const { errors } = renderField({ name: null, color: null }, locale)
      const label = MESSAGES[locale].eventCategory.label
      const group = screen.getByRole('group', { name: label })
      expect(group).toHaveTextContent(MESSAGES[locale].eventCategory.noProduct)
      expect(label).not.toBe(frProducts.eventCategory.label)
      expect(errors).toEqual([])
    },
  )
})
