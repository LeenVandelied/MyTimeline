import { expect, test, type Page } from '@playwright/test'
import { ensureAuthenticated, openSettingsChapter } from './support/auth'
import { SHARED } from './support/accounts'
import { sessionState } from './support/session'
import {
  DEFAULT_DENSITY,
  DENSITY_ATTRIBUTE,
  DENSITY_STORAGE_KEY,
  type DensityOption,
} from '../src/lib/density'

/**
 * #898 (Sprint 121) — LA DENSITÉ CHOISIE S'APPLIQUE APRÈS RECHARGEMENT, PARTOUT.
 *
 * Avant : `data-density` n'était posé sur <html> que par `useDensity`, monté
 * uniquement dans Réglages › Préférences. Après un rechargement, le tableau de bord
 * et l'onglet Profil s'affichaient en densité normale. Désormais un script inline
 * rendu par `app/[locale]/layout.tsx` (`DENSITY_INIT_SCRIPT`) l'applique avant
 * l'hydratation.
 *
 * ORACLES.
 *  - densité effective : attribut `data-density` de <html> ET `font-size` calculée de
 *    <html> (`globals.css` : compact 15px, normal = 16px du navigateur) — l'attribut
 *    seul ne prouverait pas que la feuille l'applique ;
 *  - pas de flash : TOUTES les valeurs écrites dans l'attribut pendant le
 *    chargement, journalisées par une interception de `setAttribute` posée avant
 *    tout script de page (`addInitScript`). Sur une page qui ne monte pas `useDensity`, seule la
 *    valeur persistée doit apparaître, jamais la densité par défaut.
 *
 * Compte `SHARED` : la densité est client-only (localStorage du contexte, jetable à
 * chaque test) — aucune mutation du compte partagé.
 */

test.use({ storageState: sessionState(SHARED) })

const FONT_SIZE: Record<DensityOption, string> = {
  compact: '15px',
  normal: '16px',
  comfortable: '17px',
}

/**
 * Journalise chaque valeur ÉCRITE dans `data-density` de <html> dès la création du
 * document, avant tout script de page. On intercepte `setAttribute` (seule voie
 * d'écriture du script précoce comme de `useDensity`) plutôt qu'un
 * `MutationObserver` : un observateur qui relit l'attribut dans son callback ne voit
 * que la valeur FINALE d'un lot d'écritures — oracle vacant face à un flash
 * normal → compact écrit dans la même tâche (constaté au contrôle négatif du test
 * unitaire `useDensity.test.tsx`).
 */
async function recordDensityWrites(page: Page): Promise<void> {
  await page.addInitScript((attribute: string) => {
    const log: string[] = []
    ;(window as unknown as { __densityWrites: string[] }).__densityWrites = log
    const native = Element.prototype.setAttribute
    Element.prototype.setAttribute = function (this: Element, name: string, value: string) {
      if (name === attribute && this === document.documentElement) log.push(String(value))
      native.call(this, name, value)
    }
  }, DENSITY_ATTRIBUTE)
}

async function densityWrites(page: Page): Promise<string[]> {
  return page.evaluate(
    () => (window as unknown as { __densityWrites?: string[] }).__densityWrites ?? [],
  )
}

async function expectDensity(page: Page, density: DensityOption): Promise<void> {
  const html = page.locator('html')
  await expect(html).toHaveAttribute(DENSITY_ATTRIBUTE, density)
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).fontSize))
    .toBe(FONT_SIZE[density])
}

test.describe('#898 — densité persistée appliquée sur toutes les pages connectées', () => {
  test('Compact choisi dans Préférences → appliqué après rechargement du tableau de bord et de Profil', async ({
    page,
  }) => {
    await openSettingsChapter(page, 'preferences')
    await page.getByTestId('pref-density').click()
    await page.getByTestId('pref-density-option-compact').click()
    await expectDensity(page, 'compact')
    expect(await page.evaluate((k) => window.localStorage.getItem(k), DENSITY_STORAGE_KEY)).toBe(
      'compact',
    )

    // Chargements COMPLETS (pas de navigation client) : seul l'état persisté survit.
    await recordDensityWrites(page)

    await ensureAuthenticated(page) // goto('/fr/dashboard') + `dashboard` visible
    await expectDensity(page, 'compact')
    // Aucune écriture de la densité par défaut : pas de flash normal → compact.
    // (Le script écrit `compact` par-dessus un <html> sans attribut, d'où une seule
    // écriture.)
    // Aucune autre valeur que `compact` (pas de flash) ; une ré-écriture identique
    // (ex. `useDensity` monté après hydratation) reste légitime (review S121).
    const writes = await densityWrites(page)
    expect(writes.length).toBeGreaterThan(0)
    expect(writes.filter((v) => v !== 'compact')).toEqual([])

    await page.goto('/fr/settings', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('settings-page')).toBeVisible()
    // Onglet par défaut = Profil : la section Préférences (seule à monter
    // `useDensity`) n'est PAS montée — l'ancien code laissait l'attribut absent ici.
    await expect(page.getByTestId('settings-tab-profile')).toHaveAttribute('aria-selected', 'true')
    await expectDensity(page, 'compact')
    // Aucune autre valeur que `compact` (pas de flash) ; une ré-écriture identique
    // (ex. `useDensity` monté après hydratation) reste légitime (review S121).
    const writesAfterSettings = await densityWrites(page)
    expect(writesAfterSettings.length).toBeGreaterThan(0)
    expect(writesAfterSettings.filter((v) => v !== 'compact')).toEqual([])

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('settings-page')).toBeVisible()
    await expectDensity(page, 'compact')
  })

  test('valeur invalide en localStorage → densité par défaut', async ({ page }) => {
    await page.addInitScript((key: string) => {
      try {
        window.localStorage.setItem(key, 'huge')
      } catch {
        // about:blank : pas de stockage, sans objet.
      }
    }, DENSITY_STORAGE_KEY)

    await ensureAuthenticated(page)
    await expectDensity(page, DEFAULT_DENSITY)
  })

  test('valeur persistée « comfortable » → appliquée dès le chargement', async ({ page }) => {
    await page.addInitScript((key: string) => {
      try {
        window.localStorage.setItem(key, 'comfortable')
      } catch {
        // about:blank : pas de stockage, sans objet.
      }
    }, DENSITY_STORAGE_KEY)

    await ensureAuthenticated(page)
    await expectDensity(page, 'comfortable')
  })
})
