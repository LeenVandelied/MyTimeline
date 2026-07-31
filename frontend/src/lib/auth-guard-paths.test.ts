import { readdirSync, type Dirent } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, it, expect } from 'vitest'

import {
  AUTH_COOKIE_NAME,
  LOGIN_SEGMENT,
  PROTECTED_APP_SEGMENTS,
  PROTECTED_EXTRA_SEGMENTS,
  PROTECTED_SEGMENTS,
  buildLoginPathname,
  isProtectedPathname,
  splitLocalizedPathname,
} from '@/lib/auth-guard-paths'
import { SUPPORTED_LOCALES } from '@/i18n/locales'

/**
 * #302 — Logique de chemins de la garde serveur (ADR-004).
 *
 * #318 — ce fichier ne se contente plus d'ANCRER la liste des segments protégés,
 * il la SYNCHRONISE : le garde-fou ci-dessous lit `frontend/app/[locale]/(app)/`
 * sur le disque et rougit dans les deux sens (route non déclarée / constante
 * orpheline). Avant #318, ajouter une page sous `(app)/` sans toucher à
 * `PROTECTED_APP_SEGMENTS` ne cassait AUCUN test : la page partait en production
 * accessible aux anonymes, en silence.
 */

// --- Garde-fou de synchronisation arborescence ↔ constante (#318) ------------

/** Chemins cités dans les messages d'échec — le dev doit savoir QUOI éditer. */
const GUARD_FILE = 'frontend/src/lib/auth-guard-paths.ts'
const GUARD_TEST_FILE = 'frontend/src/lib/auth-guard-paths.test.ts'
const APP_GROUP_LABEL = 'frontend/app/[locale]/(app)/'

/**
 * Résolu depuis CE fichier (`import.meta.url`), jamais depuis `process.cwd()` :
 * le résultat est le même que la suite soit lancée depuis `frontend/`, depuis la
 * racine du dépôt (`vitest --root frontend`) ou depuis un IDE.
 * `path.join` (et non `new URL(...)` ni un glob) : les `[`, `]`, `(`, `)` du
 * chemin ne sont interprétés par personne — vérifié, `join` les rend tels quels.
 */
const APP_GROUP_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'app',
  '[locale]',
  '(app)',
)

/**
 * Forme minimale d'une entrée de répertoire. `fs.Dirent` la satisfait
 * structurellement, ce qui permet de faire tourner EXACTEMENT la même logique
 * sur le vrai disque et sur des entrées fabriquées (preuve du rouge sans créer
 * de fausse route dans `app/`, qui partirait en production).
 */
type DirEntryLike = { readonly name: string; isDirectory: () => boolean }

type RouteScan = {
  /** Segments d'URL littéraux de profondeur 1 (= ce que la constante doit lister). */
  readonly segments: readonly string[]
  /** Dossiers non routés, ignorés à dessein. */
  readonly ignored: readonly string[]
  /** Dossiers dont ce garde-fou ne sait PAS déduire l'URL → refus de conclure. */
  readonly unsupported: readonly string[]
}

/**
 * Traduit le contenu (profondeur 1) de `(app)/` en segments d'URL.
 *
 * RÈGLES — explicites, pas implicites :
 * 1. **Fichiers** (`layout.tsx`, `page.tsx`, `error.tsx`, `loading.tsx`,
 *    `template.tsx`, `not-found.tsx`…) → jamais un segment d'URL, ignorés.
 * 2. **`_dossier/`** → dossier privé Next, exclu du routage → ignoré.
 * 3. **`@slot/`** → route parallèle : rendue DANS le layout parent, elle
 *    n'introduit aucun segment d'URL propre → ignorée (rien de plus à protéger).
 * 4. **`(groupe)/`** → route group imbriqué : ses enfants remontent à CE niveau
 *    d'URL, invisibles d'un scan de profondeur 1. Conclure serait conclure faux.
 * 5. **`[param]/`** → segment dynamique en première position : matcherait
 *    n'importe quel premier segment, ce qu'une liste de littéraux ne sait pas
 *    exprimer.
 *    4 et 5 n'existent pas aujourd'hui sous `(app)/` et n'ont rien d'anodin : on
 *    REFUSE de conclure (`unsupported`) et on fait rougir avec la marche à suivre,
 *    plutôt que de les ignorer en silence — un `unsupported` ignoré rouvrirait
 *    exactement le trou que #318 ferme.
 *
 * Les sous-routes (`products/[productId]/`) sont en profondeur 2 : hors du champ
 * d'un `readdirSync` non récursif. `isProtectedPathname` protège déjà toute route
 * imbriquée via son PREMIER segment (cf. tests plus bas) — il n'y a donc rien à
 * déclarer pour elles. Assertion explicite dans les tests, pas une supposition.
 */
function scanRouteDirectories(entries: readonly DirEntryLike[]): RouteScan {
  const segments: string[] = []
  const ignored: string[] = []
  const unsupported: string[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const { name } = entry
    if (name.startsWith('_') || name.startsWith('@')) {
      ignored.push(name)
    } else if (name.startsWith('(') || name.startsWith('[')) {
      unsupported.push(name)
    } else {
      segments.push(name)
    }
  }

  return { segments, ignored, unsupported }
}

type SegmentDrift = {
  /** Sur le disque, absent de la constante → route NON protégée (le cas grave). */
  readonly undeclared: readonly string[]
  /** Dans la constante, absent du disque → garde qui protège du vide. */
  readonly orphan: readonly string[]
}

/**
 * Base de comparaison commune disque ↔ constante — MIROIR EXACT de la
 * normalisation faite par `isProtectedPathname` (`segment.toLowerCase()`).
 *
 * Sans elle, un dossier `Billing/` déclaré `'billing'` (la déclaration CORRECTE,
 * celle que la garde runtime reconnaît) rougissait à tort, et un dossier
 * `Billing/` déclaré `'Billing'` (la déclaration CASSÉE) passait au vert.
 */
function normalizeSegment(segment: string): string {
  return segment.toLowerCase()
}

/** Comparaison pure, sans `fs` : testable avec des entrées fabriquées. */
function diffProtectedSegments(
  scannedSegments: readonly string[],
  declaredSegments: readonly string[],
): SegmentDrift {
  const scanned = new Set(scannedSegments.map(normalizeSegment))
  const declared = new Set(declaredSegments.map(normalizeSegment))

  // On filtre sur la base normalisée mais on RESTITUE les noms bruts : le dev
  // doit lire `Billing` (ce qu'il voit dans son explorateur), pas `billing`.
  return {
    undeclared: scannedSegments.filter((segment) => !declared.has(normalizeSegment(segment))),
    orphan: declaredSegments.filter((segment) => !scanned.has(normalizeSegment(segment))),
  }
}

/**
 * Segments déclarés que `isProtectedPathname` ne retrouvera JAMAIS.
 *
 * ⚠ Ce contrôle est le PRIX de la normalisation ci-dessus : `diffProtectedSegments`
 * ne peut plus, par construction, distinguer `'Billing'` de `'billing'` — donc une
 * constante en casse mixte lui paraît synchronisée. C'est précisément la fausse
 * assurance que ce garde-fou existe pour empêcher : la comparaison est normalisée,
 * la DÉCLARATION ne l'est pas — elle doit être rejetée, jamais corrigée en silence.
 */
function findMiscasedDeclarations(declaredSegments: readonly string[]): readonly string[] {
  return declaredSegments.filter((segment) => segment !== normalizeSegment(segment))
}

/** Wording UNIQUE, partagé par le rapport du garde-fou et l'assertion sur l'union. */
function formatMiscasedLines(miscased: readonly string[]): readonly string[] {
  if (miscased.length === 0) return []

  return [
    `• Segments déclarés en casse MIXTE : ${miscased.join(', ')}`,
    `  → isProtectedPathname compare \`segment.toLowerCase()\` à PROTECTED_SEGMENTS : un segment non minuscule n'y est JAMAIS trouvé, la route reste servie aux visiteurs ANONYMES. Déclare-le en minuscules (${miscased.map(normalizeSegment).join(', ')}) dans ${GUARD_FILE} — le dossier sur le disque garde sa casse, c'est la comparaison qui la normalise.`,
  ]
}

/** Message affiché quand tout va bien — cible de l'assertion. */
const GUARD_IN_SYNC = `PROTECTED_APP_SEGMENTS est synchronisée avec ${APP_GROUP_LABEL}`

/**
 * Produit soit `GUARD_IN_SYNC`, soit un rapport ACTIONNABLE : dans six mois, le
 * rouge doit dire quoi faire, pas seulement `expected [...] to equal [...]`.
 */
function formatGuardReport(
  entries: readonly DirEntryLike[],
  declaredSegments: readonly string[],
): string {
  const scan = scanRouteDirectories(entries)
  const drift = diffProtectedSegments(scan.segments, declaredSegments)
  const lines: string[] = [...formatMiscasedLines(findMiscasedDeclarations(declaredSegments))]

  if (drift.undeclared.length > 0) {
    lines.push(
      `• Routes présentes sous ${APP_GROUP_LABEL} mais ABSENTES de PROTECTED_APP_SEGMENTS : ${drift.undeclared.join(', ')}`,
      `  → ces pages sont servies aux visiteurs ANONYMES. Ajoute chaque segment dans ${GUARD_FILE} (PROTECTED_APP_SEGMENTS).`,
    )
  }

  if (drift.orphan.length > 0) {
    lines.push(
      `• Segments déclarés dans PROTECTED_APP_SEGMENTS mais ABSENTS de ${APP_GROUP_LABEL} : ${drift.orphan.join(', ')}`,
      `  → route supprimée, renommée, ou sortie du groupe (app) ? Retire-la de ${GUARD_FILE}, ou déclare-la dans PROTECTED_EXTRA_SEGMENTS si elle vit désormais hors du groupe.`,
    )
  }

  if (scan.unsupported.length > 0) {
    lines.push(
      `• Dossiers non interprétables à la profondeur 1 : ${scan.unsupported.join(', ')}`,
      `  → un route group « (x) » remonte ses enfants d'un niveau d'URL, un segment dynamique « [x] » matche n'importe quel premier segment : ce garde-fou ne sait plus quelles URL sont protégées. Étends scanRouteDirectories dans ${GUARD_TEST_FILE} AVANT de fusionner.`,
    )
  }

  return lines.length === 0
    ? GUARD_IN_SYNC
    : ['GARDE SERVEUR DÉSYNCHRONISÉE (#318) :', ...lines].join('\n')
}

/** Entrées de répertoire réelles, profondeur 1 (pas de `recursive: true`). */
function readAppGroupEntries(): readonly Dirent[] {
  return readdirSync(APP_GROUP_DIR, { withFileTypes: true })
}

/**
 * Assertion du garde-fou.
 *
 * ⚠ Le rapport est passé en MESSAGE (2e argument d'`expect`), pas seulement
 * comme valeur comparée : vitest tronque les valeurs d'un `toBe` à ~40 caractères
 * (`expected 'GARDE SERVEUR DÉSYNCHRONISÉE (#318) :…' to be …`), ce qui
 * décapiterait exactement la partie actionnable — vérifié en faisant rougir ce
 * test. Le message custom, lui, est imprimé entier, y compris sous un reporter
 * non interactif (CI, `--reporter=json`).
 */
function expectGuardInSync(
  entries: readonly DirEntryLike[],
  declaredSegments: readonly string[],
): void {
  const report = formatGuardReport(entries, declaredSegments)

  expect(report, `\n${report}\n`).toBe(GUARD_IN_SYNC)
}

// ---------------------------------------------------------------------------

describe('auth-guard-paths — contrat', () => {
  it('nomme le cookie exactement comme JwtFilter.java:48', () => {
    expect(AUTH_COOKIE_NAME).toBe('jwt')
  })

  it('liste les segments du groupe (app) tels que présents sur le disque', () => {
    // #318 — plus un miroir écrit à la main : la comparaison est faite CONTRE le
    // disque. Si ce test rougit, lis son message : il nomme le segment fautif,
    // le sens de l'écart et le fichier à éditer.
    expectGuardInSync(readAppGroupEntries(), [...PROTECTED_APP_SEGMENTS])
  })

  it('déclare TOUS les segments protégés en minuscules (union app + extra)', () => {
    // Le garde-fou filesystem ne voit que PROTECTED_APP_SEGMENTS ; l'invariant de
    // casse, lui, porte sur l'UNION — c'est elle que `isProtectedPathname`
    // consulte. Sans cette assertion, un `PROTECTED_EXTRA_SEGMENTS = ['Billing']`
    // n'aurait aucun filet : ni disque à contredire, ni rapport à rougir.
    const miscased = findMiscasedDeclarations(PROTECTED_SEGMENTS)
    const report = ['DÉCLARATION EN CASSE MIXTE :', ...formatMiscasedLines(miscased)].join('\n')

    expect(miscased, `\n${report}\n`).toEqual([])
  })

  it('protège settings, passé sous le groupe (app) en #299', () => {
    // #299 — la route a MIGRÉ de `app/[locale]/settings/` vers
    // `app/[locale]/(app)/settings/`. La garde serveur doit couvrir exactement
    // le même chemin qu'avant : c'est le seul point du déplacement qui pouvait
    // silencieusement ouvrir `/settings` aux anonymes.
    // #318 — les trois maillons sont vérifiés séparément, pour qu'aucun ne puisse
    // passer au vert « par défaut » : (a) le dossier existe VRAIMENT sur le
    // disque sous `(app)/` — sinon un `toContain` sur la constante seule serait
    // vert même si la route avait disparu ; (b) la constante le couvre ;
    // (c) la garde le reconnaît réellement sur une URL.
    expect(scanRouteDirectories(readAppGroupEntries()).segments).toContain('settings')
    expect([...PROTECTED_EXTRA_SEGMENTS]).toEqual([])
    expect(PROTECTED_SEGMENTS).toContain('settings')
    expect(isProtectedPathname('/fr/settings')).toBe(true)
    expect(isProtectedPathname('/en/settings')).toBe(true)
  })

  it("n'inclut PAS les routes publiques (sinon boucle de redirection)", () => {
    for (const publicSegment of [
      LOGIN_SEGMENT,
      'register',
      'forgot-password',
      'reset-password',
      'home',
      'privacy',
      'terms',
    ]) {
      expect(PROTECTED_SEGMENTS).not.toContain(publicSegment)
    }
  })
})

describe('splitLocalizedPathname', () => {
  it('extrait locale et premier segment', () => {
    expect(splitLocalizedPathname('/fr/dashboard')).toEqual({
      locale: 'fr',
      segment: 'dashboard',
    })
  })

  it('ignore les slashes superflus (trailing / doublons)', () => {
    expect(splitLocalizedPathname('/fr/timeline/')).toEqual({
      locale: 'fr',
      segment: 'timeline',
    })
  })

  it('ne garde que le PREMIER segment sur une route imbriquée', () => {
    expect(splitLocalizedPathname('/en/products/9f4c1e2a')).toEqual({
      locale: 'en',
      segment: 'products',
    })
  })

  it('renvoie segment null sur la racine localisée', () => {
    expect(splitLocalizedPathname('/de')).toEqual({ locale: 'de', segment: null })
  })

  it('renvoie null quand le chemin n’est pas préfixé par une locale supportée', () => {
    // next-intl redirigera d'abord ces chemins ; la garde s'appliquera au tour suivant.
    expect(splitLocalizedPathname('/dashboard')).toBeNull()
    expect(splitLocalizedPathname('/it/dashboard')).toBeNull()
    expect(splitLocalizedPathname('/')).toBeNull()
  })
})

describe('isProtectedPathname', () => {
  it.each([...SUPPORTED_LOCALES])('protège toutes les routes (app) en %s', (locale) => {
    for (const segment of PROTECTED_SEGMENTS) {
      expect(isProtectedPathname(`/${locale}/${segment}`)).toBe(true)
    }
  })

  it('protège les sous-routes (ex. détail produit)', () => {
    expect(isProtectedPathname('/fr/products/9f4c1e2a-0000-4000-8000-000000000000')).toBe(true)
  })

  it('ne protège pas les routes publiques', () => {
    for (const pathname of [
      '/fr/login',
      '/fr/register',
      '/fr/forgot-password',
      '/fr/reset-password',
      '/fr/home',
      '/fr/privacy',
      '/fr/terms',
      '/fr',
      '/',
    ]) {
      expect(isProtectedPathname(pathname)).toBe(false)
    }
  })

  it('ne protège pas un chemin non préfixé (next-intl redirige d’abord)', () => {
    expect(isProtectedPathname('/dashboard')).toBe(false)
  })

  it('résiste à un contournement par la casse', () => {
    expect(isProtectedPathname('/fr/DASHBOARD')).toBe(true)
    expect(isProtectedPathname('/fr/DaShBoArD')).toBe(true)
  })

  it('ne confond pas un segment préfixé par un segment protégé', () => {
    expect(isProtectedPathname('/fr/dashboards')).toBe(false)
    expect(isProtectedPathname('/fr/timeline-public')).toBe(false)
  })

  // --- Contournement par percent-encoding (audit sécurité S45) ---
  // `nextUrl.pathname` n'est pas décodé : sans décodage par segment, `%64ashboard`
  // ne matchait aucun segment protégé et la garde sautait.

  it('résiste à un contournement par percent-encoding du segment', () => {
    expect(isProtectedPathname('/fr/%64ashboard')).toBe(true) // %64 = 'd'
    expect(isProtectedPathname('/fr/%53ettings')).toBe(true) // %53 = 'S' (+ insensible casse)
    expect(isProtectedPathname('/fr/%70roducts/9f4c1e2a')).toBe(true) // %70 = 'p'
  })

  it('résiste à un contournement par percent-encoding de la LOCALE', () => {
    expect(isProtectedPathname('/%66r/dashboard')).toBe(true) // %66 = 'f'
    expect(splitLocalizedPathname('/%66r/dashboard')).toEqual({
      locale: 'fr',
      segment: 'dashboard',
    })
  })

  it('ne décode QU’UN niveau (aligné sur le routeur Next)', () => {
    // `/fr/%2564ashboard` → segment réel `%64ashboard` : aucune route ne
    // correspond. Le décoder deux fois divergerait du routage réel.
    expect(isProtectedPathname('/fr/%2564ashboard')).toBe(false)
  })

  it('traite un segment au percent-encoding MALFORMÉ comme protégé (fail-closed)', () => {
    expect(isProtectedPathname('/fr/%zz')).toBe(true)
    expect(isProtectedPathname('/fr/%')).toBe(true)
    expect(isProtectedPathname('/fr/dash%E0%A4board')).toBe(true)
  })

  it('ne fait pas dérailler les cas nominaux publics après décodage', () => {
    expect(isProtectedPathname('/fr/login')).toBe(false)
    expect(isProtectedPathname('/fr/forgot-password')).toBe(false)
    expect(isProtectedPathname('/fr/reset-password')).toBe(false)
  })
})

/**
 * #318 — Le garde-fou lui-même. Deux étages :
 *  - la LOGIQUE (pure, sans `fs`) est éprouvée sur des entrées fabriquées : c'est
 *    ce qui prouve que le test sait rougir dans les deux sens SANS créer de
 *    fausse route sous `app/` (une route bidon partirait en production) ;
 *  - le DISQUE réel n'est lu que pour appliquer cette logique éprouvée.
 */
describe('garde-fou (app)/ ↔ PROTECTED_APP_SEGMENTS (#318)', () => {
  const dir = (name: string): DirEntryLike => ({ name, isDirectory: () => true })
  const file = (name: string): DirEntryLike => ({ name, isDirectory: () => false })
  const REAL_LIKE = [
    dir('dashboard'),
    file('layout.tsx'),
    dir('products'),
    dir('settings'),
    dir('timeline'),
  ]
  const DECLARED = ['dashboard', 'products', 'settings', 'timeline']

  describe('logique pure (entrées fabriquées)', () => {
    it('est vert quand disque et constante coïncident', () => {
      expect(formatGuardReport(REAL_LIKE, DECLARED)).toBe(GUARD_IN_SYNC)
    })

    it('ROUGIT sur une route existante NON déclarée (le cas grave)', () => {
      const report = formatGuardReport([...REAL_LIKE, dir('billing')], DECLARED)

      expect(report).not.toBe(GUARD_IN_SYNC)
      expect(report).toContain('ABSENTES de PROTECTED_APP_SEGMENTS : billing')
      expect(report).toContain('servies aux visiteurs ANONYMES')
      expect(report).toContain(GUARD_FILE)
    })

    it('ROUGIT sur une constante orpheline (segment déclaré sans dossier)', () => {
      const report = formatGuardReport(REAL_LIKE, [...DECLARED, 'invoices'])

      expect(report).not.toBe(GUARD_IN_SYNC)
      expect(report).toContain('ABSENTS de frontend/app/[locale]/(app)/ : invoices')
      expect(report).toContain('PROTECTED_EXTRA_SEGMENTS')
    })

    it('signale les DEUX sens dans le même rapport', () => {
      const report = formatGuardReport(
        [...REAL_LIKE.filter((entry) => entry.name !== 'timeline'), dir('billing')],
        DECLARED,
      )

      expect(report).toContain('billing')
      expect(report).toContain('timeline')
    })

    it('ignore les fichiers frères (layout/error/loading/template/not-found)', () => {
      const entries = [
        dir('dashboard'),
        file('layout.tsx'),
        file('error.tsx'),
        file('loading.tsx'),
        file('template.tsx'),
        file('not-found.tsx'),
        file('page.tsx'),
      ]

      expect(scanRouteDirectories(entries).segments).toEqual(['dashboard'])
      expect(formatGuardReport(entries, ['dashboard'])).toBe(GUARD_IN_SYNC)
    })

    it('ignore dossiers privés `_x/` et routes parallèles `@slot/` (aucun segment d’URL)', () => {
      const scan = scanRouteDirectories([dir('dashboard'), dir('_components'), dir('@modal')])

      expect(scan.segments).toEqual(['dashboard'])
      expect(scan.ignored).toEqual(['_components', '@modal'])
      expect(scan.unsupported).toEqual([])
    })

    it('REFUSE de conclure sur un route group imbriqué ou un segment dynamique', () => {
      // Ni l'un ni l'autre n'est ignorable : `(billing)/` remonte ses enfants
      // d'un niveau d'URL, `[slug]/` matche n'importe quel premier segment.
      const report = formatGuardReport([...REAL_LIKE, dir('(marketing)'), dir('[slug]')], DECLARED)

      expect(report).not.toBe(GUARD_IN_SYNC)
      expect(report).toContain('non interprétables à la profondeur 1 : (marketing), [slug]')
      expect(report).toContain(GUARD_TEST_FILE)
    })

    it('ROUGIT sur une déclaration en casse mixte, même recopiée VERBATIM du disque', () => {
      // Le piège : `Billing/` sur le disque + `'Billing'` dans la constante. Les
      // deux coïncident au caractère près — mais `isProtectedPathname` cherche
      // `'billing'` dans une liste qui contient `'Billing'` et ne le trouve pas :
      // la route part en production SANS garde, avec un garde-fou au vert.
      const report = formatGuardReport([...REAL_LIKE, dir('Billing')], [...DECLARED, 'Billing'])

      expect(report).not.toBe(GUARD_IN_SYNC)
      expect(report).toContain('casse MIXTE : Billing')
      expect(report).toContain('ANONYMES')
      expect(report).toContain(GUARD_FILE)

      // Pourquoi un contrôle DÉDIÉ et pas la simple comparaison : normalisée, elle
      // ne voit plus rien ici. C'est ce trou que `findMiscasedDeclarations` bouche.
      expect(diffProtectedSegments(['Billing'], ['Billing'])).toEqual({
        undeclared: [],
        orphan: [],
      })
    })

    it('accepte un dossier disque en casse mixte déclaré en MINUSCULES (le cas correct)', () => {
      // `Billing/` sur le disque + `'billing'` déclaré : avant normalisation, ce
      // couple rougissait à tort (undeclared `Billing` + orphan `billing`) alors
      // que c'est la SEULE déclaration que la garde runtime honore.
      expect(formatGuardReport([...REAL_LIKE, dir('Billing')], [...DECLARED, 'billing'])).toBe(
        GUARD_IN_SYNC,
      )
      expect(diffProtectedSegments(['Billing'], ['billing'])).toEqual({
        undeclared: [],
        orphan: [],
      })

      // Preuve du mécanisme sur un segment RÉELLEMENT déclaré (pas de fausse route
      // dans `app/`) : la garde reconnaît l'URL quelle que soit sa casse.
      expect(isProtectedPathname('/fr/Settings')).toBe(true)
    })

    it('nomme le dossier avec sa casse RÉELLE dans le rapport (le dev doit le retrouver)', () => {
      const report = formatGuardReport([...REAL_LIKE, dir('Billing')], DECLARED)

      expect(report).toContain('ABSENTES de PROTECTED_APP_SEGMENTS : Billing')
      expect(report).not.toContain(': billing')
    })

    it('ne signale AUCUN faux positif sur un renommage bien propagé', () => {
      const renamed = REAL_LIKE.map((entry) =>
        entry.name === 'timeline' ? dir('frise') : entry,
      )

      expect(formatGuardReport(renamed, ['dashboard', 'products', 'settings', 'frise'])).toBe(
        GUARD_IN_SYNC,
      )
    })
  })

  describe('disque réel', () => {
    it('lit bien un répertoire contenant AUSSI des fichiers (le filtrage sert)', () => {
      // Si `(app)/` ne contenait que des dossiers, le filtre `isDirectory()` ne
      // serait jamais exercé sur le vrai disque : on l'ancre.
      const entries = readAppGroupEntries()

      expect(entries.some((entry) => !entry.isDirectory())).toBe(true)
      expect(entries.some((entry) => entry.isDirectory())).toBe(true)
    })

    it('ne voit PAS les sous-routes de profondeur 2 (vérifié, pas supposé)', () => {
      const scan = scanRouteDirectories(readAppGroupEntries())

      // `products/[productId]/` existe RÉELLEMENT — sans cette assertion, le
      // `not.toContain` ci-dessous serait vert pour la mauvaise raison.
      expect(
        readdirSync(join(APP_GROUP_DIR, 'products'), { withFileTypes: true }).some(
          (entry) => entry.isDirectory() && entry.name === '[productId]',
        ),
      ).toBe(true)
      expect(scan.segments).not.toContain('[productId]')
      expect(scan.unsupported).toEqual([])
    })

    it('résout son chemin sans dépendre du cwd', () => {
      // Chemin dérivé d'`import.meta.url` : indépendant du répertoire de lancement.
      expect(APP_GROUP_DIR.endsWith(join('frontend', 'app', '[locale]', '(app)'))).toBe(true)
      expect(() => readAppGroupEntries()).not.toThrow()
    })
  })

  describe('PROTECTED_EXTRA_SEGMENTS', () => {
    // Ce garde-fou ne couvre QUE `(app)/`. Un segment déclaré ici échappe donc à
    // toute vérification filesystem — d'où ces deux ancres.
    const extraSegments: readonly string[] = PROTECTED_EXTRA_SEGMENTS

    it('est VIDE (le trou refermé par #299 ne doit pas se rouvrir en silence)', () => {
      // Si ce test rougit : une route connectée a été déclarée hors du groupe
      // `(app)`. Vérifie qu'elle ne PEUT vraiment pas y vivre (motif à écrire
      // dans le JSDoc de la constante), puis remplace cette assertion par la
      // liste attendue — ne la supprime pas.
      expect(extraSegments).toEqual([])
    })

    it('ne duplique jamais un segment déjà couvert par le groupe (app)', () => {
      // No-op tant que la constante est vide ; devient le filet anti-déclaration
      // contradictoire (le cas exact de `settings` avant #299) dès qu'elle ne l'est plus.
      const appSegments = scanRouteDirectories(readAppGroupEntries()).segments

      for (const segment of extraSegments) {
        expect(appSegments, `${segment} est déclaré HORS (app) alors qu'il y vit`).not.toContain(
          segment,
        )
      }
      expect([...PROTECTED_SEGMENTS]).toEqual([...PROTECTED_APP_SEGMENTS, ...extraSegments])
    })
  })
})

describe('buildLoginPathname', () => {
  it.each([...SUPPORTED_LOCALES])('préfixe toujours la locale (%s)', (locale) => {
    expect(buildLoginPathname(locale)).toBe(`/${locale}/login`)
  })

  it('produit une cible NON protégée (pas de boucle de redirection)', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(isProtectedPathname(buildLoginPathname(locale))).toBe(false)
    }
  })
})
