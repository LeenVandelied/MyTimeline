'use client'

import { useTranslations } from 'next-intl'

/**
 * Les quatre étapes de prise en main — extrait du monolithe `HomePage` (#56).
 *
 * Les quatre blocs d'origine ne différaient que par leur numéro : on itère sur les
 * index plutôt que de dupliquer le JSX. Les clés i18n existantes suivent déjà cette
 * numérotation (`common.landing.howItWorks.step<N>.{title,description}`), l'itération
 * ne fabrique donc aucune nouvelle convention.
 */
const STEPS = [1, 2, 3, 4] as const

export function HowItWorksSection() {
  const t = useTranslations()

  return (
    <section id="how-it-works" className="section-animation py-20">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            {t('common.landing.howItWorks.title')}
          </h2>
          <p className="text-ink-muted mx-auto max-w-3xl text-xl">
            {t('common.landing.howItWorks.subtitle')}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step} className="p-6 text-center">
              <div className="bg-accent-soft mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <span className="text-accent text-2xl font-bold">{step}</span>
              </div>
              <h3 className="text-ink mb-2 text-xl font-bold">
                {t(`common.landing.howItWorks.step${step}.title`)}
              </h3>
              <p className="text-ink-muted">
                {t(`common.landing.howItWorks.step${step}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
