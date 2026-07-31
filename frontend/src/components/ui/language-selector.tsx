'use client';

import { usePathname } from 'next/navigation';
import { Button } from './button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { Globe } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';

const languages = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' }
];

/**
 * APPARIEMENT FOND/ENCRE — item de la locale ACTIVE (Sprint 49, puis 52 / #346).
 *
 * L'item actif pose une encre FIXE, `text-accent-ink` — l'encre prévue POUR
 * l'accent. Toute règle d'état qui change SA SURFACE sans changer cette encre
 * doit donc atterrir sur une surface où `accent-ink` reste lisible. Deux
 * régressions successives sont nées de cet oubli :
 *
 *  - S49 : `hover:bg-surface-2` posé ici ne changeait QUE la surface, et l'encre
 *    `accent-ink` s'y retrouvait — mesuré **1.10:1 en clair** (#ffffff sur
 *    #f3f4f6), **1.17:1 en sombre**. Corrigé en retirant le `hover:` de la
 *    branche active. Le défaut n'apparaissait que dans un état MIXTE (souris
 *    posée + focus clavier parti), ce qu'aucune relecture ne devine.
 *  - S52 (#346) : `ui/dropdown-menu.tsx` a remplacé son `focus:bg-accent` par
 *    `focus:bg-accent-soft`. Cette règle-là vient d'un AUTRE fichier, donc
 *    d'un autre `className` — et elle posait l'encre `accent-ink` de cet item
 *    sur un aplat CLAIR : mesuré **1.23:1 en clair** (#ffffff sur #dbe9fc) et
 *    **1.28:1 en sombre** (#0b0c0e sur #16263a), sur la landing PUBLIQUE.
 *
 * CORRECTIF (#346 suivi) : l'item actif reprend la main sur sa surface au focus,
 * avec `focus:bg-accent-hover` — le jeton que le DS prévoit pour « hover = un
 * cran plus sombre sur un aplat primaire » (readme DS §Hover/press/focus, et
 * `.mt-btn--accent:hover` qui apparie déjà `accent-hover` à `accent-ink`).
 *
 * POURQUOI `accent-hover` ET NON `accent` — les deux options ont été rendues et
 * MESURÉES au navigateur (375 px, clair + sombre, `getComputedStyle` + fonds
 * composités), pas arbitrées sur le papier :
 *
 *   |                          | `focus:bg-accent` | `focus:bg-accent-hover` |
 *   | ratio au focus, clair    | 4.71:1            | **6.08:1**              |
 *   | ratio au focus, sombre   | 6.94:1            | **8.78:1**              |
 *   | delta de SURFACE repos→focus | 1.00:1 (nul)  | **1.29:1 / 1.27:1**     |
 *
 * `focus:bg-accent` rendait l'item actif strictement identique au focus et au
 * repos, et ne laissait que 0.21 de marge sur le seuil de 4.5 en clair.
 *
 * L'INDICATEUR DE FOCUS N'EST PAS PORTÉ PAR LA SURFACE, et c'est voulu : la
 * règle globale `:focus-visible` de `styles/ds/tokens/base.css` pose un contour
 * de 2px `accent` à 2px d'offset. VÉRIFIÉ RENDU sur cet item (Chromium et
 * Firefox, #383) : `outline: solid 2px rgb(14,95,196) offset=2px` en clair,
 * `rgb(77,155,255)` en sombre, `:focus-visible = true` au clavier,
 * `outline: none` hors focus.
 * Le contour tombe sur la surface du popover — 6.08:1 en clair, 6.48:1 en
 * sombre, très au-dessus des 3:1 de WCAG 1.4.11. Aucun anneau supplémentaire
 * n'est donc posé ici : ce serait un second indicateur concentrique, absent du
 * DS.
 *
 * Ce fichier ne pose AUCUN `outline-*` : depuis #383 (Sprint 58) la règle du DS
 * est layerisée dans `@layer base`, et ce qui menaçait cet item venait d'amont,
 * du `outline-hidden` de `ui/dropdown-menu.tsx` — retiré. Le sélecteur est donc
 * protégé par construction, sans dépendre de la position de la règle en cascade.
 *
 * LIMITE MESURÉE, ASSUMÉE : en modalité POINTEUR pure (menu ouvert à la souris),
 * `:focus-visible` vaut `false` et le contour ne s'affiche pas — le seul retour
 * au survol de l'item actif est alors le delta de surface de 1.29:1. Les items
 * INACTIFS, eux, passent à `accent-soft` (retour franc). L'item actif reste
 * néanmoins signalé en permanence par son aplat d'accent.
 *
 * Garde-fou : `e2e/landing-mobile-menu.spec.ts` (« sélecteur de langue »), qui
 * mesure les trois états (repos, survol, souris+clavier) dans les deux thèmes.
 * Le garde-fou AST `landing.hover-pairing.test.ts` ne peut PAS voir ce défaut :
 * il raisonne par `className`, et les deux moitiés vivaient dans deux fichiers.
 *
 * ----------------------------------------------------------------------------
 * CIBLE TACTILE DU DÉCLENCHEUR — PAT-S24-002 (#353, Sprint 58).
 *
 * Le déclencheur mesurait 36×36 px (`size="icon"` = `h-9 w-9`), sous les 44×44
 * exigés par `styles/ds/a11y-audit.md` (WCAG 2.5.5). Le visuel RESTE 36×36 :
 * la charte demande explicitement de « conserver le visuel mais étendre la zone
 * cliquable » (a11y-audit §Mobile Form). Seul un `::before` transparent 44×44
 * centré étend la hitbox, hors flux — donc AUCUN impact de layout, et le
 * `scrollWidth` du header de la landing (le contexte de montage le plus
 * contraint) ne peut pas bouger. Même technique que `.mt-drawer__close` et
 * `.mt-tlm .mt-zoom__btn` (`ds/components/timeline.css`).
 *
 * ⚠ PIT PAT-S24-002 — le pseudo déborde de (44−36)/2 = 4 px sur chaque bord. Un
 * ancêtre en `overflow:hidden` le CLIPPE en silence et la cible réelle retombe
 * sous 44 px (c'est ce qui était arrivé aux boutons de zoom, cible réelle
 * ~37×44). Bounding box du pseudo MESURÉE au navigateur (Chromium, `next dev`)
 * sur les trois contextes publics, à 320/375/390/1280 px : **44×44 partout**,
 * aucun ancêtre clippant (`HeaderSection`, `LandingMobileMenu`, pages d'auth).
 * Contextes applicatifs (`AppShell`, `MobileDrawer`, dashboard) NON mesurés :
 * ils exigent le backend. Leurs conteneurs (`p-3` / `p-4`) laissent toutefois
 * plus que les 4 px nécessaires.
 *
 * `relative` est posé sur le déclencheur uniquement pour ancrer ce pseudo.
 * AUCUN `ring-*` ni `outline-none` n'est ajouté : l'indicateur de focus
 * canonique reste le contour du DS porté par `@layer base` (#383, arbitrage
 * ui-design de la vague 0).
 *
 * ÉTIQUETTE ACCESSIBLE — le `sr-only` était la chaîne française « Changer de
 * langue » EN DUR, donc lue en français par les lecteurs d'écran en `en`, `es`
 * et `de`. C'est le seul contenu textuel du bouton (l'icône `Globe` n'en a
 * aucun). Elle passe par next-intl : `common.navigation.changeLanguage`,
 * renseignée dans les 4 locales.
 */
export function LanguageSelector() {
  const pathname = usePathname() || '';
  const locale = useLocale();
  const t = useTranslations('common');

  // Récupérer le chemin sans le préfixe de locale
  const pathnameWithoutLocale = pathname.replace(`/${locale}`, '');
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full before:absolute before:top-1/2 before:left-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']"
        >
          <Globe className="h-4 w-4" />
          <span className="sr-only">{t('navigation.changeLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-surface">
        {languages.map((language) => (
          <Link
            key={language.code}
            href={`/${language.code}${pathnameWithoutLocale}`}
            className="w-full"
          >
            <DropdownMenuItem
              className={
                locale === language.code
                  ? 'bg-accent text-accent-ink font-medium focus:bg-accent-hover'
                  : 'hover:bg-surface-2'
              }
            >
              {language.name}
            </DropdownMenuItem>
          </Link>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 