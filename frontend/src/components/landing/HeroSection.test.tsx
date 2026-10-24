import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { HeroSection } from './HeroSection'

/**
 * #56 (slice contraste) — Hero extrait du monolithe HomePage.
 * En jsdom les valeurs CSS ne sont pas calculées : on vérifie la PRÉSENCE des
 * classes token theme-aware (qui suivent clair/sombre via les variables DS) et
 * l'ABSENCE de couleur hex hardcodée, pas les ratios calculés.
 * next-intl mocké → t('a.b.c') renvoie la clé littérale.
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}))

// `__dirname` et non `import.meta.url` : sous jsdom cette URL n'est pas en `file:`
// (même choix que `HeroTimelineAnimation.test.tsx`).
const GLOBALS_CSS = join(__dirname, '../../styles/globals.css')

describe('HeroSection', () => {
  it('rend les textes clés du hero (titre, sous-titre, CTA, secondaire)', () => {
    render(<HeroSection locale="fr" />)
    expect(screen.getByText('common.landing.hero.title')).toBeInTheDocument()
    expect(screen.getByText('common.landing.hero.subtitle')).toBeInTheDocument()
    expect(screen.getByText(/common\.landing\.hero\.cta/)).toBeInTheDocument()
    expect(screen.getByText('common.landing.hero.secondary')).toBeInTheDocument()
  })

  it('pointe le CTA primaire vers la page register de la locale', () => {
    render(<HeroSection locale="en" />)
    const registerLink = screen.getByText(/common\.landing\.hero\.cta/).closest('a')
    expect(registerLink).toHaveAttribute('href', '/en/register')
  })

  it('utilise des tokens sémantiques theme-aware (clair + sombre) — pas de hex', () => {
    const { container } = render(<HeroSection locale="fr" />)
    const html = container.innerHTML

    // tokens clair/sombre : bg-accent / text-accent-ink / text-ink / text-ink-muted
    // suivent le thème via les variables CSS du DS.
    expect(html).toMatch(/\btext-ink\b/)
    expect(html).toMatch(/\btext-ink-muted\b/)
    expect(html).toMatch(/\bbg-accent\b/)
    expect(html).toMatch(/\btext-accent-ink\b/)

    // #293 — bordure fonctionnelle du bouton secondaire : tier dédié
    // `border-rule-emphasis` (≥3:1 UI, clair + sombre). Il remplace l'emprunt
    // S39 au tier TEXTE `border-ink-muted`, qui ne doit plus réapparaître.
    expect(html).toMatch(/\bborder-rule-emphasis\b/)
    expect(html).not.toMatch(/\bborder-ink-muted\b/)

    // #610 — le panneau de la frise et sa barre de chrome sont DÉCORATIFS : tiers
    // `rule-strong` (panneau, maquette) et `rule` nu (filet de la barre).
    // (négative lookahead : `border-rule-emphasis` ne doit pas satisfaire ce test)
    expect(html).toMatch(/\bborder-rule(?![-\w])/)
    expect(html).toMatch(/\bborder-rule-strong\b/)
  })

  it('#610 — monte la frise DANS un panneau bordé de la colonne droite, sans image', () => {
    const { container } = render(<HeroSection locale="fr" />)

    // Image statique retirée : ni `<img>`, ni référence à `dashboard-preview`.
    expect(container.querySelector('img')).toBeNull()
    expect(container.innerHTML).not.toMatch(/dashboard-preview/)

    // La frise (`aria-hidden`, classe `.hero-timeline`) vit dans le panneau, et le
    // panneau est la 2e colonne de la rangée — pas une bande sous les colonnes.
    const timeline = container.querySelector('.hero-timeline')
    expect(timeline).not.toBeNull()
    const panel = timeline!.closest('.border-rule-strong')
    expect(panel).not.toBeNull()
    const row = container.querySelector('section > div')
    expect(row?.children).toHaveLength(2)
    expect(row!.children[1].contains(panel)).toBe(true)
    expect(container.querySelector('section')!.children).toHaveLength(1)
  })

  it('#610 — flex borné de la maquette en rangée `lg`, sans plancher px en empilement', () => {
    const { container } = render(<HeroSection locale="fr" />)
    const row = container.querySelector('section > div')!
    const [text, timeline] = [...row.children]

    expect(row.className).toMatch(/(^|\s)flex-col(\s|$)/)
    expect(row.className).toMatch(/\blg:flex-row\b/)

    // Texte `flex:1 1 300px; min-width:300px; max-width:420px` ; frise `1 1 460px; 340px`.
    expect(text.className).toMatch(/\blg:flex-\[1_1_300px\]/)
    expect(text.className).toMatch(/\blg:min-w-\[300px\]/)
    expect(text.className).toMatch(/\blg:max-w-\[420px\]/)
    expect(timeline.className).toMatch(/\blg:flex-\[1_1_460px\]/)
    expect(timeline.className).toMatch(/\blg:min-w-\[340px\]/)

    // Sous `lg` : aucun `min-w-[Npx]` non préfixé (à 320 px, 340 px + padding déborde),
    // et `min-w-0` pour que la largeur intrinsèque de la frise ne remonte pas.
    for (const col of [text, timeline]) {
      expect(col.className).not.toMatch(/(^|\s)min-w-\[\d+px\]/)
      expect(col.className).toMatch(/(^|\s)min-w-0(\s|$)/)
    }
  })

  it('#574 — le panneau porte un filet 1px et AUCUNE ombre au repos', () => {
    const { container } = render(<HeroSection locale="fr" />)
    const panel = container.querySelector('.hero-timeline')!.closest('.border-rule-strong')!
    expect(panel.className).toMatch(/(^|\s)border(\s|$)/)
    expect(panel.className).not.toMatch(/(^|\s|:)shadow-/)
  })

  it('ne contient aucune couleur hex hardcodée', () => {
    const { container } = render(<HeroSection locale="fr" />)
    // aucune valeur hex (#RGB / #RRGGBB) dans le markup rendu
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
  })

  /**
   * #682 (correctif de review) — le gabarit `lg` du DS a UNE source : l'utilitaire
   * `cta-lg` de `globals.css`. Les deux CTA la portent, et aucun ne répète la métrique
   * en valeurs arbitraires (`px-[…]`, `text-[…]`, `min-h-[…]`). Le rendu (une ligne,
   * 46 px) est verrouillé par `e2e/sprint-104-hero-cta-single-line.spec.ts`.
   */
  it('les deux CTA partagent l’utilitaire cta-lg, sans valeur arbitraire', () => {
    render(<HeroSection locale="fr" />)
    for (const id of ['landing-hero-cta-primary', 'landing-hero-cta-secondary']) {
      const cta = screen.getByTestId(id)
      const classes = [...cta.classList]
      expect(classes, id).toContain('cta-lg')
      expect(
        classes.filter((c) => /-\[/.test(c) && !c.startsWith('[&')),
        `${id} — valeurs arbitraires`,
      ).toEqual([])
    }
  })

  it('globals.css définit cta-lg sur la métrique .mt-btn--lg du DS', () => {
    const css = readFileSync(GLOBALS_CSS, 'utf8')
    const block = css.slice(css.indexOf('@utility cta-lg'))
    expect(block.length, '@utility cta-lg absente').toBeLessThan(css.length)
    const body = block.slice(0, block.indexOf('\n}\n') + 2)
    // Spécificité (0,1,1) : sans elle, les utilitaires du variant Button (émises
    // APRÈS celle-ci dans le layer) reprendraient padding, corps et hauteur.
    expect(body).toMatch(/&:is\(a, button\)/)
    expect(body).toMatch(/min-height:\s*46px/)
    expect(body).toMatch(/padding-block:\s*var\(--space-3\)/)
    expect(body).toMatch(/padding-inline:\s*22px/)
    expect(body).toMatch(/font-size:\s*14px/)
    expect(body).toMatch(/white-space:\s*normal/)
    expect(body).not.toMatch(/color|background/)
  })
})
