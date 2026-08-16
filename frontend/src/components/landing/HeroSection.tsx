'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { HeroTimelineAnimation } from '@/components/landing/HeroTimelineAnimation'

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
 *
 * #295 — les deux appels à l'action passent par `<Button asChild>` avec le lien À
 * L'INTÉRIEUR. Le motif précédent (`<Link passHref><Button>` et `<a><Button>`)
 * imbriquait un `<button>` dans un `<a>` : HTML invalide, double cible de tabulation,
 * sémantique cassée pour les lecteurs d'écran. `asChild` (Radix `Slot`) reporte les
 * classes du bouton sur l'ancre — un seul élément interactif, rendu identique.
 *
 * Sprint 48 — corollaire de mise en page du passage à `asChild`. Le `<a>` étant
 * désormais le flex item ET le porteur de `.cta-button`, il hérite de son
 * `overflow: hidden` (nécessaire pour clipper la brillance `.cta-button::before`) :
 * par la spec flexbox, un flex item dont l'`overflow` n'est pas `visible` a une
 * taille minimale automatique de ZÉRO. Le CTA primaire absorbait donc toute la
 * compression de la rangée — 130 px rendus pour 268 px de contenu à 1280 px, soit
 * « cer gratuit » coupé en plein mot. `min-w-min` rétablit le plancher `min-content`
 * sans toucher à `overflow`, donc sans casser la brillance. En complément :
 * `whitespace-normal` + `h-auto` (le variant Button impose `whitespace-nowrap` et
 * `h-9`) laissent les libellés se replier au lieu de forcer une largeur supérieure
 * au viewport mobile, et la rangée passe en `gap-4` + `sm:flex-wrap` — les deux
 * boutons demandent ~860 px pour 584 px disponibles à 1280 px, ils doivent donc
 * pouvoir revenir à la ligne. `gap-*` et non `space-x-*` : les marges de ce dernier
 * ne se réinitialisent pas en début de ligne. Garde-fou : `HeroSection.flex-min-size.test.tsx`.
 *
 * #56 — la frise horizontale animée vit dans `HeroTimelineAnimation`, sous les deux
 * colonnes. La mise en page flex d'origine descend d'un cran (du `<section>` vers un
 * `<div>` interne) pour que la frise occupe toute la largeur au lieu de devenir une
 * troisième colonne.
 *
 * #348 — ÉCHELLE TYPOGRAPHIQUE. Le `h1` portait `text-4xl md:text-5xl`. Ces deux
 * tokens N'EXISTENT PAS dans `ds/tokens/typography.css` (échelle 13/15/17/21/27/35/
 * 45/57) et `globals.css` ne pose aucun `--text-*: initial` : les utilitaires
 * retombaient donc sur les DÉFAUTS TAILWIND (2.25rem / 3rem = 36 / 48 px), hors
 * échelle DS et — mesuré — plus PETIT que le wordmark du header d'alors (57 px).
 * La hiérarchie était inversée. `text-xl md:text-2xl lg:text-3xl` (35 / 45 / 57)
 * la rétablit et rend l'invariant « never Tailwind-default » vrai à l'échelle du
 * dépôt : c'était le seul site `4xl`/`5xl` du code. Arbitrage :
 * `docs/memory/sprints/sprint-59/ui-design-arbitrage.md` (aucun token ajouté).
 *
 * ⚠ `leading-normal` sur le sous-titre n'est PAS décoratif. En Tailwind 4 une
 * utilitaire `text-*` pose aussi `line-height: var(--tw-leading, var(--text-md--line-height))`.
 * `--text-md--line-height` n'est émis par personne (nom propre au DS) → déclaration
 * invalide au calcul → le `<p>` hériterait silencieusement de l'interligne parent.
 * Et sur `md:text-lg`, `--text-lg--line-height` existe, lui, au défaut Tailwind
 * (1.5556). Le `line-height` de `base.css:53` ne couvre QUE `h1..h6`, pas ce `<p>`.
 * Cf. le bloc CASCADE de `ds/tokens/base.css:21-52`. Verrou :
 * `e2e/landing-typography-hierarchy.spec.ts`.
 *
 * ⚠ ET LA SYMÉTRIQUE, QUI SE LIT À L'ENVERS : le `h1` ne porte VOLONTAIREMENT
 * aucun `leading-*`. Il en portait un (`leading-tight`) et il était INERTE —
 * `base.css:53` est hors layer, donc imbattable par une utilitaire, et pose déjà
 * `var(--leading-tight)` = 1.08 sur `h1..h6`. Le garder suggérait à tort qu'un
 * `leading-*` pilote un titre ici : la mesure resterait identique en le
 * remplaçant par `leading-relaxed`. Retiré en review du Sprint 59. Le ratio 1.08
 * du `h1` reste asserté par la spec e2e — c'est `base.css:53` qui le tient, pas
 * une classe. Ne PAS en déduire qu'on peut retirer les `leading-*` du `<p>` ni
 * du `<span>` du chiffre d'étape : hors `h1..h6`, ils sont indispensables.
 */
export function HeroSection({ locale }: HeroSectionProps) {
  const t = useTranslations()

  return (
    <section className="section-animation container mx-auto px-4 py-20">
      <div className="flex flex-col items-center md:flex-row">
        <div className="mb-10 md:mb-0 md:w-1/2 md:pr-10">
          <h1 className="mb-6 text-xl font-bold md:text-2xl lg:text-3xl">
            {t('common.landing.hero.title')}
          </h1>
          <p className="text-ink-muted text-md mb-8 leading-normal md:text-lg">
            {t('common.landing.hero.subtitle')}
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <Button
              asChild
              className="cta-button bg-accent hover:bg-accent-hover text-accent-ink h-auto min-w-min rounded-lg px-8 py-6 text-center text-lg whitespace-normal transition-all"
            >
              <Link href={`/${locale}/register`}>
                {t('common.landing.hero.cta')} <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-rule-emphasis text-ink hover:bg-surface h-auto min-w-min rounded-lg px-8 py-6 text-center text-lg whitespace-normal transition-all"
            >
              <a href="#how-it-works">{t('common.landing.hero.secondary')}</a>
            </Button>
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
      </div>

      <HeroTimelineAnimation />
    </section>
  )
}
