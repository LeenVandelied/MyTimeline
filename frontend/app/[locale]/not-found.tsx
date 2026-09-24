'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'

import { EphemerisLeaf } from '@/components/shared/EphemerisLeaf'
import { StateScreen, stateActionPrimary } from '@/components/shared/StateScreen'

/**
 * #57 — Écran 404 custom du segment `[locale]` (remplace la 404 Next par
 * défaut). Rendu par le boundary `notFound()` : lorsqu'une page enfant appelle
 * `notFound()`, ce fichier est monté À L'INTÉRIEUR du `NextIntlClientProvider`
 * de `[locale]/layout.tsx` → `useLocale` et `useTranslations` résolvent. Client
 * Component pour lire la locale courante de façon fiable (pas de `params`
 * fournis à `not-found.tsx`).
 *
 * ⚠ JOIGNABILITÉ (relevé #627) : aucune page n'appelle `notFound()` à ce jour,
 * et une URL inconnue sous une locale valide (`/fr/nope`) est servie par
 * `app/global-not-found.tsx`, PAS par ce fichier (mesuré sur un serveur local :
 * `data-testid="global-not-found-screen"`). Les deux écrans doivent donc rester
 * alignés — même feuillet, mêmes libellés.
 *
 * #627 — « éphéméride » du handoff (`docs/design/graphite-handoff.md` §7) :
 * feuillet daté du jour (calculé APRÈS montage, cf. `EphemerisLeaf`) + « Cette
 * page n'a pas de date dans l'almanach ». Plus de boussole ni de gros « 404 » :
 * le code ne figure que dans le sur-titre.
 *
 * Lien de retour préfixé locale (`/${locale}`) : `localePrefix: 'always'` casse tout
 * chemin non préfixé. Cible = racine de locale, route canonique de la landing depuis
 * l'ADR-006 (`/${locale}/home` redirige désormais en 308). La maquette dit
 * « Revenir à aujourd'hui » (vers le tableau de bord) ; la racine de locale sert la
 * landing, y compris à une personne connectée (aucune redirection), d'où le
 * libellé `backHome` conservé.
 * Clair + sombre via tokens Graphite (StateScreen, EphemerisLeaf).
 */
export default function LocaleNotFound() {
  const locale = useLocale()
  const t = useTranslations('errors.notFound')

  return (
    <StateScreen
      testId="not-found-screen"
      eyebrow={t('eyebrow')}
      aside={<EphemerisLeaf locale={locale} formatWeek={(week) => t('week', { week })} />}
      title={t('title')}
      description={t('description')}
      actions={
        <Link href={`/${locale}`} className={stateActionPrimary} data-testid="not-found-home-link">
          {t('backHome')}
        </Link>
      }
    />
  )
}
