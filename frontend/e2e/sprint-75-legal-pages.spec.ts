import { test, expect, type Page } from '@playwright/test'

/**
 * #60 (absorbe #172) — finitions des pages légales `/privacy` et `/terms`.
 *
 * POURQUOI UN E2E, ALORS QUE `src/lib/legal-pages.test.ts` existe déjà.
 * L'unitaire lit la SOURCE et le JSON : il prouve qu'un `id` est écrit dans le
 * JSX et qu'une clé i18n existe. Il ne peut prouver NI que next-intl résout
 * réellement le libellé pour la locale de la route (la résolution passe par le
 * routeur et `getRequestConfig`), NI — surtout — que le SAUT D'ANCRE fonctionne :
 * jsdom ne résout aucun fragment d'URL et ne défile pas
 * ([[jsdom-scroll-tests-prove-nothing]]). Seul un vrai moteur tranche.
 *
 * Aucune authentification : les deux pages sont publiques.
 *
 * SÉLECTEURS. On s'ancre sur les `data-testid` et sur les `href` de fragment,
 * JAMAIS sur les libellés — la spec doit rester valable dans les 4 locales
 * (convention `e2e/README.md`). Les deux seules assertions portant sur du texte
 * sont celles qui COMPARENT des locales entre elles, et c'est leur objet même.
 */

const LOCALES = ['fr', 'en', 'es', 'de'] as const
const PAGES = ['privacy', 'terms'] as const

/** Libellés français attendus en `fr` — et interdits ailleurs. */
const FR_BACK = 'Retour'
const FR_BACK_TO_HOME = "Retour à l'accueil"

/** Nombre d'entrées de sommaire attendu, aligné sur `src/lib/legal-pages.ts`. */
const EXPECTED_ENTRIES = { privacy: 9, terms: 11 } as const

/**
 * Section VOLONTAIREMENT au milieu du document : assez bas pour qu'atteindre
 * son ancre EXIGE un défilement, assez haut pour que le navigateur ne bute pas
 * sur le bas de page (le clamp de fin de document ferait rater la cible et
 * rendrait l'assertion de position ininterprétable).
 */
const MID_SECTION = { privacy: 'user-rights', terms: 'article-5' } as const

/** `scroll-mt-24` = 6rem = 96px : position visée du haut de section après saut. */
const SCROLL_MARGIN_PX = 96

async function readTop(page: Page, sectionId: string): Promise<number> {
  return page.evaluate(
    (id) => document.getElementById(id)?.getBoundingClientRect().top ?? Number.NaN,
    sectionId,
  )
}

test.describe('#60 — bouton « Retour » localisé', () => {
  for (const pageName of PAGES) {
    test(`/fr/${pageName} rend les libellés français`, async ({ page }) => {
      await page.goto(`/fr/${pageName}`)

      await expect(page.getByRole('link', { name: FR_BACK, exact: true })).toBeVisible()
      await expect(page.getByRole('link', { name: FR_BACK_TO_HOME })).toBeVisible()
    })

    test(`/en/${pageName} ne rend PAS la chaîne française`, async ({ page }) => {
      await page.goto(`/en/${pageName}`)

      // Le défaut corrigé : « Retour » était en dur, donc rendu tel quel en `en`.
      await expect(page.getByRole('link', { name: FR_BACK, exact: true })).toHaveCount(0)
      await expect(page.getByRole('link', { name: FR_BACK_TO_HOME })).toHaveCount(0)

      await expect(page.getByRole('link', { name: 'Back', exact: true })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Back to home' })).toBeVisible()
    })

    test(`/de/${pageName} ne rend PAS la chaîne française`, async ({ page }) => {
      await page.goto(`/de/${pageName}`)

      await expect(page.getByRole('link', { name: FR_BACK, exact: true })).toHaveCount(0)
      await expect(page.getByRole('link', { name: FR_BACK_TO_HOME })).toHaveCount(0)
      await expect(page.getByRole('link', { name: 'Zurück', exact: true })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Zurück zur Startseite' })).toBeVisible()
    })
  }
})

test.describe('#60 / #172 — disclaimer « la version française fait foi »', () => {
  for (const pageName of PAGES) {
    test(`/fr/${pageName} ne l'affiche PAS (la page EST la version qui fait foi)`, async ({
      page,
    }) => {
      await page.goto(`/fr/${pageName}`)
      await expect(page.getByTestId('legal-disclaimer')).toHaveCount(0)
    })

    for (const locale of ['en', 'es', 'de'] as const) {
      test(`/${locale}/${pageName} l'affiche, non vide`, async ({ page }) => {
        await page.goto(`/${locale}/${pageName}`)

        const disclaimer = page.getByTestId('legal-disclaimer')
        await expect(disclaimer).toBeVisible()
        // Un `disclaimerOriginalFrench` manquant ferait rendre la CLÉ par
        // next-intl plutôt qu'un vide : on rejette explicitement ce cas.
        await expect(disclaimer).not.toHaveText(/disclaimerOriginalFrench/)
        expect(((await disclaimer.textContent()) ?? '').trim().length).toBeGreaterThan(10)
      })
    }
  }
})

test.describe('#60 — sommaire numéroté et saut d’ancre', () => {
  for (const pageName of PAGES) {
    const testId = `${pageName}-toc`

    test(`/fr/${pageName} liste ${EXPECTED_ENTRIES[pageName]} entrées ancrées`, async ({
      page,
    }) => {
      await page.goto(`/fr/${pageName}`)

      const toc = page.getByTestId(testId)
      await expect(toc).toBeVisible()

      const links = toc.locator('a[href^="#"]')
      await expect(links).toHaveCount(EXPECTED_ENTRIES[pageName])

      // Chaque entrée doit viser une cible qui EXISTE réellement dans le DOM.
      const hrefs = await links.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('href') ?? ''),
      )
      for (const href of hrefs) {
        await expect(page.locator(`section${href}`)).toHaveCount(1)
      }
    })

    test(`/fr/${pageName} — les chiffres romains ne polluent pas le nom accessible`, async ({
      page,
    }) => {
      await page.goto(`/fr/${pageName}`)

      const links = page.getByTestId(testId).locator('a[href^="#"]')
      const names = await links.evaluateAll((nodes) =>
        nodes.map((node) => (node.textContent ?? '').trim()),
      )

      expect(names).toHaveLength(EXPECTED_ENTRIES[pageName])
      for (const name of names) {
        expect(name.length).toBeGreaterThan(0)
        // « I. », « II. »… sont rendus dans un <span aria-hidden> FRÈRE du lien :
        // ils ne doivent pas se retrouver dans le texte de l'ancre.
        expect(name, `nom accessible de l'entrée`).not.toMatch(/^[IVXLC]+\.\s/)
      }

      // La numérotation romaine est bien PRÉSENTE visuellement, et masquée aux AT.
      const numerals = page.getByTestId(testId).locator('span[aria-hidden="true"]')
      await expect(numerals).toHaveCount(EXPECTED_ENTRIES[pageName])
      await expect(numerals.first()).toHaveText('I.')
      await expect(numerals.nth(1)).toHaveText('II.')
      await expect(numerals.nth(2)).toHaveText('III.')
    })

    /**
     * LE test que l'unitaire ne peut pas rendre : le clic amène-t-il vraiment à
     * la section ? On mesure la position AVANT (auto-contrôle : la cible doit
     * être hors de portée, sinon l'assertion d'après ne prouverait rien) puis
     * APRÈS.
     */
    test(`/fr/${pageName} — cliquer une entrée amène à la section`, async ({ page }) => {
      const sectionId = MID_SECTION[pageName]
      await page.goto(`/fr/${pageName}`)
      await page.evaluate(() => window.scrollTo(0, 0))

      const topBefore = await readTop(page, sectionId)
      // AUTO-CONTRÔLE. Si la section était déjà en haut du viewport, le test
      // passerait sans qu'aucun défilement n'ait eu lieu — il serait aveugle.
      expect(
        topBefore,
        `#${sectionId} doit être hors de portée avant le clic (sinon l'oracle est vide)`,
      ).toBeGreaterThan(400)

      await page.getByTestId(`${testId}-link-${sectionId}`).click()

      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
      expect(page.url()).toContain(`#${sectionId}`)

      // Position stabilisée du haut de section : `scroll-mt-24` la place à ~96px
      // du haut du viewport. Tolérance large — on prouve l'arrivée à la bonne
      // section, pas le pixel exact.
      await expect
        .poll(() => readTop(page, sectionId), {
          message: `haut de #${sectionId} après le saut d'ancre`,
        })
        .toBeLessThan(SCROLL_MARGIN_PX + 40)
      expect(await readTop(page, sectionId)).toBeGreaterThan(-40)
    })
  }
})

test.describe('#60 — date de mise à jour centralisée et localisée', () => {
  for (const pageName of PAGES) {
    for (const locale of LOCALES) {
      test(`/${locale}/${pageName} rend le mois en toutes lettres`, async ({ page }) => {
        await page.goto(`/${locale}/${pageName}`)

        const stamp = page.getByTestId('legal-last-updated')
        await expect(stamp).toBeVisible()

        const text = ((await stamp.textContent()) ?? '').trim()
        expect(text).toContain('2023')
        // Le format numérique d'origine était ambigu hors `fr` (`en` lisait
        // « 6 janvier ») : il ne doit plus apparaître nulle part.
        expect(text, `date rendue en ${locale}`).not.toMatch(/\d{2}\/\d{2}\/\d{4}/)
      })
    }
  }
})
