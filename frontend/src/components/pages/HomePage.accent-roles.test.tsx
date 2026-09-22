import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import postcss, { type Rule } from 'postcss'
import { describe, expect, it, vi } from 'vitest'
import HomePage from './HomePage'

/**
 * #615 — L'ACCENT EST UN SIGNAL, PAS UN ORNEMENT : verrou à l'échelle de la landing.
 *
 * La charte Graphite réserve l'accent à today / actif / liens (+ CTA). Les usages
 * décoratifs que listait l'issue (icônes des features, chiffres d'étapes, fonds
 * `bg-accent-soft` des badges et avatars) ont disparu avec #612 (frise) et #613
 * (témoignages). Il ne restait RIEN à retirer : ce fichier empêche leur retour.
 *
 * RÈGLE VÉRIFIÉE sur le DOM RENDU (burger ouvert, pour couvrir le panneau) : tout
 * élément portant une utilitaire d'accent doit être
 *   1. un contrôle ou un lien, ou se trouver DANS l'un d'eux (`a`, `button`) —
 *      survols, CTA, soulignement de lien ;
 *   2. OU appartenir à la bande CTA finale (fond `bg-accent` + encre `accent-ink`) :
 *      c'est un appel à l'action, reconnu par son CTA `landing-final-cta-register` ;
 *   3. OU figurer dans `PENDING` ci-dessous : dérogation NOMMÉE, en attente d'arbitrage.
 * Le marqueur « today » de la frise du hero est peint par CSS (`.mt-tlv__today*`),
 * sans utilitaire d'accent : hors du champ de ce balayage, et conforme.
 *
 * CE QU'IL N'ATTRAPE PAS : un accent posé par une règle CSS sur un sélecteur de
 * classe non-accent (d'où le 2ᵉ test, sur `landing.css`), ou par un style inline.
 */
vi.mock('next-intl', () => ({
  useTranslations: (ns?: string) => (key: string) => (ns ? `${ns}.${key}` : key),
  useLocale: () => 'fr',
}))

const ACCENT_UTILITY =
  /^(?:[a-z0-9-]+:)*(?:text|bg|border|ring|outline|fill|stroke|decoration|shadow|from|via|to)-accent(?:-[a-z]+)?$/

/**
 * Dérogations en attente d'arbitrage — PAS des usages conformes.
 * Le wordmark « Ma Timeline » (header + footer) est en `text-accent` : ce n'est ni un
 * lien, ni un CTA, ni today. Il est hors de la liste de l'issue et relève de
 * l'identité de marque : signalé en suite (issue-615-done.md), non modifié ici.
 */
const PENDING = [{ text: 'Ma Timeline', classes: ['text-accent'], reason: 'wordmark — arbitrage' }]

function accentClasses(el: Element): string[] {
  return Array.from(el.classList).filter((c) => ACCENT_UTILITY.test(c))
}

describe('Landing — l’accent n’apparaît que sur liens, CTA et today (#615)', () => {
  it('aucune utilitaire d’accent hors lien / contrôle / bande CTA / dérogation nommée', async () => {
    const user = userEvent.setup()
    const { container } = render(<HomePage params={{ locale: 'fr' }} />)
    await user.click(screen.getByTestId('landing-header-menu-toggle'))
    expect(screen.getByTestId('landing-header-menu')).toBeInTheDocument()

    const offenders: string[] = []
    let inspected = 0
    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      const classes = accentClasses(el)
      if (classes.length === 0) continue
      inspected++
      if (el.closest('a, button')) continue
      const section = el.closest('section')
      if (section?.querySelector('[data-testid="landing-final-cta-register"]')) continue
      const pending = PENDING.find(
        (p) => el.textContent?.trim() === p.text && classes.every((c) => p.classes.includes(c)),
      )
      if (pending) continue
      offenders.push(
        `<${el.tagName.toLowerCase()} class="${el.className}"> « ${el.textContent?.trim().slice(0, 40)} »`,
      )
    }
    // Garde anti-vacuité : le balayage voit bien les usages CONFORMES (CTA, liens).
    expect(inspected, 'aucun élément d’accent vu : le balayage ne mesure rien').toBeGreaterThan(5)
    expect(container.querySelector('#how-it-works')).not.toBeNull()
    expect(offenders, 'accent décoratif (ni lien, ni CTA, ni today)').toEqual([])
  })

  it('les dérogations nommées existent encore (sinon les retirer de PENDING)', () => {
    render(<HomePage params={{ locale: 'fr' }} />)
    for (const p of PENDING) {
      const hits = screen
        .getAllByText(p.text)
        .filter((el) => p.classes.every((c) => el.classList.contains(c)))
      expect(hits.length, `${p.reason} : dérogation périmée`).toBeGreaterThan(0)
    }
  })

  it('`landing.css` ne peint l’accent que sur le soulignement de lien et le titre légal', () => {
    const path = join(process.cwd(), 'src/styles/landing.css')
    const selectors: string[] = []
    postcss.parse(readFileSync(path, 'utf8'), { from: path }).walkRules((rule: Rule) => {
      let usesAccent = false
      rule.walkDecls((d) => {
        if (d.value.includes('--color-accent')) usesAccent = true
      })
      if (usesAccent) selectors.push(rule.selector)
    })
    // `.nav-link::after` = affordance de lien (conforme). `.gradient-text` = titres des
    // pages LÉGALES (dégradé encre → accent) : hors landing, signalé en suite.
    expect(selectors.sort()).toEqual(['.gradient-text', '.nav-link::after'])
  })
})
