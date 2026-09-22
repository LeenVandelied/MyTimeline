'use client'

import { useTranslations } from 'next-intl'

import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'

/**
 * #629 — Fallback de segment (Suspense) de la page Réglages.
 *
 * Reproduit l'enveloppe de `page.tsx` (paddings, `max-w-5xl`, en-tête `mb-6` avec le
 * VRAI `<h1>` `settings.pageTitle`) et celle de `SettingsShell` (barre d'onglets
 * `h-11` bordée en bas, `gap-6` avant le panneau). L'emplacement du bouton retour
 * (`settings-back`, `h-11 w-11` = 44 px depuis la clôture du Sprint 96, `lg:hidden`)
 * est réservé par un bloc vide de même taille : sans lui, le titre glisserait de
 * 56 px (44 + `gap-3`) à l'arrivée de la page sous 1024 px. Les deux tailles doivent
 * rester synchrones.
 *
 * Variante `list` pour le panneau : les chapitres sont des formulaires empilés
 * (champ + libellé par ligne), plus proches de lignes que de cartes ou de lanes.
 * Forme DESKTOP uniquement : sous 768 px la page bascule sur `MobileSettings` après
 * hydratation (`useMediaQuery` rend `false` au premier paint), ce fallback suit donc
 * la même forme que le premier rendu de la page.
 *
 * Libellé `settings.loading` (clé du namespace) plutôt que le générique
 * `common.spinner.loading` : l'état de chargement nomme son contexte (DEC-S82-003).
 */
export default function SettingsLoading() {
  const t = useTranslations('settings')

  return (
    <div className="bg-bg text-ink flex min-h-screen flex-col">
      <div className="flex-grow px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-6 flex items-center gap-3">
            <div
              className="h-11 w-11 shrink-0 lg:hidden"
              aria-hidden="true"
              data-testid="settings-back-placeholder"
            />
            <h1 className="text-xl font-semibold">{t('pageTitle')}</h1>
          </div>

          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
            <div className="border-rule flex flex-row gap-1 border-b" aria-hidden="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex h-11 shrink-0 items-center px-3">
                  <div className="bg-surface-2 h-3 w-20 animate-pulse rounded-md" />
                </div>
              ))}
            </div>

            <LoadingSkeleton
              variant="list"
              rows={5}
              label={t('loading')}
              testId="settings-loading-skeleton"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
