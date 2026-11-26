/**
 * #643 — Lecture lexicale des requêtes média dans les sources, partagée par les
 * tests des seuils (`styles/__tests__/breakpoints.test.ts`, T2, T3, T8) et de la
 * frise (`TimelineResponsive.rotation.test.tsx`, T4).
 *
 * CONTRAT LU ICI. `src/lib/breakpoints.ts` (importé par `@/lib/breakpoints`) est le
 * module des seuils :
 *  - largeur : `export const BREAKPOINT_<PALIER>_PX = <nombre>`, chacun égal au token
 *    `--breakpoint-<palier>` du thème (vérifié par T2) ;
 *  - hauteur : `export const <NOM> = <nombre>`, précédé d'un commentaire de
 *    documentation (`/** … *\/` ou `//` non vide, collé à la déclaration).
 * Une condition de seuil porte UNE seule référence à ce module, suivie de `px` : un
 * identifiant de largeur seul ou décalé de 1 (`${BREAKPOINT_MD_PX - 1}`), une
 * constante de hauteur sans décalage. Aucun autre nombre, littéral ou calculé, ni
 * autre unité, ni `calc()` qui combine deux références. Un fichier qui redéclare un
 * seuil importé est refusé. Les conditions se repèrent sans tenir compte de la casse
 * (`MAX-HEIGHT`), `device-` compris (`max-device-width`).
 *
 * LIMITES. Découpage lexical, pas un parseur : voir « Ce que ce test ne voit pas » en
 * tête de `breakpoints.test.ts`.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const BREAKPOINTS_FILE = 'src/lib/breakpoints.ts'
export const BREAKPOINT_EXPORT = /^BREAKPOINT_([A-Z0-9]+)_PX$/

// Vitest tourne depuis `frontend/`. Sous jsdom, `import.meta.url` n'est pas une URL `file:`.
const MODULE_PATH = join(process.cwd(), ...BREAKPOINTS_FILE.split('/'))

/** Source du module des seuils, vide s'il n'existe pas encore. */
export const readThresholdsSource = (): string =>
  existsSync(MODULE_PATH) ? readFileSync(MODULE_PATH, 'utf8') : ''

/**
 * Module des seuils chargé à l'exécution, ou `null` s'il n'existe pas. Chemin
 * calculé : un `import('@/lib/breakpoints')` littéral est résolu à la transformation
 * et ferait échouer tout le fichier de test, cas existants compris.
 */
export async function loadThresholds(): Promise<Record<string, unknown> | null> {
  if (!existsSync(MODULE_PATH)) return null
  return (await import(/* @vite-ignore */ MODULE_PATH)) as Record<string, unknown>
}

/**
 * Retire les commentaires en gardant les retours à la ligne (numéros de ligne
 * fidèles). Sûr vis-à-vis des chaînes `'…'`, `"…"` et des gabarits `${…}` imbriqués.
 * `//` n'est un commentaire que précédé d'un blanc (épargne `https://`) et jamais en
 * CSS. Ne connaît ni les littéraux regex ni le texte JSX (une apostrophe y ouvre une
 * fausse chaîne, close au saut de ligne).
 */
export function stripComments(text: string, { lineComments }: { lineComments: boolean }): string {
  type Mode = 'code' | 'sq' | 'dq' | 'tpl'
  let out = ''
  let mode: Mode = 'code'
  const braces: number[] = [] // profondeur d'accolades de chaque `${` ouvert
  let i = 0
  while (i < text.length) {
    const c = text[i]
    const d = text[i + 1]
    if (mode === 'code') {
      if (c === '/' && d === '*') {
        const close = text.indexOf('*/', i + 2)
        const end = close < 0 ? text.length : close + 2
        out += text.slice(i, end).replace(/[^\n]/g, '')
        i = end
        continue
      }
      if (lineComments && c === '/' && d === '/' && (i === 0 || /\s/.test(text[i - 1]))) {
        while (i < text.length && text[i] !== '\n') i++
        continue
      }
      if (c === "'") mode = 'sq'
      else if (c === '"') mode = 'dq'
      else if (c === '`') mode = 'tpl'
      else if (c === '{' && braces.length) braces[braces.length - 1]++
      else if (c === '}' && braces.length && --braces[braces.length - 1] === 0) {
        braces.pop()
        mode = 'tpl'
      }
      out += c
      i++
    } else if (mode === 'tpl') {
      if (c === '\\') {
        out += c + (d ?? '')
        i += 2
        continue
      }
      if (c === '$' && d === '{') {
        out += '${'
        braces.push(1)
        mode = 'code'
        i += 2
        continue
      }
      if (c === '`') mode = 'code'
      out += c
      i++
    } else {
      if (c === '\\') {
        out += c + (d ?? '')
        i += 2
        continue
      }
      if (c === '\n' || c === (mode === 'sq' ? "'" : '"')) mode = 'code'
      out += c
      i++
    }
  }
  return out
}

/**
 * Du `(` d'index `start` à son `)` fermant. Par défaut s'arrête à la fin de la ligne
 * (une condition média tient sur une ligne) ; `multiline` pour un appel de fonction.
 */
export function balancedSpan(text: string, start: number, multiline = false): string {
  let depth = 0
  for (let i = start; i < text.length; i++) {
    if (text[i] === '(') depth++
    else if (text[i] === ')' && --depth === 0) return text.slice(start, i + 1)
    else if (text[i] === '\n' && !multiline) break
  }
  const eol = text.indexOf('\n', start)
  return text.slice(start, eol < 0 ? text.length : eol)
}

const isBreakpointsModule = (file: string) => file.replace(/\\/g, '/').endsWith(BREAKPOINTS_FILE)

/**
 * Identifiants d'un fichier qui désignent une valeur du module des seuils :
 * nom local → nom exporté. Ce sont les imports de `@/lib/breakpoints` (alias
 * compris) et, dans le module lui-même, ses `export const`.
 */
export function thresholdIdentifiers(file: string, code: string): Map<string, string> {
  const names = new Map<string, string>()
  const imports = /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*['"]@\/lib\/breakpoints['"]/g
  for (const m of code.matchAll(imports)) {
    for (const part of m[1].split(',')) {
      const [exported, local = exported] = part.trim().split(/\s+as\s+/)
      if (exported) names.set(local, exported)
    }
  }
  if (isBreakpointsModule(file)) {
    for (const m of code.matchAll(/^export\s+const\s+([A-Za-z_$][\w$]*)/gm)) names.set(m[1], m[1])
  }
  return names
}

/**
 * Noms de `ids` redéclarés dans le fichier : `const`, `let`, `var`, `function`,
 * paramètre (fonction, méthode, flèche, `catch`) ou destructuration. Un tel homonyme masque le
 * seuil importé dans sa portée : le fichier est refusé, sans analyse de portée. Dans
 * le module des seuils, sa propre `export const` n'est pas une redéclaration.
 */
export function shadowedThresholds(file: string, code: string, ids: Map<string, string>): string[] {
  const own = isBreakpointsModule(file)
  return [...ids.keys()].filter((name) => {
    const n = name.replace(/\$/g, '\\$')
    const id = `(?<![\\w$.])(?<!=\\s*)${n}\\b`
    const declarations = code.match(
      new RegExp(`\\b(?:const|let|var|function|class)\\s+${n}\\b`, 'g'),
    )
    if ((declarations?.length ?? 0) > (own ? 1 : 0)) return true
    return [
      // Destructuration : `const { H } = …`, `const { a: H } = …`, `const [H] = …`.
      `\\b(?:const|let|var)\\s*[{[][^=;]*?${id}(?!\\s*:)[^=;]*?[}\\]]\\s*=`,
      // Paramètres : `function f(H)`, `(H) =>`, `({ H }) =>`, `H =>`, `catch (H)`.
      `\\bfunction\\b[^(]*\\([^)]*?${id}`,
      // Méthode de classe ou d'objet : `q(H: number) {`, `{ q(H = 499) {`. Les mots-clés
      // suivis d'une parenthèse (`if (x === H) {`) n'en sont pas.
      `(?<![\\w$])(?!(?:if|for|while|switch|catch|with|return|typeof|await|function)\\b)` +
        `[A-Za-z_$][\\w$]*\\s*(?:<[^>]*>)?\\([^()]*?${id}[^()]*\\)\\s*(?::[^{=;]*?)?\\{`,
      `\\([^()]*?${id}[^()]*\\)\\s*(?::[^=]*?)?=>`,
      `${id}\\s*=>`,
      `\\bcatch\\s*\\(\\s*${n}\\b`,
    ].some((pattern) => new RegExp(pattern).test(code))
  })
}

/** Ligne de directive outil : ne documente rien, mais ne décolle pas le commentaire. */
const DIRECTIVE_LINE =
  /^\s*(?:\/\/\s*(?:eslint|@?ts-|prettier)|\/\*\s*(?:eslint|@?ts-|prettier)[^\n]*\*\/\s*$)/
const DIRECTIVE_TEXT = /^(?:eslint|@?ts-|prettier)/

const meaningful = (text: string): string | null => {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean && !DIRECTIVE_TEXT.test(clean) && /[\p{L}\p{N}]/u.test(clean) ? clean : null
}

/**
 * Texte du commentaire de documentation collé à `const <name>` (déclaration en début
 * de ligne), ou `null`. Admis : un bloc `/** … *\/` qui ouvre et ferme sur ses
 * propres lignes, ou des lignes `//` non vides. Les directives `eslint`, `ts-` et
 * `prettier` ne comptent pas comme documentation. Une ligne vide décolle.
 */
export function docCommentOf(source: string, name: string): string | null {
  const lines = source.split(/\r?\n/)
  const at = lines.findIndex((l) => new RegExp(`^(?:export\\s+)?const\\s+${name}\\b`).test(l))
  if (at < 0) return null
  let k = at - 1
  while (k >= 0 && DIRECTIVE_LINE.test(lines[k])) k--
  if (k < 0) return null

  if (lines[k].trim().startsWith('//')) {
    const texts: string[] = []
    for (; k >= 0 && lines[k].trim().startsWith('//'); k--) {
      if (!DIRECTIVE_LINE.test(lines[k])) texts.unshift(lines[k].trim().replace(/^\/\/+/, ''))
    }
    return meaningful(texts.join(' '))
  }

  if (!lines[k].trim().endsWith('*/')) return null
  let start = k
  while (start >= 0 && !lines[start].trim().startsWith('/**')) start--
  if (start < 0) return null
  const block = lines
    .slice(start, k + 1)
    .join('\n')
    .trim()
  // Un seul bloc, de `/**` à `*/` : une ligne de code qui finit par `*/` n'en est pas un.
  const doc = /^\/\*\*((?:(?!\*\/)[\s\S])*)\*\/$/.exec(block)
  return doc ? meaningful(doc[1].replace(/^\s*\*+/gm, '')) : null
}

/** `export const` numériques du module des seuils, documentés par un commentaire. */
export function documentedConstants(moduleSource: string): Set<string> {
  const names = new Set<string>()
  const decl = /^export\s+const\s+([A-Za-z_$][\w$]*)\s*(?::\s*number\s*)?=\s*\d[\d_.]*\s*;?\s*$/gm
  for (const m of moduleSource.matchAll(decl)) {
    if (docCommentOf(moduleSource, m[1])) names.add(m[1])
  }
  return names
}

/**
 * Sépare une condition TS en texte fixe et expressions : interpolations `${…}` et
 * termes concaténés (`'(max-width: ' + X + 'px)'`). `unitless` : une expression n'est
 * pas suivie de `px` (`${H}em`, `${BP}rem`, concaténation finale sans unité).
 */
export function conditionParts(span: string): { rest: string; exprs: string[]; unitless: boolean } {
  const exprs: string[] = []
  let unitless = false
  let rest = span.replace(/\$\{([^}]*)\}(px)?/gi, (_m, e: string, unit?: string) => {
    exprs.push(e)
    if (!unit) unitless = true
    return unit ?? ''
  })
  rest = rest.replace(
    /(['"`])\s*\+\s*([^'"`]*?)\s*\+\s*(?=['"`](px)?)/gi,
    (_m, q: string, e: string, unit?: string) => {
      exprs.push(e)
      if (!unit) unitless = true
      return q
    },
  )
  rest = rest.replace(/(['"`])\s*\+\s*([^'"`)]*)(?=\)?$)/, (_m, q: string, e: string) => {
    exprs.push(e)
    unitless = true
    return q
  })
  return { rest, exprs, unitless }
}

/**
 * Nom exporté désigné par une expression interpolée, ou `null`. Seule forme admise :
 * un identifiant du module des seuils, suivi de `- 1` ou `+ 1` si `offset` (largeur
 * seulement : un seuil de hauteur n'a pas de décalage).
 */
export function thresholdReference(
  expr: string,
  ids: Map<string, string>,
  { offset }: { offset: boolean },
): string | null {
  const m = (
    offset ? /^\s*([A-Za-z_$][\w$]*)\s*(?:[+-]\s*1\s*)?$/ : /^\s*([A-Za-z_$][\w$]*)\s*$/
  ).exec(expr)
  return m ? (ids.get(m[1]) ?? null) : null
}

/**
 * Début d'une condition de largeur ou de hauteur, toute casse, `device-` compris :
 * `(max-width:`, `(min-device-height:`, `(width >=`, et la plage inversée dont la
 * valeur précède la caractéristique, littérale, interpolée ou concaténée, unité
 * comprise : `(640px <= width`, `(${BP}px < width`, `(' + 500 + 'px >= height`.
 */
export function conditionStart(axis: 'width' | 'height'): RegExp {
  const feature = `(?:(?:min|max)-)?(?:device-)?${axis}`
  const value = `(?:\\$\\{[^}]*\\}|\\d[\\d.]*|['"\`]\\s*\\+[^+]*\\+\\s*['"\`])[a-z]*`
  return new RegExp(
    `\\(\\s*${feature}\\s*(?::|[<>]=?)|\\(\\s*${value}\\s*[<>]=?\\s*(?:device-)?${axis}\\b`,
    'gi',
  )
}

/**
 * Dans une feuille CSS, une règle `@container` ou `@supports` n'est pas une requête
 * média. Réservé aux `.css` : en TS/TSX, une classe `@container` voisine d'une
 * variante `[@media(…)]` ne doit rien masquer.
 */
export function insideNonMediaCssRule(file: string, code: string, index: number): boolean {
  if (!file.endsWith('.css')) return false
  const boundary = Math.max(
    code.lastIndexOf('{', index),
    code.lastIndexOf('}', index),
    code.lastIndexOf(';', index),
  )
  return /@(?:container|supports)\b/i.test(code.slice(boundary + 1, index))
}

export interface HeightScan {
  findings: string[]
  /** Constantes du module (nom exporté) portées par une requête de hauteur conforme. */
  constants: string[]
}

/**
 * Conditions de hauteur d'un fichier. Conforme : la valeur est UNE constante
 * documentée du module des seuils (`documented`), sans décalage, sous n'importe
 * quelle syntaxe. En CSS, aucune ne l'est : une feuille ne peut pas lire une
 * constante TS.
 */
export function scanHeightQueries(file: string, raw: string, documented: Set<string>): HeightScan {
  const isCss = file.endsWith('.css')
  const code = stripComments(raw, { lineComments: !isCss })
  const lineOf = (index: number) => code.slice(0, index).split('\n').length
  const ids = isCss ? new Map<string, string>() : thresholdIdentifiers(file, code)
  const findings: string[] = []
  const constants: string[] = []

  // Les seuils de largeur redéclarés sont rapportés par T3, ceux-ci par T8.
  for (const name of isCss ? [] : shadowedThresholds(file, code, ids)) {
    if (!BREAKPOINT_EXPORT.test(ids.get(name)!))
      findings.push(`${file} ${name} redéclaré localement`)
    ids.delete(name)
  }

  for (const m of code.matchAll(conditionStart('height'))) {
    if (insideNonMediaCssRule(file, code, m.index)) continue
    const span = balancedSpan(code, m.index)
    const { rest, exprs, unitless } = conditionParts(span)
    const refs = exprs.map((e) => thresholdReference(e, ids, { offset: false }))
    const ok =
      !isCss &&
      !/\d/.test(rest) &&
      !unitless &&
      refs.length === 1 &&
      refs.every((r) => r !== null && documented.has(r))
    if (ok) constants.push(...(refs as string[]))
    else findings.push(`${file}:${lineOf(m.index)} ${span.replace(/\s+/g, ' ').slice(0, 80)}`)
  }
  return { findings, constants }
}

/**
 * Évalue une requête média contre un écran simulé. Comprend `min|max-width|height`,
 * la syntaxe de plage (`height <= 600px`, `600px >= height`) et `orientation`.
 * Toute autre condition rend `false`. Insensible à la casse, comme CSS.
 */
export function viewportMatcher({ width, height }: { width: number; height: number }) {
  const orientation = width >= height ? 'landscape' : 'portrait'
  const toPx = (value: string, unit: string) => Number(value) * (unit === 'px' ? 1 : 16)
  const compare = (actual: number, op: string, limit: number) =>
    op === '<='
      ? actual <= limit
      : op === '>='
        ? actual >= limit
        : op === '<'
          ? actual < limit
          : actual > limit
  const flip: Record<string, string> = { '<=': '>=', '>=': '<=', '<': '>', '>': '<' }
  const sizeOf = (axis: string) => (axis === 'width' ? width : height)

  return (query: string) =>
    query
      .toLowerCase()
      .split(/\s+and\s+/)
      .map((part) => part.trim().replace(/^\(|\)$/g, ''))
      .every((cond) => {
        const orient = cond.match(/^orientation\s*:\s*(\w+)$/)
        if (orient) return orient[1] === orientation
        const legacy = cond.match(/^(min|max)-(width|height)\s*:\s*([\d.]+)(px|rem|em)$/)
        if (legacy) {
          const op = legacy[1] === 'min' ? '>=' : '<='
          return compare(sizeOf(legacy[2]), op, toPx(legacy[3], legacy[4]))
        }
        const range = cond.match(/^(width|height)\s*(<=|>=|<|>)\s*([\d.]+)(px|rem|em)$/)
        if (range) return compare(sizeOf(range[1]), range[2], toPx(range[3], range[4]))
        const reversed = cond.match(/^([\d.]+)(px|rem|em)\s*(<=|>=|<|>)\s*(width|height)$/)
        if (reversed) {
          return compare(sizeOf(reversed[4]), flip[reversed[3]], toPx(reversed[1], reversed[2]))
        }
        return false
      })
}
