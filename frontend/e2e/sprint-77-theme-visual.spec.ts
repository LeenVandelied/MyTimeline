import { existsSync } from 'node:fs'
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test'

/**
 * #294 — Diff visuel clair/sombre du hero de la landing et des 4 écrans d'authentification.
 *
 * CE QUE CETTE SPEC INTRODUIT DANS LE DÉPÔT, ET QUI N'Y EXISTAIT PAS.
 *
 * Avant elle, `frontend/e2e/` ne contenait AUCUN `toHaveScreenshot` (grep : 0 fichier),
 * AUCUN répertoire `*-snapshots`, AUCUN PNG de référence, et `playwright.config.ts` ne
 * portait aucune clé `expect`. Le dépôt savait mesurer un contraste, une métrique
 * typographique ou un débordement — jamais comparer un RENDU. Une régression purement
 * visuelle (un token de couleur inversé entre thèmes, une carte qui perd son ombre, un
 * `border-radius` qui saute) passait donc entre toutes les mailles. C'est ce trou-là que
 * la spec ferme, et elle apporte avec elle son outillage : la tolérance vit dans
 * `playwright.config.ts` (clé `expect.toHaveScreenshot`), les références vivent dans
 * `e2e/sprint-77-theme-visual.spec.ts-snapshots/` (nomenclature PAR DÉFAUT de Playwright,
 * volontairement non surchargée : `{arg}-{projectName}-{platform}.png`).
 *
 * ────────────────────────────────────────────────────────────────────────────────
 * POURQUOI DES CAPTURES D'ÉLÉMENT, ET NON DE PAGE
 *
 * Trois raisons, dans l'ordre de force :
 *
 *  1. `next.config.mjs` ne pose AUCUN `devIndicators`. En `next dev` — le mode dans
 *     lequel un dev rejouera cette spec — Next 15 rend son indicateur de développement
 *     en position fixe dans le coin de la fenêtre. Une capture de viewport le
 *     contiendrait EN LOCAL et pas en CI (`next start`, cf. `.github/workflows/ci.yml`),
 *     soit un faux rouge structurel, insoluble par la tolérance.
 *  2. L'issue demande « le hero », pas la landing entière. Une capture pleine page
 *     agrège 9 sections : n'importe quel changement ailleurs ferait rougir ce test,
 *     qui deviendrait le test de TOUT et ne dirait plus rien.
 *  3. Moins de surface = moins de pixels susceptibles de diverger entre deux
 *     environnements de rendu.
 *
 * ⚠ On n'utilise PAS `page.screenshot({ clip })` — [[PIT-S62-002]] : ce chemin
 * intersecte SILENCIEUSEMENT le viewport, donc tronque tout élément plus haut que 720 px
 * (c'est le cas du hero) sans le dire. `locator.toHaveScreenshot()` fait défiler
 * l'élément et capture au-delà du viewport. Le garde-fou `assertCaptureBox` ci-dessous
 * vérifie tout de même la boîte mesurée et la journalise : si un jour la capture était
 * rabotée, on le lirait dans la sortie du run plutôt que dans une référence fausse.
 *
 * ────────────────────────────────────────────────────────────────────────────────
 * DÉTERMINISME — CE QUI EST NEUTRALISÉ, ET PAR QUOI
 *
 *  - `.section-animation` (`src/styles/animations.css`) pose `opacity: 0` et n'est
 *    révélée que par la classe `visible`, ajoutée au défilement par
 *    `useSectionAnimation` (`IntersectionObserver`). Capturer sans attendre donnerait
 *    un hero VIDE. On défile, puis on ATTEND `opacity > 0.99` — pas un `toBeVisible()`,
 *    que Playwright rend vrai à `opacity: 0`.
 *  - `.hero-timeline__progress` et `.hero-timeline__today` (`src/styles/hero-timeline.css`)
 *    portent des animations INFINIES. `toHaveScreenshot` pose `animations: 'disabled'`
 *    par défaut, ce qui les ramène à leur état initial avant capture. On ne s'en remet
 *    pas à la théorie : la stabilité a été mesurée par rejeux successifs (cf.
 *    `docs/memory/sprints/sprint-77/issue-294-done.md`).
 *  - Le curseur reste où Playwright l'a laissé, et `.cta-button::after` anime sa largeur
 *    au survol. On écarte donc la souris avant chaque capture (même motif que
 *    `readAtRest` dans `support/contrast.ts`).
 *  - Les polices sont attendues par `waitForRenderedFonts` — et PAS par le seul
 *    `document.fonts.ready`, qui s'est révélé insuffisant à la mesure (4 runs rouges
 *    sur 6). Voir le bloc de cette fonction : c'est le piège le plus coûteux du lot.
 *  - L'amorçage d'`AuthContext` (`GET /api/auth/me`) met les boutons de soumission en
 *    `aria-busy` avec un `<Spinner>` : on attend qu'il retombe. Une référence a été
 *    générée dans cet état avant que la garde n'existe.
 *
 * ────────────────────────────────────────────────────────────────────────────────
 * THÈME — POURQUOI `colorScheme` SUFFIT, ET POURQUOI ON LE VÉRIFIE QUAND MÊME
 *
 * `app/[locale]/layout.tsx:64` monte `<ThemeProvider attribute="class" defaultTheme="system"
 * enableSystem>` : c'est `prefers-color-scheme` qui pilote la classe `.dark` sur `<html>`,
 * via un écouteur `matchMedia` de next-themes. Poser `colorScheme` sur le contexte suffit
 * donc — aucun `localStorage` à bricoler. C'est déjà la convention du dépôt
 * (`landing-cta-contrast.spec.ts:93`).
 *
 * MAIS un `emulateMedia` sans effet rendrait CETTE spec pire qu'inutile : elle graverait
 * une référence « dark » qui serait en réalité du CLAIR, et toute vraie régression du
 * thème sombre passerait ensuite au vert pour toujours. La classe est donc ASSERTÉE
 * avant chaque capture, et le `class` observé sur `<html>` est journalisé pour que la
 * preuve figure dans la sortie du run et non dans une intention.
 *
 * ────────────────────────────────────────────────────────────────────────────────
 * ARMEMENT — le dernier `test()` du fichier
 *
 * Une comparaison visuelle dont la tolérance est trop large est STRUCTURELLEMENT
 * incapable d'échouer, et reste verte pour toujours ([[PIT-S62-003]], [[PIT-S54-002]]).
 * Le contrôle négatif rejoue donc le hero clair avec une mutation de style injectée, et
 * exige que la comparaison ÉCHOUE contre la MÊME référence committée. Il ne crée aucun
 * PNG supplémentaire et n'a besoin d'aucune fixture supprimée avant commit : il est armé
 * par les références du dépôt, pas par un montage jetable.
 *
 * ────────────────────────────────────────────────────────────────────────────────
 * LANCEMENT LOCAL (ne PAS laisser Playwright démarrer son `webServer` — [[PIT-S61-007]])
 *
 *   cd frontend
 *   NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8080 npx next dev -p 3000
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test sprint-77-theme-visual --project=chromium
 *
 * ⚠ Les références sont suffixées `-linux` : elles ont été générées en conteneur
 * (`mcr.microsoft.com/playwright:v1.61.1-jammy`) pour être COMPARABLES en CI, qui tourne
 * sur `ubuntu-latest`. Un rejeu sur macOS demanderait des références `-darwin` que le
 * dépôt ne porte pas — Playwright les ÉCRIRAIT au premier run (et échouerait), il ne
 * faut donc pas committer ce qu'un run macOS produit. Régénérer passe par le conteneur ;
 * la recette exacte est dans `docs/memory/sprints/sprint-77/issue-294-done.md`.
 */

const SCHEMES = ['light', 'dark'] as const
type Scheme = (typeof SCHEMES)[number]

/** Locale de référence du dépôt. Une seule suffit : le thème ne dépend pas de la langue. */
const LOCALE = 'fr'

/**
 * `app/[locale]/reset-password/page.tsx:80-84` — SANS `?token=`, la page rend l'état
 * d'erreur `reset-missing-token` et PAS le formulaire. Capturer l'écran d'erreur en
 * croyant capturer le formulaire graverait une référence qui ne couvre pas ce que
 * l'issue demande. Le jeton n'est jamais soumis : aucun backend n'est requis.
 */
const RESET_TOKEN = 'e2e-visual-reference-token'

/**
 * Carte des 4 écrans d'authentification.
 * `app/[locale]/{login,register,forgot-password,reset-password}/page.tsx` rendent tous
 * la MÊME enveloppe : `div.bg-surface.w-full.max-w-md.rounded-lg.p-6.shadow-lg`, centrée
 * dans un `min-h-screen`. On capture cette carte — elle porte le titre, la description et
 * le formulaire, c'est-à-dire l'écran ; le `LanguageSelector` (positionné `absolute` dans
 * un coin) et l'`AppFooter` en sont exclus, et c'est voulu : ils ne sont pas l'écran
 * d'auth et bougent pour des raisons qui lui sont étrangères.
 */
const AUTH_CARD = 'div.bg-surface.max-w-md.rounded-lg.shadow-lg'

/**
 * HABILLAGE DÉPENDANT DE L'ENVIRONNEMENT — la découverte qui a réorienté cette spec.
 *
 * Les premières références générées ici étaient FAUSSES, et la mesure l'a montrée avant
 * le commit : deux runs consécutifs sur le MÊME serveur divergeaient de 3709 px sur le
 * hero clair. Le diff a désigné trois habillages qui n'ont rien à voir avec le hero mais
 * se peignent DANS sa boîte :
 *
 *  1. `nextjs-portal` / `nextjs-toast` / `[data-nextjs-dev-tools-button]` — l'indicateur
 *     de développement de Next 15.5 (badge « N · 1 Issue » en bas à gauche). `next.config.mjs`
 *     ne pose aucun `devIndicators`, il est donc actif en `next dev`. Il n'apparaît QUE
 *     lorsque Next a une remarque à faire : sa présence varie d'un run à l'autre. Et il
 *     n'existe PAS du tout sous `next start`, le mode de la CI
 *     (`.github/workflows/ci.yml`, job `e2e`).
 *  2. `.tsqd-parent-container` — le bouton d'ouverture des devtools TanStack Query, en
 *     `position: fixed` à 48 x 48 px dans le coin bas-droit. Dev uniquement, lui aussi.
 *  3. `[data-testid="network-banner"]` — `OfflineBanner`, en `position: sticky` sur toute
 *     la largeur (1280 x 32 px) EN HAUT DU FLUX. Il ne s'affiche que quand l'API est
 *     injoignable. Sur ce poste le backend est éteint : il était donc DANS la référence.
 *     En CI le backend tourne — la référence n'aurait jamais pu matcher.
 *
 * Le 3. est le plus instructif : il aurait produit un rouge PERMANENT en CI, sans rapport
 * avec une quelconque régression visuelle, et le diagnostic aurait accusé les polices.
 *
 * ON NE MASQUE PAS (`toHaveScreenshot({ mask })`) : un masque ne s'applique qu'aux
 * éléments qui EXISTENT. La référence porterait le rectangle de masque, la CI — où ces
 * éléments n'existent pas — n'en poserait aucun, et on aurait exactement le faux rouge
 * qu'on prétend supprimer. Un `display: none` injecté est, lui, un NO-OP quand la cible
 * est absente : il rend les deux environnements identiques dans les DEUX sens.
 *
 * `#_rht_toaster` (react-hot-toast) est ajouté par précaution : conteneur vide sur ces
 * écrans, mais en `position: fixed` sur toute la surface utile — un toast retardataire
 * s'y peindrait par-dessus la capture.
 */
const ENV_CHROME_CSS = `
  nextjs-portal,
  nextjs-toast,
  [data-nextjs-dev-tools-button],
  .tsqd-parent-container,
  #_rht_toaster,
  [data-testid="network-banner"] {
    display: none !important;
  }
`

interface Screen {
  /** Base du nom de fichier de référence (`<name>-<scheme>.png`). */
  readonly name: string
  readonly path: string
  /** `data-testid` dont la présence prouve que l'écran attendu est bien monté. */
  readonly proof: string
  locate(page: Page): Locator
}

const SCREENS: readonly Screen[] = [
  {
    name: 'landing-hero',
    path: `/${LOCALE}`,
    // Le `h1` de la landing vit dans le hero et nulle part ailleurs : c'est la preuve
    // structurelle que le premier `.section-animation` est bien celui qu'on croit.
    proof: '',
    locate: (page) => page.locator('section.section-animation').first(),
  },
  {
    name: 'login',
    path: `/${LOCALE}/login`,
    proof: 'login-form',
    locate: (page) => page.locator(AUTH_CARD),
  },
  {
    name: 'register',
    path: `/${LOCALE}/register`,
    proof: 'register-form',
    locate: (page) => page.locator(AUTH_CARD),
  },
  {
    name: 'forgot-password',
    path: `/${LOCALE}/forgot-password`,
    proof: 'forgot-form',
    locate: (page) => page.locator(AUTH_CARD),
  },
  {
    name: 'reset-password',
    path: `/${LOCALE}/reset-password?token=${RESET_TOKEN}`,
    proof: 'reset-form',
    locate: (page) => page.locator(AUTH_CARD),
  },
]

/**
 * Mutation du contrôle négatif — une régression TYPOGRAPHIQUE, délibérément discrète.
 *
 * Choisir ici un changement spectaculaire (le token d'accent, donc tout le fond du CTA
 * primaire) prouverait seulement que la comparaison voit une tache de 200 x 60 px, ce
 * dont personne ne doute. La famille de régressions que ce dépôt a réellement vécue est
 * typographique (#348 : `text-4xl` hors échelle DS ; #532 : rampe des pages légales) :
 * quelques glyphes qui se décalent. On mute donc l'interlettrage du `h1` du hero, et la
 * tolérance retenue est calibrée SOUS le ratio que cette mutation produit.
 */
const NEGATIVE_CONTROL_CSS = 'section.section-animation h1 { letter-spacing: 0.035em !important; }'

/**
 * Attend que les polices RÉELLEMENT UTILISÉES soient chargées ET peintes.
 *
 * ⚠ `await document.fonts.ready` NE SUFFIT PAS ICI, et c'est mesuré — pas supposé.
 * `app/fonts.ts` déclare Archivo et IBM Plex Mono via `next/font/google` en
 * **`display: 'swap'`** : le texte est d'abord peint dans la police de REPLI, puis
 * remplacé quand la face arrive. `fonts.ready` ne se résout que sur les chargements
 * DÉJÀ EN COURS ; une face pas encore demandée le laisse passer immédiatement.
 *
 * MESURE (6 runs consécutifs en conteneur, avant ce correctif) : 4 runs sur 6 rouges,
 * ~13 700 à 13 800 px de diff — soit ~7 % de la carte de connexion. Le diff montrait
 * TOUT le texte dédoublé : deux jeux de glyphes, donc deux polices. Ce n'était NI un
 * écart de plateforme NI un bruit d'antialiasing, et une tolérance dimensionnée
 * là-dessus (0.08) aurait rendu la spec incapable de voir quoi que ce soit.
 *
 * ⚠ ET `toHaveScreenshot` NE RATTRAPE PAS ÇA, contrairement à l'intuition : il rejoue
 * la capture jusqu'à obtenir DEUX captures consécutives identiques avant de comparer.
 * Deux frames de repli consécutives sont identiques — il se stabilise donc sur le
 * MAUVAIS rendu et compare celui-là. « Attendre la stabilité » ne remplace pas
 * « attendre la bonne police ».
 *
 * Ce qu'on fait à la place : relever les spécifications de police effectivement
 * calculées sur les éléments textuels de la page, les DEMANDER explicitement
 * (`document.fonts.load`, qui déclenche le téléchargement ET l'attend), puis attendre
 * `fonts.ready` — et enfin exiger une géométrie de texte STABLE, parce qu'une face
 * chargée n'est pas encore une face peinte.
 *
 * ⚠ `support/contrast.ts` expose un `waitForFonts()` qui ne fait QUE `fonts.ready`.
 * Il n'est pas réutilisé ici pour cette raison. Les specs de contraste qui s'en
 * servent mesurent des COULEURS, que la substitution de police ne change pas — elles
 * ne sont donc pas fausses ; mais toute future spec sensible à la GÉOMÉTRIE du texte
 * ne doit pas s'y fier.
 */
async function waitForRenderedFonts(page: Page, target: Locator, label: string): Promise<void> {
  const requested = await page.evaluate(async () => {
    await document.fonts.ready

    const specs = new Set<string>()
    const nodes = document.querySelectorAll('h1, h2, h3, p, span, a, button, label, input')
    for (const el of Array.from(nodes)) {
      const cs = getComputedStyle(el)
      specs.add(`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`)
    }

    // `load()` résout même si une face manque : on ne veut pas transformer une police
    // absente en timeout opaque, seulement garantir qu'on a ATTENDU la demande.
    await Promise.all(Array.from(specs, (spec) => document.fonts.load(spec).catch(() => [])))
    await document.fonts.ready

    return specs.size
  })

  // Une face chargée n'est pas une face PEINTE : on exige une géométrie de texte
  // stable sur deux relevés consécutifs. La substitution `swap` change la largeur des
  // glyphes, donc la hauteur du bloc — c'est le signal le moins cher et le plus sûr.
  let previous = ''
  await expect
    .poll(
      async () => {
        const current = await target.evaluate((el) => {
          const box = el.getBoundingClientRect()
          const first = el.querySelector('h1, h2, p, label, button')
          const inner = first ? first.getBoundingClientRect() : null
          return [box.width, box.height, inner?.width ?? 0, inner?.height ?? 0]
            .map((n) => n.toFixed(2))
            .join('/')
        })
        const settled = current === previous
        previous = current
        return settled
      },
      { message: `[${label}] la géométrie du texte ne se stabilise pas`, timeout: 15_000 },
    )
    .toBe(true)

  console.log(`[e2e][#294] ${label} — polices demandées: ${requested} spec(s), texte stable`)
}

/** Affirme que `<html>` porte (ou non) `.dark`, ET journalise la classe observée. */
async function assertThemeApplied(page: Page, scheme: Scheme, label: string): Promise<void> {
  const htmlClass = await page.locator('html').getAttribute('class')
  const hasDark = (htmlClass ?? '').split(/\s+/).includes('dark')

  expect(
    hasDark,
    hasDark === (scheme === 'dark')
      ? ''
      : `[${label}] thème NON appliqué : \`<html class="${htmlClass ?? ''}">\` sous ` +
          `\`colorScheme: ${scheme}\`. next-themes (attribute="class", defaultTheme="system", ` +
          `enableSystem) devrait poser \`.dark\` sous \`prefers-color-scheme: dark\` et le ` +
          `retirer sous \`light\`. Capturer ici graverait une référence étiquetée à tort.`,
  ).toBe(scheme === 'dark')

  // Preuve LISIBLE dans la sortie du run : l'assertion ci-dessus est silencieuse quand
  // elle passe, or c'est précisément quand elle passe qu'on veut la trace.
  console.log(`[e2e][#294] ${label} — <html class="${htmlClass ?? ''}"> (attendu: ${scheme})`)
}

/**
 * Vérifie que la boîte capturée est PLAUSIBLE et la journalise.
 *
 * Ne remplace pas [[PIT-S62-002]] — `locator.toHaveScreenshot()` n'emprunte pas le chemin
 * `page.screenshot({ clip })` qui tronque en silence — mais rend la troncature
 * DÉTECTABLE si Playwright changeait de stratégie : une hauteur soudainement plafonnée à
 * la hauteur du viewport se lirait ici.
 */
async function assertCaptureBox(locator: Locator, label: string): Promise<void> {
  const box = await locator.boundingBox()
  expect(box, `[${label}] élément sans boîte : rien à capturer`).not.toBeNull()
  const { width, height } = box!
  expect(width, `[${label}] largeur capturée nulle`).toBeGreaterThan(100)
  expect(height, `[${label}] hauteur capturée nulle`).toBeGreaterThan(100)
  console.log(`[e2e][#294] ${label} — boîte ${Math.round(width)} x ${Math.round(height)} px`)
}

/** Amène l'écran dans un état de repos capturable, puis rend le locator visé. */
async function prepare(
  page: Page,
  screen: Screen,
  scheme: Scheme,
  testInfo: TestInfo,
): Promise<Locator> {
  const label = `${screen.name}/${scheme}`

  await page.goto(screen.path, { waitUntil: 'domcontentloaded' })

  // AVANT toute mesure : neutraliser l'habillage qui diffère entre `next dev` (poste) et
  // `next start` (CI), ou selon que l'API répond. Cf. `ENV_CHROME_CSS`.
  await page.addStyleTag({ content: ENV_CHROME_CSS })

  // Le thème est posé par next-themes APRÈS hydratation : l'attendre, ne pas le lire
  // trop tôt. `expect.poll` plutôt qu'un `waitForTimeout` arbitraire.
  await expect
    .poll(
      async () => {
        const cls = (await page.locator('html').getAttribute('class')) ?? ''
        return cls.split(/\s+/).includes('dark')
      },
      { message: `[${label}] next-themes n'a pas appliqué le thème`, timeout: 10_000 },
    )
    .toBe(scheme === 'dark')

  const target = screen.locate(page)
  await expect(target, `[${label}] cible de capture non résolue`).toHaveCount(1)

  if (screen.proof !== '') {
    // [[PIT-S54-002]] : prouver le MONTAGE au runtime, pas la présence du testid au grep.
    await expect(
      target.getByTestId(screen.proof),
      `[${label}] \`${screen.proof}\` non monté — écran inattendu (état d'erreur ? redirection ?)`,
    ).toHaveCount(1)
  } else {
    await expect(
      target.locator('h1'),
      `[${label}] le premier \`.section-animation\` ne porte pas de \`h1\` : ce n'est plus ` +
        `le hero (ordre des sections de \`HomePage\` modifié ?)`,
    ).toHaveCount(1)
  }

  // AMORÇAGE DE L'AUTHENTIFICATION — deuxième référence fausse attrapée par la mesure.
  //
  // `app/[locale]/login/page.tsx:29` et `register/page.tsx:30` lisent `loading` depuis
  // `useAuth()` : c'est l'état GLOBAL de l'amorçage d'`AuthContext`, vrai tant que
  // `GET /api/auth/me` est en vol. Pendant ce temps le bouton de soumission rend un
  // `<Spinner>` et son libellé « en cours », et il est `disabled` (donc grisé).
  //
  // La référence `register-light` a été générée EXACTEMENT dans cet état — bouton
  // « Inscription… » avec spinner — puis les 8 runs suivants ont tous rendu l'état de
  // repos « S'inscrire » : 13 820 px de diff, reproductibles, contre une référence
  // fausse. La durée de cet amorçage dépend de l'API (ici éteinte, en CI vivante) :
  // c'est donc, comme la bannière réseau, un état DÉPENDANT DE L'ENVIRONNEMENT qu'une
  // référence ne doit jamais figer.
  //
  // `aria-busy` est le signal juste, et il est déjà porté par les 4 écrans (les deux
  // autres l'alimentent depuis un état local, sans course — la garde vaut pour eux
  // aussi, sans coût).
  await expect(
    target.locator('[aria-busy="true"]'),
    `[${label}] un élément est encore \`aria-busy="true"\` : l'amorçage d'AuthContext ` +
      `(\`GET /api/auth/me\`) n'est pas retombé. Capturer ici figerait un spinner dans la ` +
      `référence, et sa durée dépend de l'API — donc de l'environnement.`,
  ).toHaveCount(0, { timeout: 15_000 })

  // Le curseur peut survoler un CTA après défilement et animer `.cta-button::after`.
  await page.mouse.move(0, 0)
  await target.scrollIntoViewIfNeeded()

  // `.section-animation` démarre à `opacity: 0` : sans cette attente, le hero est VIDE.
  await expect
    .poll(
      async () =>
        target.evaluate((el) => {
          let opacity = 1
          for (let node: Element | null = el; node; node = node.parentElement) {
            opacity *= Number(getComputedStyle(node).opacity)
          }
          return opacity
        }),
      { message: `[${label}] la cible n'atteint pas opacity 1`, timeout: 10_000 },
    )
    .toBeGreaterThan(0.99)

  await waitForRenderedFonts(page, target, label)

  await assertThemeApplied(page, scheme, label)
  await assertCaptureBox(target, label)

  testInfo.annotations.push({ type: 'ecran', description: `${label} <- ${screen.path}` })

  return target
}

for (const scheme of SCHEMES) {
  test.describe(`#294 — références visuelles (thème ${scheme})`, () => {
    // `colorScheme` du CONTEXTE : pose `prefers-color-scheme`, que next-themes traduit en
    // classe `.dark`. Convention déjà en place dans `landing-cta-contrast.spec.ts:93`.
    test.use({ colorScheme: scheme, viewport: { width: 1280, height: 720 } })

    for (const screen of SCREENS) {
      test(`${screen.name} — capture de référence`, async ({ page }, testInfo) => {
        const target = await prepare(page, screen, scheme, testInfo)
        await expect(target).toHaveScreenshot(`${screen.name}-${scheme}.png`)
      })
    }
  })
}

/**
 * CONTRÔLE NÉGATIF — la comparaison DOIT rougir sur une régression.
 *
 * Sans lui, rien ne distingue « aucune régression » de « tolérance si large que rien ne
 * peut échouer » : les deux rendent vert. Il rejoue exactement le premier cas de la
 * suite (hero, thème clair, MÊME fichier de référence), plus une mutation injectée, et
 * exige l'échec.
 *
 * `timeout` court et `retries: 0` : `toHaveScreenshot` REJOUE la capture jusqu'à son
 * timeout en espérant une convergence. Ici on espère l'inverse, inutile de l'attendre
 * longtemps. Et sans `retries: 0`, la CI (`retries: 2`) rejouerait trois fois un test
 * dont on attend l'échec de l'assertion interne.
 */
test.describe('#294 — armement de la comparaison', () => {
  test.use({ colorScheme: 'light', viewport: { width: 1280, height: 720 } })
  test.describe.configure({ retries: 0 })

  test('une mutation typographique du hero fait ROUGIR la comparaison', async ({
    page,
  }, testInfo) => {
    const hero = await prepare(page, SCREENS[0], 'light', testInfo)

    await page.addStyleTag({ content: NEGATIVE_CONTROL_CSS })
    // La mutation doit être EFFECTIVE avant capture, sinon ce test prouverait seulement
    // qu'on sait injecter une balise `<style>` inerte.
    const spacing = await hero.locator('h1').evaluate((el) => getComputedStyle(el).letterSpacing)
    expect(spacing, 'la mutation injectée est inerte : `letter-spacing` inchangé').not.toBe(
      'normal',
    )

    // GARDE-FOU DE GÉNÉRATION. Quand la référence MANQUE, `toHaveScreenshot` l'ÉCRIT
    // à partir de la capture courante — ici, la capture MUTÉE. Les workers tournant en
    // parallèle, rien ne garantit que le test de référence du hero clair passe avant
    // celui-ci : sur un run de (re)génération, ce test pourrait donc graver la mutation
    // COMME référence, et toute la suite validerait ensuite le rendu régressé. On refuse
    // explicitement de tourner sans référence préexistante.
    const referencePath = testInfo.snapshotPath('landing-hero-light.png')
    expect(
      existsSync(referencePath),
      `Référence absente (${referencePath}). Ce test COMPARE, il ne génère pas : le laisser ` +
        `écrire la référence y graverait la mutation. Générer d'abord les références ` +
        `(voir \`docs/memory/sprints/sprint-77/issue-294-done.md\`), puis rejouer.`,
    ).toBe(true)

    let comparisonFailed = false
    try {
      await expect(hero).toHaveScreenshot('landing-hero-light.png', { timeout: 5_000 })
    } catch {
      comparisonFailed = true
    }

    expect(
      comparisonFailed,
      "La comparaison visuelle est restée VERTE malgré une mutation de l'interlettrage du " +
        '`h1` du hero. La tolérance de `playwright.config.ts` (`expect.toHaveScreenshot`) est ' +
        'trop large : la suite ne peut plus détecter aucune régression et reste verte pour ' +
        "toujours. Resserrer la tolérance, ou vérifier que la référence n'a pas été " +
        'régénérée AVEC la mutation.',
    ).toBe(true)
  })
})
