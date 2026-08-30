import { test, expect } from '@playwright/test'

/**
 * #413 — WCAG 3.1.1 (Langue de la page) : `<html lang>` doit refléter la locale
 * de la route, sur les 4 langues.
 *
 * POURQUOI UN E2E ET PAS UN UNITAIRE. Le défaut corrigé ici était structurel,
 * pas local : le `<html>` était posé dans `app/layout.tsx`, RENDU AU-DESSUS du
 * segment `[locale]`, donc dans un composant auquel Next ne passe pas les
 * `params` de l'enfant. Aucun test de composant ne peut voir ça — il faut le
 * document réellement assemblé par le routeur.
 *
 * ET SURTOUT : les deux oracles ci-dessous ne sont PAS redondants.
 *  - `request.get()` lit le HTML **servi**, sans exécuter une ligne de JS. C'est
 *    le seul oracle qui disqualifie une rustine client (un
 *    `document.documentElement.lang = …` posé après hydratation laisse le HTML
 *    SSR faux, et un lecteur d'écran peut avoir déjà annoncé la page). Il est
 *    donc le critère de sortie de l'issue.
 *  - `page.goto()` + `document.documentElement.lang` vérifie qu'aucun code
 *    client (next-themes, providers) ne réécrit ensuite l'attribut.
 * Un oracle vert et l'autre rouge = régression réelle, pas un doublon.
 */

const CASES = [
  { path: '/fr/login', lang: 'fr' },
  { path: '/en/login', lang: 'en' },
  { path: '/es/login', lang: 'es' },
  { path: '/de/register', lang: 'de' },
] as const

test.describe('#413 — <html lang> localisé (WCAG 3.1.1)', () => {
  for (const { path, lang } of CASES) {
    test(`${path} → HTML SERVI porte lang="${lang}" (avant hydratation)`, async ({ request }) => {
      const response = await request.get(path)
      expect(response.status(), `${path} doit répondre 200`).toBe(200)

      const html = await response.text()
      const openingTag = html.match(/<html[^>]*>/)?.[0] ?? ''
      // Message en 2e argument d'`expect` : Vitest/Playwright tronquent la valeur
      // comparée dans le rapport CI (PIT-S57-002) — la balise brute doit rester
      // lisible dans le message, pas seulement en local.
      expect(openingTag, `balise <html> servie pour ${path}`).toMatch(
        new RegExp(`\\slang="${lang}"`),
      )
    })

    test(`${path} → document.documentElement.lang vaut "${lang}" après hydratation`, async ({ page }) => {
      await page.goto(path)
      // `document.documentElement` et pas `locator('html')` : c'est LA valeur
      // que consomment les technologies d'assistance, et celle mesurée dans le
      // constat d'origine de #413.
      await expect
        .poll(() => page.evaluate(() => document.documentElement.lang), {
          message: `document.documentElement.lang sur ${path}`,
        })
        .toBe(lang)
    })
  }
})
