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
 *
 * #799 (WCAG 1.4.4) — `break-words` (`overflow-wrap: break-word`) sur la racine, HÉRITÉ
 * par toutes les sections. À texte ×2, des mots seuls dépassent leur colonne : `h1`
 * du hero (« Organisieren » 417 px pour 343 à 375 px ; 537–679 px pour 396 à 1024 px,
 * sur la frise animée), `h2` du bandeau final (« Organisation » 398 px pour 343), `h3`/`p`
 * des jalons de la frise (« renouvellements », « Mindesthaltbarkeit » : ~250 px pour
 * 227). Posé ici plutôt que section par section : une section future en hérite.
 * `break-word` (et non `anywhere`) ne change PAS la taille min-content, donc aucune
 * mise en page nominale : il n'agit que sur un mot qui ne tient pas sur sa ligne. Les
 * libellés `white-space: nowrap` (frise du hero, badges) n'en sont pas affectés.
 * Garde-fou : `e2e/sprint-115-landing-text-200.spec.ts`.
 */
export default function HomePage({ params }: HomePageProps) {
  const defaultLocale = useLocale()
  const locale = params?.locale || defaultLocale || 'fr'

  useSectionAnimation()

  return (
    <div className="bg-bg text-ink min-h-screen break-words">
      <HeaderSection locale={locale} />
      <HeroSection locale={locale} />
      <HowItWorksSection />
      <CtaSection locale={locale} />
      <FooterSection locale={locale} />
    </div>
  )
}
