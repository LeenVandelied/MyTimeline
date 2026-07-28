'use client'

import { Calendar, Clock, LayoutList, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Trois fonctionnalités mises en avant — extrait du monolithe `HomePage` (#56).
 *
 * Les trois cartes d'origine étaient copiées-collées à l'identique (seuls l'icône et
 * le préfixe de clé i18n changeaient) : on les pilote par données. Ajouter une
 * fonctionnalité = une entrée ici, plus un bloc JSX de 14 lignes à dupliquer.
 *
 * `key` sert de segment de clé i18n : `common.landing.features.<key>.{title,description}`.
 */
const FEATURES: ReadonlyArray<{ key: string; Icon: LucideIcon }> = [
  { key: 'timeline', Icon: Calendar },
  { key: 'reminders', Icon: Clock },
  { key: 'organization', Icon: LayoutList },
]

export function FeaturesSection() {
  const t = useTranslations()

  return (
    <section id="features" className="bg-surface section-animation py-20">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            {t('common.landing.features.title')}
          </h2>
          <p className="text-ink-muted mx-auto max-w-3xl text-xl">
            {t('common.landing.features.subtitle')}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {FEATURES.map(({ key, Icon }) => (
            <Card
              key={key}
              className="feature-card card-gradient-border bg-surface border-rule transform shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-md"
            >
              <CardContent className="p-8">
                <div className="bg-accent-soft feature-icon mb-6 w-max rounded-lg p-3">
                  <Icon className="text-accent h-8 w-8" />
                </div>
                <h3 className="text-ink mb-3 text-xl font-bold">
                  {t(`common.landing.features.${key}.title`)}
                </h3>
                <p className="text-ink-muted">{t(`common.landing.features.${key}.description`)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
