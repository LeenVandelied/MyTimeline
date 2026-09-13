import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HeroTimelineAnimation } from './HeroTimelineAnimation'

/**
 * #611 — frise animée du Hero (règle, 6 lanes, barres, TODAY, boucle 52 s).
 *
 * jsdom ne calcule ni animation, ni media query, ni masque : on vérifie ici la STRUCTURE
 * (deux copies identiques, 6 lanes, curseur hors piste), l'absence de hex et d'élément
 * focusable, et — en relisant la feuille — les invariants du mouvement (durée, linéaire,
 * −50 %, reduced-motion). Le mouvement réel est mesuré au navigateur (done.md #611).
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}))

// `__dirname` et non `import.meta.url` : sous l'environnement jsdom, cette URL n'est pas
// en `file:` et `fileURLToPath` lève.
const CSS = readFileSync(join(__dirname, '../../styles/hero-timeline.css'), 'utf8')

describe('HeroTimelineAnimation', () => {
  it('est masquée aux technologies d’assistance et ne contient aucun élément focusable', () => {
    const { container } = render(<HeroTimelineAnimation />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(
      container.querySelectorAll('button, a, input, select, textarea, [tabindex]'),
    ).toHaveLength(0)
  })

  it('porte deux copies IDENTIQUES du bloc dans la piste (boucle sans raccord)', () => {
    const { container } = render(<HeroTimelineAnimation />)
    const blocks = container.querySelectorAll('.hero-timeline__track > .hero-timeline__block')
    expect(blocks).toHaveLength(2)
    // Hors attribut `data-copy`, les deux copies doivent rendre exactement le même DOM.
    const strip = (el: Element) => el.outerHTML.replace(/ data-copy="\d"/, '')
    expect(strip(blocks[0])).toBe(strip(blocks[1]))
  })

  it('rend une règle de 4 mois et 6 lanes par copie, une lane sur deux zébrée', () => {
    const { container } = render(<HeroTimelineAnimation />)
    const block = container.querySelector('.hero-timeline__block')!
    expect(block.querySelectorAll('.hero-timeline__month')).toHaveLength(4)
    const lanes = block.querySelectorAll('.hero-timeline__lane')
    expect(lanes).toHaveLength(6)
    const zebra = Array.from(lanes).map((l) => l.classList.contains('hero-timeline__lane--zebra'))
    expect(zebra).toEqual([false, true, false, true, false, true])
  })

  it('rend les barres pleines via `.mt-evt` du DS, sur les tokens `--evt-*`', () => {
    const { container } = render(<HeroTimelineAnimation />)
    const block = container.querySelector('.hero-timeline__block')!
    const bars = block.querySelectorAll<HTMLElement>('.mt-evt')
    // Maquette : Clio ×2, Habitation, Santé, Abonnements + la 6e lane (Passeport).
    expect(bars).toHaveLength(6)
    for (const bar of Array.from(bars)) {
      expect(bar.classList.contains('mt-evt--preview')).toBe(true)
      expect(bar.style.getPropertyValue('--mt-evt')).toMatch(/^var\(--evt-[a-z]+\)$/)
      expect(bar.style.getPropertyValue('--mt-evt-ink')).toMatch(/^var\(--gray-(0|950)\)$/)
    }
    // Récurrent = préfixe ↻ (3 barres dans la maquette).
    expect(Array.from(bars).filter((b) => b.textContent?.startsWith('↻ '))).toHaveLength(3)
    expect(block.querySelectorAll('.hero-timeline__pin')).toHaveLength(2)
  })

  it('pose un seul curseur TODAY, HORS de la piste animée', () => {
    const { container } = render(<HeroTimelineAnimation />)
    const cursors = container.querySelectorAll('.mt-tlv__today')
    expect(cursors).toHaveLength(1)
    expect(cursors[0].closest('.hero-timeline__track')).toBeNull()
    expect(cursors[0].closest('.hero-timeline__viewport')).not.toBeNull()
    expect(cursors[0].textContent).toBe('common.landing.hero.timeline.today')
  })

  it('passe tous ses textes par i18n et n’utilise aucune couleur hex', () => {
    const { container } = render(<HeroTimelineAnimation />)
    const texts = Array.from(container.querySelectorAll('span'))
      .filter((s) => s.childElementCount === 0 && (s.textContent ?? '').trim() !== '')
      .map((s) => (s.textContent ?? '').replace(/^↻ /, ''))
    expect(texts.length).toBeGreaterThan(0)
    for (const text of texts) expect(text).toMatch(/^common\.landing\.hero\.timeline\./)
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
  })
})

describe('hero-timeline.css — invariants du mouvement', () => {
  it('défile en 52 s linéaire, en boucle, de 0 à −50 % (une copie exacte)', () => {
    expect(CSS).toMatch(/--hero-timeline-duration:\s*52s/)
    expect(CSS).toMatch(
      /animation:\s*hero-timeline-pan var\(--hero-timeline-duration\) linear infinite/,
    )
    expect(CSS).toMatch(
      /@keyframes hero-timeline-pan\s*\{\s*from\s*\{\s*transform:\s*translateX\(0\);?\s*\}\s*to\s*\{\s*transform:\s*translateX\(-50%\);?\s*\}/,
    )
    expect(CSS).toMatch(/width:\s*calc\(var\(--hero-timeline-block\) \* 2\)/)
  })

  it('fige la piste sous `prefers-reduced-motion` (sans masquer le visuel)', () => {
    const block = CSS.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/)
    expect(block).not.toBeNull()
    expect(block![1]).toMatch(/\.hero-timeline__track\s*\{[^}]*animation:\s*none !important/)
    expect(block![1]).not.toMatch(/display:\s*none|opacity:\s*0|visibility:\s*hidden/)
  })

  it('pose le masque de fondu sur la fenêtre et n’anime que `transform`', () => {
    expect(CSS).toMatch(
      /mask-image:\s*linear-gradient\(90deg, transparent, black 7%, black 93%, transparent\)/,
    )
    const keyframes = CSS.match(/@keyframes hero-timeline-pan\s*\{([\s\S]*?)\n\}/)![1]
    const props = Array.from(keyframes.matchAll(/([a-z-]+)\s*:/g)).map((m) => m[1])
    expect(new Set(props)).toEqual(new Set(['transform']))
    // Commentaires retirés : les références d'issue (`#343`, `#611`…) ressemblent à des hex.
    const rules = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(rules).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
  })
})
