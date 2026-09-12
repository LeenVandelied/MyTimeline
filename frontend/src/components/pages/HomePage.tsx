'use client'

import { useLocale } from 'next-intl'
import { CtaSection } from '@/components/landing/CtaSection'
import { FeaturesSection } from '@/components/landing/FeaturesSection'
import { FooterSection } from '@/components/landing/FooterSection'
import { HeaderSection } from '@/components/landing/HeaderSection'
import { HeroSection } from '@/components/landing/HeroSection'
import { HowItWorksSection } from '@/components/landing/HowItWorksSection'
import { MobileAppSection } from '@/components/landing/MobileAppSection'
import TestimonialSection from '@/components/landing/TestimonialSection'
import { TimelinePreviewSection } from '@/components/landing/TimelinePreviewSection'
import { useSectionAnimation } from '@/hooks/useSectionAnimation'

interface HomePageProps {
  params: { locale: string }
}

/**
 * Landing — ORCHESTRATION UNIQUEMENT (#56).
 *
 * Chaque section vit dans `components/landing/` et porte son propre markup, ses tokens
 * et ses tests. Ce fichier ne décide que de l'ordre des sections et de la locale à leur
 * passer. Toute logique de rendu ajoutée ici est un signal qu'elle appartient à une
 * section.
 *
 * L'ordre des sections est le contrat des ancres `#features`, `#how-it-works` et
 * `#testimonials`, ciblées par `HeaderSection` et `FooterSection`.
 */
export default function HomePage({ params }: HomePageProps) {
  const defaultLocale = useLocale()
  const locale = params?.locale || defaultLocale || 'fr'

  useSectionAnimation()

  return (
    <div className="bg-bg text-ink min-h-screen">
      <HeaderSection locale={locale} />
      <HeroSection locale={locale} />
      <FeaturesSection />
      <HowItWorksSection />
      <TimelinePreviewSection />
      <TestimonialSection />
      <MobileAppSection />
      <CtaSection locale={locale} />
      <FooterSection locale={locale} />
    </div>
  )
}
