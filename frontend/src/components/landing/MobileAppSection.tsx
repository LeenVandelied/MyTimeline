'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

/**
 * Annonce des applications mobiles — extrait du monolithe `HomePage` (#56).
 *
 * MIGRATION DE TOKEN (#293) — les deux boutons de store sont des boutons SANS
 * remplissage : leur bordure EST l'affordance, elle tombe donc dans le tier
 * « bordure fonctionnelle » du DS, soumis au seuil WCAG UI ≥ 3:1. Ils étaient sur
 * `border-rule` (1.24:1, tier DÉCORATIF) — sous le seuil. Ils passent à
 * `border-rule-emphasis` (3.97:1 clair / 4.49:1 sombre), le tier livré par #293
 * précisément pour ce cas. `border-rule` reste réservé aux cadres et séparateurs.
 *
 * Ces boutons n'ont pas de `href` : les applications ne sont pas publiées (« Bientôt
 * sur iOS / Android »). On les laisse en `<button>` non interactif plutôt que de les
 * câbler sur une cible inexistante — pas de `asChild` ici, donc pas de #295 à traiter.
 */
export function MobileAppSection() {
  const t = useTranslations()

  return (
    <section className="section-animation py-20">
      <div className="container mx-auto flex flex-col items-center px-4 md:flex-row">
        <div className="mb-10 md:mb-0 md:w-1/2">
          <h2 className="mb-6 text-lg leading-tight font-bold md:text-xl">
            {t('common.landing.mobileApp.title')}
          </h2>
          <p className="text-ink-muted text-md mb-8 md:text-lg">{t('common.landing.mobileApp.subtitle')}</p>
          <div className="flex space-x-4">
            <Button className="bg-surface border-rule-emphasis hover:bg-surface-2 text-ink border">
              {t('common.landing.mobileApp.ios')}
            </Button>
            <Button className="bg-surface border-rule-emphasis hover:bg-surface-2 text-ink border">
              {t('common.landing.mobileApp.android')}
            </Button>
          </div>
        </div>
        <div className="relative md:w-1/2">
          <div className="relative mx-auto h-96 w-64">
            <Image
              src="/images/mobile-app.svg"
              alt={t('common.landing.images.mobileApp')}
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
