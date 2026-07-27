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
            <div className="text-accent mb-2 text-2xl font-bold">Ma Timeline</div>
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
