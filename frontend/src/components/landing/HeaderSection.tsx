'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { LanguageSelector } from '@/components/ui/language-selector'

interface HeaderSectionProps {
  locale: string
}

/**
 * En-tête / navigation de la landing — extrait du monolithe `HomePage` (#56).
 *
 * #295 : les deux boutons d'authentification utilisent `<Button asChild>` avec le
 * `<Link>` À L'INTÉRIEUR. Le motif inverse (`<Link passHref><Button>`) rendait un
 * `<button>` imbriqué dans un `<a>` — HTML invalide, double cible de tabulation et
 * sémantique cassée pour les lecteurs d'écran. `asChild` (Radix `Slot`) fusionne les
 * props du bouton sur le `<a>` : un seul élément interactif, styles conservés.
 *
 * « Ma Timeline » est le nom du produit, pas une chaîne traduisible — il reste littéral
 * (même traitement que dans le pied de page).
 */
export function HeaderSection({ locale }: HeaderSectionProps) {
  const t = useTranslations()

  /** Ancres de navigation — même ordre que les sections rendues par `HomePage`. */
  const navLinks = [
    { href: '#features', label: t('common.landing.navigation.features') },
    { href: '#how-it-works', label: t('common.landing.navigation.howItWorks') },
    { href: '#testimonials', label: t('common.landing.navigation.testimonials') },
  ]

  return (
    <header className="container mx-auto flex items-center justify-between px-4 py-6">
      <div className="flex items-center">
        <div className="text-accent text-3xl font-bold">Ma Timeline</div>
      </div>

      <nav className="text-ink-muted hidden space-x-8 md:flex">
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="nav-link hover:text-accent transition duration-200"
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center space-x-4">
        <LanguageSelector />
        <Button
          asChild
          variant="outline"
          className="border-accent text-accent hover:bg-accent hover:text-accent-ink transition-all"
        >
          <Link href={`/${locale}/login`}>{t('common.login.title')}</Link>
        </Button>
        <Button asChild className="bg-accent hover:bg-accent-hover text-accent-ink transition-all">
          <Link href={`/${locale}/register`}>{t('common.landing.buttons.register')}</Link>
        </Button>
      </div>
    </header>
  )
}
