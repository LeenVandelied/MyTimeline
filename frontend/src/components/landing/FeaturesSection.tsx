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
 *
 * ⚠ MOUVEMENT AU SURVOL (#384) — la lévitation appartient à `.feature-card:hover`
 * (`styles/landing.css:54`, `-10px`, palier `-5px` sous 768px ligne 168), SEUL propriétaire.
 * Deux utilitaires ont été retirées de la carte ci-dessous :
 *   - `hover:-translate-y-2` : en Tailwind 4 elle compile vers la propriété **`translate`**, pas
 *     `transform` (vérifié dans la source du paquet). Elle ne remplaçait donc pas la déclaration
 *     de la feuille, elle s'y AJOUTAIT — le navigateur compose les deux propriétés : **-18px** au
 *     survol, **-13px** sous 768px. Retirer la règle CSS à la place aurait donné -8px (pas les
 *     -10px voulus) et laissé le palier responsive orphelin ;
 *   - `transform` (nue) : en v4 elle ne pose qu'une identité (`rotateX(0) … skewY(0)`) et aucune
 *     utilitaire `rotate-*`/`skew-*` n'est posée ici. Le contexte d'empilement et le bloc
 *     conteneur viennent déjà de `.card-gradient-border` (`position:relative; z-index:0`,
 *     `animations.css:46`) : elle n'apportait rien et entretenait la confusion sur le
 *     propriétaire de `transform`.
 *
 * `transition-all duration-300` RESTE. Le raccourci `transition: all .3s ease` de `.feature-card`
 * (hors layer) les bat aujourd'hui, mais elles nomment explicitement `transition-property: all` —
 * donc pas de piège PIT-S66-002 (`duration-*` orpheline qui arme `all` par défaut), et elles
 * resteraient un repli correct si la feuille passait un jour sous `@layer`.
 *
 * ⚠ Ne PAS layeriser `.feature-card:hover` pour « ranger » ce conflit : `shadow-lg` est posée sur
 * cette carte SANS variante `hover:` — layerisée, la règle céderait et l'élévation au survol
 * disparaîtrait en permanence (PIT-S53-004, audit `sprint-53/audit-css-layers-340.md` §3.5).
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
          <h2 className="mb-4 text-lg leading-tight font-bold md:text-xl">
            {t('common.landing.features.title')}
          </h2>
          <p className="text-ink-muted text-md mx-auto max-w-3xl md:text-lg">
            {t('common.landing.features.subtitle')}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {FEATURES.map(({ key, Icon }) => (
            <Card
              key={key}
              className="feature-card card-gradient-border bg-surface border-rule shadow-lg transition-all duration-300 hover:shadow-md"
            >
              <CardContent className="p-8">
                <div className="bg-accent-soft feature-icon mb-6 w-max rounded-lg p-3">
                  <Icon className="text-accent h-8 w-8" />
                </div>
                <h3 className="text-ink text-md mb-3 font-bold md:text-lg">
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
