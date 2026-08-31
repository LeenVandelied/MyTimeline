import { test, expect, type Locator, type Page } from '@playwright/test'
import { PROD } from './support/accounts'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'
import {
  assertFocusVisible,
  dumpOutwardProfile,
  formatProfile,
  measureIndicatorContrast,
  settleForMeasurement,
  WCAG_NON_TEXT,
} from './support/pixel'

/**
 * #415 (Sprint 62) — L'indicateur de focus de `.mt-radio__dot` et
 * `.mt-switch__track` doit atteindre 3:1 (WCAG 1.4.11), MESURÉ AU PIXEL.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE CE SPEC PROUVE, ET QUE RIEN NE PROUVAIT AVANT
 * ─────────────────────────────────────────────────────────────────────────────
 * Avant #415, ces deux contrôles avaient pour UNIQUE indicateur de focus un
 * `box-shadow: var(--shadow-focus)` (= `0 0 0 3px var(--color-accent-soft)`),
 * mesuré à 1,23:1 en clair / 1,19:1 en sombre. Le contour global du DS
 * (`base.css`, `@layer base { :focus-visible }`) ne les rattrapait pas : leur
 * `<input>` réel est en `opacity:0; width:0; height:0`, donc le contour se
 * peignait sur 0×0 pixel.
 *
 * Aucun harnais en place ne pouvait voir ce défaut :
 *  · `jsdom` (Vitest) ne résout ni la précédence des `@layer` ni la peinture —
 *    c'est EXACTEMENT le mécanisme en cause ici ;
 *  · `control-border-tier.test.ts` ne lit que les déclarations `border*` du CSS
 *    source, jamais un état `:focus-visible` ni un pixel ;
 *  · `support/contrast.ts` part de `getComputedStyle` : il rend la couleur
 *    DÉCLARÉE, pas la couleur PEINTE, et ne dirait rien d'un contour rogné.
 * D'où la sonde `support/pixel.ts` (`PAT-S58-002`), livrée avec cette issue.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI DEUX MONTAGES DIFFÉRENTS (switch réel / radio synthétique)
 * ─────────────────────────────────────────────────────────────────────────────
 * Vérifié au démarrage du sprint, `grep` des consommateurs à l'appui :
 *  · `<Switch>` est monté UNE fois dans l'application, `EventEditForm.tsx:624`
 *    (toggle d'archivage, `data-testid="event-form-archived-toggle"`). C'est
 *    donc là — et là seulement — que porte la preuve sur écran réel.
 *  · `<Radio>` n'a AUCUN consommateur applicatif : le seul hit hors DS est
 *    `ui/radio.stories.tsx`. Il est dans le statut décrit par `DEC-S58-003`
 *    pour `.mt-check__box`. L'issue #415 et `docs/memory/decisions.md:437`
 *    affirment tous deux à tort qu'il est « en production ».
 *    Il n'existe donc AUCUN écran où le mesurer. On l'exerce par INJECTION DOM
 *    du markup exact de `ui/radio.tsx` dans une page réelle de l'application :
 *    la feuille du DS est la même, la cascade est la même, le moteur est le
 *    même — c'est bien la règle CSS livrée qui est mesurée. Ce que ce montage
 *    ne prouve pas, et qu'aucun montage ne peut prouver tant que le composant
 *    n'est pas consommé : qu'aucun ancêtre applicatif ne rogne le contour.
 *
 * ⚠ `PIT-S58-001` — le fond « adjacent » n'est PAS le `background-color` d'un
 * ancêtre. Chaque mesure ci-dessous fixe ses offsets sur un DUMP BRUT du profil
 * de pixels, imprimé dans la sortie du test, jamais sur une heuristique de
 * contraste maximal.
 *
 * ⚠ `PIT-S58-002` — l'état et l'instant font partie de la mesure :
 * `assertFocusVisible` (focus-visible vrai, non `disabled`) puis
 * `settleForMeasurement` (≥450 ms, transitions de couleur terminées).
 *
 * PRÉREQUIS RUNTIME : backend Spring + Postgres migré, front sur le port dont
 * l'origine est dans `app.cors.allowed-origins` (:3000 ou :3100).
 * Cf. `docs/memory/sprints/sprint-47/e2e-local-runbook.md`.
 */

test.use({ storageState: PROD.storageState })

/**
 * Amène le focus CLAVIER sur `target`.
 *
 * `locator.focus()` seul ne suffit pas : sur une `<input type=checkbox|radio>`,
 * un focus PROGRAMMATIQUE ne pose pas `:focus-visible` (la heuristique du moteur
 * ne l'accorde d'office qu'aux champs de saisie texte). On amorce donc une vraie
 * interaction clavier, puis on tabule jusqu'à la cible.
 *
 * On ne presse JAMAIS Espace : sur le toggle d'archivage, cela ouvrirait le
 * dialog de confirmation (#230) et changerait l'état qu'on veut mesurer.
 */
async function keyboardFocus(page: Page, target: Locator, maxTabs = 40): Promise<void> {
  await target.evaluate((el) => (el as HTMLElement).focus())
  for (let i = 0; i < maxTabs; i += 1) {
    const onTarget = await target.evaluate((el) => document.activeElement === el)
    if (onTarget && (await target.evaluate((el) => el.matches(':focus-visible')))) return
    await page.keyboard.press('Tab')
  }
  throw new Error(`focus clavier non atteint après ${maxTabs} tabulations`)
}

/**
 * Imprime le dump brut puis mesure, sur le côté droit indiqué.
 * Le dump est la JUSTIFICATION des offsets — sans lui, le ratio ne dit pas
 * comment il a été obtenu (`PIT-S58-001`).
 */
async function probe(
  page: Page,
  visual: Locator,
  label: string,
  side: 'top' | 'bottom' | 'left' | 'right',
  edgeGuardPx: number,
): Promise<number> {
  const profile = await dumpOutwardProfile(page, visual, side, 8, { edgeGuardPx, samples: 21 })
  const measurement = await measureIndicatorContrast(page, visual, {
    side,
    edgeGuardPx,
    samples: 21,
    // Centre du trait : `outline-offset:2px` + `outline-width:2px` -> [2,4[ px
    // vers l'extérieur. Le dump ci-dessus confirme la bande à chaque run.
    indicatorOffsetPx: 3,
    // Fond franc au-delà du trait, hors de toute frange d'anti-crénelage.
    adjacentOffsetPx: 6,
  })

  console.log(
    `\n[#415] ${label} — profil brut (côté ${side}, ${21} échantillons/ligne) :\n` +
      `${formatProfile(profile)}\n` +
      `[#415] ${label} — ${measurement.method}\n`,
  )

  expect(
    measurement.indicator.unanimity,
    `${label} : unanimité trop basse sur le trait (${(measurement.indicator.unanimity * 100).toFixed(0)}%) — ` +
      `on échantillonne probablement un arc ou un mauvais offset, le ratio ne vaut rien.\n` +
      `Profil :\n${formatProfile(profile)}`,
  ).toBeGreaterThanOrEqual(0.6)

  expect(
    measurement.ratio,
    `${label} : indicateur de focus sous le seuil WCAG 1.4.11.\n` +
      `${measurement.method}\nProfil brut :\n${formatProfile(profile)}`,
  ).toBeGreaterThanOrEqual(WCAG_NON_TEXT)

  return measurement.ratio
}

const SCHEMES = ['light', 'dark'] as const

for (const scheme of SCHEMES) {
  test.describe(`#415 contraste de l'indicateur de focus — thème ${scheme}`, () => {
    test.use({ colorScheme: scheme })

    test(`.mt-switch__track (toggle d'archivage, montage réel) atteint 3:1 en ${scheme}`, async ({
      page,
    }) => {
      const userId = await getUserId(page)
      const cat = await seedCategory(page, unique('Focus Cat'))
      const product = await seedProduct(page, {
        userId,
        name: unique('Focus Prod'),
        categoryId: cat.id,
      })

      await page.goto(`/fr/products/${product.id}`, { waitUntil: 'domcontentloaded' })
      await page.getByTestId('timeline-event').first().click()
      await page.getByTestId('event-drawer-edit').click()
      await expect(page.getByTestId('event-form')).toBeVisible()

      const input = page.getByTestId('event-form-archived-toggle')
      await expect(input).toBeVisible({ visible: false })
      // La piste visible est la SŒUR de l'input masqué (`ui/switch.tsx:17`).
      const track = input.locator('xpath=following-sibling::span[1]')
      await expect(track).toHaveClass(/mt-switch__track/)

      await keyboardFocus(page, input)
      await assertFocusVisible(input)
      await settleForMeasurement(page)

      // La piste fait 38×22 en `border-radius:999px` -> rayon 11 px : les côtés
      // gauche/droit sont ENTIÈREMENT des arcs, et la portion droite du bord haut
      // ne fait que 16 px. D'où `side:'top'` + `edgeGuardPx:12` (`PIT-S58-001`).
      const ratio = await probe(page, track, '.mt-switch__track', 'top', 12)
      expect(ratio).toBeGreaterThanOrEqual(WCAG_NON_TEXT)
    })

    test(`.mt-radio__dot (montage synthétique, aucun consommateur applicatif) atteint 3:1 en ${scheme}`, async ({
      page,
    }) => {
      await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })

      // Markup STRICTEMENT identique à `ui/radio.tsx` (input ligne 16, span 17).
      // Injecté dans une page réelle : même feuille DS, même cascade, même moteur.
      await page.evaluate(() => {
        const host = document.createElement('div')
        host.id = 'i415-radio-host'
        // Isolé du flux pour ne rien décaler, mais dans le repère de la page et
        // sur le fond de page réel — pas dans un conteneur à fond artificiel.
        host.style.cssText = 'position:fixed; top:120px; left:120px; z-index:1;'
        host.innerHTML =
          '<label class="mt-radio">' +
          '<input type="radio" name="i415" data-testid="i415-radio-input" />' +
          '<span class="mt-radio__dot" aria-hidden="true"></span>' +
          '<span>#415</span>' +
          '</label>'
        document.body.appendChild(host)
      })

      const input = page.getByTestId('i415-radio-input')
      const dot = input.locator('xpath=following-sibling::span[1]')
      await expect(dot).toHaveClass(/mt-radio__dot/)

      // Garde-fou `PIT-S59-004` / `PIT-S53-002` : prouver que la règle du DS est
      // bien APPLIQUÉE au markup injecté (un chunk CSS périmé rendrait un faux
      // vert silencieux). 18px + bordure `rule-emphasis` = la règle a mordu.
      const applied = await dot.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { width: cs.width, borderRadius: cs.borderRadius, borderWidth: cs.borderTopWidth }
      })
      expect(applied.width, 'la règle `.mt-radio__dot` du DS doit être appliquée').toBe('18px')

      await keyboardFocus(page, input)
      await assertFocusVisible(input)
      await settleForMeasurement(page)

      // `.mt-radio__dot` est un CERCLE (18×18, `border-radius:50%`) : il n'a
      // AUCUN côté droit. On échantillonne une bande étroite autour du point de
      // TANGENCE haut, où le trait est localement horizontal — au-delà de ±3,5 px
      // la courbure fait dériver le trait de plus d'un demi-pixel et
      // l'anti-crénelage dilue la lecture (`PIT-S58-001` : 3,19:1 lu sur un
      // bouton circulaire dont la couleur déclarée valait 3,70:1).
      const ratio = await probe(page, dot, '.mt-radio__dot', 'top', 7)
      expect(ratio).toBeGreaterThanOrEqual(WCAG_NON_TEXT)
    })
  })
}

/**
 * Garde-fou de non-régression sur la TECHNIQUE, pas seulement sur le ratio.
 * L'AC #415 exige que l'indicateur soit visible ALORS QUE l'`<input>` reste en
 * `opacity:0; width:0; height:0` — c'est ce qui distingue le correctif retenu
 * (porter le contour du DS sur la sœur visible) d'un correctif qui aurait
 * redimensionné l'input et déplacé le problème dans la mise en page.
 */
test('#415 — l’input reste masqué (0×0, opacity 0) : le correctif ne le redimensionne pas', async ({
  page,
}) => {
  await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    const host = document.createElement('div')
    host.innerHTML =
      '<label class="mt-switch"><input type="checkbox" role="switch" data-testid="i415-switch-input" />' +
      '<span class="mt-switch__track"><span class="mt-switch__thumb"></span></span></label>'
    document.body.appendChild(host)
  })
  const box = await page.getByTestId('i415-switch-input').evaluate((el) => {
    const cs = getComputedStyle(el)
    return { w: cs.width, h: cs.height, opacity: cs.opacity, position: cs.position }
  })
  expect(box, "l'<input> du switch doit rester masqué et sans surface").toEqual({
    w: '0px',
    h: '0px',
    opacity: '0',
    position: 'absolute',
  })
})
