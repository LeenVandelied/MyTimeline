// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Garde-fou d'UTILITAIRE DE FOCUS EN TSX — WCAG 1.4.11 / [[DEC-S58-001]] (#457).
 *
 * POURQUOI CE FICHIER EXISTE. `control-border-tier.test.ts` (S63, #447) verrouille
 * l'indicateur de focus des contrôles du DS — mais son en-tête énonce lui-même son
 * trou, premier point du bloc « CE QU'ELLE NE PROUVE PAS » :
 *
 *     « Elle ne lit QUE `ds/components/core.css`. Un indicateur — ou sa suppression
 *       — posé dans un `.tsx`, une utilitaire Tailwind, `globals.css` ou une autre
 *       feuille du DS lui échappe entièrement. »
 *
 * Le présent fichier ferme la moitié `.tsx` de ce trou, et rien d'autre.
 *
 * L'INVARIANT VÉRIFIÉ est celui de [[DEC-S58-001]] (`docs/memory/decisions.md:413`),
 * cité mot pour mot : « Après #383, `:focus-visible` vit dans `@layer base` et aucun
 * composant ne pose d'utilitaire de focus — ni `outline-none`/`outline-hidden`, ni
 * `ring-*`. » Les deux alternatives y sont MESURÉES et rejetées : `--shadow-focus`
 * plafonne à 1,23:1 clair / 1,19:1 sombre, et `ring-*` est un `box-shadow` dont le
 * `ring-offset` peint une bande OPAQUE compilée à `#fff` — un liseré blanc en thème
 * sombre. La décision nomme aussi son unique exception (`ui/popover.tsx`, panneau et
 * non contrôle) et impose l'écriture `outline-hidden`, jamais `outline-none`.
 *
 * ⚠ CETTE GARDE EST PLUS STRICTE QUE L'ÉNONCÉ DE #457, DÉLIBÉRÉMENT. L'issue demande
 * de détecter un `ring-*` « isolé (sans le token `--color-focus`) », ce qui laisserait
 * passer `ring-2 ring-[var(--color-focus)]`. [[DEC-S58-001]] rejette `ring-*` en tant
 * que MÉCANISME (le `ring-offset` opaque), pas en tant que couleur : un anneau au bon
 * token reste un liseré blanc en sombre, et un second indicateur concentrique absent
 * de la charte. C'est la décision qui fait foi, pas l'énoncé de l'issue.
 *
 * PÉRIMÈTRE — pourquoi PAS les 3 fichiers nommés par l'issue. #457 désigne
 * `ui/checkbox.tsx`, `ui/radio.tsx`, `ui/switch.tsx`. Vérifié au grep (PIT-S71-001,
 * « un inventaire fourni par un énoncé est un point de départ, jamais le périmètre ») :
 * ces trois fichiers ne contiennent AUCUNE occurrence de `outline`/`ring`, tandis que
 * la seule violation réelle du dépôt vivait dans `components/legal/`. Un périmètre à
 * trois fichiers aurait donc gardé trois fichiers sans rien à garder et manqué la
 * seule régression existante. Le périmètre retenu est l'ensemble des `.tsx` de
 * `src/components/**` et de `app/**` — c'est l'échelle de [[DEC-S58-001]], qui a
 * nettoyé « les 31 AUTRES sites applicatifs », pas un sous-ensemble du DS.
 *
 * CE QUE CETTE GARDE PROUVE. Aucun littéral de chaîne d'un `.tsx` du périmètre ne
 * porte d'utilitaire `outline-*` ou `ring-*` (préfixes de variante compris :
 * `focus:`, `focus-visible:`, `dark:`, `data-[…]:`, `[&_x]:`…), hors les dérogations
 * de `ALLOWED_UTILITIES`, chacune motivée et elle-même vérifiée non périmée.
 *
 * CE QU'ELLE NE PROUVE PAS — périmètre statué :
 * • Elle ne mesure AUCUN pixel et AUCUN ratio. Elle constate l'absence d'un
 *   contournement en source ; que le contour du DS soit effectivement PEINT et
 *   contrasté reste la charge de `e2e/sprint-62-control-focus-contrast.spec.ts`.
 * • Elle ne lit que des LITTÉRAUX — mais « littéral » englobe les FRAGMENTS STATIQUES
 *   d'un gabarit, et c'est plus large que ce que cet en-tête a d'abord affirmé.
 *
 *   ⚠ CORRECTIF DE REVUE (S77). La rédaction initiale donnait `` `ring-${n}` `` pour
 *   INVISIBLE. C'est FAUX, et c'est désormais MESURÉ (bloc « classes construites »
 *   plus bas, qui fige les deux sens) : `stringLiteralsOf` coupe le gabarit à chaque
 *   `${`, le fragment `ring-` devient un littéral à part entière, `baseUtility` le
 *   rend tel quel et `/^ring-/` matche — la garde ROUGIT. Idem pour
 *   `` `outline-${x}` ``. Aucun test ne verrouillait ce comportement dans un sens ni
 *   dans l'autre : l'affirmation n'était donc ni vraie ni gardée.
 *
 *   CE QUI RESTE RÉELLEMENT INVISIBLE — tout ce dont AUCUN fragment statique ne porte
 *   le préfixe interdit : `` `${prefix}-2` `` (le préfixe vit dans le code),
 *   `clsx({ [FOCUS]: on })` (clé calculée), une constante importée d'un autre module,
 *   une classe venue d'une lib. Aucune analyse statique par chaîne ne les voit.
 *   S'y ajoute la forme NUE construite, `` `ring${n}` `` : elle passe non pas à cause
 *   de l'interpolation mais du discriminant de multiplicité de `BARE_UTILITIES` — le
 *   fragment `ring` se retrouve SEUL dans son littéral, donc indiscernable d'une
 *   valeur de prop. Symétrique du trou DEC-S52-003 de `landing.hover-pairing.test.ts`.
 * • Elle ignore la CASCADE et les `@layer` : un `outline: none` écrit en CSS (dans
 *   `globals.css`, `landing.css` ou une feuille du DS) n'est pas du TSX et lui
 *   échappe — c'est la moitié du trou #447 que ce fichier ne ferme PAS.
 * • Elle ne juge pas la SÉMANTIQUE d'un anneau : un `ring-*` purement décoratif
 *   (halo d'avatar, focus factice) rougirait comme un contournement de focus. Le
 *   dépôt n'en contient aucun ; le jour où il en contient un, c'est un arbitrage à
 *   inscrire dans `ALLOWED_UTILITIES`, pas un faux positif à contourner.
 * • Les formes NUES `outline` / `ring` ne sont vues que dans un littéral à PLUSIEURS
 *   jetons, pour ne pas confondre une classe avec le `variant="outline"` de
 *   `ui/button.tsx` (20 occurrences réelles). Un `cn('outline', x)` passe donc — trou
 *   assumé et documenté sur `BARE_UTILITIES`, du côté permissif.
 * • Un littéral de PROSE contenant le mot isolé `ring` ou `outline` rougirait. Aucun
 *   n'existe (le texte visible passe par next-intl et vit en JSON, pas en TSX). Ce
 *   biais est du côté SÉVÈRE, assumé comme dans `landing.hover-pairing.test.ts` : un
 *   faux signalement se lève en trois secondes, un contournement part en production.
 * • Le lexeur ne reconnaît pas les littéraux d'EXPRESSION RÉGULIÈRE. Une regex
 *   contenant `//` pourrait faire prendre la suite pour un commentaire — donc un faux
 *   NÉGATIF, jamais un faux positif. Aucun `.tsx` du périmètre n'en porte.
 *
 * ARMEMENT. Le bloc final prouve chaque verdict ROUGE sur des mutations de fichiers
 * RÉELS du dépôt, mutés EN MÉMOIRE — le fichier sur disque n'est jamais touché, et
 * une assertion finale le revérifie (méthode `control-border-tier.test.ts`,
 * PIT-S62-003 : un garde prouvé par des fixtures supprimées n'est pas armé). Il
 * prouve AUSSI le sens inverse — les trois occurrences en COMMENTAIRE que le dépôt
 * porte réellement ne rougissent pas — sans quoi la garde serait inutilisable.
 */

const FRONTEND = fileURLToPath(new URL('../../../', import.meta.url))
const SCANNED_ROOTS = ['src/components', 'app'] as const

/**
 * Utilitaires interdits par [[DEC-S58-001]], une fois les variantes retirées.
 * Formes SUFFIXÉES, non ambiguës : aucune valeur de prop du dépôt ne leur ressemble.
 */
const BANNED_UTILITIES = [
  { id: 'outline', pattern: /^outline-/ },
  { id: 'ring', pattern: /^ring-/ },
] as const

/**
 * Formes NUES (`outline`, `ring` — respectivement `outline-style:solid` et un anneau
 * de 3 px en Tailwind v4). Elles sont HOMOGRAPHES d'une valeur de prop : le dépôt
 * porte 20 `variant="outline"` (le variant shadcn de `ui/button.tsx`, dans 18 fichiers
 * dont `app/[locale]/privacy/page.tsx` et `terms/page.tsx`) qui ne sont pas des
 * classes du tout. Mesuré : les interdire sans discriminant produisait 20 faux
 * positifs pour 3 vraies violations — un garde-fou à 87 % de bruit se désarme tout
 * seul à la première exécution.
 *
 * DISCRIMINANT RETENU : la MULTIPLICITÉ du littéral. Une valeur de prop est un jeton
 * seul (`"outline"`) ; une liste de classes en compte plusieurs
 * (`"rounded-sm outline"`). Le discriminant ne s'applique QU'aux formes nues — les
 * formes suffixées restent détectées même seules.
 *
 * TROU ASSUMÉ, du côté PERMISSIF et nommé ici pour qu'il ne se redécouvre pas :
 * `className={cn('outline', x)}` — un `outline` nu SEUL dans son littéral — passe.
 * Le dépôt n'en contient aucun, et la forme réelle d'une régression de focus est
 * `outline-none` (suffixée, donc vue). L'alternative — n'accepter le jeton nu que
 * hors d'un attribut `variant=` — exigeait un parseur JSX pour fermer un trou que
 * personne n'a jamais emprunté.
 */
const BARE_UTILITIES = [
  { id: 'outline' as const, value: 'outline' },
  { id: 'ring' as const, value: 'ring' },
] as const

/**
 * Dérogations ACTÉES. Clé = (fichier, utilitaire EXACT) : déroger à `outline-hidden`
 * dans `popover.tsx` n'y autorise pas `outline-none`, que [[DEC-S58-001]] proscrit
 * nommément (seul `outline-hidden` émet le repli `@media (forced-colors: active)`).
 */
const ALLOWED_UTILITIES = [
  {
    file: 'src/components/ui/popover.tsx',
    utility: 'outline-hidden',
    reason:
      "DEC-S58-001 — seule exception du dépôt : un PANNEAU n'est pas un contrôle. " +
      'Radix pose `tabIndex=-1` sur le contenu et lui donne le focus à ouverture ; ' +
      "le contour marquerait le conteneur entier, pas la cible que l'utilisateur pilote.",
  },
] as const

export interface FocusUtilityOffence {
  file: string
  /** L'utilitaire fautif, variantes comprises, tel qu'écrit dans la source. */
  token: string
  /** Famille interdite (`outline` ou `ring`). */
  kind: (typeof BANNED_UTILITIES)[number]['id']
  /** Le littéral qui le porte, tronqué — de quoi le retrouver sans noyer le rapport. */
  literal: string
}

/**
 * Littéraux de chaîne d'une source TS/TSX, COMMENTAIRES EXCLUS.
 *
 * Un lexeur, pas une regex : le dépôt porte trois occurrences de `ring-2` /
 * `outline-none` dans des COMMENTAIRES qui documentent leur propre RETRAIT au #383
 * (`CategoryDrawer.tsx:324`, `EventEditForm.tsx:835`, `LandingMobileMenu.tsx:65`) —
 * un garde-fou textuel rougirait sur les trois (PIT-S63-017 : un `grep` lit la
 * présence, jamais l'intention). Symétriquement, `href="https://…"` interdit de
 * couper les commentaires au `//` sans connaître l'état de chaîne.
 *
 * Les substitutions `${…}` d'un gabarit sont retirées du littéral capturé : leur
 * contenu est du CODE, et l'y laisser rendrait `` `#${section.id}` `` indiscernable
 * d'une liste de classes.
 *
 * On lit TOUS les littéraux, pas seulement les valeurs de `className=`. C'est
 * délibéré : `landing.hover-pairing.test.ts` documente en en-tête que les corps de
 * `cva(...)` échappent à une analyse par attribut `className`, et le dépôt range
 * aussi des listes de classes dans des `Record<Variant, string>` (`ui/badge.tsx`,
 * `ui/toast.tsx`). L'invariant vérifié ici est l'ABSENCE d'un jeton — une propriété
 * du fichier, pas d'un élément — donc le regroupement par élément est inutile et le
 * périmètre élargi est gratuit.
 */
export function stringLiteralsOf(source: string): string[] {
  const literals: string[] = []
  type Frame = { kind: 'template' | 'expr'; depth: number }
  const stack: Frame[] = []
  let state: 'code' | 'line' | 'block' | 'single' | 'double' | 'template' = 'code'
  let buffer = ''
  let i = 0

  const flush = () => {
    if (buffer.length > 0) literals.push(buffer)
    buffer = ''
  }

  while (i < source.length) {
    const char = source[i]
    const next = source[i + 1]

    if (state === 'code') {
      if (char === '/' && next === '/') {
        state = 'line'
        i += 2
      } else if (char === '/' && next === '*') {
        state = 'block'
        i += 2
      } else if (char === "'") {
        state = 'single'
        i += 1
      } else if (char === '"') {
        state = 'double'
        i += 1
      } else if (char === '`') {
        stack.push({ kind: 'template', depth: 0 })
        state = 'template'
        i += 1
      } else if (char === '{' && stack.at(-1)?.kind === 'expr') {
        stack.at(-1)!.depth += 1
        i += 1
      } else if (char === '}' && stack.at(-1)?.kind === 'expr') {
        const top = stack.at(-1)!
        if (top.depth === 0) {
          stack.pop() // fin de `${…}` : retour dans le gabarit englobant
          state = 'template'
        } else {
          top.depth -= 1
        }
        i += 1
      } else {
        i += 1
      }
      continue
    }

    if (state === 'line') {
      if (char === '\n') state = 'code'
      i += 1
      continue
    }

    if (state === 'block') {
      if (char === '*' && next === '/') {
        state = 'code'
        i += 2
      } else {
        i += 1
      }
      continue
    }

    // États de chaîne : `\` échappe le caractère suivant, quel qu'il soit.
    if (char === '\\') {
      buffer += source.slice(i, i + 2)
      i += 2
      continue
    }

    if (state === 'single' && char === "'") {
      flush()
      state = 'code'
      i += 1
      continue
    }
    if (state === 'double' && char === '"') {
      flush()
      state = 'code'
      i += 1
      continue
    }
    if (state === 'template') {
      if (char === '`') {
        flush()
        stack.pop()
        state = stack.at(-1)?.kind === 'expr' ? 'code' : 'code'
        i += 1
        continue
      }
      if (char === '$' && next === '{') {
        // La substitution est du CODE : on ferme le morceau de littéral courant.
        flush()
        stack.push({ kind: 'expr', depth: 0 })
        state = 'code'
        i += 2
        continue
      }
    }

    buffer += char
    i += 1
  }

  return literals
}

/**
 * Utilitaire de base d'un jeton Tailwind : tout ce qui suit le DERNIER `:` de
 * profondeur 0. La profondeur compte les `[…]`, sans quoi
 * `[&_svg:not([class*='size-'])]:size-4` serait coupé sur le `:` de `:not(` et
 * `data-[variant=destructive]:focus:ring-2` échapperait à la détection.
 */
export function baseUtility(token: string): string {
  let depth = 0
  let lastColon = -1
  for (let i = 0; i < token.length; i += 1) {
    const char = token[i]
    if (char === '[') depth += 1
    else if (char === ']') depth -= 1
    else if (char === ':' && depth === 0) lastColon = i
  }
  return token.slice(lastColon + 1).replace(/^!+/, '')
}

/** Utilitaires de focus posés en TSX, hors dérogation actée. */
export function findFocusUtilityOffences(file: string, source: string): FocusUtilityOffence[] {
  const offences: FocusUtilityOffence[] = []
  for (const literal of stringLiteralsOf(source)) {
    const tokens = literal.trim().split(/\s+/).filter((t) => t.length > 0)
    // Un littéral à jeton UNIQUE ne peut pas être distingué d'une valeur de prop :
    // les formes nues n'y sont pas retenues (cf. `BARE_UTILITIES`).
    const isClassList = tokens.length > 1
    for (const token of tokens) {
      const base = baseUtility(token)
      const banned =
        BANNED_UTILITIES.find((b) => b.pattern.test(base)) ??
        (isClassList ? BARE_UTILITIES.find((b) => b.value === base) : undefined)
      if (!banned) continue
      const derogated = ALLOWED_UTILITIES.some((a) => a.file === file && a.utility === base)
      if (derogated) continue
      offences.push({
        file,
        token,
        kind: banned.id,
        literal: literal.length > 120 ? `${literal.slice(0, 117)}…` : literal,
      })
    }
  }
  return offences
}

/** Tous les `.tsx` du périmètre, hors tests et stories, chemins relatifs à `frontend/`. */
function scannedFiles(): string[] {
  const walk = (dir: string): string[] =>
    readdirSync(join(FRONTEND, dir), { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap((entry) => {
        const rel = `${dir}/${entry.name}`
        if (entry.isDirectory()) return walk(rel)
        if (!entry.name.endsWith('.tsx')) return []
        if (entry.name.endsWith('.test.tsx') || entry.name.endsWith('.stories.tsx')) return []
        return [rel]
      })
  return SCANNED_ROOTS.flatMap((root) => walk(root))
}

describe("utilitaire de focus en TSX — WCAG 1.4.11 / DEC-S58-001 (#457)", () => {
  const files = scannedFiles()

  it('le périmètre est non vide (sinon la garde passerait à vide)', () => {
    // Témoin négatif de PÉRIMÈTRE : un `SCANNED_ROOTS` renommé ou un `walk` cassé
    // rendrait `[]`, et toutes les assertions ci-dessous seraient vertes sans avoir
    // rien lu. Même rôle que le `expect(decls.length).toBeGreaterThan(0)` du S63.
    expect(files.length).toBeGreaterThan(50)
  })

  it("aucun `.tsx` ne pose d'utilitaire `outline-*` ou `ring-*`", () => {
    const offences = files.flatMap((file) =>
      findFocusUtilityOffences(file, readFileSync(join(FRONTEND, file), 'utf8')),
    )
    expect(
      offences.map((o) => `${o.file} : ${o.token}  (dans « ${o.literal} »)`),
      "Un `.tsx` pose un utilitaire de focus local, ce que DEC-S58-001 interdit " +
        "(docs/memory/decisions.md:413). L'indicateur de focus UNIQUE du dépôt est le " +
        'contour `:focus-visible` du DS, layerisé dans `@layer base` ' +
        "(`ds/tokens/base.css`) : il s'applique tout seul, aucune classe n'est à poser. " +
        '`outline-none` le SUPPRIME sans rien mettre en place ; `ring-*` est un ' +
        '`box-shadow` dont le `ring-offset` opaque (compilé `#fff`) peint un liseré ' +
        'BLANC en thème sombre. Remède : retirer la classe. Si la dérogation est ' +
        'réellement voulue, elle passe par `ALLOWED_UTILITIES` avec son motif.',
    ).toEqual([])
  })

  it('aucune dérogation périmée dans `ALLOWED_UTILITIES`', () => {
    // Une allowlist qui ne mord plus sur rien blanchit un fichier en silence : le
    // jour où `popover.tsx` gagne un `outline-none`, l'entrée périmée resterait là
    // à faire croire que le cas est arbitré. Miroir du `fixture invalide` du S63.
    const stale = ALLOWED_UTILITIES.filter((allowed) => {
      const source = readFileSync(join(FRONTEND, allowed.file), 'utf8')
      return !stringLiteralsOf(source)
        .flatMap((literal) => literal.split(/\s+/))
        .some((token) => baseUtility(token) === allowed.utility)
    }).map((a) => `${a.file} : ${a.utility}`)
    expect(stale, "dérogation `ALLOWED_UTILITIES` qui ne correspond plus à aucun jeton du fichier").toEqual([])
  })
})

/**
 * ARMEMENT (contrôle négatif par assertion), méthode `control-border-tier.test.ts`.
 * Les mutations portent sur des fichiers RÉELS du dépôt, lus puis mutés EN MÉMOIRE.
 */
const CHECKBOX = 'src/components/ui/checkbox.tsx'
/** Ancre réelle de `checkbox.tsx` : la classe de base de la racine Radix. */
const CHECKBOX_ANCHOR = 'peer h-4 w-4 shrink-0'

const ARMING_CASES = [
  {
    label: '`focus-visible:outline-none` réintroduit (la forme exacte corrigée ici)',
    injected: 'focus-visible:outline-none',
    expectedKind: 'outline' as const,
  },
  {
    label: '`focus-visible:ring-2` réintroduit (régression #383)',
    injected: 'focus-visible:ring-2',
    expectedKind: 'ring' as const,
  },
  {
    label: '`ring-*` au bon token de focus — refusé quand même (DEC-S58-001)',
    injected: 'ring-2 ring-[var(--color-focus)]',
    expectedKind: 'ring' as const,
  },
  {
    label: 'variante COMPOSÉE `data-[state=checked]:focus:ring-2`',
    injected: 'data-[state=checked]:focus:ring-2',
    expectedKind: 'ring' as const,
  },
  {
    label: 'utilitaire important `!outline-none`',
    injected: '!outline-none',
    expectedKind: 'outline' as const,
  },
] as const

describe("armement de la garde d'utilitaire de focus — contrôles négatifs (#457)", () => {
  const checkboxSource = readFileSync(join(FRONTEND, CHECKBOX), 'utf8')

  it("l'ancre de mutation existe réellement dans `checkbox.tsx`", () => {
    // Une fixture qui ne mord sur rien ne prouve rien (PIT-S62-003) : si la classe
    // de base du composant est réécrite, les mutations ci-dessous deviendraient des
    // no-op silencieux et l'armement serait fictif.
    expect(checkboxSource).toContain(CHECKBOX_ANCHOR)
  })

  it.each(ARMING_CASES)('$label ⇒ la garde rougit', ({ injected, expectedKind }) => {
    const mutated = checkboxSource.replace(CHECKBOX_ANCHOR, `${CHECKBOX_ANCHOR} ${injected}`)
    expect(mutated).not.toBe(checkboxSource)

    const offences = findFocusUtilityOffences(CHECKBOX, mutated)
    expect(
      offences.map((o) => o.kind),
      `La mutation « ${injected} » aurait dû produire \`${expectedKind}\`. Rendu : ${JSON.stringify(offences)}`,
    ).toContain(expectedKind)
  })

  it('un `ring-*` posé dans un corps de `cva(...)` rougit aussi', () => {
    // Trou explicitement OUVERT par `landing.hover-pairing.test.ts` (en-tête, « les
    // corps de `cva(...)` ne passent pas par un attribut `className=` »). Il est
    // fermé ici parce qu'on lit les littéraux, pas les attributs.
    const offences = findFocusUtilityOffences(
      'Variants.tsx',
      'const v = cva("inline-flex", { variants: { tone: { soft: "bg-x focus:ring-2" } } })',
    )
    expect(offences).toHaveLength(1)
    expect(offences[0].token).toBe('focus:ring-2')
  })

  it('un `outline-none` rangé dans un `Record<Variant, string>` rougit aussi', () => {
    const offences = findFocusUtilityOffences(
      'Record.tsx',
      'const VARIANT_CLASS: Record<V, string> = { ghost: "text-ink outline-none" }',
    )
    expect(offences).toHaveLength(1)
    expect(offences[0].token).toBe('outline-none')
  })

  it('`outline-none` reste refusé DANS `popover.tsx`, dont seul `outline-hidden` est dérogé', () => {
    // La dérogation est une paire (fichier, utilitaire) et non un blanc-seing sur le
    // fichier : DEC-S58-001 proscrit nommément `outline-none`, qui n'émet pas le
    // repli `@media (forced-colors: active)`.
    const offences = findFocusUtilityOffences(
      'src/components/ui/popover.tsx',
      'className="rounded-md outline-hidden"\nclassName="rounded-md outline-none"',
    )
    expect(offences.map((o) => o.token)).toEqual(['outline-none'])
  })
})

/**
 * CONTRÔLE POSITIF — la garde doit rester AVEUGLE aux commentaires et aux formes
 * saines, sinon elle est inutilisable : le dépôt porte réellement trois occurrences
 * de `ring-2` / `outline-none` dans des commentaires qui documentent leur RETRAIT.
 */
describe('la garde ne rougit pas sur du TSX sain (#457)', () => {
  it('ignore les occurrences en COMMENTAIRE, les trois formes du dépôt', () => {
    const source = [
      '// #383 : l\'ancien `ring-2 ring-offset-1` la rendait indiscernable du focus.',
      '/* L\'ancien `focus-visible:ring-offset-2` était posé SANS `ring-offset-color`. */',
      'const A = () => (',
      '  <div>',
      '    {/* Pas d\'`outline-none` ici (#383) : le contour du DS suffit. */}',
      '    <span className="text-sm" />',
      '  </div>',
      ')',
    ].join('\n')
    expect(findFocusUtilityOffences('Commented.tsx', source)).toEqual([])
  })

  it("ne confond pas une URL `https://` avec le début d'un commentaire", () => {
    // Sans lexeur, couper au premier `//` masquerait tout le reste du fichier —
    // un faux NÉGATIF silencieux, le pire mode de panne d'un garde-fou.
    const offences = findFocusUtilityOffences(
      'Url.tsx',
      '<a href="https://example.test/x" className="underline focus:ring-2" />',
    )
    expect(offences.map((o) => o.token)).toEqual(['focus:ring-2'])
  })

  it('ignore le CODE des substitutions de gabarit', () => {
    // `` `#${section.id}` `` ne doit pas être lu comme une liste de classes.
    expect(findFocusUtilityOffences('Tpl.tsx', 'href={`#${ring.id}`}')).toEqual([])
  })

  it("ne rougit pas sur des utilitaires voisins qui ne sont pas des anneaux", () => {
    const offences = findFocusUtilityOffences(
      'Neighbours.tsx',
      'className="rounded-sm border-rule-emphasis text-ink underline-offset-4 data-[state=open]:bg-accent-soft [&_svg:not([class*=\'size-\'])]:size-4"',
    )
    expect(offences).toEqual([])
  })

  it('ne confond pas le `variant="outline"` de `ui/button.tsx` avec une classe', () => {
    // Les 20 occurrences réelles du dépôt. Sans le discriminant de multiplicité, ce
    // garde-fou naissait avec 20 faux positifs pour 3 vraies violations.
    const offences = findFocusUtilityOffences(
      'Variant.tsx',
      '<Button type="button" variant="outline" className="w-full">{t(\'cancel\')}</Button>',
    )
    expect(offences).toEqual([])
  })

  it('voit malgré tout un `outline` NU posé dans une liste de classes', () => {
    // Borne haute du discriminant : dès que le littéral est une liste, la forme nue
    // redevient détectable. Sans cette assertion, `BARE_UTILITIES` pourrait être
    // inerte et le test ci-dessus serait vert pour la mauvaise raison.
    const offences = findFocusUtilityOffences('Bare.tsx', 'className="rounded-sm outline"')
    expect(offences.map((o) => o.token)).toEqual(['outline'])
  })

  it('`core.css` et les fichiers du disque restent intacts après armement', () => {
    // Les mutations vivent en mémoire ; ce témoin le prouve (méthode S63).
    expect(readFileSync(join(FRONTEND, CHECKBOX), 'utf8')).toContain(CHECKBOX_ANCHOR)
    expect(readFileSync(join(FRONTEND, CHECKBOX), 'utf8')).not.toContain('ring-2')
  })
})

/**
 * CLASSES CONSTRUITES — la frontière EXACTE de la garde, figée dans les DEUX sens.
 *
 * Ce bloc existe parce que l'en-tête de ce fichier a affirmé pendant un sprint que
 * `` `ring-${n}` `` était invisible à la garde. La revue l'a réfuté par la mesure, et
 * personne ne pouvait trancher : AUCUN test ne verrouillait ce comportement, ni dans un
 * sens ni dans l'autre. Sur ce dépôt les commentaires servent de mémoire d'arbitrage
 * ([[PIT-S58-004]]) — une frontière décrite mais non gardée dérive au premier
 * refactoring de `stringLiteralsOf`.
 *
 * LA RÈGLE RÉELLE, telle que mesurée : le lexeur coupe le gabarit à chaque `${`, donc
 * un fragment statique porteur du préfixe interdit est vu comme n'importe quel littéral.
 * Ce qui échappe, c'est ce dont le préfixe lui-même est calculé.
 */
describe('classes construites — frontière figée (#457, correctif de revue S77)', () => {
  it.each([
    { label: 'gabarit `ring-${n}`', source: 'const c = `ring-${n}`', token: 'ring-' },
    { label: 'gabarit `outline-${x}`', source: 'const c = `outline-${x}`', token: 'outline-' },
    {
      label: 'fragment porteur au MILIEU du gabarit',
      source: 'const c = `text-${size} ring-${n}`',
      token: 'ring-',
    },
  ])('$label ⇒ la garde ROUGIT (le fragment statique suffit)', ({ source, token }) => {
    expect(findFocusUtilityOffences('Built.tsx', source).map((o) => o.token)).toEqual([token])
  })

  it('le fragment coupé au `${` est bien un littéral à part entière', () => {
    // La MÉCANIQUE derrière le verdict ci-dessus : sans cette assertion, un refactoring
    // de `stringLiteralsOf` (p. ex. « ignorer tout gabarit contenant une substitution »)
    // rendrait les trois cas ci-dessus verts pour la mauvaise raison.
    expect(stringLiteralsOf('const c = `ring-${n}`')).toEqual(['ring-'])
    expect(baseUtility('ring-')).toBe('ring-')
  })

  it.each([
    {
      label: 'préfixe CALCULÉ `${prefix}-2` — rien de statique à voir',
      source: 'const c = `${prefix}-2`',
    },
    { label: 'clé calculée `clsx({ [FOCUS]: on })`', source: 'const c = clsx({ [FOCUS]: on })' },
    {
      label: "constante importée d'un autre module",
      source: 'import { FOCUS_CLASS } from "@/x"\nconst c = FOCUS_CLASS',
    },
    {
      label: 'forme NUE construite `ring${n}` (discriminant de multiplicité, pas interpolation)',
      source: 'const c = `ring${n}`',
    },
  ])('$label ⇒ la garde reste AVEUGLE (trou assumé)', ({ source }) => {
    expect(findFocusUtilityOffences('Built.tsx', source)).toEqual([])
  })
})
