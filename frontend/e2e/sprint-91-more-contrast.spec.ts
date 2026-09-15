import { test, expect } from './support/fixtures'
import { type Locator, type Page, type Route } from '@playwright/test'
import { ensureAuthenticated } from './support/auth'
import { PROD } from './support/accounts'
import { readStable, WCAG_AA_NON_TEXT } from './support/contrast'

/**
 * Sprint 91 (absorption tardive, triage /sprint end) — contraste du `⋯` des frises MOBILES.
 *
 * DÉFAUT CORRIGÉ : sur une BARRE de durée, le bouton `⋯` (`timeline-event-more`) recevait
 * en inline l'encre calculée pour le FOND de la barre (`eventInkColor`). Or le `⋯` est posé
 * À CÔTÉ de la barre, sur le fond de lane : après une barre claire en thème sombre, encre
 * `#0B0C0E` sur `#131519` = 1,07:1 (mesuré par le lead, portrait ET paysage). Symétrique en
 * thème clair avec une barre foncée à encre blanche. WCAG 1.4.11 : l'indicateur visuel d'un
 * contrôle exige ≥ 3:1.
 *
 * CE QUE JSDOM NE PEUT PAS PROUVER : la couleur RÉSOLUE (cascade DS + thème) et le fond
 * réellement peint sous le glyphe. D'où cette mesure sur rendu réel, 2 vues × 2 thèmes ×
 * 2 barres (claire, foncée).
 *
 * FIXTURE — listing produits STUBBÉ (motif `sprint-91-event-pin`), aucune écriture sur le
 * compte PROD. Deux barres de 3 j à aujourd'hui + 5 j (PIT-S91-005 : dans la bande rendue).
 *
 * MESURE — `readStable` (fond composité des ancêtres). Seule adaptation : la lane porte la
 * grille en `background-image` (filet `--color-rule` de 1 px), que le helper refuse de
 * traverser (il ne sait compositer que des aplats). On neutralise CE SEUL dégradé, après
 * avoir vérifié que c'est bien lui, pour mesurer contre l'aplat de lane — le filet est
 * décoratif et ne passe pas sous le glyphe centré.
 */

test.use({ storageState: PROD.storageState })

const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/
const EVENT_OFFSET_DAYS = 5

const BARS = [
  // Barre CLAIRE → encre de barre sombre : c'est elle qui tombait à 1,07:1 en thème sombre.
  { title: 'S91 Barre claire', color: '#A7B83A' },
  // Barre FONCÉE → encre de barre blanche : même défaut, en thème clair.
  { title: 'S91 Barre foncée', color: '#1D4ED8' },
] as const

function isoDay(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const uuid = (prefix: string, n: number) =>
  `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`

const CAT = { id: uuid('91a59900', 1), name: 'S91 Contraste', color: '#1D4ED8' }

const PRODUCTS = BARS.map((bar, i) => {
  const id = uuid('91b59900', i + 1)
  return {
    id,
    name: `S91 Prod ${i + 1}`,
    color: null,
    category: CAT,
    events: [
      {
        id: uuid('91c59900', i + 1),
        title: bar.title,
        type: 'duration',
        startDate: isoDay(EVENT_OFFSET_DAYS),
        endDate: isoDay(EVENT_OFFSET_DAYS + 3),
        productId: id,
        color: bar.color,
        archived: false,
      },
    ],
  }
})

async function stubProducts(page: Page): Promise<void> {
  await page.route(PRODUCTS_LIST_RE, async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(PRODUCTS),
    })
  })
}

/** `⋯` du wrap qui porte la barre `title` (testids existants seulement, PIT-S46-001). */
function moreOf(page: Page, title: string): Locator {
  const bar = page.locator(`[data-testid="timeline-event"][data-event-title="${title}"]`)
  return page.locator('.mt-tlm__evt-wrap').filter({ has: bar }).getByTestId('timeline-event-more')
}

for (const scheme of ['light', 'dark'] as const) {
  for (const variant of [
    { name: 'portrait', viewport: { width: 390, height: 844 } },
    { name: 'landscape', viewport: { width: 844, height: 520 } },
  ] as const) {
    test.describe(`⋯ mobile ${variant.name} — thème ${scheme}`, () => {
      test.use({ viewport: variant.viewport, colorScheme: scheme })

      test('le `⋯` d’une barre claire ET d’une barre foncée reste ≥ 3:1 sur la lane', async ({
        page,
      }) => {
        await stubProducts(page)
        await ensureAuthenticated(page)
        await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
        await expect(page.getByTestId(`timeline-mobile-${variant.name}`)).toBeVisible()
        // Le thème mesuré est bien celui annoncé (next-themes, attribute="class").
        if (scheme === 'dark') await expect(page.locator('html')).toHaveClass(/\bdark\b/)
        else await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
        await page.mouse.move(0, 0)

        for (const bar of BARS) {
          const tag = `[${variant.name}/${scheme}/${bar.title}]`
          const more = moreOf(page, bar.title)
          await expect(more, `${tag} ⋯ monté`).toHaveCount(1)
          await more.evaluate((el) =>
            el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }),
          )

          // Neutralise la grille de la lane (seul dégradé traversé), après l'avoir identifiée.
          const gradients = await more.evaluate((el) => {
            const found: string[] = []
            for (let n: Element | null = el; n; n = n.parentElement) {
              const img = getComputedStyle(n).backgroundImage
              if (img !== 'none') {
                found.push(`${n.className}|${img.slice(0, 16)}`)
                if (n.classList.contains('mt-tlm__lane')) {
                  ;(n as HTMLElement).style.backgroundImage = 'none'
                }
              }
            }
            return found
          })
          expect(gradients, `${tag} seul dégradé traversé = grille de lane`).toEqual([
            expect.stringMatching(/^mt-tlm__lane\|linear-gradient/),
          ])

          // Le glyphe hérite bien de la couleur du bouton (stroke = currentColor).
          const { buttonColor, stroke, inline } = await more.evaluate((el) => ({
            buttonColor: getComputedStyle(el).color,
            stroke: getComputedStyle(el.querySelector('svg')!).stroke,
            inline: (el as HTMLElement).style.color,
          }))
          expect(stroke, `${tag} stroke du glyphe = color du bouton`).toBe(buttonColor)

          const r = await readStable(more)
          test.info().annotations.push({
            type: 'contraste',
            description: `${tag} ${r.foreground} sur ${r.background} = ${r.ratio.toFixed(2)}:1`,
          })
          expect(
            r.ratio,
            `${tag} ⋯ ${r.foreground} sur ${r.background} = ${r.ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(WCAG_AA_NON_TEXT)
          expect(r.effectiveOpacity, `${tag} opacité pleine`).toBe(1)
          // Garde du MOTIF, après la mesure (qui reste le verdict) : pas d'encre inline.
          expect(inline, `${tag} aucune encre inline`).toBe('')
        }
      })
    })
  }
}
