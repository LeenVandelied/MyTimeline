'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

interface HeroSectionProps {
  locale: string
}

/**
 * Hero de la landing — extrait du monolithe HomePage (#56, slice contraste).
 * Extraction non destructive : HomePage rend <HeroSection locale=… /> à la place
 * du bloc inline. Contraste WCAG AA (clair + sombre) : la bordure du bouton
 * secondaire utilise `border-rule-emphasis` (#293), le tier « bordure
 * fonctionnelle » du DS — 3.97:1 clair / 4.49:1 sombre, au-dessus du seuil UI
 * ≥ 3:1. Elle remplace l'emprunt provisoire au tier TEXTE `ink-muted` fait en
 * S39 faute de token de bordure conforme (nommer la classe ici suffirait à la
 * faire regénérer par Tailwind : on cite le token, pas l'utilitaire). Le cadre de l'image reste sur
 * `border-rule` : décoratif, non soumis au seuil. Tokens sémantiques DS
 * uniquement, zéro hex hardcodé — suit clair/sombre via les variables CSS.
 */
export function HeroSection({ locale }: HeroSectionProps) {
  const t = useTranslations()

  return (
    <section className="section-animation container mx-auto flex flex-col items-center px-4 py-20 md:flex-row">
      <div className="mb-10 md:mb-0 md:w-1/2 md:pr-10">
        <h1 className="mb-6 text-4xl leading-tight font-bold md:text-5xl">
          {t('common.landing.hero.title')}
        </h1>
        <p className="text-ink-muted mb-8 text-xl">{t('common.landing.hero.subtitle')}</p>
        <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
          <Link href={`/${locale}/register`} passHref>
            <Button className="cta-button bg-accent hover:bg-accent-hover text-accent-ink rounded-lg px-8 py-6 text-lg transition-all">
              {t('common.landing.hero.cta')} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button
              variant="outline"
              className="border-rule-emphasis text-ink hover:bg-surface rounded-lg px-8 py-6 text-lg transition-all"
            >
              {t('common.landing.hero.secondary')}
            </Button>
          </a>
        </div>
      </div>
      <div className="hero-image-container relative md:w-1/2">
        <div className="bg-surface border-rule overflow-hidden rounded-xl border shadow-lg">
          {/* Image de prévisualisation du tableau de bord */}
          <div className="relative h-80 w-full md:h-96">
            <Image
              src="/images/dashboard-preview.svg"
              alt={t('common.landing.images.dashboard')}
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
