'use client'

import { useTranslations } from 'next-intl'

/**
 * Les quatre étapes de prise en main — extrait du monolithe `HomePage` (#56).
 *
 * Les quatre blocs d'origine ne différaient que par leur numéro : on itère sur les
 * index plutôt que de dupliquer le JSX. Les clés i18n existantes suivent déjà cette
 * numérotation (`common.landing.howItWorks.step<N>.{title,description}`), l'itération
 * ne fabrique donc aucune nouvelle convention.
 *
 * #348 — ÉCHELLE DU CHIFFRE D'ÉTAPE. Il portait `text-2xl` (45 px dans l'échelle DS,
 * pas 24) et dépassait donc le `h2` de sa propre section (27 px sous `md`). Passé à
 * `text-lg` (27 px, sans palier : la pastille fait `h-16 w-16` à toutes largeurs).
 *
 * ⚠ `leading-none` explicite, pour la même raison que le sous-titre du hero : le
 * `line-height` de `base.css:53` ne couvre que `h1..h6`, et l'utilitaire `text-lg`
 * apparie `--text-lg--line-height` = 1.5556 (défaut Tailwind, non remappé par
 * `@theme inline`). Sans lui, la boîte de ligne du chiffre vaudrait 42 px dans une
 * pastille de 64 px au lieu de 27. Cf. `ds/tokens/base.css:21-52`.
 *
 * ⚠ ÉCART D'AC ASSUMÉ ET MESURÉ : sous `md`, le chiffre (27 px) ÉGALE le `h2` de
 * section (27 px) et DÉPASSE le `h3` de son étape (21 px). L'AC de #348 demandait
 * « strictement plus petit ». Le verdict `ui-design` fixe malgré tout `text-lg` —
 * l'écart est remonté en follow-up plutôt qu'arbitré ici. Relevé chiffré :
 * `e2e/landing-typography-hierarchy.spec.ts`.
 */
const STEPS = [1, 2, 3, 4] as const

export function HowItWorksSection() {
  const t = useTranslations()

  return (
    <section id="how-it-works" className="section-animation py-20">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-lg leading-tight font-bold md:text-xl">
            {t('common.landing.howItWorks.title')}
          </h2>
          <p className="text-ink-muted text-md mx-auto max-w-3xl md:text-lg">
            {t('common.landing.howItWorks.subtitle')}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step} className="p-6 text-center">
              <div className="bg-accent-soft mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <span className="text-accent text-lg leading-none font-bold">{step}</span>
              </div>
              <h3 className="text-ink text-md mb-2 font-bold md:text-lg">
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
