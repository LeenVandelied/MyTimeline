import { describe, expect, it } from 'vitest'
import { DEFAULT_COLOR, type FullCalendarEvent } from '@/types/event'
import { contrastRatio, INK_DARK, INK_LIGHT, WCAG_AA_NORMAL } from '@/lib/color'
import {
  buildEventAriaLabel,
  eventInkColor,
  eventLabelReadableInside,
  renderedEventColor,
} from './lib'

/**
 * #81 — Tests des helpers a11y purs (aria-label agrégé + garde-fou contraste).
 * `t` mocké renvoie la clé (assertions locale-agnostiques).
 */
const t = (k: string) => k

function evt(
  overrides: Partial<FullCalendarEvent> = {},
): FullCalendarEvent & { status: 'upcoming' } {
  return {
    id: 'e1',
    title: 'Péremption lait',
    start: '2026-07-10',
    end: '2026-07-14',
    allDay: true,
    resourceId: 'p1',
    color: '#3B62D4',
    status: 'upcoming',
    extendedProps: {
      productId: 'p1',
      productName: 'Lait bio',
      category: 'Frais',
      type: 'duration',
    },
    ...overrides,
  } as FullCalendarEvent & { status: 'upcoming' }
}

describe('buildEventAriaLabel', () => {
  it('agrège titre + statut + dates + produit en UNE phrase (séparée par des virgules)', () => {
    const label = buildEventAriaLabel(evt(), 'fr-FR', t)
    expect(label).toContain('Péremption lait')
    expect(label).toContain('dashboard.timeline.status.upcoming')
    expect(label).toContain('Lait bio')
    // Une seule chaîne, virgules comme séparateurs (annonce unique).
    expect(label.split(', ').length).toBeGreaterThanOrEqual(4)
  })

  // #230 (WCAG 1.4.1) — le grisage d'un archivé est une info portée par la couleur :
  // elle DOIT aussi être annoncée textuellement, sinon elle n'existe pas au lecteur
  // d'écran. Ce helper est partagé desktop + mobile portrait + mobile paysage → une
  // seule assertion couvre les trois surfaces.
  it('#230 — annonce l’état ARCHIVÉ, juste après le statut temporel', () => {
    const label = buildEventAriaLabel(
      evt({
        extendedProps: {
          productId: 'p1',
          productName: 'Lait bio',
          category: 'Frais',
          type: 'duration',
          archived: true,
        },
      }),
      'fr-FR',
      t,
    )
    expect(label).toContain('dashboard.timeline.archived')
    const parts = label.split(', ')
    expect(parts.indexOf('dashboard.timeline.archived')).toBe(
      parts.indexOf('dashboard.timeline.status.upcoming') + 1,
    )
  })

  it('#230 — n’annonce PAS « archivé » sur un event actif', () => {
    expect(buildEventAriaLabel(evt(), 'fr-FR', t)).not.toContain('timeline.archived')
  })

  it('ajoute le statut de récurrence quand isRecurring + recurrenceUnit (BR-EVE-006)', () => {
    const label = buildEventAriaLabel(
      evt({
        extendedProps: {
          productId: 'p1',
          productName: 'Lait bio',
          category: 'Frais',
          type: 'duration',
          isRecurring: true,
          recurrenceUnit: 'WEEK',
        },
      }),
      'fr-FR',
      t,
    )
    expect(label).toContain('dashboard.timeline.recurrence.week')
  })

  it('n’annonce PAS la récurrence si isRecurring absent/false', () => {
    const label = buildEventAriaLabel(evt(), 'fr-FR', t)
    expect(label).not.toContain('recurrence')
  })

  it('n’annonce PAS la récurrence si recurrenceUnit manque (isRecurring seul)', () => {
    const label = buildEventAriaLabel(
      evt({
        extendedProps: {
          productId: 'p1',
          productName: 'Lait bio',
          category: 'Frais',
          type: 'duration',
          isRecurring: true,
          recurrenceUnit: null,
        },
      }),
      'fr-FR',
      t,
    )
    expect(label).not.toContain('recurrence')
  })
})

describe('eventLabelReadableInside (garde-fou contraste, point 6)', () => {
  it('fond foncé → encre claire lisible dedans (true)', () => {
    expect(eventLabelReadableInside('#0B0C0E')).toBe(true)
  })

  it('citron #A7B83A → encre noire lisible dedans (8.91:1, true, pas de fallback)', () => {
    // Le helper choisit la MEILLEURE encre : noir passe largement AA sur ce ton clair.
    expect(eventLabelReadableInside('#A7B83A')).toBe(true)
  })

  it('indigo #6366f1 → aucune encre n’atteint 4.5:1 (4.47, false → libellé dehors)', () => {
    // Échantillon de couleur NON conforme : ni noir ni blanc ne passe AA sur ce ton,
    // d'où le libellé de secours À L'EXTÉRIEUR de la barre. #393 : ce hex a CESSÉ
    // d'être la couleur event par défaut (c'était précisément le bug — l'état normal
    // était le pire cas) ; il reste un excellent cas de test du fallback.
    expect(eventLabelReadableInside('#6366f1')).toBe(false)
  })

  // #393 — FILET ANTI-RÉGRESSION : la couleur event par défaut doit rester lisible
  // DEDANS. Porte sur la constante IMPORTÉE (pas un littéral recopié) → rougit si
  // quelqu'un remet un jour un `DEFAULT_COLOR` sous 4.5:1.
  it('DEFAULT_COLOR → lisible DEDANS (AA franchi, pas de libellé dehors)', () => {
    expect(eventLabelReadableInside(DEFAULT_COLOR)).toBe(true)
  })

  it('couleur absente → considéré lisible (theming DS, true)', () => {
    expect(eventLabelReadableInside(undefined)).toBe(true)
    expect(eventLabelReadableInside(null)).toBe(true)
  })
})

/**
 * #230 (correction review S61) — L'ÉTAT ARCHIVÉ entre dans le calcul de contraste.
 *
 * Défaut corrigé : `.mt-tlv__evt--archived` pose `filter: grayscale(1)`, mais
 * encre et garde-fou raisonnaient sur la couleur d'ORIGINE. Comme `grayscale()`
 * pondère les canaux GAMMA-ENCODÉS, le fond peint est plus SOMBRE que ne le
 * laisse croire la luminance d'origine, et l'encre noire — point fixe du filtre
 * — restait en place : ~8 % des couleurs hex passaient AA avant grisage et
 * échouaient après (`#0070F8` : 4.67 → 3.44).
 */
describe('#230 garde-fou contraste vs état ARCHIVÉ (grisage DS)', () => {
  /**
   * Deux couleurs MESURÉES contre l'encre réelle de la charte (`INK_DARK`
   * = `#0B0C0E`, PAS du noir pur — cette nuance déplace les seuils).
   *
   * `RESCUED` : l'encre foncée figée tombait à 3.51:1 sur le gris peint ;
   *   recalculée sur ce gris, elle passe au blanc et remonte à 5.57:1.
   * `FALLBACK` : même recalculée, AUCUNE encre n'atteint 4.5:1 sur son gris
   *   (`#777777`, meilleur ratio 4.48) → c'est là que le repli « libellé à
   *   l'extérieur » doit se déclencher, ce qu'il ne faisait pas avant.
   */
  const RESCUED = '#0078F8'
  const FALLBACK = '#008DFF'

  it('la couleur rendue d’un archivé est le gris du filtre, celle d’un actif est intacte', () => {
    expect(renderedEventColor(RESCUED, true)).toBe('#686868')
    expect(renderedEventColor(RESCUED, false)).toBe(RESCUED)
  })

  it(`${RESCUED} ARCHIVÉ : l’encre figée échouait à 3.51:1, recalculée elle passe`, () => {
    // Constat du défaut : l'encre choisie sur la couleur d'ORIGINE est foncée
    // et ne tient plus sur le gris effectivement peint.
    expect(contrastRatio(RESCUED, INK_DARK)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL)
    expect(contrastRatio('#686868', INK_DARK)).toBeLessThan(WCAG_AA_NORMAL)
    // Correction : l'encre suit la couleur rendue → blanc, 5.57:1.
    expect(eventInkColor(RESCUED, true)).toBe(INK_LIGHT)
    expect(contrastRatio('#686868', INK_LIGHT)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL)
    expect(eventLabelReadableInside(RESCUED, true)).toBe(true)
  })

  it(`${RESCUED} NON archivé : encre et verdict STRICTEMENT inchangés (non-régression)`, () => {
    expect(eventInkColor(RESCUED, false)).toBe(INK_DARK)
    expect(eventLabelReadableInside(RESCUED, false)).toBe(true)
    // `archived` est optionnel : les appelants non migrés gardent l'ancien calcul.
    expect(eventLabelReadableInside(RESCUED)).toBe(true)
  })

  it(`${FALLBACK} ARCHIVÉ : aucune encre ne passe sur le gris → LIBELLÉ DEHORS`, () => {
    // Le cas que le garde-fou d'origine ne voyait pas : lisible avant grisage,
    // illisible après, et pourtant `true` parce qu'il ignorait `archived`.
    expect(eventLabelReadableInside(FALLBACK, false)).toBe(true)
    expect(renderedEventColor(FALLBACK, true)).toBe('#777777')
    expect(eventLabelReadableInside(FALLBACK, true)).toBe(false)
  })

  it('chemin ENCRE BLANCHE non dégradé (le grisage y augmente le contraste)', () => {
    // Fond très foncé : l'encre était déjà blanche, elle le reste, et le gris
    // (plus sombre encore) ne peut qu'améliorer le ratio.
    expect(eventInkColor('#0B0C0E', false)).toBe(INK_LIGHT)
    expect(eventInkColor('#0B0C0E', true)).toBe(INK_LIGHT)
    expect(eventLabelReadableInside('#0B0C0E', true)).toBe(true)
  })

  it('couleur déjà NON conforme (#6366f1) : le repli reste actif dans les deux états', () => {
    expect(eventLabelReadableInside('#6366f1', false)).toBe(false)
    // Archivée, son gris `#6f6f6f` repasse AA (5.03) → plus besoin du repli.
    expect(eventLabelReadableInside('#6366f1', true)).toBe(true)
  })

  it('couleur absente + archivé → toujours considéré lisible (theming DS)', () => {
    expect(eventLabelReadableInside(undefined, true)).toBe(true)
    expect(eventInkColor(undefined, true)).toBe('var(--color-ink)')
  })
})
