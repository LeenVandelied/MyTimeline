'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';

export function AppFooter() {
  const t = useTranslations();
  const locale = useLocale();
  
  return (
    <footer className="bg-surface py-4 text-ink-muted text-sm mt-auto">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
        <div>
          <p>© {new Date().getFullYear()} Ma Timeline. {t('common.footer.allRightsReserved')}</p>
        </div>
        {/*
          #74 — `flex-wrap` + `gap` au lieu de `space-x-4`.

          MESURÉ (jammy, `sprint-63-de-overflow-audit.spec.ts`) : en `de` les deux
          libellés (« Nutzungsbedingungen », « Datenschutzrichtlinie ») totalisent
          367 px et ne pouvaient PAS se replier, d'où un débordement HORIZONTAL DE
          PAGE sur tout écran portant ce pied de page — 24 px à 320 px, 4 px à
          359/360 px, avec défilement latéral réel (`maxScrollX` 24 / 4). `fr`,
          `en` et `es` tenaient (0 px) : défaut strictement allemand.

          `space-x-*` pose une marge sur les frères et se comporte mal dès que la
          ligne se replie (le premier élément d'une nouvelle ligne hérite d'une
          marge gauche parasite) : c'est `gap` qu'il faut ici, pas un `flex-wrap`
          ajouté à `space-x-4`.

          Effet visible : en `de` sous ~384 px les deux liens passent sur deux
          lignes centrées au lieu de déborder. Inchangé partout ailleurs.
        */}
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 md:mt-0">
          <Link href={`/${locale}/terms`} className="hover:text-ink transition-colors">
            {t('common.footer.termsOfService')}
          </Link>
          <Link href={`/${locale}/privacy`} className="hover:text-ink transition-colors">
            {t('common.footer.privacyPolicy')}
          </Link>
        </div>
      </div>
    </footer>
  );
}   