'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/useMediaQuery'
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
 * #334 : le header débordait de 173 px à 375 px de large. Sous le point de bascule, le
 * groupe droit est réduit à `[Inscription] [burger]` — les ancres de navigation,
 * « Connexion » et le sélecteur de langue basculent dans `LandingMobileMenu`. Le logo
 * suit l'échelle typo du DS (`text-md` 21 px → `text-lg` 27 px → `text-3xl` 57 px).
 * ⚠ L'échelle du DS Graphite n'est PAS celle de Tailwind (`text-3xl` = 57 px, pas
 * 30 px) — tout calcul de largeur doit partir de `ds/tokens/typography.css`, sinon
 * le budget de largeur est faux d'un facteur ~2. Mesuré au navigateur à 375 px :
 * logo 121 px + groupe 178 px (de) = 299 px pour 343 px disponibles.
 *
 * #347 : #334 avait borné la bascule à `md` (768 px), ce qui laissait le palier
 * tablette 768–1023 px rendre la mise en page desktop COMPLÈTE dans un conteneur de
 * 736 px utiles. Mesuré au navigateur au HEAD 473ed65, à 768 px (min-content des trois
 * blocs, conteneur `container` = 768 px moins 2×16 px de `px-4`) :
 *
 *   locale | logo  | nav   | groupe droit | total | dispo | débordement
 *   fr     | 234   | 322,5 | 298,8        | 855,1 | 736   | +103 px
 *   de     | 234   | 302,9 | 305,5        | 842,2 | 736   |  +90 px
 *   es     | 234   | 302,4 | 323,5        | 859,7 | 736   | +108 px
 *   en     | 255,1 | 246,2 | 234,8        | 736,1 | 736   |    0 px
 *
 * Aucun bloc n'est seul coupable : les trois sont DÉJÀ compressés à leur min-content
 * (le logo y tombe sur deux lignes, 137 px de haut) et leur somme dépasse encore.
 * D'où le choix de retirer des blocs du palier plutôt que de les rétrécir : la bascule
 * passe à `lg` (1024 px). Les deux autres arbitrages proposés par l'issue ont été
 * SIMULÉS au navigateur avant de trancher — ne faire basculer que le groupe droit
 * (langue + Connexion) ramène le débordement à zéro mais avec **0 px de marge** dans
 * les 4 locales, logo toujours sur deux lignes ; la bascule à `lg` laisse 223 à 258 px
 * de marge et remet le logo sur une ligne. Cf. `issue-347-done.md`.
 *
 * À `lg:` et au-dessus, le header est rendu strictement à l'identique d'avant #334.
 */
/**
 * Point de bascule `lg` de Tailwind — le panneau mobile est en `lg:hidden`.
 * Codé ici parce qu'un `matchMedia` ne peut pas lire une classe utilitaire ; si
 * le thème redéfinit `--breakpoint-lg`, les deux doivent bouger ensemble.
 * ⚠ Trois choses ne bougent QUE de concert (#334, #347) : cette requête, le
 * `lg:hidden` du burger plus bas, et celui de `LandingMobileMenu`. Désynchronisées,
 * le focus-trap tourne sur un panneau masqué et avale l'Escape de toute la page.
 */
const LG_BREAKPOINT_QUERY = '(min-width: 64rem)'

export function HeaderSection({ locale }: HeaderSectionProps) {
  const t = useTranslations()
  const [menuOpen, setMenuOpen] = useState(false)

  /**
   * Référence STABLE : `onClose` est passé en `onEscape` à `useFocusTrap`, qui
   * l'a en dépendance d'effet. Une fonction recréée à chaque rendu rejouait donc
   * le cleanup du trap (`previousFocus.focus()`) puis le refocus du premier
   * élément à chaque re-rendu du parent — un saut de focus visible.
   */
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  /**
   * Fermeture au passage en `lg` et au-delà.
   *
   * Sans cela, `menuOpen` reste vrai : le panneau est bien masqué par
   * `lg:hidden`, mais `useFocusTrap` continue de tourner sur un panneau
   * invisible — il avale l'Escape de toute la page et piège la tabulation dans
   * un dialogue que personne ne voit, pendant que le burger, lui, a disparu.
   *
   * `useMediaQuery` (#63) plutôt qu'un `matchMedia` réécrit ici : il est déjà
   * SSR-safe et déjà moqué dans `vitest.setup.ts`.
   */
  const isDesktop = useMediaQuery(LG_BREAKPOINT_QUERY)
  useEffect(() => {
    if (isDesktop) setMenuOpen(false)
  }, [isDesktop])

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

      <nav className="text-ink-muted hidden space-x-8 lg:flex">
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

      <div className="flex items-center gap-2 max-[360px]:gap-1 lg:gap-4">
        {/* Bascule dans `LandingMobileMenu` sous `lg` — cf. #334, seuil remonté par #347. */}
        <div className="hidden items-center gap-4 lg:flex">
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
            tactile sous `lg` (donc aussi sur le palier tablette, où l'on touche encore),
            `lg:h-9` restaure la hauteur desktop d'origine.

            #347 (suivi) — PALIER PETIT TÉLÉPHONE, `max-[360px]`. À 320 px le header
            n'a que 288 px utiles (`px-4` de part et d'autre) et empile trois blocs
            INCOMPRESSIBLES : logo 122 px (`whitespace-nowrap`, #334), ce CTA, `gap-2`
            et le burger 44 px. Mesuré au navigateur Linux (image Playwright jammy,
            polices de la CI) au HEAD 13704ed, largeur du CTA par locale :

              locale | CTA | total requis | dispo | bord droit du groupe
              en     |  92 | 266          | 288   | 304  (marge 16 px)
              fr     | 117 | 291          | 288   | 307  (marge 13 px)
              es     | 126 | 300          | 288   | 316  (marge  4 px)
              de     | 131 | 305          | 288   | 321  -> DÉBORDE de 1 px

            ⚠ Ce défaut est ANTÉRIEUR à #347 : mesuré identique sur `origin/dev`
            (a2d8e8e, seuil encore `md`) dans le même conteneur. Il ne se voyait pas
            parce que l'assertion de #334 ne tournait qu'à 375 px, et parce que les
            métriques de police de macOS rendent « Registrieren » assez étroit pour
            tenir — c'est Ubuntu qui fait basculer. Ne PAS mesurer ce palier sur macOS.

            Corriger `de` seul aurait laissé `es` à 4 px du même échec. On reprend donc
            les métriques HORIZONTALES de la taille `sm` du DS (`px-3` + `text-xs`,
            cf. `button.tsx`) sans sa hauteur `h-8` : `h-11` reste, la cible tactile
            de 44 px exigée par #334 est préservée. Après correctif, `de` retombe à
            281 px requis pour 288 dispo — dans la boîte de contenu, 23 px avant
            débordement. Aucun `matchMedia` ne double ce seuil (contrairement à `lg`) :
            il est purement CSS, rien à resynchroniser côté JS. */}
        <Button
          asChild
          className="bg-accent hover:bg-accent-hover text-accent-ink h-11 transition-all max-[360px]:px-3 max-[360px]:text-xs lg:h-9"
        >
          <Link href={`/${locale}/register`}>{t('common.landing.buttons.register')}</Link>
        </Button>

        {/* `aria-controls` n'est posé QUE si la cible existe : le panneau n'est
            pas rendu à l'état fermé (`if (!open) return null`), et un idref
            pendant est une référence invalide pour les technologies d'assistance. */}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? 'landing-header-menu' : undefined}
          aria-label={t('common.landing.navigation.menuOpen')}
          data-testid="landing-header-menu-toggle"
          className="text-ink-muted border-rule-emphasis hover:bg-accent-soft focus-visible:ring-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none lg:hidden"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <LandingMobileMenu
        open={menuOpen}
        onClose={closeMenu}
        locale={locale}
        navLinks={navLinks}
      />
    </header>
  )
}
