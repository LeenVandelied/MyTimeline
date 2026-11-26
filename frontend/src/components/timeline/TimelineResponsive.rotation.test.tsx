import { render, screen, act } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi, afterEach } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import {
  BREAKPOINTS_FILE,
  docCommentOf,
  documentedConstants,
  loadThresholds,
  readThresholdsSource,
  scanHeightQueries,
  viewportMatcher,
} from '@/__tests__/support/mediaQuerySource'
import type { Resource } from './lib'
import { TimelineResponsive } from './TimelineResponsive'
import { MOBILE_LANE_TRACK_OFFSET_PX } from './useTimelineMobileState'

/**
 * #328 — Le scroll horizontal de la frise mobile survit à la rotation.
 *
 * `zoom` / `viewportStart` / la sélection étaient déjà hissés dans
 * `TimelineResponsive` (#63/#64) ; `scrollLeft` restait un état DOM porté par la
 * variante démontée → remis à 0 à chaque rotation (mesuré 400 → 0). On vérifie
 * ici le transport de la position à travers le démontage/remontage de variante,
 * ET la resynchronisation de la fenêtre minimap (`aria-valuenow` du slider).
 *
 * jsdom ne fait pas de layout : `clientWidth === 0`, donc `viewportRatio` tombe
 * sur le plancher 0.02 de la minimap et le centrage initial vaut exactement
 * `todayLeftPx`. Ces valeurs sont dérivées du DOM (largeur du rail) et jamais
 * codées en dur.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PORTÉE RÉELLE DE CE FICHIER — à lire avant de s'y fier (sprint 51)
 * ─────────────────────────────────────────────────────────────────────────────
 * jsdom ne fait pas de layout ET NE CLAMPE PAS `scrollLeft` : `scrollWidth` et
 * `clientWidth` valent 0, si bien qu'on peut y écrire 400 et relire 400 quel que
 * soit l'état du rail. Les assertions `toBe(400)` / `toBe(250)` ci-dessous
 * prouvent donc UNIQUEMENT le CÂBLAGE — que `setScrollNode` transporte bien une
 * valeur d'un nœud DOM au suivant, et que le nœud remonté est bien un autre
 * élément. Elles ne prouvent RIEN sur le comportement en navigateur.
 *
 * En navigateur, la même écriture est bornée à `scrollWidth - clientWidth`. Mesuré
 * (Chromium, 390×844 → 844×390, données seedées par `e2e/timeline-mobile.spec.ts`)
 * : rail 732 px, zone visible 340 px en portrait mais 794 px en paysage → le rail
 * entre EN ENTIER, `maxScroll` vaut 0, et le seul `scrollLeft` atteignable en
 * paysage est 0. Aucun code ne peut y produire une valeur > 0.
 *
 * Ne cherchez donc pas à « prouver » ici une correction de restauration de scroll
 * : seul un test navigateur (Playwright) le peut. Ces 4 cas sont conservés comme
 * garde-fou de non-régression du câblage, pas comme validation fonctionnelle.
 */

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}))

const TODAY = new Date(2026, 6, 15)

const EVENTS: FullCalendarEvent[] = [
  {
    id: 'e1',
    title: 'Péremption lait',
    start: '2026-07-10',
    end: '2026-07-14',
    allDay: true,
    resourceId: 'p1',
    color: '#3B62D4',
    extendedProps: {
      productId: 'p1',
      productName: 'Lait bio',
      category: 'Frais',
      type: 'duration',
    },
  },
  {
    id: 'e2',
    title: 'Livraison pain',
    start: '2026-08-20',
    end: '2026-08-20',
    allDay: true,
    resourceId: 'p2',
    color: '#4FA459',
    extendedProps: {
      productId: 'p2',
      productName: 'Pain',
      category: 'Boulangerie',
      type: 'single',
    },
  },
]

const RESOURCES: Resource[] = [
  { id: 'p1', title: 'Lait bio', category: 'Frais' },
  { id: 'p2', title: 'Pain', category: 'Boulangerie' },
]

const isPortrait = (query: string) => query.includes('portrait')
/** Seule la requête paysage contient « landscape » → minimap NON forcée masquée. */
const isLandscape = (query: string) => query.includes('landscape')

/**
 * `matchMedia` mutable : `rotate()` ré-évalue les MediaQueryList vivantes et émet
 * `change` — `useMediaQuery` bascule donc SANS remontage de l'arbre, ce qui est
 * la condition même du scénario testé (l'état vit au-dessus des variantes).
 */
function mockMatchMedia(initial: (query: string) => boolean) {
  const original = window.matchMedia
  let matcher = initial
  const lists: Array<{
    query: string
    matches: boolean
    listeners: Set<(e: MediaQueryListEvent) => void>
  }> = []

  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const entry = {
      query,
      matches: matcher(query),
      listeners: new Set<(e: MediaQueryListEvent) => void>(),
    }
    lists.push(entry)
    return {
      get matches() {
        return entry.matches
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) =>
        entry.listeners.add(cb),
      removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) =>
        entry.listeners.delete(cb),
      addListener: (cb: (e: MediaQueryListEvent) => void) => entry.listeners.add(cb),
      removeListener: (cb: (e: MediaQueryListEvent) => void) => entry.listeners.delete(cb),
      dispatchEvent: vi.fn(),
    }
  })

  return {
    rotate(next: (query: string) => boolean) {
      matcher = next
      act(() => {
        for (const entry of lists) {
          const value = matcher(entry.query)
          if (value !== entry.matches) {
            entry.matches = value
            const ev = { matches: value, media: entry.query } as MediaQueryListEvent
            entry.listeners.forEach((cb) => cb(ev))
          }
        }
      })
    },
    restore() {
      window.matchMedia = original
    },
  }
}

/** Largeur du rail lue sur le DOM (source de vérité de l'échelle du zoom). */
function railWidth(): number {
  const rail = document.querySelector('.mt-tlm__rail') as HTMLElement | null
  expect(rail).not.toBeNull()
  return Number.parseFloat(rail!.style.width)
}

/**
 * #706 — Étendue de la PISTE : le rail porte en plus la gouttière d'en-têtes de
 * lane. La minimap cartographie la piste, pas le rail — c'est cette largeur-là
 * qui normalise `viewportStart`.
 */
function trackWidth(): number {
  return railWidth() - MOBILE_LANE_TRACK_OFFSET_PX
}

function scrollEl(): HTMLElement {
  return screen.getByTestId('timeline-scroll')
}

function minimapValueNow(): number {
  return Number(screen.getByTestId('timeline-minimap-viewport').getAttribute('aria-valuenow'))
}

function renderResponsive() {
  return render(
    <TimelineResponsive events={EVENTS} resources={RESOURCES} locale="fr-FR" today={TODAY} />,
  )
}

describe('#328 — rotation portrait ↔ paysage et scroll horizontal', () => {
  let media: ReturnType<typeof mockMatchMedia> | null = null

  afterEach(() => {
    media?.restore()
    media = null
  })

  it('portrait → paysage : restaure scrollLeft sur la variante remontée', () => {
    media = mockMatchMedia(isPortrait)
    renderResponsive()

    expect(screen.getByTestId('timeline-mobile-portrait')).toBeInTheDocument()
    const before = scrollEl()
    // L'utilisateur fait défiler la frise (état purement DOM avant #328).
    act(() => {
      before.scrollLeft = 400
    })
    expect(before.scrollLeft).toBe(400)

    media.rotate(isLandscape)

    expect(screen.queryByTestId('timeline-mobile-portrait')).toBeNull()
    expect(screen.getByTestId('timeline-mobile-landscape')).toBeInTheDocument()
    const after = scrollEl()
    // Élément DOM RÉELLEMENT différent (sinon le test ne prouverait rien).
    expect(after).not.toBe(before)
    expect(after.scrollLeft).toBe(400)
  })

  it('paysage → portrait : restaure aussi au retour', () => {
    media = mockMatchMedia(isLandscape)
    renderResponsive()

    expect(screen.getByTestId('timeline-mobile-landscape')).toBeInTheDocument()
    act(() => {
      scrollEl().scrollLeft = 250
    })

    media.rotate(isPortrait)

    expect(screen.getByTestId('timeline-mobile-portrait')).toBeInTheDocument()
    expect(scrollEl().scrollLeft).toBe(250)
  })

  it('resynchronise la fenêtre minimap sur le scroll restauré', () => {
    media = mockMatchMedia(isPortrait)
    renderResponsive()

    const track = trackWidth()
    expect(track).toBeGreaterThan(0)
    act(() => {
      scrollEl().scrollLeft = 400
    })

    media.rotate(isLandscape)

    // `aria-valuenow` = fraction de départ de la fenêtre visible, en % arrondi.
    // #706 — `scrollLeft` est en repère RAIL, la minimap en repère PISTE : la
    // gouttière est retirée avant normalisation (sinon la fenêtre dériverait de
    // `MOBILE_LANE_TRACK_OFFSET_PX / trackWidth` sur toute la course).
    expect(minimapValueNow()).toBe(Math.round(((400 - MOBILE_LANE_TRACK_OFFSET_PX) / track) * 100))
    expect(scrollEl().scrollLeft).toBe(400)
  })

  it('centre sur aujourd’hui au PREMIER montage seulement (pas à la rotation)', () => {
    media = mockMatchMedia(isPortrait)
    renderResponsive()

    // clientWidth = 0 sous jsdom → la cible du centrage vaut exactement todayLeftPx,
    // lisible sur le repère « today » du rail.
    const todayLeftPx = Number.parseFloat(
      (document.querySelector('.mt-tlm__today') as HTMLElement).style.left,
    )
    expect(todayLeftPx).toBeGreaterThan(0)
    // #706 — `.mt-tlm__today` porte un `left` en repère PISTE ; `scrollLeft` est en
    // repère RAIL. La cible du centrage vaut donc `gouttière + todayLeftPx` (moins
    // la demi-largeur visible, nulle sous jsdom). C'est précisément ce décalage qui
    // empêche l'événement du jour de naître SOUS la colonne d'en-têtes quand le
    // centrage est rabattu à 0 (plage courte).
    expect(scrollEl().scrollLeft).toBe(MOBILE_LANE_TRACK_OFFSET_PX + todayLeftPx)

    // Position utilisateur ≠ centrage : la rotation ne doit PAS rejouer le centrage.
    act(() => {
      scrollEl().scrollLeft = todayLeftPx + 180
    })
    media.rotate(isLandscape)
    expect(scrollEl().scrollLeft).toBe(todayLeftPx + 180)
  })
})

/**
 * #643 — Les seuils de hauteur du mode paysage portent un nom et un commentaire.
 *
 * Les constantes vivent dans le module des seuils (`@/lib/breakpoints`), partagé
 * avec le tableau de bord (T8). Le contrat lu est décrit dans
 * `__tests__/support/mediaQuerySource.ts` : toute syntaxe de requête de hauteur est
 * admise (`max-height:` comme `height <=`), pourvu que la valeur vienne d'une
 * constante documentée. `viewportMatcher` évalue ensuite les requêtes réellement
 * posées par le composant contre un écran simulé : la partie comportementale suit
 * la requête, pas sa forme d'écriture.
 */
const HEIGHT_CONSTANTS = { MOBILE_LANDSCAPE_MAX_HEIGHT_PX: 600, MINIMAP_HIDE_MAX_HEIGHT_PX: 400 }

/** Sondes du contrôle de commentaire : vrai commentaire de documentation, collé. */
function assertDocCommentProbes() {
  const decl = 'export const X_PX = 600'
  const rejected: Record<string, string> = {
    'no comment': `const a = 1\n${decl}`,
    'blank line between': `/** Seuil. */\n\n${decl}`,
    'code line ending with */': `const a = 1 /* x */\n${decl}`,
    'code line ending with */ after an earlier doc': `/** Autre. */\nconst a = 1 /* x */\n${decl}`,
    'plain block comment': `/* Seuil. */\n${decl}`,
    'empty doc block': `/** */\n${decl}`,
    'empty line comment': `//\n${decl}`,
    'eslint directive': `// eslint-disable-next-line no-magic-numbers\n${decl}`,
    'ts directive': `// @ts-expect-error\n${decl}`,
    'prettier directive': `// prettier-ignore\n${decl}`,
    'eslint block directive': `/* eslint-disable */\n${decl}`,
    'doc block holding only a directive': `/** eslint-disable */\n${decl}`,
  }
  for (const [label, source] of Object.entries(rejected)) {
    expect(docCommentOf(source, 'X_PX'), `sonde négative : ${label}`).toBeNull()
  }
  const accepted: Record<string, string> = {
    'one-line doc block': `/** Seuil paysage. */\n${decl}`,
    'multi-line doc block': `/**\n * Seuil paysage.\n */\n${decl}`,
    'line comments': `// Seuil paysage,\n// en px.\n${decl}`,
    'doc then a directive': `/** Seuil paysage. */\n// eslint-disable-next-line x\n${decl}`,
  }
  for (const [label, source] of Object.entries(accepted)) {
    expect(docCommentOf(source, 'X_PX'), `sonde positive : ${label}`).toMatch(/Seuil/)
  }
}

describe('#643 — seuils de hauteur du mode paysage', () => {
  let media: ReturnType<typeof mockMatchMedia> | null = null

  afterEach(() => {
    media?.restore()
    media = null
  })

  it('height queries are built from named constants', async () => {
    assertDocCommentProbes()

    // `expect.soft` : chaque manque est rapporté, pas seulement le premier.
    const moduleSource = readThresholdsSource()
    const componentFile = 'src/components/timeline/TimelineResponsive.tsx'
    const componentSource = readFileSync(join(process.cwd(), componentFile), 'utf8')

    // Nom et commentaire : chaque seuil est une constante documentée du module.
    for (const name of Object.keys(HEIGHT_CONSTANTS)) {
      expect
        .soft(moduleSource, `${name} déclarée dans ${BREAKPOINTS_FILE}`)
        .toMatch(new RegExp(`^export\\s+const\\s+${name}\\b`, 'm'))
      expect
        .soft(docCommentOf(moduleSource, name), `commentaire de documentation avant ${name}`)
        .not.toBeNull()
    }

    // Provenance : les requêtes de hauteur de la frise, qu'elles soient écrites dans le
    // composant ou dans le module, ne portent que ces constantes, sous toute syntaxe.
    const documented = documentedConstants(moduleSource)
    const used = new Set<string>()
    for (const [file, source] of [
      [componentFile, componentSource],
      [BREAKPOINTS_FILE, moduleSource],
    ]) {
      const scan = scanHeightQueries(file, source, documented)
      expect.soft(scan.findings, `seuils de hauteur écrits en dur (${file})`).toEqual([])
      scan.constants.forEach((name) => used.add(name))
    }
    for (const name of Object.keys(HEIGHT_CONSTANTS)) {
      expect.soft(used.has(name), `${name} portée par une requête de hauteur`).toBe(true)
    }

    // Les seuils actuels sont conservés tels quels (décision du plan de sprint).
    const mod = (await loadThresholds()) ?? {}
    for (const [name, value] of Object.entries(HEIGHT_CONSTANTS)) {
      expect.soft(mod[name], `valeur de ${name}`).toBe(value)
    }

    // Paysage de 500 px de haut : variante paysage, minimap affichée.
    media = mockMatchMedia(viewportMatcher({ width: 844, height: 500 }))
    const first = renderResponsive()
    expect(screen.getByTestId('timeline-mobile-landscape')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-minimap-wrap')).toBeInTheDocument()
    first.unmount()
    media.restore()

    // Au seuil de 400 px (inclus, comme avant) et en dessous : minimap masquée.
    for (const height of [400, 399]) {
      media = mockMatchMedia(viewportMatcher({ width: 844, height }))
      const view = renderResponsive()
      expect(screen.getByTestId('timeline-mobile-landscape')).toBeInTheDocument()
      expect(screen.queryByTestId('timeline-minimap-wrap'), `hauteur ${height}`).toBeNull()
      view.unmount()
      media.restore()
    }

    // 401 px : juste au-dessus du seuil, la minimap revient.
    media = mockMatchMedia(viewportMatcher({ width: 844, height: 401 }))
    renderResponsive()
    expect(screen.getByTestId('timeline-minimap-wrap')).toBeInTheDocument()
  })
})
