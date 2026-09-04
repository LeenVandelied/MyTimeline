import { test, expect, type Locator, type Page } from '@playwright/test'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import {
  deleteProduct,
  getUserId,
  openCategoriesTab,
  seedCategory,
  seedProduct,
  unique,
} from './support/products'
import {
  readStable,
  waitForFonts,
  TRUNCATION_TOLERANCE_PX,
  WCAG_AA_NON_TEXT,
} from './support/contrast'
import {
  measurePaintedGlyph,
  relativeLuminance,
  settleForMeasurement,
  type Rgb,
} from './support/pixel'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SPRINT 73 — CE QUE LE SPRINT N'AVAIT PROUVÉ QUE SUR MODÈLE, VÉRIFIÉ AU RENDU
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Deux corrections du S73 ont été livrées avec un critère d'acceptation VISUEL
 * et une preuve NON visuelle. Les deux `done.md` le déclarent noir sur blanc :
 *
 *  · #458 (`3d98ce9`) — « le titre produit ne déborde plus ». Preuve fournie :
 *    un test jsdom qui assert la PRÉSENCE des classes `min-w-0 break-words`.
 *    jsdom ne calcule AUCUN layout : ce test serait vert même si le titre
 *    débordait de 400 px.
 *  · #416 (`1e3143e`) — « le glyphe de coche atteint >= 3:1 sur les 12
 *    couleurs ». Preuve fournie : un test unitaire de la fonction PURE
 *    `swatchGlyphInk` (minimum calculé 4,54:1). Il prouve l'arithmétique, pas
 *    que cette encre-là est celle qui arrive à l'écran — ni que
 *    `var(--gray-0)` / `var(--gray-900)` résolvent comme prévu en thème sombre.
 *
 * C'est très exactement le motif `PIT-S48-002` (« CI verte != page correcte »)
 * et sa variante jsdom. Cette spec ne réécrit aucune logique : elle POSE LA
 * QUESTION AU MOTEUR DE RENDU, avec les helpers de mesure déjà en place
 * (`support/contrast.ts` pour le style calculé composité, `support/pixel.ts`
 * pour les octets réellement peints).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUI EST MESURÉ, ET AVEC QUEL ORACLE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * SONDE (a) — DÉBORDEMENT. Trois oracles distincts, parce qu'un seul ne
 * distingue pas les deux modes d'échec possibles :
 *   1. `h1.scrollWidth <= h1.clientWidth` — le titre n'est pas COUPÉ à
 *      l'intérieur de sa propre boîte ;
 *   2. bord droit du `<h1>` <= bord droit de la ZONE DE CONTENU de la carte —
 *      c'est le mode d'échec réel de #458 : sans `min-w-0`, l'enfant flex garde
 *      sa largeur min-content et DÉPASSE la carte sans que son `scrollWidth`
 *      dépasse quoi que ce soit. L'oracle (1) seul serait VERT sur le bug ;
 *   3. `documentElement.scrollWidth <= clientWidth` — aucune barre horizontale,
 *      c'est-à-dire ce que la personne devant l'écran constate.
 * Et un TÉMOIN : le titre long doit occuper >= 2 lignes. S'il tient sur une
 * seule tout en respectant (1)-(3), c'est qu'il a été rogné ou masqué, pas
 * césuré — les trois oracles passeraient pour de mauvaises raisons.
 *
 * SONDE (b) — CONTRASTE DU GLYPHE. Deux mesures complémentaires :
 *   · le RATIO WCAG, lu par `readStable(..., 'color')` sur le style CALCULÉ du
 *     `<svg>` (le `<Check>` peint son trait en `currentColor`), composité sur le
 *     remplissage réel de la pastille. C'est la mesure normative — WCAG 2.x se
 *     calcule sur les couleurs, pas sur la couverture d'anticrénelage — et
 *     c'est elle qui porte l'assertion `>= 3:1` (WCAG 1.4.11) ;
 *   · le TÉMOIN DE PEINTURE, lu par `measurePaintedGlyph` sur les octets du
 *     screenshot : il atteste que des pixels de glyphe existent VRAIMENT et de
 *     quelle polarité ils sont. Un `<svg>` correctement stylé mais jamais peint
 *     (masqué, taille nulle, recouvert) passerait la première mesure et échoue
 *     à celle-ci. Son ratio n'est PAS publié comme « le » contraste : un trait
 *     de ~1,3 px CSS est majoritairement anticrénelé, son ratio peint est donc
 *     mécaniquement plus bas.
 *
 * Les 12 couleurs sont lues DANS LE DOM (`[data-testid^="category-swatch-#"]`),
 * pas importées de `CategoryDrawer.tsx` : on mesure la palette réellement
 * rendue. Un contrôle exige la présence des deux pires appariements annoncés
 * par #416 (`#3E63DD` clair, `#F2A900` sombre) — si l'un disparaissait de la
 * palette, la sonde le dirait au lieu de couvrir 11 couleurs en silence.
 *
 * THÈME SOMBRE : `test.use({ colorScheme })`, le ThemeProvider étant monté en
 * `defaultTheme="system" enableSystem` (`app/[locale]/layout.tsx:66`). Un TÉMOIN
 * vérifie que `<html>` porte bien (ou non) `.dark` : sans lui, un `storageKey`
 * next-themes résiduel dans le `storageState` ferait tourner les deux variantes
 * dans le MÊME thème, et « 12 × 2 couvertes » serait un mensonge.
 *
 * ⚠ HORS PÉRIMÈTRE, ASSUMÉ : l'état `disabled + selected` du glyphe
 * (`opacity-50` sur le bouton) n'est pas mesuré, et la couleur libre du
 * `PopoverPicker` non plus (`swatchGlyphInk` ne s'applique qu'aux 12 swatches).
 */

test.use({ storageState: PROD.storageState })

/** `#rrggbb` (sortie de `contrast.ts`) -> octets, pour comparer deux luminances. */
function hexToRgb(hex: string): Rgb {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (m == null) throw new Error(`hex inattendu « ${hex} »`)
  return {
    r: Number.parseInt(m[1], 16),
    g: Number.parseInt(m[2], 16),
    b: Number.parseInt(m[3], 16),
  }
}

/** Mot unique, sans aucune espace, > 40 caractères — et <= 100 (@Size backend). */
function longSingleWord(): string {
  const base = 'Antidisestablishmentarianismelectroencephalographie'
  return `${base}${Date.now()}`
}

/** Géométrie du titre relativement à la ZONE DE CONTENU de la carte produit. */
async function readTitleGeometry(h1: Locator): Promise<{
  h1Left: number
  h1Right: number
  contentLeft: number
  contentRight: number
  cardClientWidth: number
  docScrollWidth: number
  docClientWidth: number
  lines: number
}> {
  // Écrit ici plutôt que dans `contrast.ts` : ce module mesure un CONTRASTE et
  // une troncature intra-boîte, il n'expose aucune comparaison de boîte à boîte.
  // L'ajouter là-bas pour un seul appelant élargirait sa surface sans besoin.
  return h1.evaluate((el) => {
    const card = el.closest('[data-testid="product-detail-card"]')
    if (card == null) throw new Error('carte produit introuvable au-dessus du <h1>')
    const cs = getComputedStyle(card)
    const cr = card.getBoundingClientRect()
    const hr = el.getBoundingClientRect()
    const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight)
    return {
      h1Left: hr.left,
      h1Right: hr.right,
      contentLeft:
        cr.left + Number.parseFloat(cs.paddingLeft) + Number.parseFloat(cs.borderLeftWidth),
      contentRight:
        cr.right - Number.parseFloat(cs.paddingRight) - Number.parseFloat(cs.borderRightWidth),
      cardClientWidth: (card as HTMLElement).clientWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      docClientWidth: document.documentElement.clientWidth,
      lines: Number.isFinite(lineHeight) && lineHeight > 0 ? Math.round(hr.height / lineHeight) : 1,
    }
  })
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DÉPOLLUTION DU COMPTE PARTAGÉ — ce que cette spec doit à toutes les autres
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * LE DÉFAUT QU'ON CORRIGE ICI (régression CI du S73, `6347a28` rouge alors que
 * `664c575` — même branche, sans cette spec — était vert). La sonde (a) seede,
 * sur le compte PARTAGÉ `PROD`, un produit dont le nom est un MOT UNIQUE de 64
 * caractères, insécable par construction. `seedProduct` ne nettoyait rien : ce
 * produit restait visible de TOUTE spec réutilisant `PROD.storageState` dans le
 * même run. `sprint-62-select-focus-indicator.spec.ts` en est une : elle ouvre
 * le `<Select>` produit du `NewEventDrawer`, dont le popover s'élargit alors
 * pour afficher ce nom. Le point que sa sonde de peinture échantillonne
 * (x ≈ 412,6) tombait au-delà du viewport mobile de 390 px — « il n'existe
 * aucun pixel à lire là », sur les deux thèmes.
 *
 * Le test lésé mesurait la BONNE chose : ce sont les données laissées derrière
 * qui étaient fautives. Ce n'est donc pas à lui de s'adapter — c'est à cette
 * spec-ci de rendre le compte dans l'état où elle l'a trouvé.
 *
 * POURQUOI `afterEach` ET PAS UNE SUPPRESSION EN FIN DE `test()`. Une ligne de
 * nettoyage placée à la fin du corps d'un test n'est JAMAIS atteinte quand une
 * assertion échoue avant elle — c'est-à-dire précisément le jour où la sonde
 * rougit et où la pollution serait la plus durable. `afterEach` s'exécute quel
 * que soit le verdict, et le fixture `page` y est encore ouvert (sa destruction
 * vient après les hooks).
 *
 * POURQUOI LE NETTOYAGE NE PEUT PAS FAIRE ROUGIR UN TEST VERT. Chaque
 * suppression est isolée : son échec est journalisé (`[S73][cleanup]`) mais
 * n'est pas relancé. Un nettoyage qui masquerait la vraie cause d'un échec, ou
 * qui inventerait un échec là où la mesure a réussi, serait un défaut de plus.
 * L'inventaire est vidé dans tous les cas, pour qu'un test suivant ne réessaie
 * pas indéfiniment les mêmes ids.
 *
 * ⚠ CE QUE ÇA NE COUVRE PAS. La fenêtre de pollution n'est FERMÉE que si les
 * specs ne se chevauchent pas — c'est le cas en CI (`workers: 1`). En local à
 * `workers: 2`, une spec tierce peut lire le compte pendant qu'un test d'ici
 * est en vol : la fenêtre est réduite à la durée d'UN test, pas supprimée. La
 * suppression du chevauchement demanderait un compte dédié à cette spec, donc
 * un `register` de plus — budget déjà au plafond (5/min/IP, cf. `accounts.ts`).
 *
 * CE QUI EST NETTOYÉ, ET CE QUI NE PEUT PAS L'ÊTRE. Le PRODUIT au nom long est
 * supprimé — c'est lui, et lui seul, qui causait la régression. La CATÉGORIE
 * qui le porte est délibérément LAISSÉE, après vérification : `DELETE
 * /api/categories/{id}` répond **409** (« utilisée par 1 produits ») même une
 * fois le produit supprimé, parce que BR-PRO-007 archive le produit au lieu de
 * l'effacer — la clé étrangère `products.category_id` survit, donc la catégorie
 * reste « en usage » à jamais. La supprimer exigerait un
 * `reassignToCategoryId`, c'est-à-dire une AUTRE catégorie jetable : on
 * déplacerait le résidu, on ne le supprimerait pas. Ce résidu est de toute
 * façon inoffensif pour le défaut traité — un nom issu de `unique('S73')` fait
 * une vingtaine de caractères ET contient une espace, donc il est sécable : il
 * n'élargit aucun popover, ce qui est précisément la propriété qui manquait au
 * nom de produit.
 */

interface SeededProductFixture {
  userId: string
  productId: string
}

/** Inventaire du test EN COURS, vidé par l'`afterEach` ci-dessous. */
let seededProducts: SeededProductFixture[] = []

test.afterEach(async ({ page }) => {
  const pending = seededProducts
  seededProducts = []

  for (const { userId, productId } of pending) {
    try {
      await deleteProduct(page, { userId, productId })
    } catch (error) {
      console.warn(`[S73][cleanup] produit ${productId} non supprimé — ${String(error)}`)
    }
  }
})

/**
 * Seede un produit nommé `name` et ouvre sa fiche de détail.
 *
 * Le produit est inscrit à l'inventaire AVANT toute navigation : si le `goto`
 * ou l'attente de la carte échoue, l'`afterEach` nettoie quand même ce qui a
 * été créé.
 */
async function openProductDetail(page: Page, name: string): Promise<Locator> {
  await ensureAuthenticated(page)
  const userId = await getUserId(page)
  // `unique()` et NON `S73 ${Date.now()}` : `uq_categories_owner_name` est une
  // contrainte UNIQUE (owner, name) et le compte PROD est partagé. À
  // `workers: 2`, deux tests de ce fichier peuvent seeder dans la MÊME
  // milliseconde — mesuré : `duplicate key value violates unique constraint
  // "uq_categories_owner_name"`, remonté en **500** (pas 409), donc en
  // « seed catégorie doit renvoyer 201 (obtenu 500) ». Le suffixe aléatoire de
  // `unique()` existe exactement pour ça.
  const category = await seedCategory(page, unique('S73'))
  const product = await seedProduct(page, { userId, name, categoryId: category.id })
  seededProducts.push({ userId, productId: product.id })
  await page.goto(`/fr/products/${product.id}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('product-detail-card')).toBeVisible()
  await waitForFonts(page)
  return page.getByTestId('product-detail-card').locator('h1')
}

const VIEWPORTS = [
  { label: 'mobile 375×812', viewport: { width: 375, height: 812 } },
  { label: 'desktop 1280×800', viewport: { width: 1280, height: 800 } },
] as const

for (const { label, viewport } of VIEWPORTS) {
  test.describe(`#458 — débordement RÉEL du titre produit (${label})`, () => {
    // Viewport posée AVANT tout `goto` (PIT-S63-001 : un resize après navigation
    // laisse des mesures prises sur l'ancienne largeur).
    test.use({ viewport })

    test(`un mot de 60+ caractères ne déborde pas de la carte — ${label}`, async ({ page }) => {
      const name = longSingleWord()
      expect(name).not.toMatch(/\s/)
      expect(name.length).toBeGreaterThanOrEqual(40)

      const h1 = await openProductDetail(page, name)
      await expect(h1).toHaveText(name)

      const rendering = await readStable(h1)
      const geo = await readTitleGeometry(h1)
      const diag =
        `${label} — « ${name} » (${name.length} car., ${rendering.fontSizePx}px/${rendering.fontWeight}) : ` +
        `h1 scrollWidth ${rendering.scrollWidth} / clientWidth ${rendering.clientWidth}, ` +
        `h1 [${geo.h1Left.toFixed(1)}, ${geo.h1Right.toFixed(1)}] ` +
        `dans contenu carte [${geo.contentLeft.toFixed(1)}, ${geo.contentRight.toFixed(1)}] ` +
        `(carte clientWidth ${geo.cardClientWidth}), ` +
        `document ${geo.docScrollWidth}/${geo.docClientWidth}, ${geo.lines} ligne(s)`
      console.log(`[#458] ${diag}`)

      // (1) pas de coupe interne
      expect(
        rendering.scrollWidth,
        `${diag} — titre coupé dans sa propre boîte`,
      ).toBeLessThanOrEqual(rendering.clientWidth + TRUNCATION_TOLERANCE_PX)
      // (2) LE mode d'échec de #458 : l'enfant flex dépasse la carte
      expect(
        geo.h1Right,
        `${diag} — le titre dépasse la zone de contenu de la carte`,
      ).toBeLessThanOrEqual(geo.contentRight + TRUNCATION_TOLERANCE_PX)
      expect(rendering.scrollWidth, `${diag} — oracle du briefing`).toBeLessThanOrEqual(
        geo.cardClientWidth + TRUNCATION_TOLERANCE_PX,
      )
      // (3) ce que voit la personne : aucune barre de défilement horizontale
      expect(geo.docScrollWidth, `${diag} — la page défile horizontalement`).toBeLessThanOrEqual(
        geo.docClientWidth + TRUNCATION_TOLERANCE_PX,
      )
      // TÉMOIN : le mot a bien été CÉSURÉ, pas rogné.
      expect(
        geo.lines,
        `${diag} — titre long tenu sur une seule ligne : rogné, pas césuré`,
      ).toBeGreaterThanOrEqual(2)
    })
  })
}

test.describe('#458 — non-régression sur un titre de longueur normale', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('un titre court reste sur une ligne et ne déborde pas', async ({ page }) => {
    // ⚠ FIXTURE — « court » se juge en PIXELS, pas en intention. Le premier jet
    // suffixait le nom d'un `Date.now()` (13 chiffres) : à 375 px et à la taille
    // RÉELLE de `text-xl` dans le DS Graphite (mesurée ci-dessous, ~34 px, pas les
    // 20 px de l'échelle Tailwind par défaut — PIT-S53-001), ces 20 caractères
    // passaient à la ligne. Le test rougissait donc sur SA propre fixture, pas sur
    // le composant. Suffixe raccourci à 4 chiffres, et la largeur disponible est
    // asserée AVANT de conclure quoi que ce soit sur le nombre de lignes.
    const name = `Cle ${Date.now() % 10_000}`
    const h1 = await openProductDetail(page, name)
    await expect(h1).toHaveText(name)

    const rendering = await readStable(h1)
    const geo = await readTitleGeometry(h1)
    console.log(
      `[#458] titre court « ${name} » (${rendering.fontSizePx}px) : ` +
        `h1 ${rendering.scrollWidth}/${rendering.clientWidth}, ` +
        `droite ${geo.h1Right.toFixed(1)} <= ${geo.contentRight.toFixed(1)}, ${geo.lines} ligne(s)`,
    )
    expect(rendering.scrollWidth).toBeLessThanOrEqual(
      rendering.clientWidth + TRUNCATION_TOLERANCE_PX,
    )
    expect(geo.h1Right).toBeLessThanOrEqual(geo.contentRight + TRUNCATION_TOLERANCE_PX)
    expect(geo.docScrollWidth).toBeLessThanOrEqual(geo.docClientWidth + TRUNCATION_TOLERANCE_PX)
    expect(
      geo.lines,
      `un titre court (${rendering.scrollWidth}px de contenu pour ${rendering.clientWidth}px ` +
        `disponibles, ${rendering.fontSizePx}px) ne doit pas être césuré`,
    ).toBe(1)
  })
})

/** Pires appariements annoncés par #416 — leur absence invaliderait la couverture. */
const WORST_CASES = { light: '#3E63DD', dark: '#F2A900' } as const

const SCHEMES = ['light', 'dark'] as const

for (const scheme of SCHEMES) {
  test.describe(`#416 — contraste PEINT du glyphe de coche (thème ${scheme})`, () => {
    test.use({ colorScheme: scheme, viewport: { width: 1280, height: 900 } })

    test(`les 12 pastilles atteignent >= 3:1 au rendu — ${scheme}`, async ({ page }) => {
      await openCategoriesTab(page)
      await page.getByTestId('categories-new-button').click()
      await expect(page.getByTestId('category-drawer-form')).toBeVisible()

      // TÉMOIN DE THÈME — sans lui, « 12 × 2 » ne veut rien dire.
      const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
      expect(
        isDark,
        `le thème ${scheme} n'est pas appliqué : <html> ${isDark ? 'porte' : 'ne porte pas'} .dark`,
      ).toBe(scheme === 'dark')

      const hexes = await page
        .locator('[data-testid^="category-swatch-#"]')
        .evaluateAll((els) =>
          els.map((el) => (el.getAttribute('data-testid') ?? '').replace('category-swatch-', '')),
        )
      expect(hexes, 'la palette rendue doit compter 12 pastilles').toHaveLength(12)
      expect(hexes, 'pire appariement clair de #416 absent de la palette').toContain(
        WORST_CASES.light,
      )
      expect(hexes, 'pire appariement sombre de #416 absent de la palette').toContain(
        WORST_CASES.dark,
      )

      await settleForMeasurement(page)

      const report: string[] = []
      let worst = { hex: '', ratio: Number.POSITIVE_INFINITY }

      for (const hex of hexes) {
        const swatch = page.getByTestId(`category-swatch-${hex}`)
        await swatch.click()
        const glyph = swatch.locator('svg')
        await expect(glyph, `aucun glyphe rendu sur ${hex}`).toBeVisible()

        // Mesure NORMATIVE : couleur calculée du trait, composée sur le
        // remplissage réel de la pastille.
        const r = await readStable(glyph, 3_000, 'color')
        // TÉMOIN DE PEINTURE : des pixels de glyphe existent-ils vraiment ?
        const painted = await measurePaintedGlyph(page, swatch)

        report.push(
          `  ${hex} — WCAG ${r.ratio.toFixed(2)}:1 (encre ${r.foreground} sur ${r.background}) | ` +
            `peint ${painted.ratio.toFixed(2)}:1 extremum ${painted.extremeHex} ` +
            `sur remplissage ${painted.fillHex} (${painted.polarity}, ` +
            `${(painted.fillShare * 100).toFixed(0)}% de remplissage, ${painted.sampled} px)`,
        )

        expect(
          r.ratio,
          `${hex} (${scheme}) — glyphe ${r.foreground} sur ${r.background} : ` +
            `${r.ratio.toFixed(2)}:1 < ${WCAG_AA_NON_TEXT}:1 (WCAG 1.4.11)`,
        ).toBeGreaterThanOrEqual(WCAG_AA_NON_TEXT)

        // Le remplissage peint DOIT être la couleur demandée : si la pastille
        // n'est pas celle qu'on croit, le ratio ci-dessus porte sur autre chose.
        expect(
          painted.fillHex.toLowerCase(),
          `${hex} (${scheme}) — remplissage peint ${painted.fillHex} != hex demandé`,
        ).toBe(hex.toLowerCase())

        // Polarité : l'encre CALCULÉE et les pixels PEINTS doivent aller du même
        // côté du remplissage. Une divergence signe une variable qui ne résout
        // pas pareil à la peinture — le défaut redouté en thème sombre.
        const expectedPolarity =
          relativeLuminance(hexToRgb(r.foreground)) > relativeLuminance(hexToRgb(r.background))
            ? 'lighter'
            : 'darker'
        expect(
          painted.polarity,
          `${hex} (${scheme}) — encre calculée ${r.foreground} mais pixels peints ` +
            `${painted.polarity} que le remplissage : la variable ne résout pas pareil à la peinture`,
        ).toBe(expectedPolarity)

        // Des pixels ONT changé : un glyphe non peint donnerait ~1.00:1.
        expect(
          painted.ratio,
          `${hex} (${scheme}) — aucun pixel de glyphe distinguable du remplissage : ` +
            'le <svg> est stylé mais pas peint',
        ).toBeGreaterThan(1.5)

        if (r.ratio < worst.ratio) worst = { hex, ratio: r.ratio }
      }

      console.log(
        `[#416] thème ${scheme} — 12/12 pastilles mesurées AU RENDU\n${report.join('\n')}\n` +
          `  MINIMUM ${worst.ratio.toFixed(2)}:1 sur ${worst.hex}`,
      )
    })
  })
}
