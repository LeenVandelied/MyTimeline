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
 * « Connexion » et le sélecteur de langue basculent dans `LandingMobileMenu`.
 * ⚠ L'échelle du DS Graphite n'est PAS celle de Tailwind — tout calcul de largeur doit
 * partir de `ds/tokens/typography.css` (`text-md` = 21 px, `text-lg` = 27 px), sinon le
 * budget de largeur est faux d'un facteur ~2. Mesuré au navigateur à 375 px :
 * logo 122 px + groupe 178 px (de) = 300 px pour 343 px disponibles.
 *
 * #347 : #334 avait borné la bascule à `md` (768 px), ce qui laissait le palier
 * tablette 768–1023 px rendre la mise en page desktop COMPLÈTE dans un conteneur de
 * 736 px utiles. Le tableau ci-dessous est un RELEVÉ HISTORIQUE (HEAD 473ed65, logo
 * encore à `md:text-3xl` 57 px) : il documente pourquoi la bascule est passée à `lg`,
 * il ne décrit plus le code actuel — #381 a depuis ramené le logo à 27 px, donc
 * NE PAS recalculer sur ces largeurs de logo.
 *
 *   locale | logo  | nav   | groupe droit | total | dispo | débordement
 *   fr     | 234   | 322,5 | 298,8        | 855,1 | 736   | +103 px
 *   de     | 234   | 302,9 | 305,5        | 842,2 | 736   |  +90 px
 *   es     | 234   | 302,4 | 323,5        | 859,7 | 736   | +108 px
 *   en     | 255,1 | 246,2 | 234,8        | 736,1 | 736   |    0 px
 *
 * Aucun bloc n'était seul coupable : les trois étaient DÉJÀ compressés à leur
 * min-content (le logo y tombait sur deux lignes, 137 px de haut) et leur somme
 * dépassait encore. D'où le choix de retirer des blocs du palier plutôt que de les
 * rétrécir : la bascule passe à `lg` (1024 px). Cf. `issue-347-done.md`.
 *
 * #381 — LE LOGO N'A PLUS DE PALIER PROPRE. #347 avait remonté tout le header à `lg`
 * en oubliant le logo, resté à `md:text-3xl` + `md:whitespace-normal`. Le désalignement
 * était factuel ; le défaut visible qu'on lui prêtait entre 768 et 1023 px, NON —
 * mesuré dans `mcr.microsoft.com/playwright:v1.61.1-jammy` (4 locales × clair/sombre),
 * le logo y tenait sur UNE ligne (57 px, 330 px de large, 223 à 262 px de marge), sans
 * débordement. Le `container` y est plafonné à 768 px, la nav est masquée : la place ne
 * manquait pas.
 *
 * Le vrai défaut était 1 px plus loin, à 1024 px, là où la nav revient :
 *
 *   locale | avant #381 (57 px)          | après #381 (27 px)
 *   fr     | 2 lignes, marge 0 px        | 1 ligne, 159 px, marge 58,5 px
 *   de     | 2 lignes, marge 0 px        | 1 ligne, 159 px, marge   82 px
 *   es     | 2 lignes, marge 0 px        | 1 ligne, 159 px, marge   72 px
 *   en     | 1 ligne,  marge 61 px       | 1 ligne, 159 px, marge 146,5 px
 *
 * Le header passait de 116,4 à 184,8 px de haut en `fr`/`de`/`es` — pour un wordmark.
 * 57 px était un vestige, pas un choix : le logo suit désormais `text-md` (21 px) puis
 * `text-lg` (27 px) à partir de `sm`, en `whitespace-nowrap` à TOUTES les largeurs.
 * Une seule bascule d'échelle, à `sm`, et elle ne croise aucun seuil de mise en page.
 * Hauteur du header après correctif : 92 px sous `lg`, 90 px au-dessus, dans les
 * 4 locales et les 2 thèmes. Les paliers 320/375/390 px sont INCHANGÉS (21 px,
 * 122 px de large) — `sm` est à 640 px. Garde-fou : `e2e/landing-header-logo.spec.ts`
 * (nombre de lignes + taille rendue + marge ; `scrollWidth <= clientWidth` seul est
 * aveugle à ce défaut, un logo sur deux lignes le satisfait).
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
        {/* #381 — ÉCHELLE ET RETOUR À LA LIGNE DU LOGO, PALIER UNIQUE.
            `text-md` (21 px) puis `text-lg` (27 px) à partir de `sm`, et
            `whitespace-nowrap` à TOUTES les largeurs. Ni `md:text-3xl` ni
            `md:whitespace-normal` : le wordmark ne se coupe plus jamais.
            Justification chiffrée dans le bloc JSDoc du composant. */}
        <div className="text-accent text-md sm:text-lg font-bold whitespace-nowrap">
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
            les métriques HORIZONTALES resserrées de la taille `sm` du DS (`text-xs`
            et un rembourrage horizontal réduit, cf. `button.tsx`) sans sa hauteur
            `h-8` : `h-11` reste, la cible tactile de 44 px exigée par #334 est
            préservée. Aucun `matchMedia` ne double ce seuil (contrairement à `lg`) :
            il est purement CSS, rien à resynchroniser côté JS.

            #423 (Sprint 63) — LE REMBOURRAGE PASSE DE `px-3` À `px-2` À CE PALIER.
            #347 avait rendu la marge POSITIVE ; elle restait à 5 px en `de`, sous le
            plancher « deux chiffres » de PIT-S52-001. Des trois blocs du header à
            320 px, deux sont INTOUCHABLES : le wordmark (échelle figée à 21 px par
            `e2e/landing-header-logo.spec.ts`, cf. #381) et le burger (44 px de cible
            tactile, #334). Le rembourrage horizontal du CTA est donc le SEUL degré de
            liberté restant — `gap-1` est déjà au minimum utile. 8 px récupérés, dans
            les 4 locales à la fois.

            ── RELEVÉ APRÈS CORRECTIF #423 — 320 px, image `mcr.microsoft.com/
            playwright:v1.61.1-jammy`, mesuré le 2026-08-31 sur `sprint/63`
            (`--workers=1`, serveur `next dev` de l'hôte) :

              locale | logo | groupe droit | requis | dispo | MARGE | bord droit
              en     | 122  | 118          | 240    | 288   |  48   | 304
              fr     | 122  | 140          | 262    | 288   |  26   | 304
              es     | 122  | 148          | 270    | 288   |  18   | 304
              de     | 122  | 153          | 275    | 288   |  13   | 304

            ⚠ UN SEUL CHIFFRE DE MARGE, ET IL VAUT 13 px (`de`, pire cas). Le header
            est `justify-between` et la `nav` est en `display:none` sous `lg` : il n'y
            a que DEUX flex items, donc « marge restante dans la boîte de contenu » et
            « écart entre le logo et le groupe droit » sont LA MÊME GRANDEUR — 13 px,
            pas deux valeurs. Ce bloc a successivement annoncé « 23 px » (PR #374),
            « 7 px » puis « 5 px » (addendum #381) : trois chiffres pour une seule
            mesure, dont deux périmés. Ne PAS réintroduire de second chiffre : si le
            layout change, on remesure et on REMPLACE ce tableau, on ne le double pas.
            Le bord droit du groupe est à 304 px pour 320 de viewport dans les
            4 locales, soit 16 px avant le bord de l'écran, et
            `documentElement.scrollWidth === clientWidth === 320`.

            ⚠ CE PALIER S'ARRÊTE À 359 px, PAS À 360. Tailwind v4 compile
            `max-[360px]` en `width < 360`, donc à 360 px le CTA a déjà repris ses
            métriques pleines : le groupe passe de 153 à 183 px en `de` et la marge
            retombe de 52 px (à 359) à 23 px (à 360). C'est le SECOND creux local de
            la plage mobile, et il reste au-dessus du plancher. Mesuré dans la même
            image : `de` vaut 13 px à 320, 33 à 340, 52 à 359, 23 à 360, 24 à 361,
            38 à 375, 53 à 390 — le pire cas de toute la plage est donc bien 320 px.
            Aucun débordement (`scrollWidth === clientWidth`) sur aucune de ces
            largeurs, dans les 4 locales.

            Garde-fou : `MIN_GAP_PX` de `e2e/landing-header-logo.spec.ts` vaut 10 px
            sous 768 px depuis #423 — c'est lui qui matérialise PIT-S52-001. Il a été
            vu ROUGE sur ce fichier avant correctif (`de` : « mesuré 5px, plancher
            10px »), et il n'a jamais rougi à 375/390 px.

            #381 — CE BLOC RESTE EXACT pour les paliers concernés : le correctif de
            #381 ne touche que >= `sm` (640 px), à 320 px le logo était et reste à
            `text-md` (21 px, boîte 122 px). */}
        <Button
          asChild
          className="bg-accent hover:bg-accent-hover text-accent-ink h-11 transition-all max-[360px]:px-2 max-[360px]:text-xs lg:h-9"
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
          className="text-ink-muted border-rule-emphasis hover:bg-accent-soft flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border transition-colors duration-200 lg:hidden"
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
