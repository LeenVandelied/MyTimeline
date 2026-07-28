// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Garde-fou d'APPARIEMENT DE SURVOL — étendu à `components/landing/`.
 *
 * POURQUOI CE FICHIER EXISTE. Le commit `24f44a3` a retiré `hover:text-*` des
 * variants de `ui/button.tsx` et posé l'invariant « le survol ne change que la
 * surface, l'encre de repos reste en place ». Son garde-fou
 * (`ui/button.hover-pairing.test.ts`) ne lit QUE `button.tsx` : `LandingMobileMenu`,
 * écrit avant que l'invariant ne soit établi, réintroduisait exactement le même
 * couplage sur les ancres du panneau burger — et il est passé.
 * MESURÉ AU NAVIGATEUR (375 px, `e2e/landing-mobile-menu.spec.ts`) :
 * `hover:bg-accent-soft` + `hover:text-accent` = `#1170e4` sur `#dbe9fc`,
 * **3.83:1** en thème clair pour du 15 px non gras — sous les 4.5:1 de WCAG
 * 1.4.3 AA. En sombre le même code mesurait 5.43:1 : conforme. Un défaut qui
 * n'existe que dans un thème sur deux ne se rattrape pas à la relecture.
 *
 * L'INVARIANT VÉRIFIÉ ICI n'est pas « aucun `hover:text-*` » — ce serait faux.
 * `ui/button.tsx` l'énonce : un consommateur a le droit d'inverser le survol
 * s'il écrit LUI-MÊME les deux moitiés et en assume les deux. La règle porte
 * donc sur le COUPLAGE : dès qu'un `className` change à la fois la surface et
 * l'encre au survol, la paire doit être la seule sanctionnée par le DS —
 * `hover:bg-accent` + `hover:text-accent-ink`, c'est-à-dire l'encre prévue POUR
 * l'accent posée SUR l'accent (mesurée 4.71:1 en clair / 6.94:1 en sombre).
 * Toute autre combinaison est un appariement inventé, donc un ratio non mesuré.
 *
 * Ce qui reste HORS de cette règle, volontairement :
 *  - un `hover:text-*` SEUL (sans changement de surface) : l'encre change sur un
 *    fond inchangé, le ratio se mesure au repos comme au survol sur le même fond
 *    (c'est le cas de `.nav-link` du header desktop) ;
 *  - un `hover:bg-*` SEUL : c'est précisément la forme recommandée.
 *
 * CE QUE CE TEST NE PROUVE PAS. Aucun ratio n'est calculé : jsdom ne résout ni
 * la précédence des `@layer` ni la mise en page (PIT-S48). Les ratios réels sont
 * mesurés par `e2e/landing-mobile-menu.spec.ts` et `e2e/landing-cta-contrast.spec.ts`.
 */

const LANDING_DIR = dirname(fileURLToPath(import.meta.url))

/** La seule paire fond/encre sanctionnée pour un survol inversé. */
const SANCTIONED_SURFACE = 'hover:bg-accent'
const SANCTIONED_INK = 'hover:text-accent-ink'

function landingComponents(): string[] {
  return readdirSync(LANDING_DIR)
    .filter((name) => name.endsWith('.tsx') && !name.endsWith('.test.tsx'))
    .sort()
}

/**
 * Valeurs de `className` d'un fichier — littéral, littéral gabarit ou chaîne
 * simple. On raisonne PAR `className` et non par ligne : le couplage est une
 * propriété d'un même élément, deux éléments voisins qui portent chacun une
 * moitié ne posent aucun problème.
 */
function classNameValues(source: string): string[] {
  const values: string[] = []
  const pattern = /className=(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\})/g
  for (const match of source.matchAll(pattern)) {
    values.push(match[1] ?? match[2] ?? match[3] ?? '')
  }
  return values
}

export interface HoverPairingOffence {
  file: string
  className: string
  surfaces: string[]
  inks: string[]
}

/** Repère les `className` qui changent surface ET encre hors paire sanctionnée. */
export function findHoverPairingOffences(
  file: string,
  source: string,
): HoverPairingOffence[] {
  const offences: HoverPairingOffence[] = []
  for (const className of classNameValues(source)) {
    const surfaces = className.match(/hover:bg-[\w-]+/g) ?? []
    const inks = className.match(/hover:text-[\w-]+/g) ?? []
    if (surfaces.length === 0 || inks.length === 0) continue
    const sanctioned =
      surfaces.length === 1 &&
      inks.length === 1 &&
      surfaces[0] === SANCTIONED_SURFACE &&
      inks[0] === SANCTIONED_INK
    if (!sanctioned) offences.push({ file, className, surfaces, inks })
  }
  return offences
}

describe('landing — appariement fond/encre au survol', () => {
  it('aucun composant ne couple surface et encre hors paire sanctionnée', () => {
    const offences = landingComponents().flatMap((name) =>
      findHoverPairingOffences(name, readFileSync(join(LANDING_DIR, name), 'utf8')),
    )
    expect(
      offences.map((o) => `${o.file} : ${o.surfaces.join(' ')} + ${o.inks.join(' ')}`),
      "un `className` change à la fois la surface et l'encre au survol sans utiliser la paire " +
        `\`${SANCTIONED_SURFACE}\` + \`${SANCTIONED_INK}\` : le ratio de la combinaison inventée ` +
        "n'a été mesuré nulle part (cf. l'en-tête de ce fichier — le cas précédent valait 3.83:1)",
    ).toEqual([])
  })

  it('le détecteur voit le défaut exact que le Sprint 49 a corrigé', () => {
    // Sans cette preuve, un détecteur devenu aveugle rendrait le test ci-dessus
    // vert pour de mauvaises raisons — le défaut même que ce garde-fou combat.
    const regression = findHoverPairingOffences(
      'Regression.tsx',
      'className={`text-ink hover:bg-accent-soft hover:text-accent px-3 ${FOCUS_RING}`}',
    )
    expect(regression).toHaveLength(1)
    expect(regression[0].surfaces).toEqual(['hover:bg-accent-soft'])
    expect(regression[0].inks).toEqual(['hover:text-accent'])
  })

  it('la paire sanctionnée et les moitiés isolées ne sont pas signalées', () => {
    const accepted = findHoverPairingOffences(
      'Accepted.tsx',
      [
        'className="border-accent text-accent hover:bg-accent hover:text-accent-ink"',
        'className="nav-link hover:text-accent transition duration-200"',
        'className="text-ink hover:bg-accent-soft rounded-sm"',
      ].join('\n'),
    )
    expect(accepted).toEqual([])
  })
})
