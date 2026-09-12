'use client'

import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'

export interface FooterSectionProps {
  locale?: string
}

/**
 * Pied de page de la landing (#56).
 *
 * Déplacé depuis `components/ui/footer.tsx` vers `components/landing/` : ce pied de
 * page n'a jamais servi qu'à la landing (toutes les autres pages utilisent
 * `ui/footer-app`). Il rejoint donc les autres sections. Contenu et styles inchangés,
 * ils étaient déjà sur les tokens DS.
 *
 * MENTIONS LÉGALES — l'entrée `footer.legalNotice` pointait sur `<a href="#">`, un lien
 * mort qui renvoie en haut de page. Elle est RETIRÉE plutôt que câblée : les mentions
 * légales ont un contenu juridique obligatoire (identité de l'éditeur, directeur de
 * publication, hébergeur) qu'on ne peut pas inventer, et une route placeholder vide
 * serait une promesse de conformité fausse. Un lien absent est plus honnête qu'un lien
 * mort, et un lien mort est en outre un défaut d'accessibilité. Les clés i18n sont
 * CONSERVÉES dans les quatre locales : le jour où la page existe, il suffit de
 * rétablir l'entrée. Suivi : follow-up « créer la page mentions légales ».
 *
 * #348 (AC #2) — ÉCHELLE DU WORDMARK. Il portait `text-2xl`, soit 45 px dans l'échelle
 * DS (PAS 24) et à TOUTES les largeurs, aucun palier responsive. Il BATTAIT donc le h1
 * du hero sous 768 px (45 contre 35) et l'ÉGALAIT de 768 à 1023 px (45 contre 45) :
 * l'AC « le h1 reste le plus grand élément de la page » était en défaut à cause du pied
 * de page. Défaut PRÉEXISTANT à #348 (le h1 valait alors 36 px, défaut Tailwind de
 * `text-4xl`), pas une régression — mais sa correction est nécessaire à l'AC.
 *
 * Aligné sur le wordmark du header (`HeaderSection`, fixé par #381) : `text-md sm:text-lg`
 * = 21 / 27 px. C'est le MÊME wordmark, il n'y a pas de raison qu'il ait deux échelles.
 *
 * ⚠ PAS de `whitespace-nowrap` ici, contrairement au header — et c'est MESURÉ, pas déduit.
 * Le header le porte parce qu'il est un `flex` contraint partageant sa ligne avec la nav
 * et les CTA. Le footer, lui, est une colonne d'un `flex-col md:flex-row` : à 320 px le
 * wordmark dispose de 288 px pour ~110 px de texte, et rend sur UNE ligne dans les quatre
 * locales sans l'aide d'aucune utilitaire. Ajouter `whitespace-nowrap` serait une
 * protection inerte contre un débordement qui n'existe pas.
 *
 * ⚠ Pas de `leading-*` explicite nécessaire : la description `<p>` et le wordmark rendent
 * tous deux hors du périmètre de `base.css:53` (qui ne couvre que `h1..h6`), mais aucune
 * hiérarchie ne dépend de leur interligne — seule la TAILLE est assertée ici. Le wordmark
 * (21/27) reste au-dessus de la description (15 px, héritée du `body`) : l'inversion est
 * supprimée, pas déplacée. Relevé : `e2e/landing-typography-hierarchy.spec.ts`.
 */
export function FooterSection({ locale }: FooterSectionProps = {}) {
  const t = useTranslations()
  const defaultLocale = useLocale()
  const currentLocale = locale || defaultLocale
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-bg border-rule border-t py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between md:flex-row">
          <div className="mb-6 md:mb-0">
            <div className="text-accent text-md mb-2 font-bold sm:text-lg">Ma Timeline</div>
            <p className="text-ink-muted">{t('common.landing.footer.description')}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <div>
              <h4 className="text-ink mb-3 font-bold">{t('common.landing.footer.product')}</h4>
              <ul className="text-ink-muted space-y-2">
                <li>
                  <a href="#features" className="hover:text-accent transition">
                    {t('common.landing.footer.features')}
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-accent transition">
                    {t('common.landing.footer.howItWorks')}
                  </a>
                </li>
                <li>
                  <a href="#testimonials" className="hover:text-accent transition">
                    {t('common.landing.footer.testimonials')}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-ink mb-3 font-bold">{t('common.landing.footer.legal')}</h4>
              <ul className="text-ink-muted space-y-2">
                <li>
                  <Link href={`/${currentLocale}/terms`} className="hover:text-accent transition">
                    {t('common.landing.footer.terms')}
                  </Link>
                </li>
                <li>
                  <Link href={`/${currentLocale}/privacy`} className="hover:text-accent transition">
                    {t('common.landing.footer.privacy')}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-ink mb-3 font-bold">{t('common.landing.footer.account')}</h4>
              <ul className="text-ink-muted space-y-2">
                <li>
                  <Link href={`/${currentLocale}/login`} className="hover:text-accent transition">
                    {t('common.landing.footer.login')}
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/${currentLocale}/register`}
                    className="hover:text-accent transition"
                  >
                    {t('common.landing.footer.register')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-rule text-ink-faint mt-12 border-t pt-8 text-center">
          <p>
            &copy; {currentYear} Ma Timeline. {t('common.footer.allRightsReserved')}
          </p>
        </div>
      </div>
    </footer>
  )
}
