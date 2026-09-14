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
import { acceptedRegisterStatus, classifyRegisterResponse } from '../../e2e/support/register-retry'

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
 * Une émission dans une boucle compte × la BORNE de la boucle ; une boucle qui émet sans
 * borne lisible fait échouer le recompte (revue S88). SEULE exception, sous contrat vérifié :
 * une boucle annotée `rate-limit-budget: retry-on-request-failure` compte 1 — elle ne
 * ré-émet que si la requête a échoué (5xx, aucune réponse), décision prise par une table
 * de statuts testée ici (`classifyRegisterResponse`). Arbitrage dev du 2026-09-14.
 *
 * Le setup est multiplié par (1 + SES retries), LUS dans `auth.setup.ts` : 0 depuis la
 * revue S88. Avant, l'exemption reposait sur « un provision retenté prend 409 et lève
 * avant le login » — faux dès que 409 vaut succès, et muet sur la boucle interne qui
 * ré-émettait sur page lente (pire cas register réel 36 pour un plafond de 30). Le total
 * d'une passe est un majorant du pic par minute (refill `intervally` : si le total tient
 * sous le plafond, aucun 429 n'est possible).
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

const numericConstantsCache = new WeakMap<ts.SourceFile, Map<string, ts.Expression>>()

/** Initialiseurs des `const X = …` de niveau module, pour résoudre une borne de boucle. */
function moduleConstants(source: ts.SourceFile): Map<string, ts.Expression> {
  const cached = numericConstantsCache.get(source)
  if (cached) return cached
  const constants = new Map<string, ts.Expression>()
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue
    if (!(statement.declarationList.flags & ts.NodeFlags.Const)) continue
    for (const decl of statement.declarationList.declarations) {
      if (ts.isIdentifier(decl.name) && decl.initializer)
        constants.set(decl.name.text, decl.initializer)
    }
  }
  numericConstantsCache.set(source, constants)
  return constants
}

/** Littéral, ou constante de module qui en est un ; sinon `null`. */
function resolveConstant(node: ts.Expression): ts.Expression {
  if (!ts.isIdentifier(node)) return node
  return moduleConstants(node.getSourceFile()).get(node.text) ?? node
}

function numericValue(node: ts.Expression): number | null {
  const resolved = resolveConstant(node)
  return ts.isNumericLiteral(resolved) ? Number(resolved.text) : null
}

/** Opérandes d'une chaîne `a && b && c` (une condition simple est sa propre chaîne). */
function conjuncts(node: ts.Expression): ts.Expression[] {
  if (ts.isParenthesizedExpression(node)) return conjuncts(node.expression)
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
  )
    return [...conjuncts(node.left), ...conjuncts(node.right)]
  return [node]
}

/** Vrai si `incrementor` avance `counter` de exactement 1 (`i++`, `++i`, `i += 1`). */
function stepsByOne(incrementor: ts.Expression | undefined, counter: string): boolean {
  if (!incrementor) return false
  if (ts.isPostfixUnaryExpression(incrementor) || ts.isPrefixUnaryExpression(incrementor)) {
    return (
      incrementor.operator === ts.SyntaxKind.PlusPlusToken &&
      ts.isIdentifier(incrementor.operand) &&
      incrementor.operand.text === counter
    )
  }
  return (
    ts.isBinaryExpression(incrementor) &&
    incrementor.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken &&
    ts.isIdentifier(incrementor.left) &&
    incrementor.left.text === counter &&
    numericValue(incrementor.right) === 1
  )
}

/**
 * Nombre MAXIMAL de tours d'une boucle, lu statiquement, ou `null` s'il n'est pas lisible.
 * Résolus : `for (let i = A; i < B | i <= B [&& …]; i++)` avec A et B littéraux ou `const` de
 * module, et `for (… of [littéral de tableau])`. Une condition `&& !fini` ne fait que
 * RACCOURCIR la boucle : la borne reste un majorant, c'est ce qu'un pire cas veut.
 */
function loopBound(loop: ts.IterationStatement): number | null {
  if (ts.isForOfStatement(loop)) {
    const iterable = resolveConstant(loop.expression)
    return ts.isArrayLiteralExpression(iterable) && !iterable.elements.some(ts.isSpreadElement)
      ? iterable.elements.length
      : null
  }
  if (!ts.isForStatement(loop) || !loop.initializer || !loop.condition) return null
  if (!ts.isVariableDeclarationList(loop.initializer)) return null
  const [decl, ...others] = loop.initializer.declarations
  if (others.length > 0 || !ts.isIdentifier(decl.name) || !decl.initializer) return null
  const counter = decl.name.text
  const start = numericValue(decl.initializer)
  if (start === null || !stepsByOne(loop.incrementor, counter)) return null
  for (const operand of conjuncts(loop.condition)) {
    if (!ts.isBinaryExpression(operand) || !ts.isIdentifier(operand.left)) continue
    if (operand.left.text !== counter) continue
    const end = numericValue(operand.right)
    if (end === null) return null
    if (operand.operatorToken.kind === ts.SyntaxKind.LessThanToken) return Math.max(0, end - start)
    if (operand.operatorToken.kind === ts.SyntaxKind.LessThanEqualsToken)
      return Math.max(0, end - start + 1)
    return null
  }
  return null
}

function where(node: ts.Node): string {
  const source = node.getSourceFile()
  const { line } = source.getLineAndCharacterOfPosition(node.getStart())
  return `${source.fileName}:${line + 1}`
}

/**
 * CONVENTION « retry sur échec de requête » (arbitrage dev du 2026-09-14, revue S88).
 *
 * Pourquoi une annotation plutôt qu'un retry encapsulé dans un helper : un helper qui reçoit
 * l'émission en callback (`withRetry(() => click())`) serait compté 1 par l'ANGLE MORT du
 * compteur, pour n'importe quelle raison de retenter, sans que rien ne le dise. L'annotation
 * rend l'exception VISIBLE et VÉRIFIÉE : la boucle doit (1) garder une borne lisible,
 * (2) ne continuer que sur `<issue> === 'retry'`, (3) n'assigner `<issue>` que par un
 * classificateur de statuts dont la table est testée ci-dessous, (4) ne contenir aucun
 * try/catch (une page lente ou une assertion ratée deviendrait sinon une raison de retenter),
 * (5) classer un statut de PROVENANCE VÉRIFIÉE (#685, revue S88 cycle 2 n°2) : les clauses 1-4
 * ne lisaient que le corps de la boucle, et une attente glissée dans le helper qui émet (renvoyant
 * `null` sur page lente) aurait ré-émis après un 201 sans rien rougir. Voir `provenanceViolation`.
 * Et le dépôt n'en compte qu'UNE BOUCLE (pas un fichier), dans `auth.setup.ts` — en ajouter une,
 * même dans ce fichier, rougit l'ancrage.
 */
const RETRY_ON_FAILURE_ANNOTATION = 'rate-limit-budget: retry-on-request-failure'
const RETRY_CLASSIFIERS = new Set(['classifyRegisterResponse'])

/** Relecture des statuts DÉJÀ observés (201 tardif) : seul statut non mesuré admis à être classé. */
const STATUS_REREADS = new Set(['acceptedRegisterStatus'])

/**
 * Seuls appels permis dans la fonction qui ÉMET la requête classée : attendre SA réponse, cliquer,
 * lire le statut — ou relire les statuts observés. Forme FIGÉE (#685) : toute autre attente
 * (`toBeVisible`, `waitForTimeout`, `waitForURL`…) peut transformer une page lente en « aucune
 * réponse » après un 201.
 */
const SUBMITTER_CALLS = new Set([
  'all',
  'waitForResponse',
  'getByTestId',
  'click',
  'status',
  'url',
  ...STATUS_REREADS,
])

function unwrap(node: ts.Expression): ts.Expression {
  let current = node
  while (ts.isParenthesizedExpression(current) || ts.isAwaitExpression(current))
    current = current.expression
  return current
}

function calleeName(call: ts.CallExpression): string {
  if (ts.isIdentifier(call.expression)) return call.expression.text
  if (ts.isPropertyAccessExpression(call.expression)) return call.expression.name.text
  return call.expression.getText()
}

/** Première descendance de `node` qui satisfait `predicate` (parcours préfixe), ou `undefined`. */
function findNode<T extends ts.Node>(
  node: ts.Node,
  predicate: (n: ts.Node) => n is T,
): T | undefined {
  let found: T | undefined
  const visit = (n: ts.Node): void => {
    if (found) return
    if (predicate(n)) {
      found = n
      return
    }
    ts.forEachChild(n, visit)
  }
  ts.forEachChild(node, visit)
  return found
}

/** Valeurs renvoyées par un corps de fonction (hors callbacks imbriqués) ; `null` = `return;`. */
function returnedValues(body: ts.Node): (ts.Expression | null)[] {
  if (!ts.isBlock(body)) return [body as ts.Expression]
  const values: (ts.Expression | null)[] = []
  const visit = (n: ts.Node): void => {
    if (ts.isFunctionLike(n)) return
    if (ts.isReturnStatement(n)) values.push(n.expression ?? null)
    ts.forEachChild(n, visit)
  }
  ts.forEachChild(body, visit)
  return values
}

function isRereadCall(node: ts.Expression): boolean {
  const e = unwrap(node)
  return (
    ts.isCallExpression(e) && ts.isIdentifier(e.expression) && STATUS_REREADS.has(e.expression.text)
  )
}

/** `acceptedRegisterStatus(…)`, ou une `const` de `scope` initialisée par cet appel. */
function isStatusReread(value: ts.Expression, scope: ts.Node): boolean {
  const e = unwrap(value)
  if (isRereadCall(e)) return true
  if (!ts.isIdentifier(e)) return false
  return (
    findNode(
      scope,
      (n): n is ts.VariableDeclaration =>
        ts.isVariableDeclaration(n) &&
        ts.isIdentifier(n.name) &&
        n.name.text === e.text &&
        ts.isVariableDeclarationList(n.parent) &&
        (n.parent.flags & ts.NodeFlags.Const) !== 0 &&
        n.initializer !== undefined &&
        isRereadCall(n.initializer),
    ) !== undefined
  )
}

/** `<réponse>.status()` : le statut MESURÉ de la réponse attendue. */
function isMeasuredStatus(value: ts.Expression): boolean {
  const e = unwrap(value)
  return (
    ts.isCallExpression(e) &&
    ts.isPropertyAccessExpression(e.expression) &&
    e.expression.name.text === 'status' &&
    e.arguments.length === 0
  )
}

/**
 * Clause (5) du contrat : le statut passé au classificateur PROVIENT de l'émission, sans détour.
 *
 *   - la boucle n'émet que DANS l'argument du classificateur ;
 *   - cet argument est l'appel d'une fonction de CE fichier (ou une relecture des statuts) ;
 *   - une fonction intermédiaire ne renvoie qu'une relecture ou l'appel d'une fonction de la chaîne,
 *     et n'émet nulle part ailleurs que dans cette valeur de retour ;
 *   - la fonction qui émet a une forme figée (`SUBMITTER_CALLS`) et ne renvoie que
 *     `<réponse>.status()` ou une relecture.
 *
 * ANGLE MORT ASSUMÉ : les ARGUMENTS de la relecture ne sont pas vérifiés (un `acceptedRegisterStatus([]…)`
 * écrit exprès passerait). Le contrat ferme le glissement accidentel, pas la malveillance.
 */
function provenanceViolation(
  loop: ts.IterationStatement,
  classifierCall: ts.CallExpression,
  signature: Signature,
  emitting: Map<string, number>,
): string | null {
  const classifier = calleeName(classifierCall)
  const rereads = [...STATUS_REREADS].join(', ')
  const [argument] = classifierCall.arguments
  if (!argument) return `${classifier} appelé sans statut`
  if (countIn(loop.statement, signature, emitting) !== countIn(argument, signature, emitting)) {
    return (
      `émission de ${signature.apiPath} hors de l'argument de ${classifier} : ` +
      "le statut classé doit être celui de la requête émise dans l'essai"
    )
  }
  const fns = topLevelFunctions(loop.getSourceFile())
  const seen = new Set<string>()

  const checkChainCall = (value: ts.Expression, from: string): string | null => {
    const e = unwrap(value)
    if (!ts.isCallExpression(e) || !ts.isIdentifier(e.expression) || !fns.has(e.expression.text)) {
      return (
        `${from} : \`${e.getText()}\` n'est ni un statut relu par ${rereads}, ni l'appel d'une ` +
        'fonction de ce fichier — provenance du statut illisible'
      )
    }
    return checkFunction(e.expression.text)
  }

  const checkFunction = (name: string): string | null => {
    if (seen.has(name)) return null
    seen.add(name)
    const body = fns.get(name)!
    const values = returnedValues(body)
    const emitsDirectly =
      findNode(
        body,
        (n): n is ts.CallExpression => ts.isCallExpression(n) && isDirectEmission(n, signature),
      ) !== undefined
    if (emitsDirectly) {
      const forbidden = findNode(
        body,
        (n): n is ts.CallExpression =>
          ts.isCallExpression(n) && !SUBMITTER_CALLS.has(calleeName(n)),
      )
      if (forbidden) {
        return (
          `\`${name}\` émet ${signature.apiPath} et appelle \`${calleeName(forbidden)}\` : sa forme est ` +
          `figée (\`waitForResponse\` + \`click\`, puis le statut ou ${rereads}). Une attente glissée ` +
          'ici transforme une page lente en « aucune réponse » après un 201, et la boucle ré-émettrait'
        )
      }
      for (const value of values) {
        if (value !== null && (isMeasuredStatus(value) || isStatusReread(value, body))) continue
        return (
          `\`${name}\` renvoie \`${value === null ? 'undefined' : value.getText()}\` : seuls ` +
          `\`<réponse>.status()\` ou ${rereads}(…) peuvent atteindre ${classifier} — une valeur ` +
          'fabriquée (`null` sur délai dépassé) ferait ré-émettre après un 201'
        )
      }
      return null
    }
    let viaReturns = 0
    for (const value of values) {
      if (value === null)
        return `\`${name}\` : \`return\` sans valeur dans la chaîne de ${classifier}`
      if (isStatusReread(value, body)) continue
      const violation = checkChainCall(value, `\`${name}\``)
      if (violation !== null) return violation
      viaReturns += countIn(value, signature, emitting)
    }
    if (countIn(body, signature, emitting) !== viaReturns) {
      return (
        `\`${name}\` émet ${signature.apiPath} ailleurs que dans sa valeur de retour : ` +
        `le statut qu'elle renvoie à ${classifier} ne serait pas celui de cette émission`
      )
    }
    return null
  }

  if (isStatusReread(argument, loop)) return null
  return checkChainCall(argument, `l'argument de ${classifier}`)
}

function isRetryOnFailureLoop(loop: ts.IterationStatement): boolean {
  const source = loop.getSourceFile()
  return (ts.getLeadingCommentRanges(source.text, loop.getFullStart()) ?? []).some((range) =>
    source.text.slice(range.pos, range.end).includes(RETRY_ON_FAILURE_ANNOTATION),
  )
}

/** Première clause du contrat violée, ou `null` si la boucle le respecte. */
function retryContractViolation(
  loop: ts.IterationStatement,
  signature: Signature,
  emitting: Map<string, number>,
): string | null {
  if (!ts.isForStatement(loop) || !loop.condition || loopBound(loop) === null)
    return 'une boucle `for` à borne lisible est exigée'
  const guard = conjuncts(loop.condition).find(
    (operand): operand is ts.BinaryExpression =>
      ts.isBinaryExpression(operand) &&
      operand.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
      ts.isIdentifier(operand.left) &&
      ts.isStringLiteral(operand.right) &&
      operand.right.text === 'retry',
  )
  if (!guard) return "la condition doit contenir `<issue> === 'retry'`"
  const outcome = (guard.left as ts.Identifier).text
  const classifiers = [...RETRY_CLASSIFIERS].join(', ')
  const violations: string[] = []
  let classified = 0
  const visit = (n: ts.Node): void => {
    if (ts.isTryStatement(n)) violations.push('try/catch interdit dans la boucle')
    if (
      ts.isBinaryExpression(n) &&
      n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(n.left) &&
      n.left.text === outcome
    ) {
      const call = n.right
      if (
        ts.isCallExpression(call) &&
        ts.isIdentifier(call.expression) &&
        RETRY_CLASSIFIERS.has(call.expression.text)
      ) {
        classified += 1
        const provenance = provenanceViolation(loop, call, signature, emitting)
        if (provenance !== null) violations.push(provenance)
      } else violations.push(`\`${outcome}\` assigné autrement que par ${classifiers}`)
    }
    ts.forEachChild(n, visit)
  }
  visit(loop.statement)
  if (violations.length > 0) return violations[0]
  return classified === 1 ? null : `\`${outcome}\` doit être assigné une fois par ${classifiers}`
}

/**
 * Émissions dans `node` : directes + appels de fonctions émettrices × leur propre compte.
 *
 * Revue S88 : une émission dans une boucle est multipliée par la BORNE de la boucle
 * (`loopBound`). Une boucle qui émet et dont la borne n'est pas lisible fait ÉCHOUER le
 * recompte, explicitement — la compter 1 en silence est exactement le trou qui a laissé
 * passer la boucle `REGISTER_RETRIES` d'`auth.setup.ts`.
 */
function countIn(node: ts.Node, signature: Signature, emitting: Map<string, number>): number {
  let total = 0
  const visit = (n: ts.Node): void => {
    if (ts.isIterationStatement(n, false)) {
      const perTurn = countIn(n.statement, signature, emitting)
      if (perTurn > 0 && isRetryOnFailureLoop(n)) {
        const violation = retryContractViolation(n, signature, emitting)
        if (violation !== null) {
          throw new Error(
            `${where(n)} — boucle annotée « ${RETRY_ON_FAILURE_ANNOTATION} » HORS CONTRAT : ` +
              `${violation}. Elle serait comptée 1 alors qu'elle peut ré-émettre ` +
              `${signature.apiPath} pour une autre raison qu'un échec de requête.`,
          )
        }
        total += perTurn
      } else if (perTurn > 0) {
        const bound = loopBound(n)
        if (bound === null) {
          throw new Error(
            `${where(n)} — boucle qui émet ${signature.apiPath} ` +
              `(${perTurn} par tour) sans borne lisible statiquement. Le budget ne peut pas ` +
              'être recompté : borner la boucle par un littéral ou une `const` de module ' +
              '(`for (let i = 0; i < N; i++)`), ou sortir l’émission de la boucle.',
          )
        }
        total += perTurn * bound
      }
      ts.forEachChild(n, (child) => {
        if (child !== n.statement) visit(child)
      })
      return
    }
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

const PLAYWRIGHT_INVOCATION = /(?:npm run test:e2e|playwright test)/

/**
 * Les commandes shell des étapes `run:` du workflow, dans l'ordre : une par ligne pour
 * `run: cmd` et `run: |` (bloc littéral), une seule pour `run: >` (bloc replié, lignes
 * jointes par une espace). Les continuations `\` sont recollées, les commentaires shell
 * ignorés. Revue S88 : la version précédente ne lisait que `run: cmd` sur une ligne — une
 * 3e passe écrite dans un bloc `run: |` aurait été invisible.
 */
function readRunCommands(yaml: string): string[] {
  const lines = yaml.split('\n')
  const commands: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(\s*)(?:-\s+)?run:\s*(.*)$/)
    if (!match) continue
    const indent = match[1].length
    const value = match[2].trim()
    const block = value.match(/^([|>])[-+]?\d*\s*(?:#.*)?$/)
    if (!block) {
      commands.push(value)
      continue
    }
    const body: string[] = []
    while (i + 1 < lines.length) {
      const next = lines[i + 1]
      if (next.trim() !== '' && next.length - next.trimStart().length <= indent) break
      body.push(next.trim())
      i++
    }
    const shell = body.filter((l) => l !== '' && !l.startsWith('#'))
    if (block[1] === '>') {
      commands.push(shell.join(' '))
      continue
    }
    commands.push(...shell.join('\n').replace(/\\\n/g, ' ').split('\n'))
  }
  return commands
}

/** Les invocations Playwright du workflow CI, dans l'ordre. */
function readCiPasses(yaml: string = readFileSync(CI_WORKFLOW, 'utf8')): Pass[] {
  const passes: Pass[] = []
  for (const raw of readRunCommands(yaml)) {
    if (!PLAYWRIGHT_INVOCATION.test(raw)) continue
    const command = raw.trim()
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

/**
 * Retries Playwright du projet `setup` : ceux de `setup.describe.configure({ retries: N })`
 * dans `auth.setup.ts`, sinon la valeur CI globale — un essai retenté ré-émet register et login.
 */
function readSetupRetries(setupFile: string = SETUP_FILE): number {
  const match = readFileSync(setupFile, 'utf8').match(
    /^setup\.describe\.configure\(\{\s*retries:\s*(\d+)\s*\}\)/m,
  )
  return match ? Number(match[1]) : readRetries()
}

/**
 * BOUCLES annotées « retry sur échec de requête » des `.ts` de `dir` (récursif), en
 * `fichier:ligne`. #685 : l'ancrage comptait des FICHIERS — une 2e boucle annotée dans
 * `auth.setup.ts` (une 2e exemption du compteur) passait sans rougir.
 */
function annotatedLoops(dir: string): string[] {
  const loops: string[] = []
  for (const file of readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.ts'))
    .sort()) {
    const source = parse(join(dir, file))
    const visit = (n: ts.Node): void => {
      if (ts.isIterationStatement(n, false) && isRetryOnFailureLoop(n)) {
        const { line } = source.getLineAndCharacterOfPosition(n.getStart())
        loops.push(`${file}:${line + 1}`)
      }
      ts.forEachChild(n, visit)
    }
    visit(source)
  }
  return loops
}

/** Ancrage : UNE boucle annotée sous `dir`, dans `auth.setup.ts`. */
function expectSingleAnnotatedLoop(dir: string): void {
  const loops = annotatedLoops(dir)
  expect(
    loops.map((loop) => loop.replace(/:\d+$/, '')),
    `${loops.length} boucle(s) annotée(s) « ${RETRY_ON_FAILURE_ANNOTATION} » sous ${dir} : ` +
      `[${loops.join(', ')}]. Une seule est admise, dans auth.setup.ts : chaque boucle annotée ` +
      'est une exemption du compteur de budget, à ré-arbitrer — pas à ajouter en silence.',
  ).toEqual(['auth.setup.ts'])
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
  const setupPerPass =
    ALL_ACCOUNTS.length * setupEmissionsPerAccount(slot) * (1 + readSetupRetries())
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

  it('le setup émet 1 register et 1 login par compte, sans retry Playwright, pour 4 comptes', () => {
    // Revue S88 : la seule boucle de ré-émission est annotée « retry sur échec de requête » et
    // respecte son contrat ; le login est hors boucle ; le projet `setup` n'a aucun retry.
    expect(ALL_ACCOUNTS.length).toBe(4)
    expect(setupEmissionsPerAccount('register')).toBe(1)
    expect(setupEmissionsPerAccount('login')).toBe(1)
    expect(readSetupRetries()).toBe(0)
  })

  it('convention « retry sur échec de requête » : une seule boucle annotée, table de statuts vérifiée', () => {
    expectSingleAnnotatedLoop(E2E_DIR)
    // Ré-émis : échec de la REQUÊTE seulement.
    expect([null, 500, 502, 503].map(classifyRegisterResponse)).toEqual([
      'retry',
      'retry',
      'retry',
      'retry',
    ])
    // Jamais ré-émis : compte créé, compte existant (idempotent), 429, refus.
    expect([200, 201, 409, 429, 400, 403].map(classifyRegisterResponse)).toEqual([
      'created',
      'created',
      'exists',
      'throttled',
      'refused',
      'refused',
    ])
  })

  it('201 tardif : réponse non observée dans le délai mais 201/409 déjà vu ou page sur le login → succès (revue S88, cycle 2)', () => {
    const REGISTER = 'http://localhost:3100/fr/register'
    const LOGIN = 'http://localhost:3100/fr/login'
    // Réponse non observée par `waitForResponse` (null), mais l'écouteur a vu un 201 / 409 : succès.
    expect(classifyRegisterResponse(acceptedRegisterStatus([201], REGISTER, true))).toBe('created')
    expect(classifyRegisterResponse(acceptedRegisterStatus([502, 409], REGISTER, true))).toBe(
      'exists',
    )
    // Aucun statut vu, mais l'app a déjà navigué vers le login après un POST parti : succès.
    expect(classifyRegisterResponse(acceptedRegisterStatus([], LOGIN, true))).toBe('created')
    // Rien d'acquis : ré-émission permise.
    expect(acceptedRegisterStatus([], REGISTER, true)).toBeNull()
    expect(acceptedRegisterStatus([500, 503], REGISTER, true)).toBeNull()
    // Sur le login SANS POST parti, rien n'est acquis ; un 429 ou un 403 n'est jamais un succès.
    expect(acceptedRegisterStatus([], LOGIN, false)).toBeNull()
    expect(acceptedRegisterStatus([429, 403], REGISTER, true)).toBeNull()
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

  it('multiplie une émission dans une boucle par sa borne — le trou de la revue S88', () => {
    // Avant la revue S88, chacune de ces boucles comptait 1.
    const [specs, support] = scratch({
      support: {
        'setup.ts':
          `const RETRIES = 3\n` +
          `async function fill(page) {\n  ${SUBMIT}\n}\n` +
          `export async function provision(page) {\n` +
          `  let ok = false\n` +
          `  for (let attempt = 1; attempt <= RETRIES && !ok; attempt++) {\n` +
          `    await fill(page)\n  }\n}\n`,
      },
      specs: {
        'literal.spec.ts': `test('x', async ({ page }) => {\n  for (let i = 0; i < 4; i++) { ${SUBMIT} }\n})\n`,
        'retries.spec.ts': `test('x', async ({ page }) => { await provision(page) })\n`,
        'nested.spec.ts':
          `const PAIRS = ['a', 'b']\n` +
          `test('x', async ({ page }) => {\n` +
          `  for (const p of PAIRS) { for (let i = 0; i < 3; i += 1) { ${SUBMIT} } }\n})\n`,
      },
    })
    expect(countSpecs('register', specs, support).perFile).toEqual({
      'literal.spec.ts': 4,
      'retries.spec.ts': 3,
      'nested.spec.ts': 6,
    })
  })

  it('ÉCHOUE explicitement sur une boucle qui émet sans borne lisible', () => {
    const [specs, support] = scratch({
      specs: {
        'while.spec.ts': `test('x', async ({ page }) => {\n  while (!done) { ${SUBMIT} }\n})\n`,
      },
    })
    expect(() => countSpecs('register', specs, support)).toThrow(
      /while\.spec\.ts:2 — boucle qui émet \/api\/auth\/register \(1 par tour\) sans borne lisible/,
    )
    const [specs2, support2] = scratch({
      specs: {
        'dynamic.spec.ts':
          `test('x', async ({ page }) => {\n` +
          `  for (let i = 0; i < accounts.length; i++) { ${SUBMIT} }\n})\n`,
      },
    })
    expect(() => countSpecs('register', specs2, support2)).toThrow(/sans borne lisible/)
  })

  it("ne réclame aucune borne à une boucle qui n'émet pas", () => {
    const [specs, support] = scratch({
      specs: {
        'quiet.spec.ts':
          `test('x', async ({ page }) => {\n` +
          `  while (!done) { await page.reload() }\n  ${SUBMIT}\n})\n`,
      },
    })
    expect(countSpecs('register', specs, support).perFile['quiet.spec.ts']).toBe(1)
  })

  describe('boucle annotée « retry sur échec de requête » (arbitrage dev 2026-09-14)', () => {
    const ANNOTATION = '// rate-limit-budget: retry-on-request-failure'
    /** Fonction qui émet, à la forme d'`auth.setup.ts:submitRegister` (#685 : forme figée). */
    const submitHelper = ({
      afterResponse = '',
      onTimeout = 'return acceptedRegisterStatus(observed, page.url(), true)',
    } = {}) =>
      `const ATTEMPTS = 3\n` +
      `const isRegisterPost = (response) => response.url().includes('/api/auth/register')\n` +
      `async function submit(page, observed) {\n` +
      `  try {\n` +
      `    const [response] = await Promise.all([\n` +
      `      page.waitForResponse(isRegisterPost, { timeout: 10000 }),\n` +
      `      page.getByTestId('register-submit').click({ timeout: 5000 }),\n` +
      `    ])\n` +
      (afterResponse ? `    ${afterResponse}\n` : '') +
      `    return response.status()\n` +
      `  } catch {\n    ${onTimeout}\n  }\n}\n`
    const HELPER = submitHelper()
    const retrySpec = (body: string, annotated = true, helper = HELPER) =>
      helper +
      `test('x', async ({ page }) => {\n  let outcome = 'retry'\n` +
      (annotated ? `  ${ANNOTATION}\n` : '') +
      `  for (let attempt = 1; attempt <= ATTEMPTS && outcome === 'retry'; attempt++) {\n` +
      `${body}\n  }\n})\n`
    const CLASSIFIED = '    outcome = classifyRegisterResponse(await submit(page, []))'

    it('compte 1 une boucle conforme — et × borne la même boucle sans annotation', () => {
      const [specs, support] = scratch({
        specs: {
          'annotated.spec.ts': retrySpec(CLASSIFIED),
          'plain.spec.ts': retrySpec(CLASSIFIED, false),
        },
      })
      expect(countSpecs('register', specs, support).perFile).toEqual({
        'annotated.spec.ts': 1,
        'plain.spec.ts': 3,
      })
    })

    it('ÉCHOUE si la boucle annotée retente sur une page lente (try/catch autour du formulaire)', () => {
      // Exactement le défaut que la revue S88 a trouvé dans auth.setup.ts.
      const [specs, support] = scratch({
        specs: {
          'slow.spec.ts': retrySpec(
            `    try {\n      await submit(page)\n` +
              `      await expect(page.getByTestId('login-form')).toBeVisible({ timeout: 8000 })\n` +
              `      outcome = classifyRegisterResponse(201)\n` +
              `    } catch {\n      outcome = classifyRegisterResponse(null)\n    }`,
          ),
        },
      })
      expect(() => countSpecs('register', specs, support)).toThrow(
        /slow\.spec\.ts:\d+ — boucle annotée .* HORS CONTRAT : try\/catch interdit/,
      )
    })

    it("ÉCHOUE si l'issue n'est pas décidée par le classificateur de statuts", () => {
      const [specs, support] = scratch({
        specs: {
          'adhoc.spec.ts': retrySpec(
            "    outcome = (await submit(page)) === 201 ? 'created' : 'retry'",
          ),
        },
      })
      expect(() => countSpecs('register', specs, support)).toThrow(
        /HORS CONTRAT : `outcome` assigné autrement que par classifyRegisterResponse/,
      )
    })

    it("ÉCHOUE si la boucle annotée n'a pas de borne lisible", () => {
      const [specs, support] = scratch({
        specs: {
          'unbounded.spec.ts':
            HELPER +
            `test('x', async ({ page }) => {\n  let outcome = 'retry'\n  ${ANNOTATION}\n` +
            `  while (outcome === 'retry') {\n${CLASSIFIED}\n  }\n})\n`,
        },
      })
      expect(() => countSpecs('register', specs, support)).toThrow(
        /HORS CONTRAT : une boucle `for` à borne lisible est exigée/,
      )
    })

    // ── #685 (revue S88 cycle 2 n°2) : la provenance du statut classé, au-delà du corps de boucle ──

    it('compte 1 une chaîne conforme à deux niveaux (relecture et backoff AVANT la ré-émission)', () => {
      const helper =
        HELPER +
        `async function tryRegister(page, observed, retry) {\n` +
        `  if (retry) {\n` +
        `    const before = acceptedRegisterStatus(observed, page.url(), true)\n` +
        `    if (before !== null) return before\n` +
        `    await page.waitForTimeout(5000)\n` +
        `  }\n` +
        `  return submit(page, observed)\n}\n`
      const [specs, support] = scratch({
        specs: {
          'chain.spec.ts': retrySpec(
            '    outcome = classifyRegisterResponse(await tryRegister(page, [], attempt > 1))',
            true,
            helper,
          ),
        },
      })
      expect(countSpecs('register', specs, support).perFile).toEqual({ 'chain.spec.ts': 1 })
    })

    it('ÉCHOUE si une attente est glissée dans la fonction qui émet — le trou du cycle 2', () => {
      const [specs, support] = scratch({
        specs: {
          'visible.spec.ts': retrySpec(
            CLASSIFIED,
            true,
            submitHelper({
              afterResponse:
                "await expect(page.getByTestId('login-form')).toBeVisible({ timeout: 8000 })",
            }),
          ),
        },
      })
      expect(() => countSpecs('register', specs, support)).toThrow(
        /visible\.spec\.ts:\d+ — boucle annotée .* HORS CONTRAT : `submit` émet \/api\/auth\/register et appelle `toBeVisible`/,
      )
      const [specs2, support2] = scratch({
        specs: {
          'timeout.spec.ts': retrySpec(
            CLASSIFIED,
            true,
            submitHelper({ afterResponse: 'await page.waitForTimeout(8000)' }),
          ),
        },
      })
      expect(() => countSpecs('register', specs2, support2)).toThrow(
        /HORS CONTRAT : `submit` émet \/api\/auth\/register et appelle `waitForTimeout`/,
      )
    })

    it("ÉCHOUE si la fonction qui émet renvoie autre chose qu'un statut mesuré ou relu", () => {
      const [specs, support] = scratch({
        specs: {
          'null.spec.ts': retrySpec(CLASSIFIED, true, submitHelper({ onTimeout: 'return null' })),
        },
      })
      expect(() => countSpecs('register', specs, support)).toThrow(
        /HORS CONTRAT : `submit` renvoie `null` : seuls `<réponse>\.status\(\)`/,
      )
    })

    it('ÉCHOUE si une fonction intermédiaire fabrique le statut ou émet hors de sa valeur de retour', () => {
      const [specs, support] = scratch({
        specs: {
          'forged.spec.ts': retrySpec(
            '    outcome = classifyRegisterResponse(await tryRegister(page))',
            true,
            HELPER +
              `async function tryRegister(page) {\n` +
              `  const status = await submit(page, [])\n` +
              `  const onLogin = await page.getByTestId('login-form').isVisible()\n` +
              `  return onLogin ? status : null\n}\n`,
          ),
        },
      })
      expect(() => countSpecs('register', specs, support)).toThrow(
        /HORS CONTRAT : `tryRegister` : `onLogin \? status : null` n'est ni un statut relu/,
      )
      const [specs2, support2] = scratch({
        specs: {
          'side.spec.ts': retrySpec(
            '    outcome = classifyRegisterResponse(await tryRegister(page))',
            true,
            HELPER +
              `async function tryRegister(page) {\n` +
              `  await submit(page, [])\n` +
              `  return acceptedRegisterStatus([], page.url(), true)\n}\n`,
          ),
        },
      })
      expect(() => countSpecs('register', specs2, support2)).toThrow(
        /HORS CONTRAT : `tryRegister` émet \/api\/auth\/register ailleurs que dans sa valeur de retour/,
      )
    })

    it("ÉCHOUE si la boucle émet hors de l'argument du classificateur, ou via une fonction d'un autre fichier", () => {
      const [specs, support] = scratch({
        specs: {
          'outside.spec.ts': retrySpec(
            '    await submit(page, [])\n' +
              '    outcome = classifyRegisterResponse(acceptedRegisterStatus([], page.url(), true))',
          ),
        },
      })
      expect(() => countSpecs('register', specs, support)).toThrow(
        /HORS CONTRAT : émission de \/api\/auth\/register hors de l'argument de classifyRegisterResponse/,
      )
      const [specs2, support2] = scratch({
        support: { 'auth.ts': `export async function registerOnly(page) {\n  ${SUBMIT}\n}\n` },
        specs: {
          'imported.spec.ts': retrySpec(
            '    outcome = classifyRegisterResponse(await registerOnly(page))',
          ),
        },
      })
      expect(() => countSpecs('register', specs2, support2)).toThrow(
        /HORS CONTRAT : l'argument de classifyRegisterResponse : `registerOnly\(page\)` .* provenance du statut illisible/,
      )
    })
  })

  describe('contrôles négatifs sur une COPIE du vrai auth.setup.ts (#685)', () => {
    const original = readFileSync(SETUP_FILE, 'utf8')

    /** Copie mutée d'`auth.setup.ts` dans un dossier temporaire ; l'ancre DOIT exister. */
    function mutatedSetup(mutate: (text: string) => string): { dir: string; file: string } {
      const mutated = mutate(original)
      expect(
        mutated,
        "la mutation n'a rien changé : l'ancre a disparu d'auth.setup.ts — mettre à jour ce " +
          'contrôle négatif, pas le supprimer',
      ).not.toBe(original)
      const dir = mkdtempSync(join(tmpdir(), 'rate-limit-setup-'))
      const file = join(dir, 'auth.setup.ts')
      writeFileSync(file, mutated)
      return { dir, file }
    }

    function replaceOnce(from: string, to: string): (text: string) => string {
      return (text) => {
        expect(
          text.split(from).length - 1,
          `ancre attendue une fois dans auth.setup.ts : ${from}`,
        ).toBe(1)
        return text.replace(from, to)
      }
    }

    it('la copie intacte respecte le contrat : 1 register, une boucle annotée', () => {
      const dir = mkdtempSync(join(tmpdir(), 'rate-limit-setup-'))
      writeFileSync(join(dir, 'auth.setup.ts'), original)
      expect(setupEmissionsPerAccount('register', join(dir, 'auth.setup.ts'))).toBe(1)
      expectSingleAnnotatedLoop(dir)
    })

    it('une attente glissée dans `submitRegister` fait rougir le budget', () => {
      const { file } = mutatedSetup(
        replaceOnce(
          '    return response.status()\n',
          "    await expect(page.getByTestId('login-form')).toBeVisible({ timeout: 8_000 })\n" +
            '    return response.status()\n',
        ),
      )
      expect(() => setupEmissionsPerAccount('register', file)).toThrow(
        /HORS CONTRAT : `submitRegister` émet \/api\/auth\/register et appelle `toBeVisible`/,
      )
    })

    it('`submitRegister` qui renvoie `null` sur délai dépassé fait rougir le budget', () => {
      const { file } = mutatedSetup(
        replaceOnce(
          '    return acceptedRegisterStatus(observed, page.url(), true)\n',
          '    return null\n',
        ),
      )
      expect(() => setupEmissionsPerAccount('register', file)).toThrow(
        /HORS CONTRAT : `submitRegister` renvoie `null`/,
      )
    })

    it('`attemptRegister` qui fabrique le statut après l’émission fait rougir le budget', () => {
      const { file } = mutatedSetup(
        replaceOnce(
          '  return submitRegister(page, observed)\n',
          '  const status = await submitRegister(page, observed)\n' +
            "  const onLogin = await page.getByTestId('login-form').isVisible()\n" +
            '  return onLogin ? status : null\n',
        ),
      )
      expect(() => setupEmissionsPerAccount('register', file)).toThrow(
        /HORS CONTRAT : `attemptRegister` : `onLogin \? status : null`/,
      )
    })

    it('deux boucles annotées dans le MÊME fichier font rougir l’ancrage', () => {
      const { dir } = mutatedSetup((text) => {
        const start = text.indexOf(`  // ${RETRY_ON_FAILURE_ANNOTATION}\n`)
        expect(start, 'annotation introuvable dans auth.setup.ts').toBeGreaterThan(-1)
        const end = text.indexOf('\n  }\n', start) + '\n  }\n'.length
        return text.slice(0, end) + text.slice(start, end) + text.slice(end)
      })
      expect(annotatedLoops(dir)).toHaveLength(2)
      expect(() => expectSingleAnnotatedLoop(dir)).toThrow(/2 boucle\(s\) annotée\(s\)/)
    })
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

  it('lit les passes CI écrites dans un bloc `run: |` ou `run: >` — le trou de la revue S88', () => {
    // Avant la revue S88, seules les lignes `run: cmd` étaient lues : ce workflow donnait
    // 1 passe au lieu de 4, et les 3 invocations en bloc passaient inaperçues.
    const passes = readCiPasses(
      [
        '      - name: passe 1',
        '        run: npm run test:e2e -- --output=p1',
        '      - name: passe 2 en bloc littéral',
        '        run: |',
        '          echo "préparation"',
        '          # npx playwright test commented-out.spec.ts',
        '          npx playwright test auth.setup.ts \\',
        '            golden-path.spec.ts --output=p2',
        '      - name: passe 3 en bloc replié',
        '        run: >-',
        '          npx playwright test',
        '          forgot-password.spec.ts',
        '          --output=p3',
        '      - run: |',
        '          npm run test:e2e -- settings-account.spec.ts',
        '        env:',
        '          CI: true',
        '      - name: sans rapport',
        '        run: |',
        '          npm run lint',
      ].join('\n'),
    )
    expect(passes.map((p) => ({ full: p.full, files: p.files }))).toEqual([
      { full: true, files: [] },
      { full: false, files: ['auth.setup.ts', 'golden-path.spec.ts'] },
      { full: false, files: ['forgot-password.spec.ts'] },
      { full: false, files: ['settings-account.spec.ts'] },
    ])
  })
})
