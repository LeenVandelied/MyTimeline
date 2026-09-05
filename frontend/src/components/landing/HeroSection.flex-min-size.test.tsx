import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'
import { HeroSection } from './HeroSection'

/**
 * Garde-fou de TAILLE MINIMALE AUTOMATIQUE — régression « CTA tronqué » (sprint 48).
 *
 * CONTEXTE. `landing.css` pose `.cta-button { overflow: hidden }` — indispensable
 * pour clipper le bandeau de brillance `.cta-button::before`. Tant que `.cta-button`
 * vivait sur un `<button>` IMBRIQUÉ dans le `<a>`, seul le `<a>` (overflow visible)
 * était le flex item : sa taille minimale automatique valait `min-content`, donc
 * pas de troncature. Depuis `<Button asChild><Link>` (#295), le `<a>` EST le bouton
 * et porte `.cta-button` : par la spec flexbox, un flex item dont l'`overflow` n'est
 * pas `visible` voit sa taille minimale automatique tomber à ZÉRO. Le bouton absorbe
 * alors toute la compression de la rangée — mesuré à 130 px de large pour 268 px de
 * contenu à 1280 px, soit « cer gratuit » à l'écran, coupé en plein mot.
 *
 * CE QUE CE TEST PROUVE. Il lit les vraies feuilles `landing.css` / `animations.css`,
 * en extrait par l'AST PostCSS l'ensemble des classes qui déclarent `overflow: hidden`,
 * puis vérifie sur le markup rendu du hero que TOUT élément portant une de ces classes
 * porte aussi un plancher de largeur explicite (`min-w-*` / `shrink-0`) — c'est-à-dire
 * que la combinaison « overflow non-visible + taille minimale automatique nulle » ne
 * peut plus réapparaître. Il vérifie aussi que la rangée de CTA autorise le retour à
 * la ligne avec `gap-*` et non `space-x-*` (dont les marges se décalent en wrap).
 * L'invariant est GÉNÉRIQUE : si quelqu'un ajoute `overflow: hidden` à une autre classe
 * de la landing posée sur un `<Button>`, le test échoue sans être réécrit.
 *
 * CE QUE CE TEST NE PROUVE PAS. jsdom ne fait AUCUN calcul de mise en page : ni
 * largeur, ni `scrollWidth`, ni compression flex. Il ne peut donc pas constater une
 * troncature — il ne fait qu'interdire la CAUSE structurelle identifiée. Il ne dit
 * rien du rendu réel, des libellés traduits (une locale plus verbeuse que `fr` peut
 * déborder autrement), ni du bandeau CTA hors hero. La mesure aux vraies tailles
 * (1280 px / 375 px) reste du ressort de l'E2E / de l'œil.
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}))

const STYLESHEETS = ['../../styles/landing.css', '../../styles/animations.css'].map((rel) =>
  fileURLToPath(new URL(rel, import.meta.url))
)

/**
 * Un utilitaire rétablit-il un plancher de largeur SUR CET ÉLÉMENT ?
 * Les variantes à sélecteur arbitraire (`[&_svg]:shrink-0`, posée par le variant
 * Button) ciblent un DESCENDANT et ne comptent donc pas — sans cette exclusion le
 * garde-fou serait vacuement vert. Les variantes responsives (`sm:min-w-min`) comptent.
 */
function hasMinSizeFloor(className: string): boolean {
  if (className.includes('[&')) return false
  const base = className.slice(className.lastIndexOf(':') + 1)
  return /^min-w-./.test(base) || base === 'shrink-0' || base === 'flex-none'
}

/**
 * Classes déclarant `overflow: hidden` (ou toute valeur non-`visible`), extraites
 * de l'AST des feuilles de la landing. Les sélecteurs composés et les pseudo-éléments
 * sont réduits à leurs noms de classe.
 */
function classesWithClippedOverflow(): Set<string> {
  const found = new Set<string>()
  for (const file of STYLESHEETS) {
    const root = postcss.parse(readFileSync(file, 'utf8'), { from: file })
    root.walkRules((rule) => {
      let clipped = false
      rule.walkDecls('overflow', (decl) => {
        if (decl.value.trim() !== 'visible') clipped = true
      })
      if (!clipped) return
      for (const match of rule.selector.matchAll(/\.([\w-]+)/g)) found.add(match[1])
    })
  }
  return found
}

describe('HeroSection — taille minimale des flex items (régression CTA tronqué)', () => {
  const clipped = classesWithClippedOverflow()

  it('détecte bien `.cta-button` comme classe à overflow clippé', () => {
    // Sanity check : si ce test casse, l'extraction CSS ne regarde plus la bonne
    // feuille et les assertions suivantes deviendraient vacuement vertes.
    expect(clipped.has('cta-button')).toBe(true)
  })

  it('tout élément du hero à overflow clippé porte un plancher de largeur', () => {
    const { container } = render(<HeroSection locale="fr" />)
    const offenders: string[] = []

    for (const el of container.querySelectorAll<HTMLElement>('[class]')) {
      const classes = [...el.classList]
      if (!classes.some((c) => clipped.has(c))) continue
      if (!classes.some(hasMinSizeFloor)) {
        offenders.push(`<${el.tagName.toLowerCase()} class="${el.className}">`)
      }
    }

    // Un flex item dont l'overflow n'est pas `visible` a une taille minimale
    // automatique de 0 : sans plancher explicite, il se comprime sous son contenu
    // et, combiné au `whitespace-nowrap` du variant Button, coupe son libellé.
    expect(offenders).toEqual([])
  })

  it('la rangée de CTA autorise le retour à la ligne avec gap-* (pas space-x-*)', () => {
    const { container } = render(<HeroSection locale="fr" />)
    const row = container.querySelector('a[href="/fr/register"]')?.parentElement
    expect(row).not.toBeNull()

    const className = row!.className
    expect(className).toMatch(/\bflex\b/)
    expect(className).toMatch(/\bgap-\d/)
    expect(className).toMatch(/flex-wrap\b/)
    // `space-x-*` pose des marges inter-éléments qui ne se réinitialisent pas en
    // début de ligne : incompatible avec `flex-wrap`.
    expect(className).not.toMatch(/(^|\s|:)space-x-/)
  })
})
