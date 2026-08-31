import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * #441 — Garde-fou : tout namespace passé à `useTranslations('…')` DOIT se
 * résoudre dans les messages réellement chargés par `i18n.ts`.
 *
 * LE DÉFAUT QU'IL ATTRAPE (constaté en navigateur avant correction, 4 locales) :
 * `DeleteConfirmDialog` appelait `useTranslations('deleteDialog')` et
 * `ConflictDialog` `useTranslations('conflictDialog')`. Or `i18n.ts` indexe les
 * namespaces par NOM DE FICHIER (`messages[file.replace('.json','')] = content`) :
 * les clés de premier niveau de `messages` sont les 13 noms de fichier, et
 * `deleteDialog` / `conflictDialog` sont IMBRIQUÉS dans `common.json`. next-intl
 * émettait `MISSING_MESSAGE: Could not resolve 'deleteDialog' in messages for
 * locale 'fr'` et son `getMessageFallback` par défaut affichait le CHEMIN DE CLÉ
 * BRUT à l'utilisateur — « deleteDialog.product.title » en toutes lettres dans le
 * dialog de suppression, dans les 4 locales.
 *
 * POURQUOI UN GARDE-FOU DE DÉPÔT ET PAS DEUX ASSERTIONS :
 * les tests unitaires des deux dialogs mockent `next-intl` en
 * `` `${namespace}.${key}` `` — un namespace FAUX y produit exactement le même
 * résultat qu'un namespace juste. Le défaut était donc INDÉTECTABLE PAR
 * CONSTRUCTION, et l'est resté plusieurs sprints. Ce fichier vérifie les ~40
 * namespaces du dépôt d'un coup, pas seulement les deux corrigés.
 *
 * CE QU'IL N'ATTRAPE PAS (cf. [[PIT-S58-004]] : écrire ce qu'une garde ignore) :
 *  - les CLÉS manquantes sous un namespace valide (`t('cle.inexistante')`) — seule
 *    la racine du namespace est résolue ici ; c'est le rôle des `*.intl.test.tsx`
 *    qui rendent les composants avec les VRAIS messages et un collecteur `onError` ;
 *  - les namespaces CALCULÉS hors littéral (`useTranslations(cond ? a : b)` est
 *    couvert, mais pas `useTranslations(maVariable)`) ;
 *  - les placeholders ICU non fournis (cf. `DensityRibbon.intl.test.tsx`).
 */

const LOCALES_ROOT = join(process.cwd(), 'public', 'locales')
const SRC_ROOT = join(process.cwd(), 'src')
const APP_ROOT = join(process.cwd(), 'app')
const EXTENSIONS = ['.ts', '.tsx']
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'coverage'])
/** Ce fichier CITE des namespaces fautifs pour les décrire : il doit s'exclure. */
const SELF = fileURLToPath(import.meta.url)

/** Les tests/stories mockent `next-intl` et ne rendent rien en production. */
const NOT_PRODUCTION = /\.(test|spec|stories)\.tsx?$/

/**
 * Reproduit EXACTEMENT `loadMessages()` de `frontend/i18n.ts` : un namespace de
 * premier niveau par FICHIER `.json`. Toute divergence ici rendrait le garde-fou
 * faux dans un sens comme dans l'autre — d'où la duplication assumée plutôt
 * qu'un import de `i18n.ts`, qui tirerait `next-intl/server`.
 */
function loadMessages(locale: string): Record<string, unknown> {
  const dir = join(LOCALES_ROOT, locale)
  if (!existsSync(dir)) return {}
  const messages: Record<string, unknown> = {}
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    messages[file.replace('.json', '')] = JSON.parse(readFileSync(join(dir, file), 'utf8'))
  }
  return messages
}

/**
 * Résout un namespace next-intl, chemin pointé compris (`common.deleteDialog`).
 * Renvoie `undefined` si un maillon manque ou si la cible n'est pas un objet —
 * `useTranslations` d'une FEUILLE (chaîne) est tout aussi cassé qu'un namespace
 * absent. Exporté implicitement via les tests de contrôle négatif ci-dessous.
 */
function resolveNamespace(messages: Record<string, unknown>, namespace: string): unknown {
  let node: unknown = messages
  for (const segment of namespace.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[segment]
  }
  return typeof node === 'object' && node !== null ? node : undefined
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
  let out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out = out.concat(walk(full))
      continue
    }
    if (EXTENSIONS.some((ext) => entry.endsWith(ext)) && !NOT_PRODUCTION.test(entry)) out.push(full)
  }
  return out
}

/**
 * Capture l'ARGUMENT de chaque `useTranslations(...)`, puis TOUS les littéraux
 * simple-quote qu'il contient. La deuxième passe est ce qui couvre la forme
 * ternaire réellement présente au dépôt (`useTranslations(forbidden ?
 * 'errors.forbidden' : 'errors.crash')`) : une regex qui n'accepterait qu'un
 * littéral nu la manquerait en silence.
 *
 * `useTranslations:` (deux-points) ne matche pas — c'est la forme des `vi.mock`,
 * qui définissent le hook au lieu de l'appeler.
 */
function namespacesIn(source: string): string[] {
  const out: string[] = []
  for (const call of source.matchAll(/useTranslations\(([^)]*)\)/g)) {
    for (const literal of call[1].matchAll(/'([^']+)'/g)) out.push(literal[1])
  }
  return out
}

describe('i18n — tout namespace `useTranslations()` se résout dans les messages (#441)', () => {
  const files = [...walk(SRC_ROOT), ...walk(APP_ROOT)].filter((f) => f !== SELF)

  it("balaye réellement le dépôt (garde d'anti-vacuité)", () => {
    // `walk` renvoie `[]` sur un dossier absent : sans ce plancher, un run depuis
    // un mauvais `cwd` balaierait ZÉRO fichier et serait VERT — garde désarmée en
    // silence, pire qu'une garde rouge. Cf. [[PIT-S53-006]], [[PIT-S54-002]].
    expect(
      files.length,
      `aucun fichier balayé : \`src/\` (${SRC_ROOT}) et \`app/\` (${APP_ROOT}) sont ` +
        `résolus depuis \`process.cwd()\`, qui doit être \`frontend/\`.`,
    ).toBeGreaterThan(50)

    const found = files.flatMap((f) => namespacesIn(readFileSync(f, 'utf8')))
    expect(
      found.length,
      `aucun \`useTranslations('…')\` trouvé alors que ${files.length} fichiers ont été ` +
        `lus : la regex d'extraction ne matche plus rien, la garde ne vérifie RIEN.`,
    ).toBeGreaterThan(30)
  })

  it('aucun namespace orphelin dans `src/` ni `app/`', () => {
    const messages = loadMessages('fr')
    expect(Object.keys(messages).length, 'aucun fichier de messages `fr` chargé').toBeGreaterThan(5)

    const offenders: string[] = []
    for (const file of files) {
      for (const namespace of new Set(namespacesIn(readFileSync(file, 'utf8')))) {
        if (resolveNamespace(messages, namespace) === undefined) {
          offenders.push(`${relative(process.cwd(), file)} → useTranslations('${namespace}')`)
        }
      }
    }

    // Message en 2e argument d'`expect` : Vitest tronque à ~40 caractères la valeur
    // comparée d'un `toEqual`, et le reporter JSON ne transporte que ce message —
    // un rapport multi-ligne y serait décapité en CI ([[PIT-S57-002]]).
    expect(
      offenders,
      `namespace(s) i18n introuvable(s) dans les messages \`fr\`. next-intl rendra le ` +
        `CHEMIN DE CLÉ BRUT à l'utilisateur (ex. « deleteDialog.product.title ») dans les ` +
        `4 locales.\nRappel : \`i18n.ts\` indexe par NOM DE FICHIER de ` +
        `\`public/locales/<locale>/\` — un groupe imbriqué se cible en chemin pointé ` +
        `(\`common.deleteDialog\`), jamais par son nom seul.\n` +
        `Fautifs :\n  ${offenders.join('\n  ')}`,
    ).toEqual([])
  })

  it('les 4 locales exposent les mêmes namespaces de premier niveau', () => {
    const reference = Object.keys(loadMessages('fr')).sort()
    for (const locale of ['en', 'de', 'es']) {
      expect(Object.keys(loadMessages(locale)).sort(), `namespaces manquants en \`${locale}\``).toEqual(
        reference,
      )
    }
  })
})

/**
 * CONTRÔLE NÉGATIF PERMANENT.
 *
 * [[PIT-S62-003]] : une garde prouvée par des fixtures supprimées avant commit
 * n'est PAS armée — toute régression future (résolution qui renverrait un objet
 * par défaut, `split` cassé, feuille acceptée comme namespace) passerait en CI
 * verte. Ces cas figent donc le défaut RÉEL de #441 dans le dépôt : ils échouent
 * si `resolveNamespace` cesse de distinguer un namespace valide d'un orphelin.
 */
describe('résolution de namespace — contrôle négatif figé (#441)', () => {
  const messages = loadMessages('fr')

  it('rejette les namespaces exacts qui produisaient le bug', () => {
    // Les deux valeurs littérales d'AVANT correction. Elles n'existent qu'en tant
    // que groupes imbriqués de `common.json`, jamais en tant que fichier.
    expect(resolveNamespace(messages, 'deleteDialog')).toBeUndefined()
    expect(resolveNamespace(messages, 'conflictDialog')).toBeUndefined()
  })

  it('accepte les chemins pointés corrigés', () => {
    expect(resolveNamespace(messages, 'common.deleteDialog')).toBeTypeOf('object')
    expect(resolveNamespace(messages, 'common.conflictDialog')).toBeTypeOf('object')
  })

  it('rejette une FEUILLE (chaîne) prise pour un namespace', () => {
    // `common.deleteDialog.cancel` est une chaîne : `useTranslations` dessus est
    // aussi cassé qu'un namespace absent, et doit être signalé comme tel.
    expect(resolveNamespace(messages, 'common.deleteDialog.cancel')).toBeUndefined()
  })

  it('rejette un namespace entièrement inventé', () => {
    expect(resolveNamespace(messages, 'namespaceQuiNexistePas')).toBeUndefined()
    expect(resolveNamespace(messages, 'common.groupeInvente')).toBeUndefined()
  })
})
