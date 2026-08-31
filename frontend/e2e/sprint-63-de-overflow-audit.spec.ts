import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import { waitForFonts } from './support/contrast'
import { devToolingSelectors, neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { ensureAuthenticated } from './support/auth'
import { PROD, SHARED } from './support/accounts'
import { getUserId, seedCategory, seedProduct, todayIsoDate } from './support/products'

/**
 * #74 — AUDIT des débordements de mise en page en locale `de` sur les trois
 * écrans applicatifs : frise (`timeline`), formulaire d'événement, réglages.
 *
 * POURQUOI CE FICHIER EXISTE, ET CE QU'IL N'EST PAS.
 * `landing-mobile-overflow.spec.ts` (#341) verrouille déjà la LANDING. Aucun
 * équivalent n'existait pour les écrans AUTHENTIFIÉS — or c'est là que vivent
 * les libellés de formulaire, les onglets et les listes de réglages, c'est-à-dire
 * exactement les surfaces que l'allemand (+30 % de longueur, mots composés)
 * met en tension. L'issue #74 demandait à l'origine d'appliquer des utilitaires
 * `ds/components/i18n.css` ; vérification faite, 7 de ses 8 sections n'ont
 * AUCUN consommateur applicatif, donc rien à activer. L'issue a été re-scopée
 * en audit, et ce fichier en est l'instrument.
 *
 * ⚠ MÉTHODE DE MESURE — `PIT-S52-001`. Les métriques de police diffèrent entre
 * macOS et Ubuntu et `de` est la locale la plus large : les Sprints 49 et 52 ont
 * TOUS DEUX conclu « écart 0 partout » depuis macOS et la CI Ubuntu les a
 * démentis. Ce fichier n'a de valeur QUE joué dans
 * `mcr.microsoft.com/playwright:v1.61.1-jammy`, `--workers=1`.
 *
 * ⚠ GRILLE DE LARGEURS — `PIT-S59-001` + découverte de #423. Un désalignement de
 * paliers ne prédit pas où le défaut sort : il faut mesurer les DEUX côtés d'un
 * seuil. En Tailwind v4 `max-[Npx]` compile en `width < N` (et non `<= N`), donc
 * le palier compact s'arrête à `N-1` et `N` est un SECOND CREUX LOCAL. D'où
 * 359/360 (seul palier `max-[]` du dépôt, `HeaderSection.tsx`) et 1023/1024
 * (seuil `lg`, où la sidebar `hidden lg:flex` apparaît et redistribue toute la
 * largeur utile des trois écrans).
 *
 * ⚠ EXCLUSION D'OUTILLAGE — `PIT-S59-002`. Un balayage
 * `getBoundingClientRect().right > clientWidth` sous `next dev` remonte le bouton
 * flottant des TanStack Query Devtools et l'overlay Next, dont le décalage SUIT
 * la largeur du viewport : indiscernable d'un vrai défaut, et c'est ce faux
 * positif qui a produit #341. La liste vit dans `support/dev-tooling.ts`
 * (source unique). N'y ajouter AUCUN sélecteur applicatif.
 */

/**
 * 320 = plus petit mobile supporté ; 359/360 = frontière du palier `max-[360px]`
 * (cf. supra) ; 375/390/414 = mobiles courants ; **640/641 = frontière de la
 * frise** — `TimelineResponsive.tsx:42` bascule en `matchMedia
 * '(max-width: 640px) and (orientation: portrait)'`, donc 640 rend la frise
 * MOBILE et 641 la frise DESKTOP, deux arbres DOM différents ; 768 = tablette ;
 * 1023/1024 = frontière `lg` (apparition de la sidebar 248 px) ; 1280 = desktop.
 *
 * Le couple 640/641 a été ajouté APRÈS coup : la grille sautait de 414 à 768 et
 * était donc aveugle au seul seuil qui change l'arbre rendu de la frise. C'est
 * exactement le reproche de `PIT-S59-001` (« mesurer les DEUX côtés du seuil »).
 */
const WIDTHS = [320, 359, 360, 375, 390, 414, 640, 641, 768, 1023, 1024, 1280] as const

/** Les 4 locales du dépôt. `de` est la plus large, `fr` la principale. */
const LOCALES = ['fr', 'en', 'es', 'de'] as const

/**
 * BASCULE DE LA FRISE — les media queries de `TimelineResponsive.tsx:44-46`,
 * recopiées ici parce que le composant ne les exporte pas.
 *
 * ⚠ CE QUI CLOCHAIT (rouge CI du S63, job e2e passé de ~15 à 42 min).
 * La série `event-form` détectait le chemin par
 * `getByTestId('timeline-event-more').count()` juste après `product-detail-view`.
 * Deux raisons rendent ce compte NUL alors que la frise mobile est bien celle
 * qui sera rendue : (a) `count()` NE PATIENTE PAS, et le bouton « ⋯ » n'existe
 * qu'une fois les événements arrivés ; (b) `useMediaQuery` rend `false` au
 * PREMIER rendu (`useMediaQuery.ts:20`, SSR-safe) — la frise est donc DESKTOP
 * tant que l'effet d'hydratation n'a pas basculé. Le test prenait alors la
 * branche desktop en portrait, cliquait la pastille (`timeline-event` existe
 * dans les DEUX variantes, et ce clic-là patiente), puis attendait
 * `event-drawer-edit` — que `TimelineMobilePortrait` ne monte JAMAIS — jusqu'au
 * budget de 300 s. D'où 3 flaky + 1 échec dur, et des attentes de 5 min.
 *
 * CE QU'ON FAIT À LA PLACE. On pose au navigateur les MÊMES requêtes, avec la
 * MÊME priorité que le composant (paysage > portrait > desktop) : `matchMedia`
 * est exact dès `setViewportSize` et ne doit RIEN à l'hydratation, donc la
 * détection n'est plus une course. On attend ensuite la RACINE de la variante
 * déduite avec un budget COURT : cette attente VÉRIFIE la déduction au lieu de
 * la supposer. Si la bascule du composant divergeait un jour de ces requêtes,
 * le test échoue en 20 s avec un message qui nomme la largeur, la locale et la
 * racine manquante — au lieu d'expirer à 300 s sur un locator muet.
 */
const MOBILE_PORTRAIT_QUERY = '(max-width: 640px) and (orientation: portrait)'
const MOBILE_LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 600px)'

type TimelineVariant = 'portrait' | 'landscape' | 'desktop'

/** Racine rendue par chaque variante — montée même sans aucun événement. */
const TIMELINE_ROOT_TESTID: Record<TimelineVariant, string> = {
  portrait: 'timeline-mobile-portrait',
  landscape: 'timeline-mobile-landscape',
  desktop: 'timeline-view',
}

/**
 * Budget des étapes de NAVIGATION du parcours d'édition (routage vers le bon
 * chemin, ouverture de la feuille/du tiroir).
 *
 * ⚠ NE PAS ALLONGER. Il est court EXPRÈS : le défaut par défaut de Playwright
 * pour `locator.click()` est `actionTimeout: 0` — aucun budget propre, donc
 * l'échec remonte au budget du TEST (300 s ici). C'est précisément ce qui a
 * transformé une erreur de routage en attente de 5 min répétée par les retries.
 * Un chemin correct s'ouvre en moins d'une seconde ; si 20 s ne suffisent pas,
 * c'est le routage ou le composant qu'il faut corriger, pas ce nombre.
 * Cf. `PIT-S54-001` (un budget mal posé rend le diagnostic inatteignable).
 */
const PATH_TIMEOUT_MS = 20_000

/**
 * Variante de frise que `TimelineResponsive` VA rendre à la taille courante.
 *
 * Interrogée dans la page, pas déduite d'un seuil recalculé côté test : c'est la
 * même primitive (`window.matchMedia`) que celle du composant.
 */
async function resolveTimelineVariant(page: Page): Promise<TimelineVariant> {
  return page.evaluate<TimelineVariant, { portrait: string; landscape: string }>(
    ({ portrait, landscape }) => {
      // Même ordre de priorité que `TimelineResponsive` : paysage d'abord.
      if (window.matchMedia(landscape).matches) return 'landscape'
      if (window.matchMedia(portrait).matches) return 'portrait'
      return 'desktop'
    },
    { portrait: MOBILE_PORTRAIT_QUERY, landscape: MOBILE_LANDSCAPE_QUERY },
  )
}

/** Tolérance sub-pixel : les arrondis de rendu produisent des écarts < 1 px. */
const SUBPIXEL_TOLERANCE_PX = 0.5

interface Offender {
  tag: string
  id: string
  cls: string
  right: number
  width: number
}

/**
 * Texte coupé par son propre conteneur.
 *
 * `silent` = coupé SANS ellipsis (`text-overflow: clip`) : le mot s'arrête net,
 * rien n'indique au lecteur qu'il manque du texte. `titled` dit si le contenu
 * complet reste atteignable (attribut `title` ou `aria-label`), ce qui est la
 * contrepartie que `ds/components/i18n.css` §4 impose à `.mt-truncate` et que
 * `OfflineBanner` respecte déjà.
 */
interface Truncation {
  tag: string
  cls: string
  textStart: string
  scrollWidth: number
  clientWidth: number
  textOverflow: string
  titled: boolean
  silent: boolean
}

interface Measurement {
  screen: string
  locale: string
  width: number
  clientWidth: number
  scrollWidth: number
  maxScrollX: number
  offenders: Offender[]
  truncations: Truncation[]
  note?: string
}

/**
 * Nom de fixture COURT et sécable — ne pas utiliser `unique()` ici.
 *
 * ⚠ CE PIÈGE A DÉJÀ FAUSSÉ CET AUDIT UNE FOIS. `unique()` (`support/products.ts:40`)
 * produit `${prefix} ${Date.now()}${rand}`, soit un jeton de **16 chiffres
 * insécable**. Rendu dans le `<h1 class="text-xl">` du détail produit
 * (`ProductDetailView.tsx:302`), il mesure 290 à 310 px et faisait déborder la
 * page sous 375 px — dans les QUATRE locales. Lu trop vite, cela ressemblait à un
 * défaut du formulaire d'événement en `de` ; c'était la fixture qui débordait,
 * pas l'écran. Cf. `PIT-S61-004` (le phénomène est réel, l'exemplaire est faux)
 * et `jsdom-scroll-tests-prove-nothing` (vérifier l'arithmétique de la fixture
 * avant d'accuser le code).
 *
 * Base 36 + suffixe court : unicité conservée sur le compte partagé PROD, sans
 * jeton insécable.
 */
function shortName(prefix: string): string {
  return `${prefix} ${Date.now().toString(36).slice(-4)}${Math.floor(Math.random() * 90 + 10)}`
}

/**
 * Budget de temps EXPLICITE — `PIT-S54-001` : un test dont le coût dépasse le
 * budget par défaut (30 s) expire toujours, et son diagnostic devient
 * inatteignable. Ici UN test parcourt jusqu'à 12 largeurs, et la série
 * `event-form` recharge la page produit à chaque largeur (~5 s l'unité, soit
 * ~60 s au pire) : 12 × 5 s + navigations + marge => 300 s.
 */
test.beforeEach(({}, testInfo) => {
  testInfo.setTimeout(300_000)
})

/**
 * Relève, en une seule passe dans la page : le débordement horizontal du
 * document, les éléments dépassant le bord droit, et les textes coupés.
 */
async function measure(page: Page, screen: string, locale: string, width: number, note?: string) {
  const data = await page.evaluate(
    ({ tolerance, tooling }) => {
      const docEl = document.documentElement
      const clientWidth = docEl.clientWidth
      const offenders: Offender[] = []
      const truncations: Truncation[] = []

      for (const el of Array.from(document.querySelectorAll('*'))) {
        // Outillage de DÉVELOPPEMENT uniquement (cf. `support/dev-tooling.ts`).
        // `closest` teste aussi l'élément lui-même.
        if (tooling.some((sel) => el.closest(sel))) continue

        const rect = el.getBoundingClientRect()
        if (rect.width === 0 && rect.height === 0) continue

        /**
         * CONTENU D'UN DÉFILEUR HORIZONTAL LÉGITIME — sinon l'audit est noyé.
         *
         * La frise EST un rail défilant par construction : à 320 px,
         * `.mt-tlm__rail` mesure 732 px et ses graduations finissent bien au-delà
         * du bord droit. Un balayage naïf `rect.right > clientWidth` les compte
         * toutes (mesuré : 9 à 16 « débordements » par largeur, tous faux) alors
         * que `documentElement.scrollWidth === clientWidth` et `maxScrollX === 0`
         * — la PAGE ne déborde pas, c'est un conteneur interne qui défile.
         *
         * Un élément n'est donc un débordement de PAGE que si aucun ancêtre ne le
         * contient (`overflow-x` `auto`/`scroll`/`hidden`). Même famille que
         * `PIT-S59-002` : sans exclusion motivée, l'instrument fabrique le défaut
         * qu'il prétend trouver.
         */
        // ⚠ La remontée s'arrête AVANT `<body>`/`<html>`. Radix pose un
        // scroll-lock (`overflow` sur `body`) quand un Dialog est ouvert : inclure
        // `body` dans la remontée déclarait « contenu » TOUT le document dès qu'une
        // modale était ouverte, et masquait donc l'élément fautif du formulaire
        // d'événement (relevé : 0 offender alors que `maxScrollX` valait 52).
        // Le débordement de PAGE est précisément ce que mesure
        // `documentElement.scrollWidth` — `body` n'est pas un conteneur légitime ici.
        let contained = false
        for (
          let p = el.parentElement;
          p && p !== docEl && p !== document.body;
          p = p.parentElement
        ) {
          const ox = getComputedStyle(p).overflowX
          if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') {
            contained = true
            break
          }
        }
        if (contained) continue

        if (rect.right > clientWidth + tolerance) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            id: el.id,
            cls: (el.getAttribute('class') ?? '').slice(0, 90),
            right: Math.round(rect.right * 100) / 100,
            width: Math.round(rect.width * 100) / 100,
          })
        }

        // Troncature : on ne considère que les FEUILLES textuelles, sinon tout
        // conteneur scrollable remonterait et noierait le signal.
        // `.sr-only` est un masquage VISUEL délibéré (clip 1×1 px pour lecteurs
        // d'écran) : son `scrollWidth > clientWidth` est le fonctionnement normal
        // du motif, pas une troncature. Sans cette exclusion l'audit remonte 4
        // faux positifs (« Sprache ändern » & co, clientWidth = 1 px).
        if (el.childElementCount === 0 && !el.closest('.sr-only')) {
          const text = (el.textContent ?? '').trim()
          if (text.length > 0 && el.scrollWidth > el.clientWidth + 1) {
            const style = getComputedStyle(el)
            const titled =
              el.hasAttribute('title') ||
              el.hasAttribute('aria-label') ||
              !!el.closest('[title],[aria-label]')
            truncations.push({
              tag: el.tagName.toLowerCase(),
              cls: (el.getAttribute('class') ?? '').slice(0, 90),
              textStart: text.slice(0, 60),
              scrollWidth: el.scrollWidth,
              clientWidth: el.clientWidth,
              textOverflow: style.textOverflow,
              titled,
              silent: style.textOverflow !== 'ellipsis',
            })
          }
        }
      }

      // Sonde de défilement RÉEL : Chromium clampe `scrollX`, une page sans
      // débordement renvoie donc 0. (jsdom ne clampe pas — d'où l'E2E.)
      const previousY = window.scrollY
      window.scrollTo(5_000, previousY)
      const maxScrollX = window.scrollX
      window.scrollTo(0, previousY)

      return { clientWidth, scrollWidth: docEl.scrollWidth, maxScrollX, offenders, truncations }
    },
    { tolerance: SUBPIXEL_TOLERANCE_PX, tooling: devToolingSelectors() },
  )

  const row: Measurement = { screen, locale, width, ...data, note }
  // Écriture INCRÉMENTALE (JSONL) et non un dump en `afterAll` : Playwright
  // redémarre le worker après un échec, ce qui remet `REPORT` à zéro — un dump
  // final a déjà écrasé le relevé de 3 écrans par celui du seul worker survivant.
  // Une ligne par mesure survit à tout redémarrage.
  const out = process.env.AUDIT_OUT
  if (out) fs.appendFileSync(out, JSON.stringify(row) + '\n', 'utf8')
  return data
}

/**
 * GARDE ARMÉE — sans elle ce fichier ne serait qu'un enregistreur.
 *
 * `PIT-S62-003` / `coverage-check-vert-ne-prouve-rien` : un garde-fou qui ne peut
 * pas rougir est un décor. Ces assertions passent aujourd'hui sur les 164 mesures
 * d'écran (relevé 2026-08-31, jammy) ; elles rougiront si un futur libellé, une
 * police ou un palier réintroduit un débordement de page.
 *
 * Le contrôle négatif de l'issue #74 les a vues rouges : avec l'ancien pied de page
 * (`flex space-x-4`), `settings`/`de` sortait 344 > 320 à 320 px.
 */
function expectNoPageOverflow(
  data: { clientWidth: number; scrollWidth: number; maxScrollX: number; offenders: Offender[] },
  screen: string,
  locale: string,
  width: number,
) {
  const where = `${screen} · ${locale} · ${width}px`
  expect(
    data.scrollWidth,
    `${where} : débordement horizontal de page — scrollWidth ${data.scrollWidth} > clientWidth ${data.clientWidth}. ` +
      `Éléments débordants : ${JSON.stringify(data.offenders)}`,
  ).toBeLessThanOrEqual(data.clientWidth)
  expect(data.maxScrollX, `${where} : la page défile latéralement de ${data.maxScrollX}px`).toBe(0)
  expect(
    data.offenders,
    `${where} : éléments dépassant le bord droit — ${JSON.stringify(data.offenders)}`,
  ).toEqual([])
}

/** Mesure au repos : un élément survolé peut être mesuré dans un état élargi. */
async function settle(page: Page) {
  await waitForFonts(page)
  await page.mouse.move(0, 0)
}

/* ------------------------------------------------------------------ FRISE */

test.describe('#74 — frise chronologique', () => {
  test.use({ storageState: PROD.storageState })

  for (const locale of LOCALES) {
    test(`timeline · ${locale} · ${WIDTHS.length} largeurs`, async ({ page }) => {
      await ensureAuthenticated(page)

      // `timeline-host` n'est monté que si les données sont chargées ET NON VIDES :
      // auditer une frise vide ne mesurerait que l'état vide. On seede donc une
      // pastille datée d'AUJOURD'HUI (la frise défile sur le jour courant ; sans
      // cette date la pastille naît hors écran, cf. timeline-mobile.spec.ts:58-63).
      const userId = await getUserId(page)
      const category = await seedCategory(page, shortName('TL'))
      await seedProduct(page, {
        userId,
        name: shortName('TL'),
        categoryId: category.id,
        eventDate: todayIsoDate(),
      })

      await page.goto(`/${locale}/timeline`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId('timeline-screen')).toBeVisible({ timeout: 30_000 })
      await expect(page.getByTestId('timeline-host')).toBeVisible({ timeout: 30_000 })

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 800 })
        await settle(page)
        expectNoPageOverflow(await measure(page, 'timeline', locale, width), 'timeline', locale, width)
      }
    })
  }
})

/* -------------------------------------------------------------- RÉGLAGES */

test.describe('#74 — réglages', () => {
  test.use({ storageState: SHARED.storageState })

  for (const locale of LOCALES) {
    test(`settings · ${locale} · ${WIDTHS.length} largeurs`, async ({ page }) => {
      await ensureAuthenticated(page)
      await page.goto(`/${locale}/settings`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId('settings-page')).toBeVisible({ timeout: 30_000 })

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 800 })
        await settle(page)
        // Sous 768 px l'écran rend le drill-down `settings-index` ; au-dessus, la
        // tablist. On mesure ce qui est réellement monté, sans le présupposer.
        const shell = (await page.getByTestId('settings-tablist').count())
          ? 'tablist'
          : 'index'
        const m = await measure(page, 'settings', locale, width, `coquille=${shell}`)
        expectNoPageOverflow(m, 'settings', locale, width)
      }
    })
  }
})

/* --------------------------------------------------- FORMULAIRE ÉVÉNEMENT */

test.describe('#74 — formulaire d’événement', () => {
  test.use({ storageState: PROD.storageState })

  for (const locale of LOCALES) {
    test(`event-form · ${locale} · ${WIDTHS.length} largeurs`, async ({ page }) => {
      // Le bouton flottant des Query Devtools intercepte le clic sur
      // `event-drawer-edit` (mesuré : 42 tentatives repoussées). La CI tourne
      // sur `next dev`, donc il y est présent. Neutralisé pour le POINTEUR
      // seulement — la mesure continue de l'exclure par `closest()`.
      await neutralizeDevToolingPointerEvents(page)
      await ensureAuthenticated(page)
      const userId = await getUserId(page)
      const category = await seedCategory(page, shortName('Ev'))
      const product = await seedProduct(page, {
        userId,
        name: shortName('Ev'),
        categoryId: category.id,
        eventDate: todayIsoDate(),
      })

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 800 })
        await page.goto(`/${locale}/products/${product.id}`, { waitUntil: 'domcontentloaded' })
        // 30 s et non le défaut 5 s : sous `next dev` la route produit est
        // compilée À LA DEMANDE au premier passage d'une locale, ce qui dépasse
        // régulièrement 5 s et faisait échouer la série à 320 px — un artefact
        // du serveur de dev, pas un défaut de mise en page.
        await expect(page.getByTestId('product-detail-view')).toBeVisible({ timeout: 30_000 })

        /**
         * DEUX chemins RÉELLEMENT DISTINCTS, et le chemin desktop N'EXISTE PAS
         * en portrait mobile : `event-drawer-edit` n'est rendu que par
         * `EventDrawer`, monté par le seul `TimelineView` desktop
         * (`TimelineView.tsx:1203`). En portrait <= 640 px la frise rend
         * `TimelineMobilePortrait`, dont le clic sur la pastille ouvre une
         * bottom-sheet EN LECTURE SEULE (`TimelineBottomSheet`, aucun bouton
         * d'édition) : l'édition passe par le bouton « ⋯ »
         * (`timeline-event-more`) puis la feuille d'actions.
         *
         * Le routage et son garde-fou sont documentés au-dessus de
         * `MOBILE_PORTRAIT_QUERY` : variante interrogée via `matchMedia`, puis
         * VÉRIFIÉE en attendant sa racine sous un budget court.
         */
        const variant = await resolveTimelineVariant(page)
        const rootTestId = TIMELINE_ROOT_TESTID[variant]

        await expect(
          page.getByTestId(rootTestId),
          `[${locale} @ ${width}px] la frise devait rendre la variante « ${variant} » ` +
            `(racine \`${rootTestId}\`), d'après les media queries de ` +
            `TimelineResponsive.tsx recopiées dans cette spec. Racine absente => ` +
            `la bascule du composant a divergé de ces requêtes : corriger la ` +
            `détection, ne PAS allonger PATH_TIMEOUT_MS.`,
        ).toBeVisible({ timeout: PATH_TIMEOUT_MS })

        if (variant === 'desktop') {
          await page.getByTestId('timeline-event').first().click({ timeout: PATH_TIMEOUT_MS })
          const drawerEdit = page.getByTestId('event-drawer-edit')
          await expect(
            drawerEdit,
            `[${locale} @ ${width}px] chemin DESKTOP : \`event-drawer-edit\` absent ` +
              `après clic sur la pastille. Ce bouton n'existe que sous \`TimelineView\` ` +
              `(EventDrawer) — s'il manque ici, c'est que la frise rendue n'est pas ` +
              `celle attendue.`,
          ).toBeVisible({ timeout: PATH_TIMEOUT_MS })
          await drawerEdit.click({ timeout: PATH_TIMEOUT_MS })
        } else {
          const more = page.getByTestId('timeline-event-more').first()
          await expect(
            more,
            `[${locale} @ ${width}px] chemin MOBILE (${variant}) : \`timeline-event-more\` ` +
              `absent. Soit l'événement de fixture n'est pas monté, soit la frise ` +
              `rendue n'est pas la variante mobile.`,
          ).toBeVisible({ timeout: PATH_TIMEOUT_MS })
          await more.click({ timeout: PATH_TIMEOUT_MS })
          await page
            .getByTestId('timeline-actionsheet-edit')
            .click({ timeout: PATH_TIMEOUT_MS })
        }

        await expect(page.getByTestId('event-form')).toBeVisible({ timeout: 30_000 })
        await settle(page)
        const m = await measure(
          page,
          'event-form',
          locale,
          width,
          `via=${variant === 'desktop' ? 'drawer' : 'actionsheet'}·frise=${variant}`,
        )
        expectNoPageOverflow(m, 'event-form', locale, width)
      }
    })
  }
})

/* ------------------------------- FORMULAIRE DE CRÉATION (NewEventDrawer) */

/**
 * Le formulaire de CRÉATION partage le même composant interne `EventEditForm`
 * que l'édition (`NewEventDrawer.tsx:236`), mais son hôte diffère
 * (`shell-new-event-drawer`, 452 px) et son unique déclencheur,
 * `shell-sidebar-new-event-button`, vit dans l'`<aside className="hidden … lg:flex">`
 * d'`AppShell.tsx:137` — donc **injoignable sous 1024 px**.
 *
 * On mesure donc :
 *  · aux largeurs où il est RÉELLEMENT atteignable (>= 1024) ;
 *  · puis, ouvert à 1280 px et rétréci, dans sa variante feuille (`isCompact`
 *    est un `useMediaQuery` vivant). Cette seconde série est explicitement
 *    marquée `état-non-atteignable` : elle décrit un rendu que l'utilisateur ne
 *    peut PAS produire aujourd'hui, et ne doit pas être lue comme un défaut
 *    visible en production.
 */
test.describe('#74 — formulaire de création', () => {
  test.use({ storageState: PROD.storageState })

  for (const locale of LOCALES) {
    test(`create-form · ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await ensureAuthenticated(page)
      await page.goto(`/${locale}/timeline`, { waitUntil: 'domcontentloaded' })
      await page.getByTestId('shell-sidebar-new-event-button').click()
      await expect(page.getByTestId('shell-new-event-drawer')).toBeVisible({ timeout: 30_000 })

      for (const width of [1280, 1024] as const) {
        await page.setViewportSize({ width, height: 900 })
        await settle(page)
        expectNoPageOverflow(
          await measure(page, 'create-form', locale, width, 'atteignable'),
          'create-form',
          locale,
          width,
        )
      }

      for (const width of [320, 375, 390] as const) {
        await page.setViewportSize({ width, height: 800 })
        await settle(page)
        await measure(page, 'create-form', locale, width, 'état-non-atteignable')
      }
    })
  }
})

/* ------------------------------------------------------- AUTO-CONTRÔLE */

/**
 * `PIT-S62-003` : un garde-fou prouvé par des fixtures supprimées n'est pas armé.
 * Ce test reste dans le fichier et prouve, sur l'écran réellement audité, que le
 * balayage DÉTECTE une dégradation injectée — sans lui, « aucun débordement »
 * pourrait n'être qu'un aveuglement du harnais.
 */
test.describe('#74 — auto-contrôle du harnais', () => {
  test.use({ storageState: PROD.storageState })

  test('une largeur excessive injectée dans la frise EST détectée', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await ensureAuthenticated(page)
    await page.goto('/de/timeline', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('timeline-screen')).toBeVisible({ timeout: 30_000 })
    await settle(page)

    const PROBE_ID = 'audit74-self-check'
    await page.evaluate((id) => {
      const probe = document.createElement('div')
      probe.id = id
      probe.style.cssText =
        'position:absolute;top:0;left:0;width:9999px;height:4px;transition:none;min-width:0;'
      document.body.appendChild(probe)
    }, PROBE_ID)

    const degraded = await measure(page, 'self-check', 'de', 375, 'sonde injectée')

    // On asserte l'IDENTITÉ de la sonde : `some(o => o.tag === 'div')` serait
    // vacuous, satisfait par n'importe quel autre `div` réellement fautif (S59).
    expect(
      degraded.offenders.map((o) => o.id),
      `le harnais doit détecter la sonde \`#${PROBE_ID}\` — relevés : ${JSON.stringify(degraded.offenders)}`,
    ).toContain(PROBE_ID)

    await page.evaluate((id) => document.getElementById(id)?.remove(), PROBE_ID)
  })
})
