import { render, screen, cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Session } from '@/types/settings'
import type { FullCalendarEvent } from '@/types/event'
import type { Product } from '@/types/product'
import { makePositionedEvent } from '@/components/timeline/fixtures'
import { EventDrawer } from '@/components/timeline/EventDrawer'
import { TimelineBottomSheet } from '@/components/timeline/TimelineBottomSheet'
import { TimelineLandscapeDrawer } from '@/components/timeline/TimelineLandscapeDrawer'
import { DateStamp } from '@/components/timeline/DateStamp'
import { SessionList } from '@/components/settings/SessionList'
import { WeekAgenda } from '@/components/dashboard/WeekAgenda'
import { ProductList } from '@/components/dashboard/ProductList'
import { ProductCarousel } from '@/components/dashboard/ProductCarousel'
import { parseServerDateTime, serverDateTime, toIsoInstant, toLocalIsoDate } from '@/lib/date-iso'

/**
 * #518 — Garde de SÉMANTIQUE des dates : une date affichée se rend en
 * `<time datetime="…">`, pas en `<span>` (convention DS, `i18n.css` §7).
 *
 * CE QU'IL PROUVE, et pourquoi c'est prouvable sous jsdom : la BALISE et
 * l'ATTRIBUT sont du DOM, exactement ce que jsdom construit fidèlement. Chaque cas
 * cherche le libellé VISIBLE (celui qu'`Intl` a produit) et exige que l'élément qui
 * le porte soit un `TIME` : un retour en arrière vers `<span>` rend un `SPAN` et
 * échoue en nommant le composant. Il vérifie aussi que `datetime` désigne le MÊME
 * jour que le libellé — le défaut silencieux qu'un `toISOString()` introduit dans
 * tout fuseau positif (cf. `src/lib/date-iso.ts`).
 *
 * CE QU'IL NE PROUVE PAS (règle du dépôt : écrire ce qu'une garde ignore) :
 *  - AUCUNE tenue visuelle. Sous jsdom aucune feuille du DS n'est appliquée :
 *    `font-size`, `font-family`, `nowrap` et `text-transform` de `.mt-date--long`
 *    n'y sont pas observables. Les deltas typographiques assumés par cette
 *    migration (15px → 13px sur `ProductDetailView`, `ProductsListView` et
 *    `SessionList`) relèvent d'une vérification NAVIGATEUR, pas d'ici ;
 *  - l'EXHAUSTIVITÉ. Il couvre les composants migrés qui se rendent isolément ;
 *    `ProductDetailView`, `ProductsListView` et `ExportDataFlow` sont couverts dans
 *    LEURS fichiers de test (ils demandent router / react-query / machine à états).
 *    Un composant NEUF qui afficherait une date dans un `<span>` ne serait attrapé
 *    par aucune garde automatique — seule la revue le voit.
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
  useLocale: () => 'fr',
}))

const LOCALE = 'fr'
const NOW = new Date(2026, 6, 15, 9, 0, 0)

/** Le libellé visible `text` est-il porté par un `<time>` — et non par un `<span>` ? */
function timeCarrying(text: string): HTMLTimeElement {
  const el = screen.getByText(text)
  expect(el.tagName).toBe('TIME')
  return el as HTMLTimeElement
}

/** `datetime` présent, analysable, et désignant le même jour LOCAL que `source`. */
function expectSameLocalDay(el: HTMLTimeElement, source: Date): void {
  const attr = el.getAttribute('datetime')
  expect(attr).toBeTruthy()
  expect(attr).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(attr).toBe(toLocalIsoDate(source))
}

afterEach(cleanup)

describe('#518 — les drawers de la frise rendent leurs dates en <time>', () => {
  const event = makePositionedEvent({
    start: '2026-07-05T00:00:00.000Z',
    end: '2026-07-10T00:00:00.000Z',
  })
  const fmt = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' })
  const startLabel = fmt.format(new Date(event.start))
  const endLabel = fmt.format(new Date(event.end as string))

  const cases = [
    ['EventDrawer', <EventDrawer key="d" event={event} locale={LOCALE} onClose={() => {}} />],
    [
      'TimelineBottomSheet',
      <TimelineBottomSheet key="s" event={event} locale={LOCALE} onClose={() => {}} />,
    ],
    [
      'TimelineLandscapeDrawer',
      <TimelineLandscapeDrawer key="l" event={event} locale={LOCALE} onClose={() => {}} />,
    ],
  ] as const

  it.each(cases)('%s : début et fin portent <time datetime>', (_name, node) => {
    render(node)
    expectSameLocalDay(timeCarrying(startLabel), new Date(event.start))
    expectSameLocalDay(timeCarrying(endLabel), new Date(event.end as string))
  })

  it.each(cases)('%s : les libellés NON temporels restent hors <time>', (_name, node) => {
    const { container } = render(node)
    // Produit / catégorie / statut ne sont pas des dates : exactement 2 `<time>`.
    expect(container.querySelectorAll('time')).toHaveLength(2)
  })
})

describe('#518 — DateStamp (cellule de jour du Ruler)', () => {
  it('enveloppe le libellé de jour dans un <time datetime> local', () => {
    const day = new Date(2026, 6, 5)
    const { container } = render(<DateStamp day={day} locale={LOCALE} now={NOW} />)
    const el = container.querySelector('time')
    expect(el).not.toBeNull()
    expect(el?.getAttribute('datetime')).toBe('2026-07-05')
  })

  it('ne porte PAS `.mt-date--long` (son `nowrap` défait le repli sur 2 lignes)', () => {
    const { container } = render(<DateStamp day={new Date(2026, 6, 5)} locale={LOCALE} now={NOW} />)
    expect(container.querySelector('time')?.className ?? '').not.toContain('mt-date--')
  })
})

describe('#518 — SessionList (horodatage avec heure)', () => {
  const SESSIONS: Session[] = [
    {
      id: 'sess-current',
      deviceInfo: 'Chrome / macOS',
      ipAddress: '192.168.1.0',
      lastActivity: '2026-07-05T10:00:00',
      createdAt: '2026-07-01T09:00:00',
      current: true,
    },
  ]

  function renderList(sessions: Session[]) {
    return render(
      <SessionList
        sessions={sessions}
        isLoading={false}
        isError={false}
        revokingId={null}
        onRevoke={() => {}}
        onRevokeOthers={() => {}}
        isRevokingOthers={false}
      />,
    )
  }

  it('rend `lastActivity` en <time> porteur de l’INSTANT complet, pas du seul jour', () => {
    renderList(SESSIONS)
    // `parseServerDateTime` et non `new Date` : `lastActivity` est un
    // `LocalDateTime` Java, lu dans le référentiel SERVEUR (correctif S83).
    const instant = parseServerDateTime('2026-07-05T10:00:00')
    const label = new Intl.DateTimeFormat(LOCALE, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(instant)
    const el = timeCarrying(label)
    // Le libellé porte une HEURE : l'attribut doit la porter aussi (`toIsoInstant`).
    expect(el.getAttribute('datetime')).toBe(toIsoInstant(instant))
    expect(el.className).toContain('mt-date--long')
  })

  it('n’émet AUCUN `datetime` sur un horodatage illisible (plutôt qu’une valeur fausse)', () => {
    const { container } = renderList([{ ...SESSIONS[0], lastActivity: 'pas-une-date' }])
    const el = container.querySelector('time')
    expect(el).not.toBeNull()
    expect(el?.hasAttribute('datetime')).toBe(false)
    // Le repli de `formatDate` reste affiché : on ne perd pas l'information brute.
    expect(el?.textContent).toContain('pas-une-date')
  })
})

describe('#518 — dashboard : agenda et listes produits', () => {
  const evt = (start: string): FullCalendarEvent => ({
    id: 'a',
    title: 'Event a',
    start,
    end: start,
    allDay: true,
    resourceId: 'p1',
    color: '#3E8BD6',
    extendedProps: { productId: 'p1', productName: 'Produit A', category: 'Cat', type: 'single' },
  })

  const product: Product = {
    id: 'p1',
    name: 'Produit A',
    color: '#3E8BD6',
    category: { id: 'c1', name: 'Cat', color: '#4FA459' },
    events: [
      { id: 'e0', title: 'Event 0', startDate: '2026-07-16', archived: false, productId: 'p1' },
    ] as Product['events'],
  }

  it('WeekAgenda : `datetime` nomme le jour LOCAL affiché (et non son bascule UTC)', () => {
    // 2026-07-16T00:00Z → 16 juillet en UTC+2, mais 15 juillet pour `toISOString()`
    // dans un fuseau négatif : l'attribut doit suivre le libellé, pas UTC.
    const start = '2026-07-16T00:00:00.000Z'
    const { container } = render(<WeekAgenda events={[evt(start)]} locale={LOCALE} now={NOW} />)
    const el = container.querySelector('time')
    expect(el).not.toBeNull()
    expect(el?.getAttribute('datetime')).toBe(toLocalIsoDate(new Date(start)))
  })

  it.each([
    ['ProductList', <ProductList key="pl" products={[product]} locale={LOCALE} now={NOW} />],
    [
      'ProductCarousel',
      <ProductCarousel key="pc" products={[product]} locale={LOCALE} now={NOW} />,
    ],
  ])('%s : la prochaine échéance est un <time>, plus un <span class="font-mono">', (_n, node) => {
    const { container } = render(node)
    const el = container.querySelector('time')
    expect(el).not.toBeNull()
    expect(el?.className).toContain('mt-date--long')
    expect(el?.getAttribute('datetime')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

/**
 * #518 (correctif S83) — CONVENTION des horodatages NAÏFS du backend.
 *
 * `SessionResponse.lastActivity` et `ExportJobResponse.expiresAt` sont des
 * `LocalDateTime` Java : Jackson les sérialise SANS offset. `SessionList` les
 * lisait via `new Date(iso)` (fuseau du NAVIGATEUR) là où `ExportDataFlow`
 * ajoutait `Z` (référentiel SERVEUR, #58) — deux lectures opposées du même
 * contrat. Les deux passent désormais par `lib/date-iso.ts`.
 *
 * POURQUOI CE BLOC FORCE `TZ` : le défaut est un NO-OP en UTC. Un test qui se
 * contenterait du fuseau ambiant passerait à l'identique AVANT et APRÈS le
 * correctif sur la CI (Ubuntu = UTC) et ne prouverait donc rien. `Asia/Tokyo`
 * (UTC+9, aucun DST à aucune date) rend l'écart de 9 h observable et stable.
 * Node ≥ 16 honore une réaffectation de `process.env.TZ` à chaud (vérifié
 * Node 22) ; le fuseau d'origine est restauré en `afterAll` pour ne pas
 * contaminer les blocs suivants du fichier.
 *
 * CE QU'IL NE PROUVE PAS : rien sur `ExportDataFlow`, qui exige sa machine à
 * états et est couvert dans son propre fichier ; ni sur les dates SANS heure
 * (`LocalDate`, cf. `startDate` des événements), qui relèvent d'une autre
 * convention et d'un autre arbitrage.
 */
describe('#518 — horodatage naïf du backend : lu dans le référentiel SERVEUR', () => {
  /** Naïf, tel que Jackson l'écrit pour un `LocalDateTime`. */
  const NAIVE = '2026-07-05T10:00:00'
  /** Le même instant, explicite. C'est un LITTÉRAL : aucune dépendance au fuseau. */
  const INSTANT = '2026-07-05T10:00:00.000Z'

  const previousTz = process.env.TZ
  beforeAll(() => {
    process.env.TZ = 'Asia/Tokyo'
  })
  afterAll(() => {
    // ⚠ `process.env.TZ = undefined` N'EFFACE PAS la variable : Node coerce en la
    // CHAÎNE "undefined", qui n'est pas une zone valide et retombe sur UTC. Or `TZ`
    // n'est settée ni en CI ni dans un shell local, donc `previousTz` vaut presque
    // toujours `undefined` — la restauration naïve contaminait silencieusement tout
    // test suivant du même worker qui compte sur le fuseau AMBIANT.
    // Mesuré : affectation de `undefined` -> getTimezoneOffset() 0 au lieu de -120.
    if (previousTz === undefined) delete process.env.TZ
    else process.env.TZ = previousTz
  })

  const session = (iso: string): Session => ({
    id: 'sess-current',
    deviceInfo: 'Chrome / macOS',
    ipAddress: '192.168.1.0',
    lastActivity: iso,
    createdAt: '2026-07-01T09:00:00',
    current: true,
  })

  function renderList(iso: string) {
    return render(
      <SessionList
        sessions={[session(iso)]}
        isLoading={false}
        isError={false}
        revokingId={null}
        onRevoke={() => {}}
        onRevokeOthers={() => {}}
        isRevokingOthers={false}
      />,
    )
  }

  it('le fuseau forcé est bien actif (sans quoi tout ce bloc serait vacant)', () => {
    // Sentinelle : à Tokyo, l'ANCIENNE lecture (`new Date(iso)`) donne 01:00Z.
    // Si cette assertion tombe, c'est `process.env.TZ` qui n'a pas pris — et
    // aucune des assertions suivantes ne discriminerait plus quoi que ce soit.
    expect(new Date(NAIVE).toISOString()).toBe('2026-07-05T01:00:00.000Z')
    expect(new Date(NAIVE).toISOString()).not.toBe(INSTANT)
  })

  it('`parseServerDateTime` lit le naïf en UTC, pas dans le fuseau du navigateur', () => {
    expect(parseServerDateTime(NAIVE).toISOString()).toBe(INSTANT)
  })

  it('tolère un offset DÉJÀ présent au lieu de le rendre invalide', () => {
    expect(parseServerDateTime('2026-07-05T10:00:00Z').toISOString()).toBe(INSTANT)
    expect(parseServerDateTime('2026-07-05T12:00:00+02:00').toISOString()).toBe(INSTANT)
    expect(Number.isNaN(parseServerDateTime('pas-une-date').getTime())).toBe(true)
  })

  it('SessionList : `datetime` nomme l’instant SERVEUR (échouerait avant le correctif)', () => {
    const { container } = renderList(NAIVE)
    expect(container.querySelector('time')?.getAttribute('datetime')).toBe(INSTANT)
  })

  it('SessionList : le libellé visible est la projection LOCALE de cet instant', () => {
    renderList(NAIVE)
    // 10:00 UTC = 19:00 à Tokyo. L'ancienne lecture affichait « 10:00 ».
    const el = timeCarrying(
      new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(INSTANT),
      ),
    )
    expect(el.textContent).toContain('19:00')
  })

  it('libellé et attribut désignent le MÊME instant, quel que soit le fuseau', () => {
    // La garde anti-redivergence : c'est `serverDateTime` qui produit les deux,
    // à partir d'un seul parsing. Un appelant qui reviendrait à `new Date(iso)`
    // pour l'un des deux casserait cette égalité.
    const { label, machine } = serverDateTime(NAIVE, LOCALE)
    const { container } = renderList(NAIVE)
    const el = container.querySelector('time')
    expect(machine).toBe(INSTANT)
    expect(el?.getAttribute('datetime')).toBe(machine)
    expect(el?.textContent).toBe(label)
  })

  it('horodatage illisible : chaîne brute affichée, AUCUN `datetime`', () => {
    const { container } = renderList('pas-une-date')
    const el = container.querySelector('time')
    expect(el?.hasAttribute('datetime')).toBe(false)
    expect(el?.textContent).toContain('pas-une-date')
  })
})
