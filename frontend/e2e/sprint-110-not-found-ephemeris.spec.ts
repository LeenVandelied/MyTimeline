import { test, expect, type Page } from '@playwright/test'

/**
 * #627 — 404 « éphéméride » : feuillet daté du jour + « Cette page n'a pas de
 * date dans l'almanach ».
 *
 * QUEL ÉCRAN. Une URL inconnue sous une locale valide est servie par
 * `app/global-not-found.tsx` (document autonome, PRÉRENDU au build, cf.
 * `e2e/document-lang.spec.ts`) — désormais l'UNIQUE écran 404 : `#827`
 * (Sprint 111) a supprimé `app/[locale]/not-found.tsx`, qu'aucune page
 * n'atteignait (seul `notFound()` du layout, qui échappe de toute façon au
 * `not-found.tsx` du même segment, PIT-S62-005).
 *
 * CE QUE LA SPEC PROUVE :
 *  - le HTML SERVI (`request.get`, sans JS) ne contient AUCUNE date : le
 *    prérendu ne fige pas le jour du build (critère « pas de date obsolète ») ;
 *  - après hydratation, le feuillet porte le jour de l'horloge du NAVIGATEUR
 *    (pas celle du runner) ;
 *  - le rendu sombre change par les seuls tokens : `.dark` posée à la main sur
 *    `<html>` (cet écran vit hors `ThemeProvider` et rend toujours en clair,
 *    recul assumé de #413 — on prouve ici que le feuillet SUIT la classe, pas
 *    que la préférence de thème est lue) ;
 *  - une locale non-fr (`/de/…`) affiche titre et feuillet en allemand.
 *
 * Aucun compte : pas de `storageState` (budget rate-limit intact).
 */

const UNKNOWN_FR = '/fr/sprint-110-page-sans-date'
const UNKNOWN_DE = '/de/sprint-110-page-sans-date'

/** Barrière d'hydratation NOMMÉE (PIT-S83-001) : la date n'existe qu'après montage. */
async function waitForEphemeris(page: Page): Promise<void> {
  await expect(page.getByTestId('ephemeris-leaf')).toHaveAttribute('data-ephemeris-ready', 'true')
}

test.describe('#627 — 404 éphéméride', () => {
  test('HTML servi : 404, écran présent, AUCUNE date calculée au prérendu', async ({ request }) => {
    const response = await request.get(UNKNOWN_FR)
    expect(response.status(), `statut de ${UNKNOWN_FR}`).toBe(404)

    const html = await response.text()
    expect(html, 'écran 404 servi').toContain('data-testid="global-not-found-screen"')

    const leaf = html.match(/<time[^>]*data-testid="ephemeris-leaf"[^>]*>[\s\S]*?<\/time>/)?.[0]
    expect(leaf, 'feuillet présent dans le HTML servi').toBeDefined()
    expect(leaf, 'barrière à false dans le HTML servi').toContain('data-ephemeris-ready="false"')
    expect(leaf, 'pas de datetime figé au build').not.toContain('datetime=')
    // Texte seul : les classes Tailwind (`w-[150px]`…) contiennent des chiffres.
    const text = (leaf ?? '').replace(/<[^>]*>/g, '')
    expect(text, 'aucun chiffre dans le feuillet servi').not.toMatch(/\d/)
  })

  test('après hydratation : jour du navigateur, titre de l’almanach, feuillet à gauche', async ({
    page,
  }) => {
    const response = await page.goto(UNKNOWN_FR)
    expect(response?.status(), `statut de ${UNKNOWN_FR}`).toBe(404)
    await waitForEphemeris(page)

    const browserDay = await page.evaluate(() => String(new Date().getDate()).padStart(2, '0'))
    await expect(page.getByTestId('ephemeris-day')).toHaveText(browserDay)
    const browserIso = await page.evaluate(() => {
      const d = new Date()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${d.getFullYear()}-${mm}-${dd}`
    })
    await expect(page.getByTestId('ephemeris-leaf')).toHaveAttribute('datetime', browserIso)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      "Cette page n'a pas de date dans l'almanach.",
    )
    await expect(page.getByTestId('state-screen-eyebrow')).toHaveText('Erreur 404')
    await expect(page.getByTestId('global-not-found-home-link')).toHaveAttribute('href', '/fr')

    // Viewport desktop par défaut (≥ sm) : feuillet et texte en RANGÉE.
    await expect(page.getByTestId('state-screen-with-aside')).toBeVisible()
    const leafBox = await page.getByTestId('ephemeris-leaf').boundingBox()
    const titleBox = await page.getByRole('heading', { level: 1 }).boundingBox()
    expect(leafBox, 'boîte du feuillet').not.toBeNull()
    expect(titleBox, 'boîte du titre').not.toBeNull()
    expect(leafBox!.x + leafBox!.width, 'feuillet à gauche du titre').toBeLessThanOrEqual(
      titleBox!.x,
    )
  })

  test('sombre : le feuillet change par les tokens seuls (.dark)', async ({ page }) => {
    await page.goto(UNKNOWN_FR)
    await waitForEphemeris(page)

    const readColors = () =>
      page.evaluate(() => {
        const leaf = document.querySelector('[data-testid="ephemeris-leaf"]')
        const month = document.querySelector('[data-testid="ephemeris-month"]')
        if (!leaf || !month) throw new Error('feuillet introuvable')
        const leafStyle = getComputedStyle(leaf)
        return {
          background: leafStyle.backgroundColor,
          border: leafStyle.borderTopColor,
          month: getComputedStyle(month).color,
        }
      })

    const light = await readColors()
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    const dark = await readColors()

    expect(dark.background, 'fond du feuillet clair ≠ sombre').not.toBe(light.background)
    expect(dark.border, 'bordure du feuillet clair ≠ sombre').not.toBe(light.border)
    expect(dark.month, 'mois (accent) clair ≠ sombre').not.toBe(light.month)
  })

  test('/de/… : titre et feuillet en allemand', async ({ page }) => {
    const response = await page.goto(UNKNOWN_DE)
    expect(response?.status(), `statut de ${UNKNOWN_DE}`).toBe(404)

    // La locale n'est posée qu'après hydratation (écran prérendu en `fr`).
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('de')
    await waitForEphemeris(page)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Für diese Seite gibt es kein Kalenderblatt.',
    )
    await expect(page.getByTestId('state-screen-eyebrow')).toHaveText('Fehler 404')
    const weekday = await page.evaluate(() =>
      new Intl.DateTimeFormat('de', { weekday: 'long' }).format(new Date()),
    )
    await expect(page.getByTestId('ephemeris-weekday')).toHaveText(weekday)
    await expect(page.getByTestId('ephemeris-week')).toHaveText(/^KW \d{1,2}$/)
  })
})
