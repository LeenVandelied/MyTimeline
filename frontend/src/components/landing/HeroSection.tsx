'use client'

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
 * faire regénérer par Tailwind : on cite le token, pas l'utilitaire). Le panneau de la
 * frise et sa barre de chrome restent sur les tiers DÉCORATIFS (`rule-strong` / `rule`),
 * non soumis au seuil — cf. #610 plus bas. Tokens sémantiques DS
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
 * boutons demandaient ~860 px pour 584 px disponibles à 1280 px (et la colonne texte
 * ne fait plus que ≤ 420 px depuis #610), ils doivent donc pouvoir revenir à la ligne.
 * `gap-*` et non `space-x-*` : les marges de ce dernier ne se réinitialisent pas en
 * début de ligne. Garde-fou : `HeroSection.flex-min-size.test.tsx`.
 *
 * #610 — HERO ASYMÉTRIQUE « 30/70 ». La maquette (`Landing.dc.html`) ne pose PAS de
 * pourcentages : c'est un flex BORNÉ — texte `flex:1 1 300px; min-width:300px;
 * max-width:420px`, frise `flex:1 1 460px; min-width:340px`, gap 40px. Transcrit tel
 * quel sous `lg` (1024, token `--breakpoint-lg`) : ~396/556 à 1024, 420/reste au-delà.
 * La frise (`HeroTimelineAnimation`, qui vivait en bande pleine largeur SOUS les
 * colonnes depuis #56) est montée DANS la colonne droite, dans un panneau bordé avec
 * sa barre de chrome ; l'image statique `dashboard-preview.svg` qu'elle remplace est
 * supprimée.
 * - SOUS `lg` : empilement (texte puis panneau), et AUCUN `min-width` px. À 320 px,
 *   `min-width:340px` + le padding du `container` déborderait : les planchers de la
 *   maquette ne s'appliquent qu'en rangée. Le panneau reste visible (c'est l'image du
 *   produit, pas un ornement) mais descend à `h-80` sous `md` ; 420 px au-delà.
 * - ⚠ `min-w-0` sur la colonne frise n'est PAS décoratif : une piste animée plus large
 *   que le panneau (#611) ferait remonter sa `min-content` via `min-width:auto` et
 *   pousserait la page en largeur. `overflow-hidden` sur le panneau ne suffit pas — il
 *   rogne le rendu, pas la taille intrinsèque.
 * - ⚠ #574 — FILET 1px, SANS OMBRE AU REPOS. La maquette pose `box-shadow: shadow-md`
 *   sur le panneau ; #574 a retiré précisément ce type d'ombre des surfaces de la
 *   landing (charte : surface au repos = filet, élévation réservée aux popovers et
 *   modales). Écart de maquette assumé : ne pas réintroduire l'ombre. Tier
 *   `rule-strong` (maquette) : décoratif « appuyé » du DS, adapté à un panneau imbriqué
 *   — le panneau n'est l'affordance d'aucun contrôle, donc PAS `rule-emphasis`.
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
      <div className="flex flex-col gap-10 lg:flex-row lg:items-stretch">
        <div className="flex min-w-0 flex-col justify-center lg:max-w-[420px] lg:min-w-[300px] lg:flex-[1_1_300px]">
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
        <div className="min-w-0 lg:min-w-[340px] lg:flex-[1_1_460px]">
          <div className="bg-surface border-rule-strong relative flex h-80 flex-col overflow-hidden rounded-xl border md:h-[420px]">
            {/* Barre de chrome — décorative, d'où `aria-hidden` et le tier `rule`. */}
            <div
              className="border-rule flex shrink-0 items-center gap-2 border-b px-4 py-3"
              aria-hidden="true"
            >
              <span className="bg-rule-strong block size-[9px] rounded-full" />
              <span className="bg-rule-strong block size-[9px] rounded-full" />
              <span className="bg-rule-strong block size-[9px] rounded-full" />
            </div>
            <div className="relative flex min-h-0 flex-1 items-center px-6">
              <HeroTimelineAnimation />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
