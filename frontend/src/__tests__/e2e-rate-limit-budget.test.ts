import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'

import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { ALL_ACCOUNTS } from '../../e2e/support/accounts'

/**
 * #475 → #547 — LE BUDGET RATE-LIMIT DE LA SUITE E2E, RECOMPTÉ DEPUIS LES SOURCES.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CE FICHIER EXISTE
 * ─────────────────────────────────────────────────────────────────────────────
 * Depuis #547 le filtre de rate-limit est ARMÉ pendant les runs E2E (plus de
 * `RATE_LIMIT_ENABLED=false` dans `ci.yml` ni dans `docker-compose.yml`). Derrière
 * le proxy Next, TOUTE la suite compte sur UNE IP : un budget sous-estimé n'est plus
 * une croyance inoffensive, c'est un 429 en CI. Ce test confronte donc, pour chaque
 * créneau que la suite consomme, le budget RECOMPTÉ depuis les sources au plafond
 * réellement configuré côté backend.
 *
 * Il remplace `e2e-register-budget.test.ts` (#475), qui ne comptait que `register`,
 * sur une seule passe. Deux défauts corrigés au S88 :
 *
 *   1. LA PASSE 2 MANQUAIT. Le job CI `e2e` joue DEUX passes Playwright contre le
 *      MÊME backend (seaux en mémoire JVM, conservés d'une passe à l'autre) ; la
 *      passe 2 (`auth.setup.ts auth-signature.spec.ts`) re-provisionne les 4 comptes.
 *      Le budget register annoncé (8) valait 12 en CI. Les passes sont maintenant
 *      LUES dans `ci.yml`, pas supposées.
 *   2. LES HELPERS LOCAUX D'UNE SPEC ÉTAIENT COMPTÉS UNE FOIS. La détection par
 *      regex voyait `login-submit` UNE fois dans `reset-password-failures.spec.ts`,
 *      alors que la fonction locale `submitLogin` qui le porte est appelée deux fois.
 *      Invisible pour `register` (le helper vit dans `support/`), faux pour `login`
 *      et `reset-password`. La détection lit maintenant l'AST TypeScript.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA RÈGLE (identique à celle écrite dans application-e2e.properties)
 * ─────────────────────────────────────────────────────────────────────────────
 *   nominal CI  = Σ passes [ setup + émissions des specs de la passe ]
 *   pire cas CI = Σ passes [ setup + émissions des specs × (1 + retries) ]
 *
 * Le setup n'est PAS multiplié par les retries, et c'est prouvé, pas supposé : un
 * `provision` retenté ré-inscrit un compte FIXE, prend 409, reste sur /fr/register
 * et lève AVANT le login (`auth.setup.ts`). Il émet donc au plus UN register et UN
 * login par compte par passe. Le total d'une passe est un majorant du pic par minute
 * (refill `intervally` : si le total tient sous le plafond, aucun 429 n'est possible).
 *
 * ⚠ CE QU'IL NE PROUVE PAS. Il lit de la CONFIGURATION et du TEXTE SOURCE, pas un
 * run. L'application effective des plafonds est prouvée côté backend par
 * `RateLimitE2eProfileIntegrationTest` / `RateLimitDefaultCeilingsIntegrationTest`, et
 * l'armement du chemin réseau réel par `e2e/rate-limit-armed.proof.ts`. Le compte
 * statique a été confronté une fois à un comptage MESURÉ (proxy de comptage entre
 * Next et le backend, S88) : identique sur les 10 créneaux.
 */

/** Racine du dépôt (les tests Vitest tournent avec `cwd` = frontend/). */
const FRONTEND = process.cwd()
const REPO_ROOT = join(FRONTEND, '..')
const E2E_DIR = join(FRONTEND, 'e2e')
const SUPPORT_DIR = join(E2E_DIR, 'support')
const SETUP_FILE = join(E2E_DIR, 'auth.setup.ts')
const PLAYWRIGHT_CONFIG = join(FRONTEND, 'playwright.config.ts')
const CI_WORKFLOW = join(REPO_ROOT, '.github', 'workflows', 'ci.yml')
const BACKEND_RESOURCES = join(REPO_ROOT, 'backend', 'src', 'main', 'resources')
const E2E_PROPERTIES = join(BACKEND_RESOURCES, 'application-e2e.properties')
const FILTER_SOURCE = join(
  REPO_ROOT,
  'backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java',
)

/**
 * Marge minimale exigée entre le plafond e2e et le budget NOMINAL CI d'un créneau
 * réglable — héritée de #475.
 */
const MIN_MARGIN = 5

// ─────────────────────────────────────────────────────────────────────────────
// Signatures d'émission
// ─────────────────────────────────────────────────────────────────────────────

type SlotName =
  | 'register'
  | 'login'
  | 'reset-password'
  | 'forgot-password'
  | 'change-password'
  | 'refresh'

interface Signature {
  /** `data-testid` du bouton de soumission qui déclenche l'appel (absent si aucun écran). */
  uiSubmit?: string
  /** Chemin API émis en appel direct (`request.post('/api/…')`). */
  apiPath: string
}

const SIGNATURES: Record<SlotName, Signature> = {
  register: { uiSubmit: 'register-submit', apiPath: '/api/auth/register' },
  login: { uiSubmit: 'login-submit', apiPath: '/api/auth/login' },
  'reset-password': { uiSubmit: 'reset-submit', apiPath: '/api/auth/reset-password' },
  'forgot-password': { uiSubmit: 'forgot-submit', apiPath: '/api/auth/forgot-password' },
  'change-password': { uiSubmit: 'password-submit', apiPath: '/api/me/change-password' },
  // Créneau de la preuve d'armement : AUCUNE spec ne doit le consommer.
  refresh: { apiPath: '/api/auth/refresh' },
}

const HTTP_METHODS = new Set(['post', 'fetch', 'patch', 'put'])

function literalText(node: ts.Node | undefined): string | null {
  if (!node) return null
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (ts.isTemplateExpression(node)) return node.getText()
  return null
}

/** Vrai si `call` émet directement le créneau (clic sur le bouton OU appel HTTP direct). */
function isDirectEmission(call: ts.CallExpression, signature: Signature): boolean {
  if (!ts.isPropertyAccessExpression(call.expression)) return false
  const method = call.expression.name.text
  const first = literalText(call.arguments[0])
  if (first === null) return false // ANGLE MORT ASSUMÉ : argument non littéral.
  if (method === 'getByTestId')
    return signature.uiSubmit !== undefined && first === signature.uiSubmit
  if (HTTP_METHODS.has(method)) {
    const escaped = signature.apiPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Ancré à droite : `/api/auth/login-history` n'est PAS `/api/auth/login`.
    return new RegExp(`${escaped}(?![\\w-])`).test(first)
  }
  return false
}

/** Émissions dans `node` : directes + appels de fonctions émettrices × leur propre compte. */
function countIn(node: ts.Node, signature: Signature, emitting: Map<string, number>): number {
  let total = 0
  const visit = (n: ts.Node): void => {
    if (ts.isCallExpression(n)) {
      if (isDirectEmission(n, signature)) total += 1
      if (ts.isIdentifier(n.expression)) total += emitting.get(n.expression.text) ?? 0
    }
    ts.forEachChild(n, visit)
  }
  visit(node)
  return total
}

function parse(file: string, text = readFileSync(file, 'utf8')): ts.SourceFile {
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
}

/** Fonctions de niveau module : `function f() {}` et `const f = (…) => {}` / `function () {}`. */
function topLevelFunctions(source: ts.SourceFile): Map<string, ts.Node> {
  const fns = new Map<string, ts.Node>()
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && statement.body) {
      fns.set(statement.name.text, statement.body)
    } else if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        const init = decl.initializer
        if (
          ts.isIdentifier(decl.name) &&
          init &&
          (ts.isArrowFunction(init) || ts.isFunctionExpression(init))
        ) {
          fns.set(decl.name.text, init.body)
        }
      }
    }
  }
  return fns
}

function isFunctionStatement(statement: ts.Statement): boolean {
  if (ts.isFunctionDeclaration(statement)) return true
  return (
    ts.isVariableStatement(statement) &&
    statement.declarationList.declarations.some(
      (d) =>
        d.initializer !== undefined &&
        (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)),
    )
  )
}

/**
 * Compte d'émissions par fonction, en point fixe (une fonction qui appelle une fonction
 * émettrice émet autant qu'elle, par appel). `base` = fonctions déjà résolues ailleurs.
 */
function resolveFunctions(
  fns: Map<string, ts.Node>,
  signature: Signature,
  base: Map<string, number> = new Map(),
): Map<string, number> {
  const counts = new Map(base)
  for (const name of fns.keys()) counts.set(name, 0)
  for (let pass = 0; pass <= fns.size; pass++) {
    let changed = false
    for (const [name, body] of fns) {
      const value = countIn(body, signature, counts)
      if (value !== counts.get(name)) {
        counts.set(name, value)
        changed = true
      }
    }
    if (!changed) break
  }
  return counts
}

function supportHelpers(supportDir: string, signature: Signature): Map<string, number> {
  const fns = new Map<string, ts.Node>()
  for (const file of readdirSync(supportDir)) {
    if (!file.endsWith('.ts')) continue
    for (const [name, body] of topLevelFunctions(parse(join(supportDir, file)))) fns.set(name, body)
  }
  return resolveFunctions(fns, signature)
}

/** Émissions d'un fichier de spec : hors déclarations de fonctions, helpers résolus. */
function countSpecSource(
  source: ts.SourceFile,
  signature: Signature,
  helpers: Map<string, number>,
) {
  const local = resolveFunctions(topLevelFunctions(source), signature, helpers)
  return source.statements
    .filter((statement) => !isFunctionStatement(statement))
    .reduce((sum, statement) => sum + countIn(statement, signature, local), 0)
}

function countSpecs(
  slot: SlotName,
  specDir: string = E2E_DIR,
  supportDir: string = SUPPORT_DIR,
): { perFile: Record<string, number>; helpers: string[] } {
  const signature = SIGNATURES[slot]
  const helpers = supportHelpers(supportDir, signature)
  const perFile: Record<string, number> = {}
  for (const file of readdirSync(specDir)) {
    if (!file.endsWith('.spec.ts')) continue
    const count = countSpecSource(parse(join(specDir, file)), signature, helpers)
    if (count > 0) perFile[file] = count
  }
  const emitting = [...helpers].filter(([, n]) => n > 0).map(([name]) => name)
  return { perFile, helpers: emitting.sort() }
}

/** Émissions par compte provisionné : la fonction `provision` du projet `setup`. */
function setupEmissionsPerAccount(slot: SlotName, setupFile: string = SETUP_FILE): number {
  const signature = SIGNATURES[slot]
  const source = parse(setupFile)
  const fns = topLevelFunctions(source)
  expect(fns.has('provision'), `fonction \`provision\` introuvable dans ${setupFile}`).toBe(true)
  return resolveFunctions(fns, signature, supportHelpers(SUPPORT_DIR, signature)).get('provision')!
}

// ─────────────────────────────────────────────────────────────────────────────
// Passes CI, retries, plafonds — LUS, jamais supposés
// ─────────────────────────────────────────────────────────────────────────────

interface Pass {
  command: string
  full: boolean
  files: string[]
}

/** Les invocations Playwright du workflow CI, dans l'ordre. */
function readCiPasses(yaml: string = readFileSync(CI_WORKFLOW, 'utf8')): Pass[] {
  const passes: Pass[] = []
  for (const line of yaml.split('\n')) {
    const match = line.match(/^\s*run:\s*(.*(?:npm run test:e2e|playwright test).*)$/)
    if (!match) continue
    const command = match[1].trim()
    const args = command.includes('test:e2e')
      ? (command.split(/\s--\s/)[1] ?? '').split(/\s+/)
      : command.split(/playwright test/)[1].split(/\s+/)
    const files = args.filter((a) => a !== '' && !a.startsWith('-'))
    passes.push({ command, full: files.length === 0, files })
  }
  return passes
}

function passIncludes(pass: Pass, file: string): boolean {
  return pass.full || pass.files.some((f) => basename(f) === file)
}

function readRetries(): number {
  const match = readFileSync(PLAYWRIGHT_CONFIG, 'utf8').match(
    /retries:\s*process\.env\.CI\s*\?\s*(\d+)\s*:\s*\d+/,
  )
  expect(match, 'retries CI introuvable dans playwright.config.ts').not.toBeNull()
  return Number(match![1])
}

/** Spécs rejouées une 2e fois dans la même passe par le projet `firefox` (testMatch restreint). */
function readFirefoxMatch(): RegExp {
  const text = readFileSync(PLAYWRIGHT_CONFIG, 'utf8')
  const match = text.match(/name:\s*'firefox',\s*testMatch:\s*\/(.+)\/,/)
  expect(match, 'testMatch du projet firefox introuvable dans playwright.config.ts').not.toBeNull()
  return new RegExp(match![1])
}

function readProperty(key: string): number | null {
  expect(existsSync(E2E_PROPERTIES), `INTROUVABLE : ${E2E_PROPERTIES}`).toBe(true)
  const escaped = key.replace(/\./g, '\\.')
  const match = readFileSync(E2E_PROPERTIES, 'utf8').match(
    new RegExp(`^\\s*${escaped}\\s*=\\s*(\\d+)\\s*$`, 'm'),
  )
  return match ? Number(match[1]) : null
}

/** Plafond PAR DÉFAUT, lu dans RateLimitingFilter.java (constante dédiée ou entrée de la map). */
function readDefaultCeiling(slot: SlotName): number {
  const java = readFileSync(FILTER_SOURCE, 'utf8')
  const constant = `DEFAULT_${slot.toUpperCase().replace(/-/g, '_')}_PER_MINUTE`
  const byConstant = java.match(new RegExp(`int ${constant} = (\\d+);`))
  if (byConstant) return Number(byConstant[1])
  const escaped = SIGNATURES[slot].apiPath.replace(/\//g, '\\/')
  const byEntry = java.match(new RegExp(`Map\\.entry\\("POST ${escaped}", (\\d+)\\)`))
  expect(
    byEntry,
    `plafond par défaut de ${slot} introuvable dans RateLimitingFilter.java`,
  ).not.toBeNull()
  return Number(byEntry![1])
}

interface BudgetLine {
  nominal: number
  worst: number
  ceiling: number
  defaultCeiling: number
}

function readBudgetLines(): Record<string, BudgetLine> {
  const lines: Record<string, BudgetLine> = {}
  const re =
    /^#\s+BUDGET\s+(\S+)\s+nominal-ci=(\d+)\s+pire-cas-ci=(\d+)\s+plafond=(\d+)\s+defaut=(\d+)\s*$/gm
  for (const m of readFileSync(E2E_PROPERTIES, 'utf8').matchAll(re)) {
    lines[m[1]] = {
      nominal: Number(m[2]),
      worst: Number(m[3]),
      ceiling: Number(m[4]),
      defaultCeiling: Number(m[5]),
    }
  }
  return lines
}

interface Budget {
  nominal: number
  worst: number
  detail: string[]
}

function computeBudget(slot: SlotName): Budget {
  const passes = readCiPasses()
  const retries = readRetries()
  const firefox = readFirefoxMatch()
  const { perFile } = countSpecs(slot)
  const setupPerPass = ALL_ACCOUNTS.length * setupEmissionsPerAccount(slot)
  let nominal = 0
  let worst = 0
  const detail: string[] = []
  passes.forEach((pass, index) => {
    const setup = passIncludes(pass, 'auth.setup.ts') ? setupPerPass : 0
    let specs = 0
    for (const [file, count] of Object.entries(perFile)) {
      if (!passIncludes(pass, file)) continue
      specs += count * (pass.full && firefox.test(file) ? 2 : 1)
    }
    nominal += setup + specs
    worst += setup + specs * (1 + retries)
    detail.push(
      `  passe ${index + 1} (${pass.full ? 'suite complète' : pass.files.join(' ')}) : setup ${setup} + specs ${specs}`,
    )
  })
  detail.push(`  specs émettrices : ${JSON.stringify(perFile)} ; retries CI : ${retries}`)
  return { nominal, worst, detail }
}

const TUNABLE: { slot: SlotName; property: string }[] = [
  { slot: 'register', property: 'app.rate-limit.register-per-minute' },
  { slot: 'login', property: 'app.rate-limit.login-per-minute' },
  { slot: 'reset-password', property: 'app.rate-limit.reset-password-per-minute' },
]

/** Arbitrage #547 (option D) : ces créneaux restent au défaut, sans propriété. */
const AT_DEFAULT: SlotName[] = ['forgot-password', 'change-password']

// ─────────────────────────────────────────────────────────────────────────────

describe('#547 — budget rate-limit de la suite E2E (dépôt réel)', () => {
  it('le job CI joue bien les passes attendues, dont la passe 2 qui re-provisionne', () => {
    const passes = readCiPasses()
    expect(
      passes.length,
      `invocations Playwright lues dans ci.yml : ${JSON.stringify(passes)}`,
    ).toBe(2)
    expect(passes[0].full).toBe(true)
    expect(passIncludes(passes[1], 'auth.setup.ts')).toBe(true)
  })

  it('le setup émet exactement 1 register et 1 login par compte, et provisionne 4 comptes', () => {
    expect(ALL_ACCOUNTS.length).toBe(4)
    expect(setupEmissionsPerAccount('register')).toBe(1)
    expect(setupEmissionsPerAccount('login')).toBe(1)
  })

  for (const { slot, property } of TUNABLE) {
    it(`${slot} : le plafond e2e couvre le pire cas CI, avec la marge exigée`, () => {
      const ceiling = readProperty(property)
      expect(ceiling, `${property} absente de application-e2e.properties`).not.toBeNull()
      const { nominal, worst, detail } = computeBudget(slot)
      const retries = readRetries()
      const report = [
        `Créneau ${slot} : nominal CI ${nominal}, pire cas CI ${worst}, plafond e2e ${ceiling}.`,
        ...detail,
        '',
        'Deux corrections possibles, PAS interchangeables :',
        '  - mutualiser un compte / retirer une émission -> baisse le budget ;',
        `  - relever ${property} (application-e2e.properties) -> relève le plafond ;`,
        '    mettre alors à jour la ligne BUDGET et RateLimitE2eProfileIntegrationTest.',
        "NE PAS remettre RATE_LIMIT_ENABLED=false : c'est ce que #547 a retiré.",
      ].join('\n')

      expect(worst, report).toBeLessThanOrEqual(ceiling!)
      expect(ceiling! - nominal, report).toBeGreaterThanOrEqual(MIN_MARGIN)
      // Critère #475 généralisé : UNE émission de plus dans une spec (retries compris)
      // ne fait pas déborder le pire cas.
      expect(worst + (1 + retries), report).toBeLessThanOrEqual(ceiling!)
    })
  }

  for (const slot of AT_DEFAULT) {
    it(`${slot} : reste au plafond par défaut, et un run vert du premier coup ne peut pas l'atteindre`, () => {
      const property = `app.rate-limit.${slot}-per-minute`
      expect(
        readProperty(property),
        `${property} est posée : l'arbitrage #547 (option D) laisse ${slot} au défaut. ` +
          'La réglage de ce créneau est une décision à re-soumettre, pas un détail.',
      ).toBeNull()
      const defaultCeiling = readDefaultCeiling(slot)
      const { nominal, worst, detail } = computeBudget(slot)
      expect(
        nominal,
        [
          `${slot} : nominal CI ${nominal} pour un défaut de ${defaultCeiling} (pire cas ${worst}).`,
          ...detail,
        ].join('\n'),
      ).toBeLessThanOrEqual(defaultCeiling)
    })
  }

  it('les lignes BUDGET de application-e2e.properties disent vrai', () => {
    const lines = readBudgetLines()
    for (const slot of [...TUNABLE.map((t) => t.slot), ...AT_DEFAULT]) {
      const line = lines[slot]
      expect(line, `ligne « BUDGET ${slot} » absente de application-e2e.properties`).toBeDefined()
      const { nominal, worst } = computeBudget(slot)
      const tunable = TUNABLE.find((t) => t.slot === slot)
      const ceiling = tunable ? readProperty(tunable.property)! : readDefaultCeiling(slot)
      expect(line, `ligne BUDGET ${slot} périmée — la recopier depuis le recompte`).toEqual({
        nominal,
        worst,
        ceiling,
        defaultCeiling: readDefaultCeiling(slot),
      })
    }
  })

  it("aucune spec ne consomme le créneau de la preuve d'armement (refresh)", () => {
    expect(countSpecs('refresh').perFile).toEqual({})
    const config = readFileSync(PLAYWRIGHT_CONFIG, 'utf8')
    expect(config, 'projet Playwright dédié `rate-limit-armed` attendu').toMatch(
      /name:\s*'rate-limit-armed',\s*testMatch:\s*\/rate-limit-armed\\\.proof\\\.ts\/,[\s\S]*?dependencies:\s*\['chromium',\s*'firefox'\]/,
    )
  })

  it('ancrages sur le dépôt : helpers de support ET helpers locaux de spec', () => {
    const register = countSpecs('register')
    expect(register.helpers).toEqual(expect.arrayContaining(['registerOnly', 'registerAndLogin']))
    expect(register.perFile).toMatchObject({
      'golden-path.spec.ts': 1,
      'forgot-password.spec.ts': 1,
      'reset-password-failures.spec.ts': 2,
    })
    // `submitLogin` / `submitResetPassword` sont des fonctions LOCALES de la spec, appelées
    // 2 et 3 fois : le compteur par regex de #475 les aurait vues 1 fois chacune.
    expect(countSpecs('login').perFile).toEqual({
      'golden-path.spec.ts': 1,
      'forgot-password.spec.ts': 1,
      'reset-password-failures.spec.ts': 2,
    })
    expect(countSpecs('reset-password').perFile).toEqual({
      'forgot-password.spec.ts': 1,
      'reset-password-failures.spec.ts': 3,
    })
  })
})

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LA DÉTECTION, EXERCÉE SUR DES SOURCES SYNTHÉTIQUES
 * ─────────────────────────────────────────────────────────────────────────────
 * Les tests ci-dessus mesurent le dépôt ; ceux-ci mesurent le MESUREUR, dans un
 * dossier temporaire — jamais une modification d'une vraie spec.
 */
describe('#547 — la détection, exercée sur des sources synthétiques', () => {
  const SUBMIT = "await page.getByTestId('register-submit').click()"
  const LOGIN = "await page.getByTestId('login-submit').click()"

  function scratch(files: { specs?: Record<string, string>; support?: Record<string, string> }) {
    const root = mkdtempSync(join(tmpdir(), 'rate-limit-budget-'))
    const supportDir = join(root, 'support')
    mkdirSync(supportDir)
    for (const [name, body] of Object.entries(files.specs ?? {}))
      writeFileSync(join(root, name), body)
    for (const [name, body] of Object.entries(files.support ?? {}))
      writeFileSync(join(supportDir, name), body)
    return [root, supportDir] as const
  }

  it('compte une soumission écrite directement dans la spec', () => {
    const [specs, support] = scratch({
      specs: { 'fake.spec.ts': `test('x', async ({ page }) => {\n  ${SUBMIT}\n})\n` },
    })
    expect(countSpecs('register', specs, support).perFile['fake.spec.ts']).toBe(1)
  })

  it('compte un appel API direct, sans confondre un chemin voisin', () => {
    const [specs, support] = scratch({
      specs: {
        'api.spec.ts':
          `test('x', async ({ request }) => {\n` +
          `  await request.post('/api/auth/login', { data })\n` +
          `  await request.post('/api/auth/login-history', { data })\n})\n`,
      },
    })
    expect(countSpecs('login', specs, support).perFile['api.spec.ts']).toBe(1)
  })

  it('compte un helper de support par APPEL, et suit l’indirection transitive', () => {
    const [specs, support] = scratch({
      support: {
        'auth.ts':
          `export async function registerOnly(page) {\n  ${SUBMIT}\n}\n` +
          `export async function registerAndLogin(page) {\n  await registerOnly(page)\n  ${LOGIN}\n}\n`,
      },
      specs: {
        'helper.spec.ts':
          `import { registerOnly, registerAndLogin } from './support/auth'\n` +
          `test('a', async ({ page }) => { await registerOnly(page) })\n` +
          `test('b', async ({ page }) => { await registerAndLogin(page) })\n`,
      },
    })
    expect(countSpecs('register', specs, support).perFile['helper.spec.ts']).toBe(2)
    expect(countSpecs('login', specs, support).perFile['helper.spec.ts']).toBe(1)
  })

  it('compte une fonction LOCALE de spec par appel — le trou de la détection #475', () => {
    const [specs, support] = scratch({
      specs: {
        'local.spec.ts':
          `async function submitLogin(page) {\n  ${LOGIN}\n}\n` +
          `const again = async (page) => { await submitLogin(page) }\n` +
          `test('a', async ({ page }) => { await submitLogin(page); await submitLogin(page) })\n` +
          `test('b', async ({ page }) => { await again(page) })\n`,
      },
    })
    expect(countSpecs('login', specs, support).perFile['local.spec.ts']).toBe(3)
  })

  it('ne compte ni un import seul, ni une URL citée dans un message', () => {
    const [specs, support] = scratch({
      support: {
        'auth.ts':
          `export async function registerOnly(page) {\n  ${SUBMIT}\n}\n` +
          `export async function ensureRegisterForm(page) {\n` +
          `  throw new Error("aucun POST /api/auth/register n'a été tenté")\n}\n`,
      },
      specs: {
        'imports-only.spec.ts':
          `import { registerOnly } from './support/auth'\n` +
          `test('x', async ({ page }) => { await ensureRegisterForm(page) })\n`,
      },
    })
    expect(countSpecs('register', specs, support).perFile['imports-only.spec.ts']).toBeUndefined()
  })

  it("ANGLE MORT ASSUMÉ — un locator construit depuis une variable n'est pas vu", () => {
    // Le compteur lit du texte, il n'exécute rien. Aucune spec du dépôt n'écrit ça
    // aujourd'hui. Si ce test rougit, la détection a été renforcée : mettre à jour
    // l'attendu, pas le contourner.
    const [specs, support] = scratch({
      specs: {
        'blind.spec.ts':
          `const SUBMIT_ID = 'register-submit'\n` +
          `test('x', async ({ page }) => { await page.getByTestId(SUBMIT_ID).click() })\n`,
      },
    })
    expect(countSpecs('register', specs, support).perFile).toEqual({})
  })

  it('lit les passes CI : suite complète via npm, passe filtrée via npx', () => {
    const passes = readCiPasses(
      [
        '      - name: passe 1',
        '        run: npm run test:e2e -- --output=test-results/p1',
        '      - name: passe 2',
        '        run: npx playwright test auth.setup.ts auth-signature.spec.ts --output=x',
      ].join('\n'),
    )
    expect(passes.map((p) => ({ full: p.full, files: p.files }))).toEqual([
      { full: true, files: [] },
      { full: false, files: ['auth.setup.ts', 'auth-signature.spec.ts'] },
    ])
  })
})
