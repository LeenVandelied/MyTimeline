import type { LegalSection } from '@/lib/legal-pages'
import { toRomanNumeral } from '@/lib/legal-pages'

/**
 * Traducteur next-intl, réduit à ce dont ce composant a besoin.
 *
 * On reçoit le `t` déjà résolu par la page (server component) plutôt que
 * d'appeler `getTranslations` ici : le composant reste agnostique du namespace
 * et, surtout, SYNCHRONE — donc rendu côté serveur sans `await` ni `'use client'`.
 */
type Translate = (key: string) => string

type LegalTableOfContentsProps = {
  sections: readonly LegalSection[]
  /** Libellé du sommaire, déjà traduit par l'appelant. */
  label: string
  t: Translate
  /** Discrimine les deux pages dans les sélecteurs E2E. */
  testId: string
}

/**
 * Sommaire numéroté en chiffres romains, ancré vers les sections de la page.
 *
 * AUCUN JAVASCRIPT. Ce sont de simples `<a href="#id">` : le saut d'ancre est
 * assuré par le navigateur. Rien ici ne justifie `'use client'`, et la page
 * reste intégralement rendue côté serveur.
 *
 * ACCESSIBILITÉ. Le chiffre romain est `aria-hidden` et le lien ne porte donc
 * que le titre de section comme nom accessible. Sans cela, un lecteur d'écran
 * annoncerait « I », « II »… — que la plupart épellent ou lisent comme des
 * lettres — avant chaque intitulé. Le repère visuel est conservé, le bruit
 * sonore non.
 */
export function LegalTableOfContents({ sections, label, t, testId }: LegalTableOfContentsProps) {
  return (
    <nav
      aria-label={label}
      data-testid={testId}
      className="bg-surface rounded-xl p-6 shadow-lg border border-rule mb-8"
    >
      <h2 className="text-lg font-semibold mb-4">{label}</h2>
      <ol className="space-y-2">
        {sections.map((section, index) => (
          <li key={section.id} className="flex gap-3">
            <span aria-hidden="true" className="text-ink-muted tabular-nums shrink-0 w-10">
              {toRomanNumeral(index + 1)}.
            </span>
            <a
              href={`#${section.id}`}
              data-testid={`${testId}-link-${section.id}`}
              // #457 — PAS de `focus-visible:outline-none focus-visible:ring-2
              // focus-visible:ring-ring` ici. La COULEUR était juste
              // (`--color-ring` est un alias de `--color-focus`,
              // `globals.css:114`), mais le MÉCANISME viole DEC-S58-001 : le
              // trio supprimait le contour du DS pour le remplacer par un
              // `box-shadow`. Trois conséquences — un second motif d'indicateur
              // absent de la charte ; un anneau ROGNÉ par tout ancêtre
              // `overflow` là où `outline` déborde (même raisonnement qu'en
              // DEC-S58-004) ; et la perte du repli `@media (forced-colors:
              // active)` que seul `outline` émet. Le contour `:focus-visible`
              // du DS (`ds/tokens/base.css`, `@layer base`) s'applique tout
              // seul : il n'y a AUCUNE classe de focus à poser.
              // `rounded-sm` est conservé — il donne sa forme à ce contour.
              className="text-ink-muted hover:text-ink underline-offset-4 hover:underline rounded-sm"
            >
              {t(section.titleKey)}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
