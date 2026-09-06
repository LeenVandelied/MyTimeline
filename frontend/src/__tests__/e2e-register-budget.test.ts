import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ALL_ACCOUNTS } from '../../e2e/support/accounts'

/**
 * #475 — LE BUDGET `register` DE LA SUITE E2E, RECOMPTÉ DEPUIS LES SOURCES.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE CE FICHIER REMPLACE
 * ─────────────────────────────────────────────────────────────────────────────
 * Avant #475, le budget `register` de la suite n'était affirmé que par des
 * COMMENTAIRES, recopiés dans trois fichiers (`accounts.ts`, `auth.setup.ts`,
 * `playwright.config.ts`). Ils étaient faux sur les deux bords :
 *
 *   - ils annonçaient « 3 comptes » là où `ALL_ACCOUNTS` en contient 4 ;
 *   - ils concluaient « on reste sous le rate-limit register (5/min/IP) » alors
 *     que 4 provisions + l'auto-inscription du golden-path font exactement 5
 *     pour un plafond de 5 — marge NULLE, pas une marge.
 *
 * Et la conclusion fausse était PORTANTE : `playwright.config.ts` s'en servait
 * pour justifier `workers: 1` en CI. Un commentaire que rien ne recompte n'est
 * pas un budget, c'est une croyance.
 *
 * Ce test recompte donc le budget à partir des SOURCES (le tableau de comptes,
 * les specs qui soumettent le formulaire register) et le confronte au plafond
 * réellement configuré côté backend. Il rougit si l'un des trois bouge sans les
 * autres : un compte ajouté, une spec qui s'inscrit, un plafond abaissé.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CORRECTION DU CYCLE 2 DE REVUE (S79) — LA DÉTECTION ÉTAIT AVEUGLE, ET PAS EN
 * THÉORIE
 * ─────────────────────────────────────────────────────────────────────────────
 * La première version de `countSpecRegisters` cherchait `register-submit` et
 * `/api/auth/register` dans les SEULS fichiers `e2e/*.spec.ts`. Elle documentait
 * ses angles morts, mais RIEN ne les exerçait — et l'un d'eux était déjà réalisé
 * dans le dépôt :
 *
 *   `e2e/support/auth.ts` expose `registerOnly()`, qui soumet le formulaire
 *   d'inscription. `forgot-password.spec.ts` l'appelle 1 fois,
 *   `reset-password-failures.spec.ts` 2 fois. Ces TROIS inscriptions réelles
 *   étaient invisibles au compteur : aucun de ces deux fichiers ne contient
 *   `register-submit`, le clic vit dans le helper. Le budget annoncé (5) était
 *   donc faux de 3, dans le sens qui minimise le risque.
 *
 * La détection résout maintenant l'indirection : elle repère dans `e2e/support/`
 * les fonctions exportées qui émettent un register (directement, ou en appelant
 * une autre fonction qui en émet), puis compte leurs APPELS dans les specs. Et
 * la détection elle-même est exercée par le bloc de tests « sources
 * synthétiques » plus bas — dont un cas est exactement le trou ci-dessus.
 *
 * ⚠ CE QU'IL NE PROUVE PAS. Il lit de la CONFIGURATION, pas un run. Que le
 * plafond soit effectivement APPLIQUÉ par `RateLimitingFilter` sous le profil
 * `e2e` est prouvé côté backend, par un test d'intégration qui traverse la vraie
 * chaîne de filtres (`RegisterRateLimitE2eProfileIntegrationTest`). Les deux sont
 * nécessaires : celui-ci ne sait pas exécuter Spring, celui-là ne sait pas
 * compter les specs.
 *
 * ⚠ ET SURTOUT — la stack E2E réelle (job CI `e2e`, service `backend-e2e`) pose
 * aujourd'hui `RATE_LIMIT_ENABLED=false`, qui court-circuite le filtre ENTIER.
 * Aucun plafond n'y est en vigueur, donc un run E2E vert ne dit RIEN du budget :
 * c'est exactement pourquoi ce contrôle est statique et vit hors de la suite E2E.
 */

/** Racine du dépôt (les tests Vitest tournent avec `cwd` = frontend/). */
const REPO_ROOT = join(process.cwd(), '..')

const E2E_DIR = join(process.cwd(), 'e2e')

const SUPPORT_DIR = join(E2E_DIR, 'support')

const E2E_PROPERTIES = join(
  REPO_ROOT,
  'backend',
  'src',
  'main',
  'resources',
  'application-e2e.properties',
)

/**
 * Marge minimale exigée, en inscriptions par minute. Le critère d'acceptation de
 * #475 demande qu'ajouter UN register à la suite ne fasse plus déborder ; on exige
 * plus large (5) pour que l'ajout d'une spec entière reste possible sans toucher au
 * backend, et pour absorber les retries CI (`retries: 2`).
 */
const MIN_MARGIN = 5

/**
 * Lit le plafond `register` du profil `e2e`.
 *
 * Échec DUR si le fichier manque, jamais un `skip` : un contrôle qui se désarme
 * tout seul quand sa cible disparaît est un faux vert — et c'est précisément la
 * cible qui porte la correction de #475.
 */
function readE2eRegisterCeiling(): number {
  expect(
    existsSync(E2E_PROPERTIES),
    `application-e2e.properties INTROUVABLE (${E2E_PROPERTIES}). C'est ce fichier qui porte ` +
      'le plafond `register` du profil e2e (#475) : sans lui, la suite retombe au défaut de ' +
      '5/min/IP, soit exactement le budget sans marge que #475 corrige.',
  ).toBe(true)

  const content = readFileSync(E2E_PROPERTIES, 'utf8')
  const match = content.match(/^\s*app\.rate-limit\.register-per-minute\s*=\s*(\d+)\s*$/m)
  expect(
    match,
    'app.rate-limit.register-per-minute absente (ou commentée) de application-e2e.properties.',
  ).not.toBeNull()

  return Number(match![1])
}

/**
 * Les DEUX signatures d'une inscription réellement émise :
 *  - le clic sur le bouton de soumission du formulaire (`register-submit`) ;
 *  - un appel HTTP direct vers `/api/auth/register`.
 *
 * Les motifs sont volontairement ANCRÉS sur la forme d'appel (`getByTestId(...)`,
 * `.post(...)`) et pas sur la simple présence de la chaîne : `support/register-page.ts`
 * cite `/api/auth/register` dans un MESSAGE d'erreur sans jamais rien émettre, et la
 * première version comptait ce genre d'occurrence.
 */
const UI_SUBMIT = /getByTestId\(\s*(['"`])register-submit\1\s*\)/g
const API_SUBMIT = /\.(?:post|fetch)\(\s*(['"`])[^'"`]*\/api\/auth\/register/g

/** Inscriptions émises DIRECTEMENT par ce texte source (hors indirection par helper). */
function countDirectRegisters(source: string): number {
  return (source.match(UI_SUBMIT)?.length ?? 0) + (source.match(API_SUBMIT)?.length ?? 0)
}

/** Occurrences d'un APPEL à `fnName` (l'import nommé, lui, n'est pas suivi d'une parenthèse). */
function countCalls(source: string, fnName: string): number {
  return source.match(new RegExp(`\\b${fnName}\\s*\\(`, 'g'))?.length ?? 0
}

const EXPORTED_FUNCTION = /export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/g

/** Découpe grossière d'un module en « corps de fonctions exportées » (du header au suivant). */
function readHelperChunks(supportDir: string): { name: string; body: string }[] {
  const chunks: { name: string; body: string }[] = []
  for (const file of readdirSync(supportDir)) {
    if (!file.endsWith('.ts')) continue
    const source = readFileSync(join(supportDir, file), 'utf8')
    const headers = [...source.matchAll(EXPORTED_FUNCTION)]
    headers.forEach((header, index) => {
      const start = header.index!
      const end = index + 1 < headers.length ? headers[index + 1].index! : source.length
      chunks.push({ name: header[1], body: source.slice(start, end) })
    })
  }
  return chunks
}

/**
 * Fonctions exportées de `e2e/support/` qui émettent une inscription — directement,
 * ou parce qu'elles en appellent une autre qui le fait (point fixe, `registerAndLogin`
 * -> `registerOnly`).
 */
function findRegisterHelpers(supportDir: string): string[] {
  const chunks = readHelperChunks(supportDir)
  const emitting = new Set(
    chunks.filter((chunk) => countDirectRegisters(chunk.body) > 0).map((chunk) => chunk.name),
  )

  for (let pass = 0; pass <= chunks.length; pass++) {
    let grew = false
    for (const chunk of chunks) {
      if (emitting.has(chunk.name)) continue
      if ([...emitting].some((name) => countCalls(chunk.body, name) > 0)) {
        emitting.add(chunk.name)
        grew = true
      }
    }
    if (!grew) break
  }

  return [...emitting].sort()
}

/**
 * Compte les auto-inscriptions faites par les SPECS (hors projet `setup`, dont le
 * volume est déjà donné par `ALL_ACCOUNTS`).
 *
 * HEURISTIQUE ASSUMÉE, et ses bords EXERCÉS plus bas : une soumission = un clic sur
 * `register-submit` ou un `.post('/api/auth/register')`, émis par la spec ou par un
 * helper de `e2e/support/` qu'elle appelle. Elle sur-compte une soumission placée
 * dans une boucle et sous-compte un locator construit depuis une variable (contre-
 * exemple explicite dans le bloc « sources synthétiques »). Le but n'est pas un
 * compteur exact au runtime, c'est qu'AUCUNE spec ne puisse ajouter un register sans
 * que ce test le voie passer.
 */
function countSpecRegisters(
  specDir: string = E2E_DIR,
  supportDir: string = SUPPORT_DIR,
): { total: number; perFile: Record<string, number>; helpers: string[] } {
  const helpers = findRegisterHelpers(supportDir)
  const perFile: Record<string, number> = {}
  for (const file of readdirSync(specDir)) {
    if (!file.endsWith('.spec.ts')) continue
    const source = readFileSync(join(specDir, file), 'utf8')
    const count =
      countDirectRegisters(source) +
      helpers.reduce((sum, helper) => sum + countCalls(source, helper), 0)
    if (count > 0) perFile[file] = count
  }
  return { total: Object.values(perFile).reduce((a, b) => a + b, 0), perFile, helpers }
}

describe('#475 — budget register de la suite E2E', () => {
  it('le budget nominal tient sous le plafond du profil e2e, avec une marge', () => {
    const ceiling = readE2eRegisterCeiling()
    const setupRegisters = ALL_ACCOUNTS.length
    const { total: specRegisters, perFile } = countSpecRegisters()
    const budget = setupRegisters + specRegisters
    const margin = ceiling - budget

    expect(
      margin,
      [
        `Budget register de la suite = ${budget} pour un plafond e2e de ${ceiling} ` +
          `(marge ${margin}, minimum exigé ${MIN_MARGIN}).`,
        `  projet setup (ALL_ACCOUNTS) : ${setupRegisters}`,
        `  specs : ${specRegisters} ${JSON.stringify(perFile)}`,
        '',
        'Deux corrections possibles, PAS interchangeables :',
        '  - mutualiser un compte / retirer une auto-inscription -> baisse le budget ;',
        '  - relever app.rate-limit.register-per-minute (application-e2e.properties)',
        '    -> relève le plafond, et il faut alors recompter la marge du slot `login`',
        '       (10/min/IP), que #475 n a PAS mesuré.',
        "N'exempte PAS l'IP du runner et ne désarme pas le filtre : ce serait supprimer",
        'le symptôme en supprimant ce que la suite est censée traverser.',
      ].join('\n'),
    ).toBeGreaterThanOrEqual(MIN_MARGIN)
  })

  it('ajouter UN register de plus à la suite ne fait pas déborder (critère #475)', () => {
    const ceiling = readE2eRegisterCeiling()
    const budget = ALL_ACCOUNTS.length + countSpecRegisters().total

    expect(
      budget + 1,
      `Une inscription de plus porterait la suite à ${budget + 1} pour un plafond de ${ceiling}. ` +
        "C'est le scénario que l'issue #475 décrit : le test suivant qui s'inscrit fait échouer " +
        'toute la CI, avec un symptôme (timeout sur la page de connexion) qui ne pointe pas vers ' +
        'la vraie cause.',
    ).toBeLessThanOrEqual(ceiling)
  })

  it('le projet setup provisionne bien 4 comptes fixes (garde le chiffre honnête)', () => {
    // Le chiffre est cité dans application-e2e.properties, dans le test d'intégration
    // backend et dans les commentaires du harnais E2E. S'il change ici sans être
    // répercuté, la marge documentée devient fausse — c'est l'origine de #475.
    expect(ALL_ACCOUNTS.length).toBe(4)
  })

  it('voit les inscriptions émises par un HELPER, pas seulement celles écrites dans la spec', () => {
    // ANCRAGE SUR LE DÉPÔT RÉEL du trou trouvé au cycle 2 de revue du S79 : ces trois
    // inscriptions passent par `support/auth.ts#registerOnly`. Aucun de ces deux
    // fichiers ne contient `register-submit` — la version précédente du compteur les
    // voyait à 0 et annonçait un budget de 5 au lieu de 8.
    const { perFile, helpers } = countSpecRegisters()

    expect(helpers, 'les helpers émetteurs de support/auth.ts doivent être détectés').toEqual(
      expect.arrayContaining(['registerOnly', 'registerAndLogin']),
    )
    expect(perFile['forgot-password.spec.ts']).toBe(1)
    expect(perFile['reset-password-failures.spec.ts']).toBe(2)
    expect(perFile['golden-path.spec.ts']).toBe(1)
  })
})

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LA DÉTECTION, EXERCÉE (correctif du cycle 2 de revue, S79)
 * ─────────────────────────────────────────────────────────────────────────────
 * Les tests ci-dessus mesurent le dépôt ; ceux-ci mesurent le MESUREUR. Ils
 * fabriquent des sources SYNTHÉTIQUES dans un dossier temporaire — jamais une
 * modification d'une vraie spec — et vérifient que le compteur les voit (ou, pour
 * le dernier, qu'il ne les voit pas, avec le contre-exemple sous les yeux).
 */
describe('#475 — la détection de register, exercée sur des sources synthétiques', () => {
  const SUBMIT = "await page.getByTestId('register-submit').click()"

  /** Écrit un mini-dépôt E2E jetable et renvoie ses deux dossiers. */
  function scratch(files: {
    specs?: Record<string, string>
    support?: Record<string, string>
  }): [string, string] {
    const root = mkdtempSync(join(tmpdir(), 'register-budget-'))
    const supportDir = join(root, 'support')
    mkdirSync(supportDir)
    for (const [name, body] of Object.entries(files.specs ?? {})) {
      writeFileSync(join(root, name), body, 'utf8')
    }
    for (const [name, body] of Object.entries(files.support ?? {})) {
      writeFileSync(join(supportDir, name), body, 'utf8')
    }
    return [root, supportDir]
  }

  it('compte une soumission écrite directement dans la spec', () => {
    const [specs, support] = scratch({
      specs: { 'fake.spec.ts': `test('x', async ({ page }) => {\n  ${SUBMIT}\n})\n` },
    })
    expect(countSpecRegisters(specs, support).perFile['fake.spec.ts']).toBe(1)
  })

  it('compte un register émis en API directe', () => {
    const [specs, support] = scratch({
      specs: {
        'api.spec.ts': `test('x', async ({ request }) => {\n  await request.post('/api/auth/register', { data })\n})\n`,
      },
    })
    expect(countSpecRegisters(specs, support).perFile['api.spec.ts']).toBe(1)
  })

  it('COMPTE un register émis via un helper de support — le trou du cycle 1', () => {
    // Reproduction fidèle du cas RÉEL (`registerOnly` dans `support/auth.ts`) :
    // la spec ne contient ni `register-submit` ni `/api/auth/register`.
    const [specs, support] = scratch({
      support: {
        'auth.ts': `export async function registerOnly(page) {\n  ${SUBMIT}\n}\n`,
      },
      specs: {
        'helper.spec.ts':
          `import { registerOnly } from './support/auth'\n` +
          `test('a', async ({ page }) => { await registerOnly(page) })\n` +
          `test('b', async ({ page }) => { await registerOnly(page, 'x') })\n`,
      },
    })
    const counted = countSpecRegisters(specs, support)
    expect(counted.helpers).toContain('registerOnly')
    expect(counted.perFile['helper.spec.ts']).toBe(2)
  })

  it("suit l'indirection transitive (helper qui appelle un helper émetteur)", () => {
    const [specs, support] = scratch({
      support: {
        'auth.ts':
          `export async function registerOnly(page) {\n  ${SUBMIT}\n}\n` +
          `export async function registerAndLogin(page) {\n  await registerOnly(page)\n}\n`,
      },
      specs: {
        'transitive.spec.ts': `test('x', async ({ page }) => { await registerAndLogin(page) })\n`,
      },
    })
    const counted = countSpecRegisters(specs, support)
    expect(counted.helpers).toEqual(expect.arrayContaining(['registerOnly', 'registerAndLogin']))
    expect(counted.perFile['transitive.spec.ts']).toBe(1)
  })

  it('ne compte PAS un helper seulement importé, ni un helper qui ne soumet rien', () => {
    const [specs, support] = scratch({
      support: {
        'auth.ts':
          `export async function registerOnly(page) {\n  ${SUBMIT}\n}\n` +
          // Cite l'URL dans un MESSAGE, comme `support/register-page.ts` : n'émet rien.
          `export async function ensureRegisterForm(page) {\n` +
          `  throw new Error("aucun POST /api/auth/register n'a été tenté")\n}\n`,
      },
      specs: {
        'imports-only.spec.ts':
          `import { registerOnly } from './support/auth'\n` +
          `test('x', async ({ page }) => { await ensureRegisterForm(page) })\n`,
      },
    })
    expect(countSpecRegisters(specs, support).perFile['imports-only.spec.ts']).toBeUndefined()
  })

  it("ANGLE MORT ASSUMÉ — un locator construit depuis une variable n'est pas vu", () => {
    // CONTRE-EXEMPLE, écrit noir sur blanc plutôt que masqué : une spec qui fait
    //     const SUBMIT_ID = 'register-submit'
    //     await page.getByTestId(SUBMIT_ID).click()
    // émet une inscription RÉELLE que ce compteur ne voit pas — il lit du texte, il
    // n'exécute rien. Aucune spec du dépôt n'écrit ça aujourd'hui (vérifié : les 3
    // points d'émission passent par un littéral). Si ce test se met à rougir, c'est
    // que la détection a été renforcée : mettre à jour l'attendu, pas le contourner.
    const [specs, support] = scratch({
      specs: {
        'blind.spec.ts':
          `const SUBMIT_ID = 'register-submit'\n` +
          `test('x', async ({ page }) => { await page.getByTestId(SUBMIT_ID).click() })\n`,
      },
    })
    expect(countSpecRegisters(specs, support).total).toBe(0)
  })
})
