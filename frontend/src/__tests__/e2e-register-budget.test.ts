import { existsSync, readFileSync, readdirSync } from 'node:fs'
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
 * Compte les auto-inscriptions faites par les SPECS (hors projet `setup`, dont le
 * volume est déjà donné par `ALL_ACCOUNTS`).
 *
 * HEURISTIQUE ASSUMÉE : une occurrence de `register-submit` = une soumission du
 * formulaire. Elle sur-compte une soumission placée dans une boucle et sous-compte
 * un register émis en API directe (`request.post('/api/auth/register')`) — les deux
 * sont recherchés ci-dessous. Le but n'est pas un compteur exact au runtime, c'est
 * qu'AUCUNE spec ne puisse ajouter un register sans que ce test le voie passer.
 */
function countSpecRegisters(): { total: number; perFile: Record<string, number> } {
  const perFile: Record<string, number> = {}
  for (const file of readdirSync(E2E_DIR)) {
    if (!file.endsWith('.spec.ts')) continue
    const source = readFileSync(join(E2E_DIR, file), 'utf8')
    const uiSubmits = source.match(/register-submit/g)?.length ?? 0
    const apiCalls = source.match(/['"`][^'"`]*\/api\/auth\/register/g)?.length ?? 0
    const count = uiSubmits + apiCalls
    if (count > 0) perFile[file] = count
  }
  return { total: Object.values(perFile).reduce((a, b) => a + b, 0), perFile }
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
})
