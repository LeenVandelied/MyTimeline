'use client'

import { useLocale } from 'next-intl'
import { CtaSection } from '@/components/landing/CtaSection'
import { FooterSection } from '@/components/landing/FooterSection'
import { HeaderSection } from '@/components/landing/HeaderSection'
import { HeroSection } from '@/components/landing/HeroSection'
import { HowItWorksSection } from '@/components/landing/HowItWorksSection'
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
 * L'ancre `#how-it-works` (frise de cas d'usage) est ciblée par `HeaderSection`,
 * `FooterSection` et le CTA secondaire du hero.
 *
 * #612 (Sprint 103) — `FeaturesSection` (3 cartes) est RETIRÉE : son contenu vit
 * désormais dans les 4 jalons de `HowItWorksSection`, avec l'ancre `#features`.
 * Deux sections expliquaient la même chose ; le handoff n'en prévoit qu'une.
 *
 * #613 (Sprint 103) — la section témoignages est RETIRÉE : ses 4 avis nominatifs étaient
 * inventés (FR codé en dur, hors i18n). Elle ne revient qu'avec de vraies citations
 * sourcées ; `HomePage.test.tsx` interdit sa réintroduction silencieuse.
 */
export default function HomePage({ params }: HomePageProps) {
  const defaultLocale = useLocale()
  const locale = params?.locale || defaultLocale || 'fr'

  useSectionAnimation()

  return (
    <div className="bg-bg text-ink min-h-screen">
      <HeaderSection locale={locale} />
      <HeroSection locale={locale} />
      <HowItWorksSection />
      <CtaSection locale={locale} />
      <FooterSection locale={locale} />
    </div>
  )
}
