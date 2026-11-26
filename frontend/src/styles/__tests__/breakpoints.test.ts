// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BREAKPOINTS_FILE,
  BREAKPOINT_EXPORT,
  balancedSpan,
  conditionParts,
  conditionStart,
  documentedConstants,
  insideNonMediaCssRule,
  loadThresholds,
  readThresholdsSource,
  scanHeightQueries,
  shadowedThresholds,
  stripComments,
  thresholdIdentifiers,
  thresholdReference,
  viewportMatcher,
} from '@/__tests__/support/mediaQuerySource'

/**
 * #643 — Les points de rupture de largeur sont des tokens du thème, les seuils de
 * hauteur des constantes nommées et commentées du module des seuils.
 *
 * Lecture de texte, sans compilation ni rendu : ces tests prouvent ce qui est
 * ÉCRIT dans les sources, rien sur le comportement en navigateur. Le contrat du
 * module `@/lib/breakpoints` est décrit dans `__tests__/support/mediaQuerySource.ts`.
 *
 * CHAÎNE DE PROVENANCE (largeur). T2 prouve que chaque `BREAKPOINT_<PALIER>_PX`
 * exporté égale le token `--breakpoint-<palier>` du thème. T3 n'admet dans une
 * requête de largeur TS qu'un seul de ces identifiants, seul ou décalé de 1, suivi
 * de `px`, dans un fichier qui ne le redéclare pas. Le seuil vient donc du thème, ou
 * T2 ou T3 rougit. Pour la hauteur (T8), une seule constante documentée, sans
 * décalage : une bascule stricte s'écrit dans le module.
 *
 * PÉRIMÈTRE DE T3 ET T8. « Composants » couvre ici aussi leurs feuilles de style et
 * les pages de `app/` : ce sont elles qui portent les requêtes média. Le balayage
 * lit tout `src/` et `app/` (ts, tsx, css, mjs), hors tests.
 *
 * CE QUE CE TEST NE VOIT PAS. C'est un découpage lexical, pas un parseur :
 *  - un littéral regex n'est pas reconnu : un `/` ou une apostrophe qu'il contient
 *    peut ouvrir une fausse chaîne ou un faux commentaire ;
 *  - dans le texte JSX, une apostrophe ouvre une fausse chaîne (close au saut de
 *    ligne) et peut masquer une requête sur le reste de la ligne ;
 *  - seul l'empan de la condition est lu : un post-traitement hors de l'empan
 *    (`.replace('768', '767')` sur la requête construite) passe inaperçu ;
 *  - les fichiers `.js`, `.jsx` et `.scss` ne sont pas balayés ;
 *  - un token `--container-*` est admis comme token de largeur (plafond de la
 *    landing), sans être compté comme seuil ;
 *  - un import écrit dans une chaîne ou un gabarit (`'import { H } from …'`) est lu
 *    comme un vrai import ;
 *  - T3 prouve qu'une requête de largeur lit un `BREAKPOINT_*_PX` du module, pas que
 *    sa valeur égale le thème : cette égalité est prouvée par T2 seulement.
 */

const FRONTEND = fileURLToPath(new URL('../../../', import.meta.url))
const GLOBALS = join(FRONTEND, 'src', 'styles', 'globals.css')
const TIMELINE_RESPONSIVE = join(
  FRONTEND,
  'src',
  'components',
  'timeline',
  'TimelineResponsive.tsx',
)
const DASHBOARD = join(FRONTEND, 'app', '[locale]', '(app)', 'dashboard', 'page.tsx')

/** Sources lues par T3 et T8, chemins relatifs au frontend. */
function sourceFiles(): Array<{ rel: string; raw: string }> {
  const SOURCE = /\.(ts|tsx|css|mjs)$/
  const TEST_FILE = /\.(test|spec)\.[tj]sx?$/
  const files: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        if (entry === '__tests__' || entry === 'node_modules') continue
        walk(full)
      } else if (SOURCE.test(entry) && !TEST_FILE.test(entry)) {
        files.push(full)
      }
    }
  }
  ;[join(FRONTEND, 'src'), join(FRONTEND, 'app')].forEach(walk)
  return files.map((full) => ({
    rel: relative(FRONTEND, full).split(sep).join('/'),
    raw: readFileSync(full, 'utf8'),
  }))
}

// Seul un token `--breakpoint-*` est un seuil de largeur. `--container-*` borne une
// largeur de contenu (plafond de la landing) : admis, mais hors anti-vacuité.
const BREAKPOINT_TOKEN = /--theme\(\s*--breakpoint-[\w-]+\s*\)/g
const CONTAINER_TOKEN = /--theme\(\s*--container-[\w-]+\s*\)/g
// Variante Tailwind arbitraire (`max-[360px]:`). `@min-[34px]` est un conteneur : hors sujet.
const ARBITRARY_VARIANT = /(?<![@\w-])(?:min|max)-\[[^\]]*\d[^\]]*\]/g

interface WidthScan {
  findings: string[]
  /** Requêtes de largeur fondées sur un token `--breakpoint-*`, en CSS et en TS. */
  tokenBased: { css: number; ts: number }
}

/**
 * Seuils de largeur ne venant pas d'un token. En CSS : `--theme(--breakpoint-*)` sans
 * autre nombre, seul compté comme seuil ; `--theme(--container-*)` est admis (plafond
 * de la landing) mais ne compte pas, un seul token par condition. En TS : un seul
 * `BREAKPOINT_<PALIER>_PX` du module des seuils par condition, seul ou décalé de 1
 * (`thresholdReference`), suivi de `px`, et jamais redéclaré dans le fichier.
 */
function scanWidthQueries(file: string, raw: string): WidthScan {
  const isCss = file.endsWith('.css')
  const code = stripComments(raw, { lineComments: !isCss })
  const lineOf = (index: number) => code.slice(0, index).split('\n').length
  const findings: string[] = []
  const tokenBased = { css: 0, ts: 0 }
  const report = (index: number, what: string) =>
    findings.push(`${file}:${lineOf(index)} ${what.replace(/\s+/g, ' ').slice(0, 80)}`)

  for (const m of code.matchAll(ARBITRARY_VARIANT)) report(m.index, m[0])

  const ids = isCss ? new Map<string, string>() : thresholdIdentifiers(file, code)
  // Les seuils de hauteur redéclarés sont rapportés par T8, ceux-ci par T3.
  for (const name of isCss ? [] : shadowedThresholds(file, code, ids)) {
    if (BREAKPOINT_EXPORT.test(ids.get(name)!))
      findings.push(`${file} ${name} redéclaré localement`)
    ids.delete(name)
  }

  for (const m of code.matchAll(conditionStart('width'))) {
    if (insideNonMediaCssRule(file, code, m.index)) continue
    const span = balancedSpan(code, m.index)
    if (isCss) {
      const bare = span.replace(BREAKPOINT_TOKEN, '').replace(CONTAINER_TOKEN, '')
      const breakpoints = span.match(BREAKPOINT_TOKEN)?.length ?? 0
      const containers = span.match(CONTAINER_TOKEN)?.length ?? 0
      if (breakpoints + containers !== 1 || /\d/.test(bare)) report(m.index, span)
      else if (breakpoints) tokenBased.css++
      continue
    }
    const { rest, exprs, unitless } = conditionParts(span)
    const ok =
      !/\d/.test(rest) &&
      !unitless &&
      exprs.length === 1 &&
      BREAKPOINT_EXPORT.test(thresholdReference(exprs[0], ids, { offset: true }) ?? '')
    if (ok) tokenBased.ts++
    else report(m.index, span)
  }
  return { findings, tokenBased }
}

/** Sondes de T3 : le détecteur signale les contournements connus et accepte l'écriture voulue. */
function assertWidthProbes() {
  const IMPORT = "import { BREAKPOINT_MD_PX } from '@/lib/breakpoints'\n"
  const flagged: Record<string, [string, string]> = {
    'interpolated number `${640}px`': ['x.tsx', 'const q = useMediaQuery(`(max-width: ${640}px)`)'],
    'local constant `const BP = 640` + `${BP}px`': [
      'x.tsx',
      'const BP = 640\nconst q = `(max-width: ${BP}px)`',
    ],
    'literal hidden in an interpolation `${BP * 0 + 1023}`': [
      'x.ts',
      "import { BREAKPOINT_MD_PX as BP } from '@/lib/breakpoints'\n" +
        'const q = `(max-width: ${BP * 0 + 1023}px)`',
    ],
    'offset other than 1': ['x.ts', IMPORT + 'const q = `(max-width: ${BREAKPOINT_MD_PX - 2}px)`'],
    'literal first, token second': [
      'x.ts',
      IMPORT + 'const q = `(max-width: ${1023 + 0 * BREAKPOINT_MD_PX}px)`',
    ],
    'digit glued after the token': [
      'x.ts',
      IMPORT + 'const q = `(min-width: ${BREAKPOINT_MD_PX}0px)`',
    ],
    'non-breakpoint export of the module': [
      'x.ts',
      "import { MINIMAP_HIDE_MAX_HEIGHT_PX } from '@/lib/breakpoints'\n" +
        'const q = `(max-width: ${MINIMAP_HIDE_MAX_HEIGHT_PX}px)`',
    ],
    'module: non-exported constant named like a token': [
      BREAKPOINTS_FILE,
      'const BREAKPOINT_MD_PX = 1023\nexport const Q = `(max-width: ${BREAKPOINT_MD_PX}px)`',
    ],
    'concatenation with a number': ['x.ts', "const q = '(max-width: ' + 640 + 'px)'"],
    'concatenation with a local constant': [
      'x.ts',
      "const BP = 640\nconst q = '(max-width: ' + BP + 'px)'",
    ],
    'bare literal': ['x.ts', "useMediaQuery('(min-width: 1024px)')"],
    'bare rem literal in range syntax': ['x.ts', "useMediaQuery('(width >= 64rem)')"],
    'identifier imported from another module': [
      'x.ts',
      "import { BREAKPOINT_MD_PX } from './other'\nconst q = `(min-width: ${BREAKPOINT_MD_PX}px)`",
    ],
    'arbitrary class max-[360px]': ['x.tsx', 'const c = "gap-2 max-[360px]:gap-1"'],
    'css literal px': ['x.css', '@media (min-width:1024px){ .a{color:red} }'],
    'css literal rem': ['x.css', '@media (min-width: 64rem) { .a{color:red} }'],
    'css range with a number': ['x.css', '@media (width >= 640px) { .a{color:red} }'],
    'css token plus a number': [
      'x.css',
      '@media (width >= calc(--theme(--breakpoint-md) - 1px)) { .a{color:red} }',
    ],
    'violation after an `image/*` string': [
      'x.tsx',
      '<input accept="image/*" />\nconst q = "(max-width: 767px)"',
    ],
    '`@container` class next to an arbitrary media variant': [
      'x.tsx',
      'const c = "@container [@media(max-width:767px)]:hidden"',
    ],
    'local constant shadowing the import': [
      'x.ts',
      IMPORT +
        'function f() {\n  const BREAKPOINT_MD_PX = 1023\n' +
        '  return `(max-width: ${BREAKPOINT_MD_PX}px)`\n}',
    ],
    'parameter shadowing the import': [
      'x.ts',
      IMPORT + 'const f = (BREAKPOINT_MD_PX: number) => `(max-width: ${BREAKPOINT_MD_PX}px)`',
    ],
    'destructuring shadowing the import': [
      'x.ts',
      IMPORT +
        'function f(o: { BREAKPOINT_MD_PX: number }) {\n  const { BREAKPOINT_MD_PX } = o\n' +
        '  return `(max-width: ${BREAKPOINT_MD_PX}px)`\n}',
    ],
    'upper case bare literal': ['x.ts', "useMediaQuery('(MAX-WIDTH: 767px)')"],
    'upper case range syntax': ['x.ts', "useMediaQuery('(WIDTH >= 640px)')"],
    'token followed by rem': ['x.ts', IMPORT + 'const q = `(min-width: ${BREAKPOINT_MD_PX}rem)`'],
    'token concatenated with em': [
      'x.ts',
      IMPORT + "const q = '(min-width: ' + BREAKPOINT_MD_PX + 'em)'",
    ],
    'css upper case literal': ['x.css', '@media (MIN-WIDTH: 1024px) { .a{color:red} }'],
    'reversed range, interpolated number': ['x.ts', 'const q = `(${767}px >= width)`'],
    'reversed range, local constant': ['x.ts', 'const BP = 767\nconst q = `(${BP}px < width)`'],
    'reversed range, concatenated number': ['x.ts', "const q = '(' + 767 + 'px >= width)'"],
    'max-device-width literal': ['x.ts', "useMediaQuery('(max-device-width: 767px)')"],
    'min-device-width literal': ['x.ts', "useMediaQuery('(min-device-width: 768px)')"],
    'css max-device-width literal': ['x.css', '@media (max-device-width: 767px) { .a{color:red} }'],
    'calc() combining two tokens': [
      'x.ts',
      "import { BREAKPOINT_MD_PX as MD, BREAKPOINT_SM_PX as SM } from '@/lib/breakpoints'\n" +
        'const q = `(max-width: calc(${MD}px - ${SM}px))`',
    ],
    'css calc() combining two tokens': [
      'x.css',
      '@media (max-width: calc(--theme(--breakpoint-md) - --theme(--breakpoint-sm))) { .a{color:red} }',
    ],
    'class method parameter shadowing the import': [
      'x.ts',
      IMPORT +
        'class A {\n  q(BREAKPOINT_MD_PX: number) {\n' +
        '    return `(max-width: ${BREAKPOINT_MD_PX}px)`\n  }\n}',
    ],
    'object method parameter shadowing the import': [
      'x.ts',
      IMPORT +
        'const o = {\n  q(BREAKPOINT_MD_PX = 1023) {\n' +
        '    return `(max-width: ${BREAKPOINT_MD_PX}px)`\n  },\n}',
    ],
  }
  for (const [label, [file, source]] of Object.entries(flagged)) {
    const scan = scanWidthQueries(file, source)
    expect(scan.findings.length, `sonde négative : ${label}`).toBeGreaterThan(0)
  }

  const accepted: Record<string, [string, string, 'css' | 'ts' | null]> = {
    'imported token': ['x.ts', IMPORT + 'const q = `(min-width: ${BREAKPOINT_MD_PX}px)`', 'ts'],
    'imported token minus 1': [
      'x.ts',
      IMPORT + 'const q = `(max-width: ${BREAKPOINT_MD_PX - 1}px)`',
      'ts',
    ],
    'aliased token plus 1, range syntax': [
      'x.ts',
      "import { BREAKPOINT_SM_PX as SM } from '@/lib/breakpoints'\n" +
        'const q = `(width >= ${SM + 1}px)`',
      'ts',
    ],
    'imported token concatenated': [
      'x.ts',
      IMPORT + "const q = '(min-width: ' + BREAKPOINT_MD_PX + 'px)'",
      'ts',
    ],
    'module: exported token constant': [
      BREAKPOINTS_FILE,
      'export const BREAKPOINT_LG_PX = 1024\nexport const Q = `(min-width: ${BREAKPOINT_LG_PX}px)`',
      'ts',
    ],
    'css theme token': [
      'x.css',
      '@media (width >= --theme(--breakpoint-lg)) { .a{color:red} }',
      'css',
    ],
    'css theme token, min-width form': [
      'x.css',
      '@media (min-width: --theme(--breakpoint-md)) { .a{color:red} }',
      'css',
    ],
    'named breakpoint variant': ['x.tsx', 'const c = "gap-2 max-xs:gap-1 md:gap-4"', null],
    'height query': [
      'x.ts',
      "useMediaQuery('(orientation: landscape) and (max-height: 600px)')",
      null,
    ],
    'width inside a comment': [
      'x.ts',
      '/* (min-width: 640px) */\n// (max-width: 767px)\nconst a = 1',
      null,
    ],
    'object key homonym of the token': [
      'x.ts',
      IMPORT + 'const o = { BREAKPOINT_MD_PX: 1 }\nconst q = `(min-width: ${BREAKPOINT_MD_PX}px)`',
      'ts',
    ],
    'upper case query on an imported token': [
      'x.ts',
      IMPORT + 'const q = `(MIN-WIDTH: ${BREAKPOINT_MD_PX}PX)`',
      'ts',
    ],
    'css container token (landing cap), not counted': [
      'x.css',
      '@media (width >= --theme(--container-landing)) { .a{color:red} }',
      null,
    ],
    'container query': ['x.css', '@container (max-width:700px){ .a{color:red} }', null],
    'container class': ['x.tsx', 'const c = "@min-[34px]:px-2"', null],
    'reversed range on an imported token': [
      'x.ts',
      IMPORT + 'const q = `(${BREAKPOINT_MD_PX}px <= width)`',
      'ts',
    ],
    'max-device-width on an imported token': [
      'x.ts',
      IMPORT + 'const q = `(max-device-width: ${BREAKPOINT_MD_PX - 1}px)`',
      'ts',
    ],
    'comparison with the token is not a shadowing': [
      'x.ts',
      IMPORT +
        'function f(x: number) {\n  if (x === BREAKPOINT_MD_PX) {\n    return 1\n  }\n}\n' +
        'const q = `(min-width: ${BREAKPOINT_MD_PX}px)`',
      'ts',
    ],
  }
  for (const [label, [file, source, counted]] of Object.entries(accepted)) {
    const scan = scanWidthQueries(file, source)
    expect(scan.findings, `sonde positive : ${label}`).toEqual([])
    // Une requête de largeur acceptée compte pour l'anti-vacuité, le reste non.
    expect(scan.tokenBased, `sonde anti-vacuité : ${label}`).toEqual({
      css: counted === 'css' ? 1 : 0,
      ts: counted === 'ts' ? 1 : 0,
    })
  }
}

/** Sondes de T8 : mêmes exigences, sur les conditions de hauteur. */
function assertHeightProbes() {
  const DOCUMENTED = new Set(['MOBILE_LANDSCAPE_MAX_HEIGHT_PX'])
  const IMPORT = "import { MOBILE_LANDSCAPE_MAX_HEIGHT_PX as H } from '@/lib/breakpoints'\n"
  const flagged: Record<string, [string, string]> = {
    'bare max-height': [
      'x.tsx',
      "useMediaQuery('(orientation: landscape) and (max-height: 500px)')",
    ],
    'bare range syntax': ['x.ts', "useMediaQuery('(height <= 500px)')"],
    'bare reversed range': ['x.ts', "useMediaQuery('(500px >= height)')"],
    'interpolated number': ['x.ts', 'const q = `(max-height: ${500}px)`'],
    'local constant': ['x.ts', 'const H = 500\nconst q = `(max-height: ${H}px)`'],
    'literal hidden in an interpolation `${H * 0 + 499}`': [
      'x.ts',
      IMPORT + 'const q = `(max-height: ${H * 0 + 499}px)`',
    ],
    'undocumented constant of the module': [
      'x.ts',
      "import { UNDOCUMENTED_PX } from '@/lib/breakpoints'\n" +
        'const q = `(max-height: ${UNDOCUMENTED_PX}px)`',
    ],
    'identifier imported from another module': [
      'x.ts',
      "import { MOBILE_LANDSCAPE_MAX_HEIGHT_PX } from './other'\n" +
        'const q = `(max-height: ${MOBILE_LANDSCAPE_MAX_HEIGHT_PX}px)`',
    ],
    'digit glued after the constant': ['x.ts', IMPORT + 'const q = `(max-height: ${H}0px)`'],
    'concatenation with a number': ['x.ts', "const q = '(max-height: ' + 500 + 'px)'"],
    'arbitrary media variant': ['x.tsx', 'const c = "[@media(max-height:500px)]:hidden"'],
    '`@container` class next to an arbitrary media variant': [
      'x.tsx',
      'const c = "@container [@media(max-height:500px)]:hidden"',
    ],
    'local constant shadowing the import': [
      'x.ts',
      IMPORT + 'function f() {\n  const H = 499\n  return `(max-height: ${H}px)`\n}',
    ],
    'parameter shadowing the import': [
      'x.ts',
      IMPORT + 'const f = (H = 499) => `(max-height: ${H}px)`',
    ],
    'upper case bare literal': ['x.ts', "useMediaQuery('(MAX-HEIGHT: 500px)')"],
    'upper case range syntax': ['x.ts', "useMediaQuery('(HEIGHT <= 500px)')"],
    'constant followed by em': ['x.ts', IMPORT + 'const q = `(max-height: ${H}em)`'],
    'constant concatenated without unit': ['x.ts', IMPORT + "const q = '(max-height: ' + H + ')'"],
    'css media query': ['x.css', '@media (max-height: 400px) { .a{color:red} }'],
    'reversed range, interpolated number': ['x.ts', 'const q = `(${500}px >= height)`'],
    'reversed range, concatenated number': ['x.ts', "const q = '(' + 500 + 'px >= height)'"],
    'max-device-height literal': ['x.ts', "useMediaQuery('(max-device-height: 500px)')"],
    'min-device-height literal': ['x.ts', "useMediaQuery('(min-device-height: 400px)')"],
    'css max-device-height literal': [
      'x.css',
      '@media (max-device-height: 500px) { .a{color:red} }',
    ],
    'calc() combining two constants': [
      'x.ts',
      IMPORT + 'const q = `(max-height: calc(${H}px + ${H}px))`',
    ],
    'constant minus 1': ['x.ts', IMPORT + 'const q = `(height < ${H - 1}px)`'],
    'constant plus 1': ['x.ts', IMPORT + 'const q = `(max-height: ${H + 1}px)`'],
    'class method parameter shadowing the import': [
      'x.ts',
      IMPORT + 'class A {\n  q(H: number) {\n    return `(max-height: ${H}px)`\n  }\n}',
    ],
    'object method parameter shadowing the import': [
      'x.ts',
      IMPORT + 'const o = {\n  q(H = 499) {\n    return `(max-height: ${H}px)`\n  },\n}',
    ],
  }
  for (const [label, [file, source]] of Object.entries(flagged)) {
    const scan = scanHeightQueries(file, source, DOCUMENTED)
    expect(scan.findings.length, `sonde négative : ${label}`).toBeGreaterThan(0)
  }

  const accepted: Record<string, [string, string, number]> = {
    'documented constant, max-height': [
      'x.ts',
      IMPORT + 'const q = `(orientation: landscape) and (max-height: ${H}px)`',
      1,
    ],
    'documented constant, range syntax': ['x.ts', IMPORT + 'const q = `(height <= ${H}px)`', 1],
    'reversed range on a documented constant': [
      'x.ts',
      IMPORT + 'const q = `(${H}px >= height)`',
      1,
    ],
    'max-device-height on a documented constant': [
      'x.ts',
      IMPORT + 'const q = `(max-device-height: ${H}px)`',
      1,
    ],
    'module: query built from its documented constant': [
      BREAKPOINTS_FILE,
      '/** Doc. */\nexport const MOBILE_LANDSCAPE_MAX_HEIGHT_PX = 600\n' +
        'export const Q = `(max-height: ${MOBILE_LANDSCAPE_MAX_HEIGHT_PX}px)`',
      1,
    ],
    'upper case query on a documented constant': [
      'x.ts',
      IMPORT + 'const q = `(MAX-HEIGHT: ${H}px)`',
      1,
    ],
    'object key homonym of the constant': [
      'x.ts',
      IMPORT + 'const o = { H: 1 }\nconst q = `(max-height: ${H}px)`',
      1,
    ],
    'width query': ['x.ts', "useMediaQuery('(max-width: 767px)')", 0],
    'height inside a comment': ['x.ts', '// (max-height: 500px)\nconst a = 1', 0],
    'css property, not a query': ['x.css', '.a{min-height:44px;max-height:calc(100% - 8px)}', 0],
    'container query': ['x.css', '@container (max-height:300px){ .a{color:red} }', 0],
  }
  for (const [label, [file, source, count]] of Object.entries(accepted)) {
    const scan = scanHeightQueries(file, source, DOCUMENTED)
    expect(scan.findings, `sonde positive : ${label}`).toEqual([])
    expect(scan.constants.length, `sonde anti-vacuité : ${label}`).toBe(count)
  }

  // Seule une constante documentée du module compte.
  const sample =
    '/** Seuil documenté. */\nexport const DOC_PX = 500\n\nexport const BARE_PX = 400\n' +
    '// eslint-disable-next-line no-magic-numbers\nexport const LINTED_PX = 300\n'
  expect(documentedConstants(sample), 'sonde : constantes documentées').toEqual(new Set(['DOC_PX']))
}

/**
 * Requêtes passées à `useMediaQuery` / `matchMedia` dans un fichier, interpolations
 * résolues avec les valeurs du module des seuils. Une requête irrésolue reste telle
 * quelle et ne correspond à aucun écran.
 */
function resolvedMediaQueries(file: string, raw: string, mod: Record<string, unknown>): string[] {
  const code = stripComments(raw, { lineComments: true })
  const ids = thresholdIdentifiers(file, code)
  const valueOf = (expr: string): unknown => {
    const m = /^\s*([A-Za-z_$][\w$]*)\s*(?:([+-])\s*1\s*)?$/.exec(expr)
    const value = m && ids.has(m[1]) ? mod[ids.get(m[1])!] : expr
    if (typeof value !== 'number') return value
    return value + (m![2] === '-' ? -1 : m![2] === '+' ? 1 : 0)
  }
  const queries: string[] = []
  for (const m of code.matchAll(/\b(?:useMediaQuery|matchMedia)(?=\()/g)) {
    const arg = balancedSpan(code, m.index + m[0].length, true)
      .slice(1, -1)
      .trim()
    const literal = /^(['"`])([\s\S]*)\1$/.exec(arg)
    queries.push(
      literal
        ? literal[2].replace(/\$\{([^}]*)\}/g, (_x, e: string) => String(valueOf(e)))
        : String(valueOf(arg)),
    )
  }
  return queries
}

/** Contenu des blocs `@theme` (avec ou sans `inline`) d'une feuille déjà sans commentaires. */
function themeBlocks(css: string): string[] {
  return [...css.matchAll(/@theme[^{]*\{([^}]*)\}/g)].map((m) => m[1])
}

/** `640px` → 640, `40rem` → 640 (16 px par rem) ; `null` hors de ces unités. */
function pxOf(value: string | undefined): number | null {
  const m = /^([\d.]+)(px|rem)$/.exec(value ?? '')
  return m ? Number(m[1]) * (m[2] === 'px' ? 1 : 16) : null
}

describe('#643 — points de rupture de largeur', () => {
  it('declares sm, md and lg breakpoint tokens once in the theme', async () => {
    const css = stripComments(readFileSync(GLOBALS, 'utf8'), { lineComments: false })
    const expected = { sm: '640px', md: '768px', lg: '1024px' } as const

    for (const [name, value] of Object.entries(expected)) {
      const declaration = new RegExp(`--breakpoint-${name}\\s*:\\s*([^;]+);`, 'g')
      // Une seule déclaration dans TOUTE la feuille, et elle vit dans un `@theme`.
      const everywhere = [...css.matchAll(declaration)].map((m) => m[1].trim())
      const inTheme = themeBlocks(css).flatMap((block) =>
        [...block.matchAll(declaration)].map((m) => m[1].trim()),
      )
      expect.soft(everywhere, `--breakpoint-${name} déclaré dans la feuille`).toEqual([value])
      expect.soft(inTheme, `--breakpoint-${name} déclaré dans un @theme`).toEqual([value])
    }

    // Provenance : le module JS des seuils reprend exactement les tokens du thème,
    // `xs` compris s'il est exporté. C'est ce lien qui rend T3 probant.
    const tokens = new Map(
      themeBlocks(css).flatMap((block) =>
        [...block.matchAll(/--breakpoint-([\w-]+)\s*:\s*([^;]+);/g)].map(
          (m) => [m[1], m[2].trim()] as const,
        ),
      ),
    )
    const mod = await loadThresholds()
    expect.soft(mod, 'module @/lib/breakpoints chargé').not.toBeNull()
    const exported = Object.entries(mod ?? {}).filter(([key]) => BREAKPOINT_EXPORT.test(key))
    for (const name of ['SM', 'MD', 'LG']) {
      expect
        .soft(
          exported.map(([key]) => key),
          `BREAKPOINT_${name}_PX exporté`,
        )
        .toContain(`BREAKPOINT_${name}_PX`)
    }
    for (const [key, value] of exported) {
      const token = BREAKPOINT_EXPORT.exec(key)![1].toLowerCase()
      expect
        .soft(value, `${key} égal au token --breakpoint-${token}`)
        .toBe(pxOf(tokens.get(token)) ?? `--breakpoint-${token} absent du thème`)
    }
  })

  it('no component hardcodes a width media query value', () => {
    // Le détecteur d'abord : un balayage dont les sondes échouent ne prouve rien.
    assertWidthProbes()

    const files = sourceFiles()
    const findings: string[] = []
    const tokenBased = { css: 0, ts: 0 }
    for (const { rel, raw } of files) {
      const scan = scanWidthQueries(rel, raw)
      findings.push(...scan.findings)
      tokenBased.css += scan.tokenBased.css
      tokenBased.ts += scan.tokenBased.ts
    }

    expect(files.length, 'fichiers source lus').toBeGreaterThan(100)
    expect.soft(findings, 'seuils de largeur ne venant pas d’un token').toEqual([])
    // Anti-vacuité : des requêtes de LARGEUR fondées sur un token, côté CSS et côté
    // TS (les deux chemins du détecteur), sinon le vert ne prouverait rien.
    expect.soft(tokenBased.css, 'requêtes de largeur CSS fondées sur un token').toBeGreaterThan(0)
    expect.soft(tokenBased.ts, 'requêtes de largeur TS fondées sur un token').toBeGreaterThan(0)
  })

  it('responsive timeline no longer claims ad hoc breakpoints', () => {
    const source = readFileSync(TIMELINE_RESPONSIVE, 'utf8')
    // Documentation de tête : tout ce qui précède l'interface des props.
    const head = source.slice(0, source.indexOf('export interface TimelineResponsiveProps'))
    expect(head.length).toBeGreaterThan(0)
    expect(head).not.toMatch(/ad[\s-]?hoc/i)
  })
})

describe('#643 — seuils de hauteur', () => {
  it('no height media query value is hardcoded anywhere in the app', async () => {
    assertHeightProbes()

    const documented = documentedConstants(readThresholdsSource())
    const files = sourceFiles()
    const findings: string[] = []
    const constants: string[] = []
    for (const { rel, raw } of files) {
      const scan = scanHeightQueries(rel, raw, documented)
      findings.push(...scan.findings)
      constants.push(...scan.constants)
    }

    expect(files.length, 'fichiers source lus').toBeGreaterThan(100)
    expect
      .soft(findings, 'seuils de hauteur ne venant pas d’une constante documentée du module')
      .toEqual([])
    expect
      .soft(constants.length, 'requêtes de hauteur fondées sur une constante documentée')
      .toBeGreaterThan(0)

    // Tableau de bord en paysage : le seuil reste 500 px de haut, inclus.
    const mod = (await loadThresholds()) ?? {}
    const dashboard = relative(FRONTEND, DASHBOARD).split(sep).join('/')
    const heightQueries = resolvedMediaQueries(
      dashboard,
      readFileSync(DASHBOARD, 'utf8'),
      mod,
    ).filter((q) => /height/i.test(q))
    expect.soft(heightQueries.length, 'requête de hauteur du tableau de bord').toBeGreaterThan(0)
    for (const query of heightQueries) {
      expect
        .soft(viewportMatcher({ width: 844, height: 500 })(query), `${query} à 500 px`)
        .toBe(true)
      expect
        .soft(viewportMatcher({ width: 844, height: 501 })(query), `${query} à 501 px`)
        .toBe(false)
    }
  })
})
