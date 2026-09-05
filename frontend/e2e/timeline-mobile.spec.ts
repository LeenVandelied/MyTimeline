import { test, expect, type Locator, type Page } from '@playwright/test'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { getUserId, seedCategory, seedProduct, todayIsoDate, unique } from './support/products'
import { revealSeededLane } from './support/timeline-lanes'

/**
 * #205 (Sprint 47) — E2E des vues Timeline MOBILES (portrait #63 / paysage #64).
 *
 * Couvre le trou de couverture signalé par l'issue : les deux variantes mobiles
 * sont instrumentées de `data-testid` depuis le Sprint 19 mais aucune spec ne les
 * exerçait. Écran cible : `/fr/timeline` (#301), seul écran qui monte
 * `TimelineEditHost` → `TimelineResponsive` quelle que soit la viewport (le
 * dashboard, lui, ne monte PAS la frise en mobile portrait : il rend
 * `dashboard-mobile-portrait`, cf. `dashboard/page.tsx`).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PIÈGE VIEWPORT (le seul qui compte ici)
 * ─────────────────────────────────────────────────────────────────────────────
 * `TimelineResponsive` choisit sa variante via `useMediaQuery` :
 *   portrait  : (max-width: 640px) and (orientation: portrait)
 *   paysage   : (orientation: landscape) and (max-height: 600px)
 *   minimap forcée masquée : (max-height: 400px)
 * La viewport DOIT donc être fixée AVANT `page.goto` (`test.use`), sinon la
 * variante desktop est montée et AUCUN testid mobile n'existe.
 *
 * En revanche la ROTATION en cours de test se fait bien par
 * `page.setViewportSize()` sans navigation : `useMediaQuery` écoute l'événement
 * `change` de `matchMedia` → la bascule est réactive (c'est précisément ce qui
 * rend le scénario « rotation sans perte d'état » testable).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * GESTES TACTILES — repli assumé
 * ─────────────────────────────────────────────────────────────────────────────
 * Le pinch-zoom (2 pointeurs) n'est PAS automatisé : Playwright ne pilote qu'un
 * pointeur et le repli « événements simulés » testerait le handler, pas le
 * parcours (déjà couvert en RTL, `TimelineMobilePortrait.test.tsx`). On exerce
 * ici l'alternative accessible officielle (boutons +/-), qui passe par le MÊME
 * reducer de zoom. Le long-press EST automatisé (un seul pointeur, `mouse.down`
 * + attente > 500 ms) car c'est un geste réellement mono-pointeur.
 *
 * Auth : compte fixe PROD (storageState) → zéro register par test. État seedé par
 * API, assertions sur `data-testid` uniquement (4 locales, `localePrefix:'always'`).
 * PRÉREQUIS RUNTIME : backend Spring (:8080) + Postgres migré + front Next.
 */

const PORTRAIT = { width: 390, height: 844 }
/** Mobile retourné : hauteur 390 <= 400 → minimap FORCÉE masquée. */
const LANDSCAPE_SHORT = { width: 844, height: 390 }
/** Paysage plus haut (401..600) → minimap togglable par l'utilisateur. */
const LANDSCAPE_TALL = { width: 844, height: 520 }

interface SeededTimeline {
  /** Titre de l'event seedé = nom du produit (cf. `seedProduct`). */
  eventTitle: string
  productName: string
}

/**
 * Seede une catégorie + un produit portant UN event daté d'aujourd'hui, puis
 * ouvre `/fr/timeline` et attend que la variante mobile attendue soit montée.
 *
 * L'event est daté d'aujourd'hui à dessein : la frise se centre sur « today » au
 * montage (`scrollToToday`), donc le bloc est visible sans scroll manuel — le
 * compte PROD accumule les produits des autres specs et le rail peut être large.
 */
async function seedAndOpenTimeline(
  page: Page,
  variant: 'portrait' | 'landscape',
): Promise<SeededTimeline> {
  await ensureAuthenticated(page)

  const userId = await getUserId(page)
  const productName = unique('TL Mobile')
  const cat = await seedCategory(page, unique('TL Mobile Cat'))
  await seedProduct(page, {
    userId,
    name: productName,
    categoryId: cat.id,
    eventDate: todayIsoDate(),
  })

  await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('timeline-screen')).toBeVisible()
  // Le host n'est monté qu'une fois les données chargées ET non vides.
  await expect(page.getByTestId('timeline-host')).toBeVisible()
  await expect(page.getByTestId(`timeline-mobile-${variant}`)).toBeVisible()
  // #467 — les vues mobiles partagent le MÊME seuil de virtualisation verticale que
  // le desktop (`useTimelineMobileState.ts:168`) et le MÊME compte PROD cumulatif :
  // la lane semée peut n'être pas montée. Point d'entrée unique de toutes les specs
  // mobiles -> la parade est posée ici une seule fois (cf. `support/timeline-lanes.ts`).
  await revealSeededLane(page, { category: cat.name, product: productName })

  return { eventTitle: productName, productName }
}

/** Le bloc de l'event seedé, ciblé par son titre (unique) plutôt que par index. */
function seededEvent(page: Page, title: string): Locator {
  return page.locator(`[data-testid="timeline-event"][data-event-title="${title}"]`)
}

/** Le bouton `⋯` voisin du bloc seedé (même `.mt-tlm__evt-wrap`). */
function seededEventMore(page: Page, title: string): Locator {
  return page
    .locator('.mt-tlm__evt-wrap')
    .filter({ has: page.locator(`[data-event-title="${title}"]`) })
    .getByTestId('timeline-event-more')
}

/* ========================================================================== */
/* PORTRAIT                                                                    */
/* ========================================================================== */

test.describe('#205 Timeline mobile — portrait', () => {
  test.use({ storageState: PROD.storageState, viewport: PORTRAIT })

  test('affiche la frise portrait (règle, lanes, minimap) et pas la vue desktop', async ({
    page,
  }) => {
    const { eventTitle } = await seedAndOpenTimeline(page, 'portrait')

    // La variante desktop ne doit PAS être montée (sinon le switch est cassé).
    await expect(page.getByTestId('timeline-view')).toHaveCount(0)
    await expect(page.getByTestId('timeline-mobile-landscape')).toHaveCount(0)

    // Chrome de la frise.
    await expect(page.getByTestId('timeline-ruler')).toBeVisible()
    await expect(page.getByTestId('timeline-scroll')).toBeVisible()
    await expect(page.getByTestId('timeline-minimap')).toBeVisible()
    await expect(page.getByTestId('timeline-zoom-level')).toBeVisible()

    // Lanes groupées par catégorie + le produit seedé présent.
    expect(await page.getByTestId('timeline-group').count()).toBeGreaterThan(0)
    expect(await page.getByTestId('timeline-resource-row').count()).toBeGreaterThan(0)
    await expect(seededEvent(page, eventTitle)).toHaveCount(1)
  })

  test('tap sur un bloc ouvre le bottom sheet, fermé par le bouton close', async ({ page }) => {
    const { eventTitle, productName } = await seedAndOpenTimeline(page, 'portrait')

    await expect(page.getByTestId('timeline-sheet')).toHaveCount(0)
    await seededEvent(page, eventTitle).click()

    const sheet = page.getByTestId('timeline-sheet')
    await expect(sheet).toBeVisible()
    await expect(sheet).toHaveAttribute('role', 'dialog')
    await expect(sheet).toHaveAttribute('aria-modal', 'true')
    await expect(sheet).toContainText(productName)

    await page.getByTestId('timeline-sheet-close').click()
    await expect(sheet).toHaveCount(0)
  })

  test('bouton ⋯ et long-press ouvrent le MÊME action sheet', async ({ page }) => {
    // Horloge simulée : le franchissement du seuil long-press ne doit pas dépendre
    // de l'horloge murale (flake latent sous charge CI). `install()` DOIT précéder
    // toute navigation ; `resume()` laisse l'app se charger en temps réel.
    await page.clock.install()
    await page.clock.resume()
    const { eventTitle } = await seedAndOpenTimeline(page, 'portrait')

    // --- Voie a11y visible : le bouton `⋯` ---------------------------------
    await seededEventMore(page, eventTitle).click()
    await expect(page.getByTestId('timeline-actionsheet')).toBeVisible()
    await expect(page.getByTestId('timeline-actionsheet-edit')).toBeVisible()
    await expect(page.getByTestId('timeline-actionsheet-delete')).toBeVisible()
    // Le `⋯` n'ouvre PAS le bottom sheet détail (chemins disjoints).
    await expect(page.getByTestId('timeline-sheet')).toHaveCount(0)
    await page.getByTestId('timeline-actionsheet-cancel').click()
    await expect(page.getByTestId('timeline-actionsheet')).toHaveCount(0)

    // --- Geste mono-pointeur : long-press (> 500 ms, sans déplacement) ------
    const block = seededEvent(page, eventTitle)
    await block.scrollIntoViewIfNeeded()
    const box = await block.boundingBox()
    expect(box, 'le bloc seedé doit être positionné').not.toBeNull()
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await page.mouse.down()
    // Seuil long-press = `LONG_PRESS_MS` = 500 ms (`useTimelineMobileGestures.ts:21`).
    // `fastForward` déclenche le `setTimeout` du hook sans attendre réellement :
    // le franchissement est déterministe, indépendant de la charge machine.
    await page.clock.fastForward(600)
    await page.mouse.up()
    await expect(page.getByTestId('timeline-actionsheet')).toBeVisible()
  })

  test('les boutons +/- changent le niveau de zoom (alternative au pinch)', async ({ page }) => {
    await seedAndOpenTimeline(page, 'portrait')

    const level = page.getByTestId('timeline-zoom-level')
    const before = await level.textContent()
    await page.getByTestId('timeline-zoom-in').click()
    await expect(level).not.toHaveText(before ?? '')
  })

  /**
   * #330 (lot b) — `timeline-zoom-out` existe EN DOUBLE (desktop `TimelineView.tsx`
   * ET les deux variantes mobiles) : le lot b du briefing couvre le desktop
   * (`timeline.spec.ts`), ce test couvre le variant PORTRAIT mobile (même bouton,
   * même reducer de zoom — `state.zoomOut`).
   */
  test('zoom-out : dézoome (alternative au pinch, variant portrait)', async ({ page }) => {
    await seedAndOpenTimeline(page, 'portrait')

    // #390-fix (A) — oracle ANCRÉ (aligné sur le desktop `timeline.spec.ts:594`) :
    // un « le texte a changé » laisserait passer un `timeline-zoom-out` recâblé par
    // erreur sur zoomIn (Mois -> Semaine). On asserte l'état de DÉPART (Mois, zoom
    // par défaut `initialZoomState`, zoom.ts:65) PUIS l'état d'ARRIVÉE (Trimestre).
    const level = page.getByTestId('timeline-zoom-level')
    await expect(level).toHaveText('Mois')
    await page.getByTestId('timeline-zoom-out').click()
    await expect(level).toHaveText('Trimestre')
  })

  /**
   * #330 (lot a) — `timeline-sheet-overlay` : le tap ferme le bottom sheet, au même
   * titre que le bouton close déjà couvert plus haut (deux chemins de fermeture
   * distincts, pas un doublon).
   */
  test('overlay du bottom sheet : le tap ferme (comme le bouton close)', async ({ page }) => {
    const { eventTitle } = await seedAndOpenTimeline(page, 'portrait')

    await seededEvent(page, eventTitle).click()
    const sheet = page.getByTestId('timeline-sheet')
    await expect(sheet).toBeVisible()
    await expect(page.getByTestId('timeline-sheet-overlay')).toBeVisible()

    // Le sheet est ANCRÉ EN BAS (`.mt-sheet{left:0;right:0;bottom:0}`, cf.
    // timeline.css:276) : tap en HAUT de l'overlay pour ne pas retomber sur le
    // panneau lui-même (qui couvre jusqu'à 80vh).
    await page.getByTestId('timeline-sheet-overlay').click({ position: { x: 5, y: 5 } })
    await expect(sheet).toHaveCount(0)
    await expect(page.getByTestId('timeline-sheet-overlay')).toHaveCount(0)
  })

  /**
   * #330 (lot a) — `timeline-sheet-grabber` : zone de swipe-down (pas juste un
   * décor). Le seuil `DISMISS_THRESHOLD_PX` (80px, `TimelineBottomSheet.tsx:30`)
   * distingue un swipe qui ferme d'un swipe qui ne fait que déplacer le panneau
   * puis revient à sa place — les DEUX branches sont exercées, pas seulement le cas
   * qui « marche ».
   */
  test('grabber : swipe-down > 80px ferme le sheet, un swipe court le laisse ouvert', async ({
    page,
  }) => {
    const { eventTitle } = await seedAndOpenTimeline(page, 'portrait')

    await seededEvent(page, eventTitle).click()
    const sheet = page.getByTestId('timeline-sheet')
    await expect(sheet).toBeVisible()
    const grabber = page.getByTestId('timeline-sheet-grabber')

    // #330-fix (Sprint 54) — le panneau se STABILISE en 2 temps après l'ouverture
    // (animation d'entrée CSS `mt-sheet-in` PUIS un léger réajustement de layout,
    // mesuré ~20-25px, une fois le focus-trap/scroll-lock posé) : une seule mesure
    // `boundingBox()` en tête de test, réutilisée pour les DEUX swipes, capture une
    // position TRANSITOIRE. Le 2e swipe visait alors des coordonnées obsolètes qui
    // retombaient sur `timeline-sheet-overlay` (sous le panneau, déjà réinstallé à
    // sa position finale) au lieu du grabber -> aucun pointerdown sur la zone,
    // fermeture jamais déclenchée (reproduit et confirmé hors suite : la 2e mesure
    // de `boundingBox()` diffère de 24px de la 1re). Fix : une mesure FRAÎCHE,
    // juste avant CHAQUE swipe (oracle observable = position réelle courante),
    // aucune temporisation arbitraire.
    // #390-fix (B) — deux corrections. (1) MESURE STABILISÉE : le panneau se réajuste
    // ~24px après l'ouverture (animation d'entrée PUIS repositionnement au montage du
    // focus-trap/scroll-lock) ; une `boundingBox()` prise « juste après toBeVisible »
    // capture une position TRANSITOIRE et `mouse.down()` retombe sur l'overlay (sous le
    // panneau) au lieu du grabber. On attend une position VÉRIFIÉE stable (2 lectures
    // consécutives identiques), pas une temporisation arbitraire. (2) ORACLE POSITIF :
    // pendant le drag, le sheet suit le doigt (`style.transform=translateY`,
    // `TimelineBottomSheet.tsx:116`, posé UNIQUEMENT si `dragY>0`) — sans mouvement
    // observé, le geste n'a pas atteint le grabber -> rouge (le défaut qu'on corrige,
    // là où l'ancien `toBeVisible()` restait vacuously vert « par inaction »).
    const stableGrabberBox = async () => {
      let prev = await grabber.boundingBox()
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(50)
        const cur = await grabber.boundingBox()
        if (prev && cur && Math.abs(cur.y - prev.y) < 0.5 && Math.abs(cur.x - prev.x) < 0.5) {
          return cur
        }
        prev = cur
      }
      expect(prev, 'le grabber doit se stabiliser en position').not.toBeNull()
      return prev!
    }

    const boxShort = await stableGrabberBox()

    // --- Swipe COURT (< seuil) : ne ferme PAS -------------------------------
    const shortCx = boxShort.x + boxShort.width / 2
    const shortCy = boxShort.y + boxShort.height / 2
    await page.mouse.move(shortCx, shortCy)
    await page.mouse.down()
    await page.mouse.move(shortCx, shortCy + 30, { steps: 5 })
    // ORACLE POSITIF : le geste a bien saisi le grabber -> le panneau a suivi (< seuil).
    await expect(async () => {
      const transform = await sheet.evaluate((el) => (el as HTMLElement).style.transform)
      const moved = /translateY\(([\d.]+)px\)/.exec(transform)
      expect(moved, `le sheet doit suivre le drag court (transform=${transform})`).not.toBeNull()
      expect(parseFloat(moved![1])).toBeGreaterThan(0)
    }).toPass({ timeout: 1000 })
    await page.mouse.up()
    // Revient à sa place ET reste MONTÉ (toHaveCount(1), pas juste « visible » qui
    // passerait aussi pendant une éventuelle animation de sortie) ; transform purgé.
    await expect(sheet).toHaveCount(1)
    await expect
      .poll(async () => sheet.evaluate((el) => (el as HTMLElement).style.transform))
      .toBe('')

    // --- Swipe LONG (> seuil) : ferme ---------------------------------------
    // Mesure fraîche + stabilisée aussi pour le 2e swipe (le panneau est revenu à sa
    // place après le swipe court, mais on ne réutilise pas une mesure potentiellement
    // périmée).
    const boxLong = await stableGrabberBox()
    const longCx = boxLong.x + boxLong.width / 2
    const longCy = boxLong.y + boxLong.height / 2
    await page.mouse.move(longCx, longCy)
    await page.mouse.down()
    await page.mouse.move(longCx, longCy + 120, { steps: 5 })
    // ORACLE POSITIF : le geste dépasse le seuil DISMISS_THRESHOLD_PX (80px,
    // TimelineBottomSheet.tsx:30) AVANT le relâchement — prouve qu'on ferme bien
    // « parce que le seuil est franchi », pas « parce que le geste n'est jamais parti ».
    await expect(async () => {
      const transform = await sheet.evaluate((el) => (el as HTMLElement).style.transform)
      const moved = /translateY\(([\d.]+)px\)/.exec(transform)
      expect(moved, `le sheet doit suivre le drag long (transform=${transform})`).not.toBeNull()
      expect(parseFloat(moved![1])).toBeGreaterThan(80)
    }).toPass({ timeout: 1000 })
    await page.mouse.up()
    await expect(sheet).toHaveCount(0)
  })

  /**
   * #330 (lot a) — `timeline-actionsheet-overlay` : le tap ferme l'action sheet,
   * au même titre que le bouton « Annuler » déjà couvert plus haut.
   */
  test('overlay de l’action sheet : le tap ferme (comme Annuler)', async ({ page }) => {
    const { eventTitle } = await seedAndOpenTimeline(page, 'portrait')

    await seededEventMore(page, eventTitle).click()
    const sheet = page.getByTestId('timeline-actionsheet')
    await expect(sheet).toBeVisible()
    await expect(page.getByTestId('timeline-actionsheet-overlay')).toBeVisible()

    await page.getByTestId('timeline-actionsheet-overlay').click({ position: { x: 5, y: 5 } })
    await expect(sheet).toHaveCount(0)
    await expect(page.getByTestId('timeline-actionsheet-overlay')).toHaveCount(0)
  })
})

/* ========================================================================== */
/* ROTATION portrait → paysage → portrait                                      */
/* ========================================================================== */

test.describe('#205 Timeline mobile — rotation', () => {
  test.use({ storageState: PROD.storageState, viewport: PORTRAIT })

  /**
   * Critère d'acceptation central de l'issue : la rotation démonte/remonte la
   * VARIANTE, mais pas l'ÉTAT — `useTimelineMobileState` / `...Selection` sont
   * hissés dans `TimelineResponsive`, qui reste monté. On vérifie donc que le
   * ZOOM et la SÉLECTION traversent l'aller-retour, y compris le remplacement du
   * bottom sheet (portrait) par le drawer latéral (paysage) sur le MÊME event.
   */
  test('portrait → paysage → portrait conserve zoom et sélection', async ({ page }) => {
    const { eventTitle } = await seedAndOpenTimeline(page, 'portrait')

    // --- État à préserver : un zoom modifié + un event sélectionné ----------
    const level = page.getByTestId('timeline-zoom-level')
    const initialLevel = await level.textContent()
    await page.getByTestId('timeline-zoom-in').click()
    await expect(level).not.toHaveText(initialLevel ?? '')
    const zoomedLevel = await level.textContent()

    await seededEvent(page, eventTitle).click()
    await expect(page.getByTestId('timeline-sheet')).toBeVisible()

    // --- Rotation → PAYSAGE (sans navigation) ------------------------------
    await page.setViewportSize(LANDSCAPE_SHORT)
    await expect(page.getByTestId('timeline-mobile-landscape')).toBeVisible()
    await expect(page.getByTestId('timeline-mobile-portrait')).toHaveCount(0)

    // Sélection conservée : le bottom sheet cède la place au drawer latéral, qui
    // affiche le MÊME event (titre en en-tête).
    await expect(page.getByTestId('timeline-sheet')).toHaveCount(0)
    const drawer = page.getByTestId('timeline-landscape-drawer')
    await expect(drawer).toBeVisible()
    await expect(drawer).toContainText(eventTitle)
    // Zoom conservé (le reducer vit au-dessus de la variante).
    await expect(page.getByTestId('timeline-zoom-level')).toHaveText(zoomedLevel ?? '')

    // Hauteur 390 <= 400 → minimap forcée masquée ET toggle neutralisé.
    await expect(page.getByTestId('timeline-minimap-wrap')).toHaveCount(0)
    await expect(page.getByTestId('timeline-minimap-toggle')).toBeDisabled()

    // --- Rotation retour → PORTRAIT ----------------------------------------
    await page.setViewportSize(PORTRAIT)
    await expect(page.getByTestId('timeline-mobile-portrait')).toBeVisible()
    await expect(page.getByTestId('timeline-mobile-landscape')).toHaveCount(0)

    // Le drawer disparaît, le bottom sheet réaffiche la MÊME sélection.
    await expect(page.getByTestId('timeline-landscape-drawer')).toHaveCount(0)
    await expect(page.getByTestId('timeline-sheet')).toBeVisible()
    await expect(page.getByTestId('timeline-sheet')).toContainText(eventTitle)
    await expect(page.getByTestId('timeline-zoom-level')).toHaveText(zoomedLevel ?? '')
  })

  /**
   * #328 — Le `scrollLeft` est le SEUL état qui ne traversait pas la rotation :
   * porté par le DOM de la variante démontée (mesuré 400 → 0), là où zoom et
   * sélection vivent en state React au-dessus. Ce test l'asserte explicitement
   * (l'ancien test de rotation ne couvrait que zoom + sélection).
   *
   * Nuance NON contournable : le navigateur CLAMPE `scrollLeft` à
   * `scrollWidth - clientWidth`, et `clientWidth` grandit en paysage (390 → 844).
   * La cible attendue est donc `min(position portrait, max de scroll paysage)`.
   */
  test('portrait → paysage → portrait conserve le scroll horizontal (#328)', async ({ page }) => {
    await seedAndOpenTimeline(page, 'portrait')

    // ÉLARGIR LE RAIL AVANT DE MESURER — sans quoi le test peut être insatisfiable.
    // `computeRange` couvre l'amplitude de TOUS les events du compte, et le compte
    // PROD est PARTAGÉ par 6 specs : `totalDays` est un MINORANT (>= 61 j), jamais
    // une valeur connue d'avance. Au zoom par défaut ('Mois', 12 px/jour) le rail
    // vaut donc >= 732 px — même ordre de grandeur que le `clientWidth` paysage
    // (~794 px pour une viewport de 844). Sur un compte à VOLUME MINIMAL le rail
    // entre EN ENTIER : `scrollWidth === clientWidth`, `maxScroll` vaut 0, le seul
    // `scrollLeft` atteignable est 0, et les deux assertions du test se
    // contredisent (`> 0` plus bas vs `≈ min(x, 0)` = 0). Sur un compte chargé le
    // rail dépasse 794 px et le test redevient satisfiable : d'où un échec
    // INTERMITTENT, fonction du volume accumulé — pas une contradiction absolue.
    // Deux crans de zoom (Mois → Semaine → Jour, 96 px/jour) portent le rail à
    // >= 5 856 px (minorant, pas mesure) : le débordement paysage passe hors de
    // portée du volume d'events et le test redevient déterministe.
    await page.getByTestId('timeline-zoom-in').click()
    await page.getByTestId('timeline-zoom-in').click()
    // Les deux clics doivent être COMMITÉS avant toute mesure : si le commit React
    // du 2e clic atterrissait après `setViewportSize`, le paysage mesurerait encore
    // l'échelle 'Mois' (rail ~732 px < clientWidth) → `maxScroll` 0 → assertion
    // rouge. On attend l'échelle atteinte, pas la latence des allers-retours.
    // Libellé lu dans `public/locales/fr/dashboard.json` (`timeline.zoom.day`), la
    // spec ouvrant `/fr/timeline` (`localePrefix: 'always'`).
    await expect(page.getByTestId('timeline-zoom-level')).toHaveText('Jour')

    const geometry = (locator: Locator) =>
      locator.evaluate((el) => ({
        scrollLeft: el.scrollLeft,
        scrollWidth: el.scrollWidth,
        maxScroll: el.scrollWidth - el.clientWidth,
      }))

    const portraitScroll = page.getByTestId('timeline-scroll')
    // Garde-fou SUR LE BON AXE : ce que le test mesure après rotation, c'est le
    // débordement du rail dans le viewport PAYSAGE (`clientWidth` ~794), pas dans
    // le portrait (~340). Garder sur le `maxScroll` PORTRAIT laisserait ouverte la
    // fenêtre morte `340 < rail <= 794` : garde vert, `afterRotate.scrollLeft > 0`
    // rouge — exactement la pathologie que le garde prétend éliminer. On borne donc
    // par la largeur de viewport paysage (844 >= `clientWidth` paysage) : condition
    // SUFFISANTE pour `maxScroll > 0` après rotation, et vérifiable AVANT de
    // tourner l'écran, donc l'échec reste diagnostiqué ici, pas 20 lignes plus bas.
    expect((await geometry(portraitScroll)).scrollWidth).toBeGreaterThan(LANDSCAPE_SHORT.width)
    // Défilement utilisateur : on vise 400px, borné par l'étendue réelle du rail.
    await portraitScroll.evaluate((el) => {
      el.scrollLeft = Math.min(400, el.scrollWidth - el.clientWidth)
    })
    const before = await geometry(portraitScroll)
    expect(before.scrollLeft).toBeGreaterThan(0)

    // --- Rotation → PAYSAGE -------------------------------------------------
    await page.setViewportSize(LANDSCAPE_SHORT)
    await expect(page.getByTestId('timeline-mobile-landscape')).toBeVisible()

    const landscapeScroll = page.getByTestId('timeline-scroll')
    const afterRotate = await geometry(landscapeScroll)
    expect(afterRotate.scrollLeft).toBeGreaterThan(0)
    expect(afterRotate.scrollLeft).toBeCloseTo(
      Math.min(before.scrollLeft, afterRotate.maxScroll),
      0,
    )

    // --- Rotation retour → PORTRAIT -----------------------------------------
    await page.setViewportSize(PORTRAIT)
    await expect(page.getByTestId('timeline-mobile-portrait')).toBeVisible()

    const back = await geometry(page.getByTestId('timeline-scroll'))
    expect(back.scrollLeft).toBeCloseTo(Math.min(afterRotate.scrollLeft, back.maxScroll), 0)
  })
})

/* ========================================================================== */
/* PAYSAGE                                                                     */
/* ========================================================================== */

test.describe('#205 Timeline mobile — paysage', () => {
  // Hauteur 520 : au-dessus du seuil de forçage (400), sous le seuil paysage (600)
  // → la minimap est présente ET le toggle utilisateur est actif.
  test.use({ storageState: PROD.storageState, viewport: LANDSCAPE_TALL })

  test('monte la variante paysage avec minimap et lanes denses', async ({ page }) => {
    const { eventTitle } = await seedAndOpenTimeline(page, 'landscape')

    await expect(page.getByTestId('timeline-view')).toHaveCount(0)
    await expect(page.getByTestId('timeline-mobile-portrait')).toHaveCount(0)
    await expect(page.getByTestId('timeline-ruler')).toBeVisible()
    await expect(page.getByTestId('timeline-minimap-wrap')).toBeVisible()
    await expect(seededEvent(page, eventTitle)).toHaveCount(1)
  })

  test('le toggle masque et réaffiche la minimap', async ({ page }) => {
    await seedAndOpenTimeline(page, 'landscape')

    const toggle = page.getByTestId('timeline-minimap-toggle')
    await expect(toggle).toBeEnabled()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('timeline-minimap-wrap')).toBeVisible()

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByTestId('timeline-minimap-wrap')).toHaveCount(0)

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('timeline-minimap-wrap')).toBeVisible()
  })

  test('tap sur un bloc ouvre le drawer latéral (et non le bottom sheet)', async ({ page }) => {
    const { eventTitle, productName } = await seedAndOpenTimeline(page, 'landscape')

    await seededEvent(page, eventTitle).click()
    const drawer = page.getByTestId('timeline-landscape-drawer')
    await expect(drawer).toBeVisible()
    await expect(drawer).toHaveAttribute('role', 'dialog')
    await expect(drawer).toContainText(productName)
    // Le bottom sheet portrait ne doit jamais être monté en paysage.
    await expect(page.getByTestId('timeline-sheet')).toHaveCount(0)

    await page.getByTestId('timeline-landscape-drawer-close').click()
    await expect(drawer).toHaveCount(0)
  })

  test('le bouton ⋯ ouvre l’action sheet en paysage (parité avec le portrait)', async ({
    page,
  }) => {
    const { eventTitle } = await seedAndOpenTimeline(page, 'landscape')

    await seededEventMore(page, eventTitle).click()
    await expect(page.getByTestId('timeline-actionsheet')).toBeVisible()
    await expect(page.getByTestId('timeline-actionsheet-edit')).toBeVisible()
    await expect(page.getByTestId('timeline-actionsheet-delete')).toBeVisible()
  })

  /**
   * #330 (lot a) — `timeline-landscape-drawer-overlay` : le tap ferme le drawer
   * latéral, au même titre que son bouton close déjà couvert plus haut.
   */
  test('overlay du drawer latéral : le tap ferme (comme le bouton close)', async ({ page }) => {
    const { eventTitle } = await seedAndOpenTimeline(page, 'landscape')

    await seededEvent(page, eventTitle).click()
    const drawer = page.getByTestId('timeline-landscape-drawer')
    await expect(drawer).toBeVisible()
    await expect(page.getByTestId('timeline-landscape-drawer-overlay')).toBeVisible()

    // Le drawer paysage est ANCRÉ À DROITE (réutilise `.mt-drawer`, cf. desktop) :
    // tap en haut à gauche de l'overlay.
    await page.getByTestId('timeline-landscape-drawer-overlay').click({ position: { x: 5, y: 5 } })
    await expect(drawer).toHaveCount(0)
    await expect(page.getByTestId('timeline-landscape-drawer-overlay')).toHaveCount(0)
  })
})
