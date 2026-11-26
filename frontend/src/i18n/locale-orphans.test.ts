// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

import { API_ERROR_KEYS } from '@/services/apiErrorMessages'

/**
 * #90 — Les fichiers de langue ne gardent que des phrases que l'application lit.
 *
 * T1 aplatit les clés de `public/locales/fr/*.json` (namespace = nom du fichier)
 * et cherche chacune dans le code de production de `src/` et `app/`.
 * T2 compare les clés aplaties des quatre langues.
 * T3 vérifie que le namespace `legal` reste présent dans les quatre langues.
 *
 * Une clé est lue quand une de ces formes la référence :
 *  - un littéral de chemin complet (`'auth.login.title'`), cas des traducteurs
 *    sans namespace (`useTranslations()`) et des tables de clés ;
 *  - un littéral relatif (`'login.title'`) dans un fichier qui ouvre le namespace
 *    parent (`useTranslations('auth')`, `useTranslations('auth.login')`,
 *    `getTranslations({ locale, namespace: 'auth' })`) ;
 *  - une valeur de `API_ERROR_KEYS`, que le pont `ApiErrorTranslatorBridge` lit
 *    sous le namespace `errors`.
 *
 * Ce qu'il ne voit pas : un littéral construit à la volée (`t(\`status.${s}\`)`) ou une
 * clé définie dans un fichier et lue dans un autre. Ces cas vont dans
 * `DYNAMIC_KEY_EXCEPTIONS`, avec leur raison. Une clé lue par un littéral relatif
 * dans un fichier qui ouvre le bon namespace est reconnue, même si le littéral
 * n'est pas dans l'appel `t(...)` lui-même : le test préfère manquer une orpheline
 * que rejeter une clé lue.
 */

const FRONTEND_ROOT = process.cwd()
const LOCALES_ROOT = join(FRONTEND_ROOT, 'public', 'locales')
const SOURCE_ROOTS = [join(FRONTEND_ROOT, 'src'), join(FRONTEND_ROOT, 'app')]
const LOCALES = ['fr', 'en', 'es', 'de'] as const
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'coverage', '__tests__'])

/** Textes juridiques lus côté serveur : exclus de T1 volontairement (décision du plan). */
const EXCLUDED_NAMESPACES = new Set(['legal'])

type DynamicKeyException = {
  /** Chemin fixe avant la partie choisie à la volée, point final compris. */
  prefix: string
  /** Valeurs que la partie dynamique peut prendre dans le code (le sous-arbre de chacune est protégé). */
  values: readonly string[]
  /** Fichier qui lit la clé à la volée. */
  file: string
  reason: string
}

/**
 * Clés choisies à la volée : le code ne contient pas leur chemin en toutes lettres.
 * Chaque entrée liste les valeurs précises que le code peut produire, pas tout le
 * préfixe : une clé voisine jamais lue reste signalée. N'y ajouter que ce qui est
 * vraiment dynamique, une clé simplement oubliée se retire.
 */
const DYNAMIC_KEY_EXCEPTIONS: readonly DynamicKeyException[] = [
  {
    prefix: 'categories.palette.roles.',
    values: [
      'red',
      'orange',
      'amber',
      'citron',
      'grass',
      'teal',
      'sky',
      'cobalt',
      'periwinkle',
      'orchid',
      'rose',
      'graphite',
    ],
    file: 'src/components/ui/palette-color-picker.tsx',
    reason: 't(`roles.${entry.role}`), un rôle par entrée de EVENT_PALETTE',
  },
  {
    prefix: 'categories.validation.',
    values: ['nameRequired', 'nameTooLong'],
    file: 'src/types/category.ts',
    reason:
      "le schéma reçoit le traducteur de CategoryDrawer (namespace categories.validation) et lit t('nameRequired')",
  },
  {
    prefix: 'common.conflictDialog.fields.',
    values: [
      'title',
      'type',
      'durationValue',
      'durationUnit',
      'isRecurring',
      'recurrenceUnit',
      'recurrenceEndDate',
      'startDate',
      'endDate',
      'color',
      'archived',
    ],
    file: 'src/components/shared/ConflictDialog.tsx',
    reason: 't(`fields.${f.key}`), la clé vient de la liste des champs comparés',
  },
  {
    prefix: 'common.deleteDialog.',
    values: ['event', 'product', 'category'],
    file: 'src/components/shared/DeleteConfirmDialog.tsx',
    reason:
      't(`${variant}.title`) et t(`${variant}.description`), variant = event, product ou category',
  },
  {
    prefix: 'common.landing.hero.timeline.lanes.',
    values: ['car', 'health', 'home', 'pantry', 'passport', 'subscriptions'],
    file: 'src/components/landing/HeroTimelineAnimation.tsx',
    reason: 't(`lanes.${lane.id}.name`) et voisins, un couloir par entrée de la liste des couloirs',
  },
  {
    prefix: 'common.landing.hero.timeline.months.',
    values: ['may', 'june', 'july', 'august'],
    file: 'src/components/landing/HeroTimelineAnimation.tsx',
    reason: 't(`months.${month.key}`), un mois par entrée de la liste des mois',
  },
  {
    prefix: 'common.landing.howItWorks.milestones.',
    values: ['reminder', 'recurrence', 'coverage', 'deadline'],
    file: 'src/components/landing/HowItWorksSection.tsx',
    reason: 't(`milestones.${key}.title`) et voisins, une étape par entrée de MILESTONES',
  },
  {
    prefix: 'dashboard.timeline.recurrence.',
    values: ['week', 'month', 'year'],
    file: 'src/components/timeline/lib.ts',
    reason:
      't(`dashboard.timeline.recurrence.${unitKey}`), unitKey = recurrenceUnit en minuscules (WEEK, MONTH, YEAR)',
  },
  {
    prefix: 'dashboard.timeline.status.',
    values: ['upcoming', 'ongoing', 'expired'],
    file: 'src/components/timeline/EventDrawer.tsx',
    reason:
      't(`dashboard.timeline.status.${event.status}`), lu aussi par lib.ts et les tiroirs mobiles',
  },
  {
    prefix: 'dashboard.timeline.zoom.',
    values: ['day', 'week', 'month', 'quarter', 'year'],
    file: 'src/components/timeline/TimelineMobilePortrait.tsx',
    reason: 't(`dashboard.timeline.zoom.${state.zoomLevel}`), un niveau par entrée de ZOOM_LEVELS',
  },
  {
    prefix: 'export.formats.',
    values: ['JSON', 'MARKDOWN', 'ZIP', 'CSV'],
    file: 'src/components/settings/ExportDataFlow.tsx',
    reason: 't(`formats.${format}.label`) et .hint, un format par entrée de EXPORT_FORMATS',
  },
  {
    prefix: 'export.status.',
    values: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'],
    file: 'src/components/settings/ExportDataFlow.tsx',
    reason: "t(`status.${flow.jobStatus ?? 'PENDING'}`), statut du job d'export",
  },
  {
    prefix: 'export.steps.',
    values: ['confirm', 'preparing', 'ready', 'error'],
    file: 'src/components/settings/ExportDataFlow.tsx',
    reason: 't(`steps.${flow.phase}.title`), une phase par valeur de ExportPhase',
  },
  {
    prefix: 'export.errors.',
    values: ['network', 'jobFailed'],
    file: 'src/components/settings/ExportDataFlow.tsx',
    reason: "t(`errors.${flow.errorKey ?? 'network'}`), valeurs de ExportErrorKey",
  },
  {
    prefix: 'network.',
    values: ['offline', 'retrying', 'timeout', 'server-error'],
    file: 'src/components/shared/OfflineBanner.tsx',
    reason: 't(`${state}.message`), un état par valeur de BannerState',
  },
  {
    prefix: 'products.categories.suggestions.',
    values: ['vehicles', 'insurance', 'finance', 'food', 'health', 'housing', 'travel'],
    file: 'src/components/categories/CategorySuggestions.tsx',
    reason: 't(`suggestions.${id}`), un identifiant par entrée de category-suggestions.ts',
  },
  {
    prefix: 'products.list.sort.',
    values: ['nextEvent', 'nameAsc', 'nameDesc'],
    file: 'src/components/products/ProductsListView.tsx',
    reason: 't(`sort.${key}`), une clé par entrée de SORT_KEYS',
  },
  {
    prefix: 'settings.nav.',
    values: ['profile', 'security', 'preferences', 'account'],
    file: 'src/components/settings/SettingsShell.tsx',
    reason:
      't(`nav.${chapter.id}`), un chapitre par valeur de ChapterId (lu aussi par les écrans mobiles)',
  },
  {
    prefix: 'settings.preferences.language.options.',
    values: ['fr', 'en', 'es', 'de'],
    file: 'src/components/settings/PreferencesSection.tsx',
    reason: 't(`preferences.language.options.${code}`), un code par langue supportée',
  },
  {
    prefix: 'settings.preferences.theme.options.',
    values: ['light', 'dark', 'system'],
    file: 'src/components/settings/PreferencesSection.tsx',
    reason: 't(`preferences.theme.options.${option}`), une option par entrée de THEME_OPTIONS',
  },
  {
    prefix: 'settings.preferences.density.options.',
    values: ['compact', 'normal', 'comfortable'],
    file: 'src/components/settings/PreferencesSection.tsx',
    reason: 't(`preferences.density.options.${option}`), une option par entrée de DENSITY_OPTIONS',
  },
  {
    prefix: 'settings.security.strength.',
    values: ['weak', 'medium', 'strong'],
    file: 'src/components/settings/PasswordStrength.tsx',
    reason: 't(`security.strength.${level}`), un niveau par entrée de LEVEL_STYLES',
  },
  {
    prefix: 'shell.nav.',
    values: ['dashboard', 'timeline', 'products'],
    file: 'src/components/layout/AppShell.tsx',
    reason: 't(`nav.${id}`), une entrée de navigation par identifiant',
  },
  {
    prefix: 'validation.event.',
    values: [
      'titleRequired',
      'titleMax',
      'durationMin',
      'durationUnitRequired',
      'recurrenceUnitRequired',
      'recurrenceEndBeforeStart',
      'endBeforeStart',
      'colorInvalid',
    ],
    file: 'src/types/event.ts',
    reason:
      'createEventEditSchema reçoit le traducteur de EventEditForm (validation.event), clés = champs de EventEditMessages',
  },
]

/**
 * Blocs conservés car leur écran existe (décision du plan : ne retirer que ce que
 * le test prouve inutilisé, garder tout bloc dont l'écran existe encore ou est
 * prévu). Ce ne sont pas des clés dynamiques : le code ne les lit pas aujourd'hui.
 */
const KEPT_SCREEN_BLOCKS: ReadonlyArray<{ prefix: string; screen: string; reason: string }> = [
  {
    prefix: 'errors.notFound.',
    screen: 'app/global-not-found-screen.tsx',
    reason:
      "écran 404 : la copie est écrite en dur dans l'écran, et app/global-not-found.test.tsx lit ces clés comme source de vérité de cette copie",
  },
]

type Messages = Record<string, unknown>

function readLocale(locale: string): Record<string, Messages> {
  const dir = join(LOCALES_ROOT, locale)
  const out: Record<string, Messages> = {}
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    out[file.replace('.json', '')] = JSON.parse(readFileSync(join(dir, file), 'utf8'))
  }
  return out
}

/** `namespace.a.b` pour chaque feuille (chaîne), tableaux compris. */
function flatten(files: Record<string, Messages>): string[] {
  const keys: string[] = []
  const visit = (node: unknown, path: string) => {
    if (node !== null && typeof node === 'object') {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) visit(v, `${path}.${k}`)
    } else {
      keys.push(path)
    }
  }
  for (const [ns, content] of Object.entries(files)) visit(content, ns)
  return keys.sort()
}

const NOT_PRODUCTION = /\.(test|spec|stories)\.tsx?$|(^|[\\/])(stress-)?fixtures\.tsx?$/

function productionFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...productionFiles(full))
    else if (/\.tsx?$/.test(entry) && !NOT_PRODUCTION.test(entry)) out.push(full)
  }
  return out
}

/**
 * Retire les commentaires en gardant les chaînes : une clé citée dans un
 * commentaire ne compte pas comme une lecture. Découpage lexical, pas un parseur :
 * une apostrophe dans du texte JSX peut fausser la suite de sa ligne seulement.
 */
function stripComments(src: string): string {
  let out = ''
  let i = 0
  while (i < src.length) {
    const c = src[i]
    const next = src[i + 1]
    if (c === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i++
    } else if (c === '/' && next === '*') {
      const end = src.indexOf('*/', i + 2)
      i = end === -1 ? src.length : end + 2
    } else if (c === "'" || c === '"' || c === '`') {
      const start = i++
      while (i < src.length && src[i] !== c && (c === '`' || src[i] !== '\n')) {
        i += src[i] === '\\' ? 2 : 1
      }
      i++
      out += src.slice(start, i)
    } else {
      out += c
      i++
    }
  }
  return out
}

const STRING_LITERAL = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g

/**
 * Littéraux fixes. Un gabarit à `${...}` ne compte pas lui-même (clé à la volée),
 * mais les littéraux de ses expressions oui : `${t('a.b')} suite`.
 */
function literalsOf(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(STRING_LITERAL)) {
    const literal = m[1] ?? m[2] ?? m[3] ?? ''
    if (m[3] !== undefined && literal.includes('${')) out.push(...literalsOf(literal))
    else out.push(literal)
  }
  return out
}

/**
 * Namespaces ouverts dans un fichier : les littéraux de chaque appel
 * `useTranslations(...)` ou `getTranslations(...)`. Un appel sans littéral lit la
 * racine (namespace vide).
 */
function namespacesOpenedIn(code: string): Set<string> {
  const namespaces = new Set<string>()
  for (const call of code.matchAll(/\b(?:useTranslations|getTranslations)\(([^)]*)\)/g)) {
    const literals = literalsOf(call[1])
    if (literals.length === 0) namespaces.add('')
    for (const literal of literals) namespaces.add(literal)
  }
  return namespaces
}

/** Chaque clé aplatie qu'au moins un fichier de production lit par un littéral. */
function referencedKeys(allKeys: string[]): Set<string> {
  const used = new Set<string>()
  const keySet = new Set(allKeys)

  // Le pont des erreurs réseau lit ces clés sous le namespace `errors`.
  for (const key of Object.values(API_ERROR_KEYS)) used.add(`errors.${key}`)

  for (const dir of SOURCE_ROOTS) {
    for (const file of productionFiles(dir)) {
      const code = stripComments(readFileSync(file, 'utf8'))
      const literals = new Set(literalsOf(code))
      const namespaces = namespacesOpenedIn(code)
      for (const literal of literals) {
        if (keySet.has(literal)) used.add(literal)
        for (const ns of namespaces) {
          if (ns !== '' && keySet.has(`${ns}.${literal}`)) used.add(`${ns}.${literal}`)
        }
      }
    }
  }
  return used
}

function isKeptBlock(key: string): boolean {
  return KEPT_SCREEN_BLOCKS.some((b) => key.startsWith(b.prefix))
}

function isException(key: string): boolean {
  return DYNAMIC_KEY_EXCEPTIONS.some((e) =>
    e.values.some((v) => key === `${e.prefix}${v}` || key.startsWith(`${e.prefix}${v}.`)),
  )
}

describe('locale files', () => {
  it('reports no French locale key that the source never references', () => {
    const frKeys = flatten(readLocale('fr')).filter(
      (k) => !EXCLUDED_NAMESPACES.has(k.split('.')[0]),
    )
    // Garde d'anti-vacuité : un mauvais `cwd` ne doit pas rendre le test vert.
    expect(frKeys.length, 'aucune clé fr lue : `cwd` doit être `frontend/`').toBeGreaterThan(100)
    const used = referencedKeys(frKeys)
    expect(
      used.size,
      'aucune clé repérée dans le code : le scan ne voit plus rien',
    ).toBeGreaterThan(100)

    // Une exception ou un bloc conservé qui ne protège plus aucune clé doit disparaître.
    for (const e of DYNAMIC_KEY_EXCEPTIONS) {
      for (const v of e.values) {
        expect(
          frKeys.some((k) => k === `${e.prefix}${v}` || k.startsWith(`${e.prefix}${v}.`)),
          `exception sans clé : ${e.prefix}${v}`,
        ).toBe(true)
      }
      expect(existsSync(join(FRONTEND_ROOT, e.file)), `fichier absent : ${e.file}`).toBe(true)
    }
    for (const b of KEPT_SCREEN_BLOCKS) {
      expect(
        frKeys.some((k) => k.startsWith(b.prefix)),
        `bloc conservé sans clé : ${b.prefix}`,
      ).toBe(true)
      expect(existsSync(join(FRONTEND_ROOT, b.screen)), `écran absent : ${b.screen}`).toBe(true)
    }

    const orphans = frKeys.filter((k) => !used.has(k) && !isException(k) && !isKeptBlock(k))

    const byNamespace = new Map<string, string[]>()
    for (const key of orphans) {
      const ns = key.split('.')[0]
      byNamespace.set(ns, [...(byNamespace.get(ns) ?? []), key])
    }
    const report = [...byNamespace]
      .map(([ns, keys]) => `[${ns}] ${keys.length}\n  ${keys.join('\n  ')}`)
      .join('\n')

    // Rapport dans le message : Vitest tronque la valeur comparée d'un `toEqual`.
    expect(
      orphans,
      `${orphans.length} clé(s) fr jamais lue(s) dans src/ ni app/ :\n${report}\n` +
        `Une clé choisie à la volée va dans DYNAMIC_KEY_EXCEPTIONS avec sa raison, les autres se retirent des 4 langues.`,
    ).toEqual([])
  })

  it('keeps the same keys in fr, en, es and de', () => {
    const reference = new Set(flatten(readLocale('fr')))
    expect(reference.size, 'aucune clé fr lue').toBeGreaterThan(100)

    const differences: string[] = []
    for (const locale of LOCALES.filter((l) => l !== 'fr')) {
      const keys = new Set(flatten(readLocale(locale)))
      for (const k of reference) if (!keys.has(k)) differences.push(`${locale}: manque ${k}`)
      for (const k of keys) if (!reference.has(k)) differences.push(`${locale}: en trop ${k}`)
    }

    expect(
      differences,
      `les langues ne portent pas les mêmes clés que fr :\n  ${differences.join('\n  ')}`,
    ).toEqual([])
  })

  it('still ships the legal namespace in every locale', () => {
    for (const locale of LOCALES) {
      const file = join(LOCALES_ROOT, locale, 'legal.json')
      expect(existsSync(file), `${relative(FRONTEND_ROOT, file)} absent`).toBe(true)
      const legalKeys = flatten({ legal: JSON.parse(readFileSync(file, 'utf8')) })
      expect(legalKeys.length, `namespace legal vide en ${locale}`).toBeGreaterThan(0)
    }
  })
})
