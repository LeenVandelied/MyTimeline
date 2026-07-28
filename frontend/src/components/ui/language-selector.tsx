'use client';

import { usePathname } from 'next/navigation';
import { Button } from './button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { Globe } from 'lucide-react';
import { useLocale } from 'next-intl';
import Link from 'next/link';

const languages = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' }
];

/**
 * APPARIEMENT FOND/ENCRE AU SURVOL — item de la locale ACTIVE (Sprint 49).
 *
 * L'item actif pose `bg-accent text-accent-foreground` (= `accent-ink`, l'encre
 * prévue POUR l'accent). Il portait AUSSI `hover:bg-surface-2`, qui ne change
 * QUE la surface : l'encre `accent-ink` restait en place sur un fond `surface-2`.
 * `tailwind-merge` ne fusionne pas `hover:bg-*` avec `focus:bg-*` (clés
 * distinctes), donc la règle coexistait avec le `focus:bg-accent` de
 * `dropdown-menu.tsx` — et tant que Radix focalise l'item au `pointermove`, le
 * `focus:` gagne et le défaut reste invisible.
 *
 * MESURÉ AU NAVIGATEUR (375 px, panneau burger de la landing) : la séquence
 * « souris posée sur l'item actif, puis navigation au CLAVIER vers un autre
 * item » retire le focus SANS retirer le `:hover` — et là le libellé mesure
 * **1.10:1 en clair** (#ffffff sur #f3f4f6) et **1.17:1 en sombre** (#0b0c0e sur
 * #1b1e24) : illisible dans les DEUX thèmes. Avec le focus (survol souris seul),
 * le même item mesure 4.71:1 / 6.94:1 — conforme. Le défaut n'existe donc que
 * dans un état mixte clavier+souris, ce qu'aucune relecture ne devine.
 *
 * Correctif : l'item ACTIF ne change plus de surface au survol — sa surface EST
 * déjà l'accent, et son encre y est appariée. La branche INACTIVE garde
 * `hover:bg-surface-2` : elle n'impose aucune encre, l'encre de repos du
 * `popover` reste en place sur les deux fonds.
 * Garde-fou : `e2e/landing-mobile-menu.spec.ts` (« sélecteur de langue »).
 */
export function LanguageSelector() {
  const pathname = usePathname() || '';
  const locale = useLocale();
  
  // Récupérer le chemin sans le préfixe de locale
  const pathnameWithoutLocale = pathname.replace(`/${locale}`, '');
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
          <Globe className="h-4 w-4" />
          <span className="sr-only">Changer de langue</span>
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
              className={locale === language.code ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-surface-2'}
            >
              {language.name}
            </DropdownMenuItem>
          </Link>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 