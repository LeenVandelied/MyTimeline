import { afterEach, describe, expect, it } from 'vitest'

import {
  assertFocusVisible,
  contrastRatio,
  measureIndicatorContrast,
  readStrip,
  type Rgb,
} from '../../e2e/support/pixel'

/**
 * ARMEMENT DES GARDES DE `e2e/support/pixel.ts` (`PAT-S58-002`).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CE FICHIER EXISTE
 * ─────────────────────────────────────────────────────────────────────────────
 * `pixel.ts` porte quatre garde-fous dont le seul rôle est d'empêcher la
 * publication d'un ratio de contraste FAUX. Les deux specs Playwright qui
 * consomment la sonde (`sprint-62-control-focus-contrast`,
 * `sprint-62-select-focus-indicator`) mesurent des éléments sains : unanimité
 * 100 %, loin des bords du viewport, jamais désactivés. **Aucune garde ne s'y
 * déclenche.** Leur vert prouve la non-régression des RATIOS, pas que les gardes
 * fonctionnent.
 *
 * Conséquence, si rien ne les arme : un seuil inversé, un `<` devenu `<=`, une
 * tolérance élargie ou un `closest()` supprimé passent la CI en vert. C'est la
 * variante « garde-fou » du travers déjà documenté par ce dépôt (un filet que
 * rien ne teste n'est pas un filet, c'est un commentaire).
 *
 * Chaque test ci-dessous est écrit pour ÉCHOUER si la garde qu'il vise est
 * retirée — c'est le critère, pas la couverture de ligne. La preuve d'armement
 * (run garde neutralisée / garde remise) est consignée dans le rapport de #415.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI EN VITEST, ET POURQUOI DANS `src/__tests__/`
 * ─────────────────────────────────────────────────────────────────────────────
 * Les gardes vivent dans du code Node PUR (arithmétique d'offsets, agrégation
 * modale, comparaison de seuil) ou dans un callback DOM que jsdom exécute tel
 * quel. Aucune n'a besoin d'un rendu réel : les éprouver dans Chromium
 * coûterait un backend, un `next dev` et deux minutes par run pour prouver
 * exactement la même chose. On n'injecte donc PAS de fixtures de composants —
 * le but est d'armer les gardes, pas de re-mesurer des composants.
 *
 * Le fichier ne peut pas vivre sous `e2e/` : `vitest.config.mts` y exclut tout
 * (`exclude: ['e2e/**']`), et le `testMatch` par défaut de Playwright happe
 * tout fichier en `.test.ts` sous son `testDir`. Un `e2e/support/*.test.ts`
 * serait donc soit invisible à Vitest, soit exécuté par Playwright comme une
 * spec — où il échouerait, faute de navigateur et de serveur. Il vit donc ici,
 * avec les autres garde-fous transverses du dépôt (`ds-type-scale`,
 * `console-error-guard`).
 */

/** Rectangle CSS page — homologue du `Box` interne, non exporté par `pixel.ts`. */
interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Les types `Page` / `Locator` de Playwright, dérivés de la SIGNATURE RÉELLE de
 * la sonde plutôt qu'importés de `@playwright/test` : le double de test reste
 * ainsi accroché au contrat exact de `readStrip`, et ce fichier Vitest n'a
 * aucune dépendance d'exécution vers Playwright.
 */
type PixelPage = Parameters<typeof readStrip>[0]
type PixelLocator = Parameters<typeof readStrip>[1]

const hex = (h: string): Rgb => ({
  r: parseInt(h.slice(1, 3), 16),
  g: parseInt(h.slice(3, 5), 16),
  b: parseInt(h.slice(5, 7), 16),
})

/** `--color-focus` en clair, et le fond sur lequel #415 a publié 6,08:1. */
const FOCUS_LIGHT = hex('#0e5fc4')
const SURFACE_LIGHT = hex('#ffffff')
/** Le couple sombre de #415 (6,48:1). */
const FOCUS_DARK = hex('#4d9bff')
const SURFACE_DARK = hex('#131519')
/** Couleur d'intrus, pour fabriquer une bande NON unanime. */
const INTRUDER = hex('#ff0000')

/**
 * Double de `Page` qui peint une image synthétique.
 *
 * Il n'encode aucun PNG : `captureRegion` passe le base64 de `screenshot()` à
 * `page.evaluate()` et n'utilise QUE la valeur de retour de ce dernier. Le
 * double retourne donc directement le tableau RGBA décodé, calculé à partir du
 * `clip` que la sonde a réellement demandé. Tout le code de clamp, d'assertion
 * d'échelle et d'accès pixel de `pixel.ts` s'exécute pour de vrai.
 *
 * `paint` est indexée en coordonnées CSS de PAGE (entières) : c'est le repère
 * dans lequel les tests raisonnent.
 */
function makeFakePage(opts: {
  viewport: { width: number; height: number } | null
  dpr?: number
  paint: (x: number, y: number) => Rgb
}): PixelPage {
  const dpr = opts.dpr ?? 1
  let lastClip: Rect | null = null
  const fake = {
    viewportSize: () => opts.viewport,
    screenshot: async ({ clip }: { clip: Rect }) => {
      lastClip = clip
      return Buffer.from([])
    },
    evaluate: async () => {
      if (lastClip == null) throw new Error('double de test : evaluate() avant screenshot()')
      const width = Math.round(lastClip.width * dpr)
      const height = Math.round(lastClip.height * dpr)
      const data: number[] = []
      for (let py = 0; py < height; py += 1) {
        for (let px = 0; px < width; px += 1) {
          const { r, g, b } = opts.paint(lastClip.x + px / dpr, lastClip.y + py / dpr)
          data.push(r, g, b, 255)
        }
      }
      return { width, height, dpr, data }
    },
  }
  // Double de test volontairement partiel : `pixel.ts` n'appelle que ces trois
  // membres de `Page`. Implémenter les ~200 autres n'apporterait rien.
  return fake as unknown as PixelPage
}

/** Double de `Locator` réduit à `boundingBox()` — seul membre utilisé par `readStrip`. */
function makeFakeLocator(box: Rect | null): PixelLocator {
  return { boundingBox: async () => box } as unknown as PixelLocator
}

/** Double de `Locator` qui exécute le callback de `evaluate()` sur un nœud jsdom RÉEL. */
function makeDomLocator(node: Element): PixelLocator {
  return {
    evaluate: async (fn: (el: Element) => unknown) => fn(node),
  } as unknown as PixelLocator
}

// ─────────────────────────────────────────────────────────────────────────────

describe('pixel.ts — arithmétique WCAG', () => {
  it('reproduit les deux ratios publiés par #415, au centième', () => {
    // Non décoratif : une moyenne naïve des canaux (au lieu de la
    // linéarisation sRGB pondérée) se trompe d'un facteur ~2 sur les BLEUS,
    // c'est-à-dire précisément sur la teinte de `--color-focus`.
    expect(contrastRatio(FOCUS_LIGHT, SURFACE_LIGHT)).toBeCloseTo(6.08, 2)
    expect(contrastRatio(FOCUS_DARK, SURFACE_DARK)).toBeCloseTo(6.48, 2)
  })

  it('est symétrique — l’ordre des deux couleurs ne change pas le ratio', () => {
    expect(contrastRatio(SURFACE_LIGHT, FOCUS_LIGHT)).toBeCloseTo(
      contrastRatio(FOCUS_LIGHT, SURFACE_LIGHT),
      10,
    )
  })
})

describe('GARDE 1 — mode() refuse une bande vide', () => {
  it('lève un message NOMMÉ au lieu du TypeError opaque de `samples: 0`', async () => {
    const page = makeFakePage({
      viewport: { width: 400, height: 400 },
      paint: () => SURFACE_LIGHT,
    })
    const locator = makeFakeLocator({ x: 100, y: 100, width: 40, height: 20 })

    // `samples: 0` produit zéro position. Sans la garde, l'ancien code
    // déréférençait `samples[0].hex` (TypeError « Cannot read properties of
    // undefined ») et `unanimity` valait `NaN` — dont la comparaison
    // `NaN < 0.6` est FAUSSE, donc la garde d'unanimité laissait PASSER.
    await expect(
      readStrip(page, locator, { side: 'top', offsetPx: 3, samples: 0, edgeGuardPx: 10 }),
    ).rejects.toThrow(/mode\(\) : aucun échantillon à agréger/)
  })

  it('un NaN d’unanimité ne peut pas traverser measureIndicatorContrast', async () => {
    const page = makeFakePage({
      viewport: { width: 400, height: 400 },
      paint: () => SURFACE_LIGHT,
    })
    const locator = makeFakeLocator({ x: 100, y: 100, width: 40, height: 20 })

    // Le point de la garde : refuser AVANT d'atteindre le seuil d'unanimité,
    // que `NaN` franchirait silencieusement.
    await expect(
      measureIndicatorContrast(page, locator, {
        side: 'top',
        edgeGuardPx: 10,
        samples: 0,
        indicatorOffsetPx: 3,
        adjacentOffsetPx: 6,
      }),
    ).rejects.toThrow(/aucun échantillon à agréger/)
  })
})

describe('GARDE 2 — seuil minUnanimity', () => {
  /**
   * Géométrie choisie pour que les positions échantillonnées tombent sur des
   * ENTIERS : côté `top` de 40 px, `edgeGuardPx: 10` (donc 20 px utiles),
   * 21 échantillons -> pas de 1 px, x = 110..130.
   *
   * Une ligne « rayée » par parité de x donne 11 pixels d'une couleur contre
   * 10 de l'autre : unanimité 11/21 = 52 %, sous le seuil de 60 %. C'est le
   * profil exact d'un arc ou d'un offset qui chevauche deux zones — le cas où
   * #415 a vu l'unanimité tomber à 48 % sur `.mt-radio__dot`.
   */
  const BOX: Rect = { x: 100, y: 100, width: 40, height: 20 }
  const STRIP = { side: 'top', edgeGuardPx: 10, samples: 21 } as const
  const INDICATOR_Y = BOX.y - 3
  const ADJACENT_Y = BOX.y - 6

  const striped = (x: number): Rgb => (Math.round(x) % 2 === 0 ? FOCUS_LIGHT : INTRUDER)

  it('LÈVE quand le TRAIT DE FOCUS est sous le seuil, en nommant la bande', async () => {
    const page = makeFakePage({
      viewport: { width: 400, height: 400 },
      paint: (x, y) => (Math.round(y) === INDICATOR_Y ? striped(x) : SURFACE_LIGHT),
    })
    await expect(
      measureIndicatorContrast(page, makeFakeLocator(BOX), {
        ...STRIP,
        indicatorOffsetPx: 3,
        adjacentOffsetPx: 6,
      }),
    ).rejects.toThrow(/Ratio NON publié : unanimité 52% sur le trait de focus \(côté top, \+3px/)
  })

  it('LÈVE aussi quand c’est le FOND ADJACENT qui est sous le seuil', async () => {
    // La garde boucle sur les DEUX bandes : un dénominateur douteux rend le
    // ratio aussi faux qu'un numérateur douteux. Un test sur une seule bande
    // laisserait passer la suppression de l'autre.
    const page = makeFakePage({
      viewport: { width: 400, height: 400 },
      paint: (x, y) =>
        Math.round(y) === ADJACENT_Y
          ? striped(x)
          : Math.round(y) === INDICATOR_Y
            ? FOCUS_LIGHT
            : SURFACE_LIGHT,
    })
    await expect(
      measureIndicatorContrast(page, makeFakeLocator(BOX), {
        ...STRIP,
        indicatorOffsetPx: 3,
        adjacentOffsetPx: 6,
      }),
    ).rejects.toThrow(/Ratio NON publié : unanimité 52% sur le fond adjacent \(côté top, \+6px/)
  })

  it('laisse passer une bande unanime et publie le ratio attendu', async () => {
    // Contrôle négatif : sans lui, une garde qui lèverait TOUJOURS ferait
    // passer les deux tests ci-dessus.
    const page = makeFakePage({
      viewport: { width: 400, height: 400 },
      paint: (_x, y) => (Math.round(y) === INDICATOR_Y ? FOCUS_LIGHT : SURFACE_LIGHT),
    })
    const m = await measureIndicatorContrast(page, makeFakeLocator(BOX), {
      ...STRIP,
      indicatorOffsetPx: 3,
      adjacentOffsetPx: 6,
    })
    expect(m.indicator.unanimity).toBe(1)
    expect(m.adjacent.unanimity).toBe(1)
    expect(m.ratio).toBeCloseTo(6.08, 2)
    expect(m.method).toContain('unanimité 100%')
  })

  it('`minUnanimity: 0` est un opt-out EXPLICITE, et il fonctionne', async () => {
    const page = makeFakePage({
      viewport: { width: 400, height: 400 },
      paint: (x, y) => (Math.round(y) === INDICATOR_Y ? striped(x) : SURFACE_LIGHT),
    })
    const m = await measureIndicatorContrast(page, makeFakeLocator(BOX), {
      ...STRIP,
      indicatorOffsetPx: 3,
      adjacentOffsetPx: 6,
      minUnanimity: 0,
    })
    expect(m.indicator.unanimity).toBeCloseTo(11 / 21, 6)
    // Le mode retient la couleur MAJORITAIRE (11 px), jamais l'extremum.
    expect(m.indicator.dominantHex).toBe('#0e5fc4')
    expect(m.ratio).toBeCloseTo(6.08, 2)
  })
})

describe('GARDE 4 — un point hors de la région capturée LÈVE, il n’est pas rabattu', () => {
  it('refuse de lire au-delà du clip intersecté par le viewport', async () => {
    // L'élément touche le bord DROIT du viewport (x + width = 100). Le clip est
    // clampé à 100, mais l'offset vers l'extérieur (+6 px) désigne x = 106 :
    // un pixel qui n'existe dans aucune capture. L'ancien code le rabattait sur
    // le bord (`Math.min`) et rendait la couleur d'un AUTRE pixel — un ratio
    // plausible mesuré au mauvais endroit, sans le moindre signal.
    const page = makeFakePage({
      viewport: { width: 100, height: 100 },
      paint: () => SURFACE_LIGHT,
    })
    const locator = makeFakeLocator({ x: 80, y: 40, width: 20, height: 10 })

    await expect(
      readStrip(page, locator, { side: 'right', offsetPx: 6, samples: 5, edgeGuardPx: 2 }),
    ).rejects.toThrow(/hors de la région capturée \[71, 100\] × \[31, 59\]/)
  })

  it('lit sans lever le même élément éloigné du bord', async () => {
    // Contrôle négatif : la garde ne doit pas lever sur une lecture légitime.
    const page = makeFakePage({
      viewport: { width: 400, height: 400 },
      paint: () => FOCUS_LIGHT,
    })
    const locator = makeFakeLocator({ x: 80, y: 40, width: 20, height: 10 })
    const strip = await readStrip(page, locator, {
      side: 'right',
      offsetPx: 6,
      samples: 5,
      edgeGuardPx: 2,
    })
    expect(strip.dominantHex).toBe('#0e5fc4')
    expect(strip.unanimity).toBe(1)
  })

  it('lève quand la boîte ne croise pas du tout le viewport', async () => {
    const page = makeFakePage({
      viewport: { width: 100, height: 100 },
      paint: () => SURFACE_LIGHT,
    })
    const locator = makeFakeLocator({ x: 300, y: 300, width: 20, height: 10 })
    await expect(
      readStrip(page, locator, { side: 'top', offsetPx: 2, samples: 5, edgeGuardPx: 2 }),
    ).rejects.toThrow(/Zone de capture vide après clamp sur le viewport/)
  })
})

describe('GARDE 3 — assertFocusVisible lit l’état sur l’élément ET sur ses ancêtres', () => {
  const mounted: Element[] = []

  const mount = (html: string): Document => {
    const host = document.createElement('div')
    host.innerHTML = html
    document.body.appendChild(host)
    mounted.push(host)
    return document
  }

  afterEach(() => {
    while (mounted.length > 0) mounted.pop()?.remove()
  })

  const focus = (el: Element): Element => {
    ;(el as HTMLElement).focus()
    return el
  }

  it('passe sur un contrôle focalisé et actif', async () => {
    const doc = mount('<button id="ok" class="mt-btn">go</button>')
    await expect(
      assertFocusVisible(makeDomLocator(focus(doc.getElementById('ok')!))),
    ).resolves.toBeUndefined()
  })

  it('refuse un élément qui n’est PAS en :focus-visible', async () => {
    const doc = mount('<button id="cold">go</button>')
    await expect(assertFocusVisible(makeDomLocator(doc.getElementById('cold')!))).rejects.toThrow(
      /n'est PAS en :focus-visible/,
    )
  })

  it('refuse `aria-disabled="true"` porté par l’ÉLÉMENT lui-même', async () => {
    const doc = mount('<button id="self" aria-disabled="true">go</button>')
    await expect(
      assertFocusVisible(makeDomLocator(focus(doc.getElementById('self')!))),
    ).rejects.toThrow(/aria-disabled="true"`, porté par l'élément mesuré lui-même/)
  })

  it('refuse `data-disabled` porté par l’ÉLÉMENT lui-même', async () => {
    const doc = mount('<span id="selfd" tabindex="0" data-disabled>go</span>')
    await expect(
      assertFocusVisible(makeDomLocator(focus(doc.getElementById('selfd')!))),
    ).rejects.toThrow(/data-disabled` \(convention Radix\), porté par l'élément mesuré lui-même/)
  })

  it('refuse `aria-disabled="true"` porté par un ANCÊTRE, et NOMME cet ancêtre', async () => {
    // Le cas Radix : `Select.Item` / `DropdownMenu.Group` porte l'attribut, le
    // descendant réellement peint n'en porte aucun. Avant `closest()`, ce
    // contrôle désactivé PASSAIT la garde et son ratio (mesuré sous
    // `opacity:.4`) était publié — c'est le 1,59:1 de `PIT-S58-002`.
    const doc = mount(
      '<div id="grp" class="mt-select__item" aria-disabled="true">' +
        '<span id="dot" tabindex="0">•</span></div>',
    )
    await expect(
      assertFocusVisible(makeDomLocator(focus(doc.getElementById('dot')!))),
    ).rejects.toThrow(/aria-disabled="true"`, porté par un ANCÊTRE <div#grp\.mt-select__item>/)
  })

  it('refuse `data-disabled` porté par un ANCÊTRE, et NOMME cet ancêtre', async () => {
    const doc = mount(
      '<fieldset id="fs" data-disabled><span id="knob" tabindex="0">•</span></fieldset>',
    )
    await expect(
      assertFocusVisible(makeDomLocator(focus(doc.getElementById('knob')!))),
    ).rejects.toThrow(/data-disabled` \(convention Radix\), porté par un ANCÊTRE <fieldset#fs>/)
  })

  it('remonte plusieurs niveaux, pas seulement le parent direct', async () => {
    const doc = mount(
      '<div id="root" data-disabled><div class="wrap"><span class="inner">' +
        '<span id="deep" tabindex="0">•</span></span></div></div>',
    )
    await expect(
      assertFocusVisible(makeDomLocator(focus(doc.getElementById('deep')!))),
    ).rejects.toThrow(/porté par un ANCÊTRE <div#root>/)
  })

  it('ne lève PAS sur `aria-disabled="false"` — la valeur est lue, pas la présence', async () => {
    // Faux positif à éviter : un `aria-disabled="false"` est explicite et
    // légitime. Une garde écrite avec `hasAttribute('aria-disabled')`
    // refuserait de mesurer un contrôle parfaitement actif.
    const doc = mount(
      '<div id="grp2" aria-disabled="false"><span id="live" tabindex="0">•</span></div>',
    )
    await expect(
      assertFocusVisible(makeDomLocator(focus(doc.getElementById('live')!))),
    ).resolves.toBeUndefined()
  })
})
