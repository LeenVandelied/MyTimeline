import { test, expect } from './support/fixtures'
import { type Locator, type Page } from '@playwright/test'
import { PROD } from './support/accounts'
import { sessionState } from './support/session'
import { ensureAuthenticated } from './support/auth'
import { waitForFonts } from './support/contrast'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * Sprint 114 — #825 : dans « Tes produits » (tableau de bord desktop), le nom d'un
 * produit long s'écrasait (« K. ») ou disparaissait quand son prochain événement était
 * long lui aussi.
 *
 * Testids couverts (2, posés par #825 dans `ProductList.tsx`) :
 *   `dashboard-product-list-name` — nom du produit, dans chaque ligne
 *   `dashboard-product-list-next` — « prochain événement · date » (ou repli « aucune
 *                                   échéance »), dans chaque ligne
 * (+ `dashboard-product-list-row-{id}`, préexistant, pour cibler la ligne semée.)
 *
 * POURQUOI UN E2E : jsdom ne calcule aucune largeur. `ProductList.test.tsx` verrouille
 * la structure (nom en base auto plafonné à 60 %, secondaire élastique rogné) ; seule
 * une mise en page réelle dit si le nom reçoit sa part. Une absence de débordement ne
 * suffit pas : le défaut d'origine avait `scrollWidth === clientWidth` partout et un
 * nom à 0 px (PIT-S85, #602 : « mesurer la largeur de l'élément élastique aux
 * paliers »). On MESURE donc la largeur du nom.
 *
 * ORACLES (rangée = `<li>` de l'aside, 280 px à ≥ 1024 px) :
 *   (a) le nom occupe ≥ NAME_MIN_RATIO (40 %) de la rangée — OU il est affiché en
 *       entier (un nom court n'a pas à remplir 40 %). Le correctif plafonne le nom à
 *       60 % : le seuil 40 % laisse une marge à la police sans accepter le défaut
 *       (0 px / « K. » ≈ 8 px, soit < 3 %).
 *   (b) le secondaire reste VISIBLE (≥ NEXT_MIN_PX) et se rogne avec « … » :
 *       `text-overflow: ellipsis` calculé ET `scrollWidth > clientWidth` (la sonde de
 *       débordement est `scrollWidth - clientWidth`, PIT-S77-002) ; son texte commence
 *       au bord de début de sa boîte (l'ellipse est en FIN, pas le début rogné).
 *   (c) ordre et confinement : nom < secondaire < compteur sans chevauchement, le
 *       compteur dans la rangée ; aucun débordement horizontal de page.
 *
 * DONNÉES : 2 produits semés sur PROD via les helpers de `support/products.ts`
 * (catégorie + produit + un événement, dont le titre = le nom du produit, J+20 pour
 * qu'il soit « prochain »). Noms SANS suffixe unique — leur longueur est l'objet du
 * test ; la ligne est ciblée par l'id. La fixture `seedIsolation` purge les semis en
 * fin de test, échec compris (#463, cf. `deleteProduct`).
 *   - `Kraftfahrzeughaftpflichtversicherung` : cas mesuré au S109 (nom réduit à « K. »).
 *   - `Wohnungsmietvertrag` : cas du nom totalement invisible.
 *
 * Mesures, pas captures : aucune référence visuelle n'est créée ni modifiée.
 */

test.use({ storageState: sessionState(PROD), timezoneId: 'Europe/Paris' })

const LOCALES = ['fr', 'de'] as const
const WIDTHS = [1024, 1280] as const

const NAMES = ['Kraftfahrzeughaftpflichtversicherung', 'Wohnungsmietvertrag'] as const

/** Part minimale de la rangée garantie au nom (correctif : plafond à 60 %). */
const NAME_MIN_RATIO = 0.4
/** Largeur minimale du secondaire rogné : il doit rester lisible (« Neb… »). */
const NEXT_MIN_PX = 24

/** `YYYY-MM-DD` local, J+`offset`. */
function isoDay(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

interface Box {
  left: number
  right: number
  width: number
  scrollWidth: number
  clientWidth: number
  textOverflow: string
  /** Bord gauche du 1er caractère du 1er nœud texte (null si aucun texte). */
  firstCharLeft: number | null
}

async function measure(locator: Locator): Promise<Box> {
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let first: Node | null = walker.nextNode()
    while (first && !(first.textContent ?? '').trim()) first = walker.nextNode()
    let firstCharLeft: number | null = null
    if (first && first.textContent) {
      // Range sur le 1er caractère : il ignore le rognage `overflow:hidden` (PIT-S77-002),
      // c'est précisément ce qu'on veut ici — savoir OÙ commence le texte, pas s'il déborde.
      const offset = first.textContent.search(/\S/)
      const range = document.createRange()
      range.setStart(first, offset)
      range.setEnd(first, offset + 1)
      firstCharLeft = range.getBoundingClientRect().left
    }
    return {
      left: r.left,
      right: r.right,
      width: r.width,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      textOverflow: getComputedStyle(el).textOverflow,
      firstCharLeft,
    }
  })
}

async function expectNoPageOverflow(page: Page): Promise<void> {
  const doc = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(doc.scrollWidth, 'débordement horizontal de page').toBeLessThanOrEqual(doc.innerWidth)
}

async function seedLongProducts(page: Page): Promise<string[]> {
  const userId = await getUserId(page)
  const cat = await seedCategory(page, unique('825 Cat'))
  const eventDate = isoDay(20)
  const ids: string[] = []
  for (const name of NAMES) {
    const p = await seedProduct(page, { userId, name, categoryId: cat.id, eventDate })
    ids.push(p.id)
  }
  return ids
}

for (const locale of LOCALES) {
  for (const width of WIDTHS) {
    test.describe(`#825 — desktop ${width} · ${locale}`, () => {
      test.use({ viewport: { width, height: 900 } })

      test(`le nom long garde sa part, le prochain événement se rogne · ${locale} · ${width}`, async ({
        page,
      }) => {
        await ensureAuthenticated(page)
        const ids = await seedLongProducts(page)

        await page.goto(`/${locale}/dashboard`, { waitUntil: 'domcontentloaded' })
        await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: 30_000 })
        // Desktop (≥ 768 px) : c'est `ProductList` qui est monté, pas le carrousel mobile.
        await expect(page.getByTestId('dashboard-product-list')).toBeVisible()
        await waitForFonts(page)

        for (const [i, id] of ids.entries()) {
          const label = `${NAMES[i]} (${locale}, ${width} px)`
          const row = page.getByTestId(`dashboard-product-list-row-${id}`)
          await row.scrollIntoViewIfNeeded()
          await expect(row).toBeVisible()
          const nameEl = row.getByTestId('dashboard-product-list-name')
          const nextEl = row.getByTestId('dashboard-product-list-next')
          await expect(nameEl).toHaveText(NAMES[i])
          // Le titre de l'événement semé = le nom du produit : c'est bien le prochain
          // événement qui est affiché, pas le repli « aucune échéance ».
          await expect(nextEl).toContainText(NAMES[i])
          await expect(nextEl.locator('time')).toHaveCount(1)

          const rowBox = await measure(row)
          const name = await measure(nameEl)
          const next = await measure(nextEl)
          const count = await measure(row.locator(':scope > span').last())

          // (a) Le nom reçoit sa part : ≥ 40 % de la rangée, ou affiché en entier.
          const fullyShown = name.scrollWidth <= name.clientWidth + 1
          expect(
            fullyShown || name.width >= rowBox.width * NAME_MIN_RATIO,
            `${label} : nom écrasé — ${name.width.toFixed(1)} px sur une rangée de ` +
              `${rowBox.width.toFixed(1)} px (seuil ${NAME_MIN_RATIO * 100} %), ` +
              `scrollWidth ${name.scrollWidth}`,
          ).toBe(true)
          if (i === 0) {
            // Le nom de 36 lettres ne tient jamais dans 280 px avec son secondaire :
            // c'est LE cas du défaut, il doit atteindre le seuil (pas seulement « tenir »).
            expect(name.width, `${label} : nom long sous le seuil`).toBeGreaterThanOrEqual(
              rowBox.width * NAME_MIN_RATIO,
            )
          }

          // (b) Le secondaire reste visible, rogné avec « … » en fin.
          expect(next.textOverflow, `${label} : secondaire sans ellipse`).toBe('ellipsis')
          expect(next.width, `${label} : secondaire réduit à rien`).toBeGreaterThanOrEqual(
            NEXT_MIN_PX,
          )
          if (i === 0) {
            expect(
              next.scrollWidth,
              `${label} : le secondaire long devrait être rogné`,
            ).toBeGreaterThan(next.clientWidth)
          }
          expect(next.firstCharLeft, `${label} : secondaire sans texte`).not.toBeNull()
          expect(
            next.firstCharLeft ?? Number.NaN,
            `${label} : le début du secondaire est rogné (texte aligné à la fin)`,
          ).toBeGreaterThanOrEqual(next.left - 1)

          // (c) Ordre, non-chevauchement, confinement dans la rangée.
          expect(name.right, `${label} : nom sur le secondaire`).toBeLessThanOrEqual(
            next.left + 0.5,
          )
          expect(next.right, `${label} : secondaire sur le compteur`).toBeLessThanOrEqual(
            count.left + 0.5,
          )
          expect(count.right, `${label} : compteur hors rangée`).toBeLessThanOrEqual(
            rowBox.right + 0.5,
          )
          expect(count.scrollWidth, `${label} : compteur rogné`).toBeLessThanOrEqual(
            count.clientWidth + 1,
          )
        }

        await expectNoPageOverflow(page)
      })
    })
  }
}
