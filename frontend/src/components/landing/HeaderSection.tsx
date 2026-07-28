'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LanguageSelector } from '@/components/ui/language-selector'
import { LandingMobileMenu } from './LandingMobileMenu'

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
 *
 * #334 : le header débordait de 173 px à 375 px de large. Sous `md`, le groupe droit
 * est réduit à `[Inscription] [burger]` — les ancres de navigation, « Connexion » et le
 * sélecteur de langue basculent dans `LandingMobileMenu`. Le logo suit l'échelle typo
 * du DS (`text-md` 21 px → `text-lg` 27 px → `text-3xl` 57 px).
 * ⚠ L'échelle du DS Graphite n'est PAS celle de Tailwind (`text-3xl` = 57 px, pas
 * 30 px) — tout calcul de largeur doit partir de `ds/tokens/typography.css`, sinon
 * le budget de largeur est faux d'un facteur ~2. Mesuré au navigateur à 375 px :
 * logo 121 px + groupe 178 px (de) = 299 px pour 343 px disponibles.
 * À `md:` et au-dessus, le header est rendu strictement à l'identique d'avant #334.
 */
export function HeaderSection({ locale }: HeaderSectionProps) {
  const t = useTranslations()
  const [menuOpen, setMenuOpen] = useState(false)

  /** Ancres de navigation — même ordre que les sections rendues par `HomePage`. */
  const navLinks = [
    { href: '#features', label: t('common.landing.navigation.features') },
    { href: '#how-it-works', label: t('common.landing.navigation.howItWorks') },
    { href: '#testimonials', label: t('common.landing.navigation.testimonials') },
  ]

  return (
    <header className="container mx-auto flex items-center justify-between px-4 py-6">
      <div className="flex items-center">
        {/* `whitespace-nowrap` UNIQUEMENT sous `md` : à `text-3xl` (57 px) le logo
            se coupe en deux lignes, et l'empêcher élargirait le header desktop de
            234 → 328 px. Au-dessus de `md` on restitue donc le comportement d'origine. */}
        <div className="text-accent text-md sm:text-lg md:text-3xl font-bold whitespace-nowrap md:whitespace-normal">
          Ma Timeline
        </div>
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

      <div className="flex items-center gap-2 md:gap-4">
        {/* Bascule dans `LandingMobileMenu` sous `md` — cf. #334. */}
        <div className="hidden items-center gap-4 md:flex">
          <LanguageSelector />
          <Button
            asChild
            variant="outline"
            className="border-accent text-accent hover:bg-accent hover:text-accent-ink transition-all"
          >
            <Link href={`/${locale}/login`}>{t('common.login.title')}</Link>
          </Button>
        </div>

        {/* CTA primaire : reste visible à toutes les largeurs. `h-11` = 44 px de cible
            tactile sous `md`, `md:h-9` restaure la hauteur desktop d'origine. */}
        <Button
          asChild
          className="bg-accent hover:bg-accent-hover text-accent-ink h-11 transition-all md:h-9"
        >
          <Link href={`/${locale}/register`}>{t('common.landing.buttons.register')}</Link>
        </Button>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-controls="landing-header-menu"
          aria-label={t('common.landing.navigation.menuOpen')}
          data-testid="landing-header-menu-toggle"
          className="text-ink-muted border-rule-emphasis hover:bg-accent-soft focus-visible:ring-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none md:hidden"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <LandingMobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        locale={locale}
        navLinks={navLinks}
      />
    </header>
  )
}
