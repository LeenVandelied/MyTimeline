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
 * pas 24) et dépassait donc le `h2` de sa propre section. Une 1ʳᵉ passe l'a mis à
 * `text-lg` (27 px sans palier), ce qui laissait l'AC #1 en défaut : sous `md` le
 * chiffre ÉGALAIT le h2 (27) et DÉPASSAIT le h3 de sa propre étape (21).
 *
 * VALEUR RETENUE : `text-sm md:text-md` = 17 / 21 px. L'AC #1 demande « STRICTEMENT
 * plus petit que le titre auquel il se rattache », et le titre auquel ce chiffre se
 * rattache est le `h3` de SON étape (21 / 27), pas le h2 de section. Les deux candidats
 * ont été mesurés en jammy, dans la pastille réelle :
 *   · `text-md md:text-lg` (21 / 27) → ÉGALE le h3 aux deux paliers. Rejeté : l'AC
 *     demande une inégalité stricte, et une égalité n'est pas une hiérarchie.
 *   · `text-sm md:text-md` (17 / 21) → strictement sous le h3 ET sous le h2 partout.
 * La crainte « trop petit, le chiffre flotte dans le rond » ne s'est PAS vérifiée : la
 * pastille fait 64 px, le chiffre y occupe 26,6 % de la hauteur sous `md` et 32,8 %
 * au-dessus, avec un décentrage MESURÉ de 0,00 px en x comme en y (le `flex
 * items-center justify-center` de la pastille centre la boîte de ligne, quelle que
 * soit sa taille). Relevé complet : `e2e/landing-typography-hierarchy.spec.ts`.
 *
 * ⚠ `leading-none` explicite, à CONSERVER, pour la même raison que le sous-titre du
 * hero : le `line-height` de `base.css:53` ne couvre que `h1..h6`, et une utilitaire
 * `text-*` apparie son propre `--text-*--line-height` (défaut Tailwind 1.5556, non
 * remappé par `@theme inline`). Sans lui la boîte de ligne du chiffre enflerait et il
 * se décentrerait dans sa pastille. Piège MESURÉ, pas supposé. Cf. `base.css:21-52`.
 *
 * ⚠ LA RÈGLE INVERSE SUR LE `h2`, ET ELLE NE SE GÉNÉRALISE PAS. Le `h2` portait
 * `leading-tight` : INERTE, car `base.css:53` est hors layer et pose déjà 1.08 sur
 * `h1..h6` — aucune utilitaire ne peut le battre. Retiré en review du Sprint 59
 * parce qu'il laissait croire qu'un `leading-*` pilote un titre. La distinction est
 * exactement celle du paragraphe ci-dessus : sur un `h1..h6` le `leading-*` est
 * décoratif, sur un `<p>` ou un `<span>` il est INDISPENSABLE. Ne pas propager le
 * retrait au `<span>` du chiffre.
 */
const STEPS = [1, 2, 3, 4] as const

export function HowItWorksSection() {
  const t = useTranslations()

  return (
    <section id="how-it-works" className="section-animation py-20">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-lg font-bold md:text-xl">
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
                <span className="text-accent md:text-md text-sm leading-none font-bold">
                  {step}
                </span>
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
