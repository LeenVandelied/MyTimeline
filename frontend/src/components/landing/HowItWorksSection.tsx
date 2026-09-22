'use client'

import { useTranslations } from 'next-intl'
import type { EventPaletteRole } from '@/lib/event-palette'

/**
 * « Comment ça marche » — FRISE DE CAS D'USAGE à 4 jalons (#612, Sprint 103).
 *
 * Remplace les DEUX sections redondantes d'avant : `FeaturesSection` (3 cartes) et
 * l'ancienne `HowItWorksSection` (4 étapes chiffrées). Cible : handoff
 * `docs/design/graphite-handoff.md` §1 Landing (« ligne horizontale + 4 jalons à
 * pastilles colorées, *remplace* des features 3 colonnes ») et l'extrait de maquette
 * `docs/memory/sprints/sprint-103/maquette-landing-frise-cas-usage.md` §1.
 *
 * CONTENU DES 3 ANCIENNES FEATURES — rien n'est perdu :
 *   · rappels            → jalon `reminder` ;
 *   · visualisation      → jalon `coverage` (barres pleines sur la frise) + titre de section ;
 *   · organisation par produit/catégorie → jalon `deadline` (« rangé par produit et par
 *     catégorie ») — absent de la maquette, ajouté explicitement.
 *
 * COULEURS. Chaque pastille porte un RÔLE de la palette curatée (`EVENT_PALETTE`) et
 * se peint via `var(--evt-<rôle>)`, jamais via le hex (règle de `lib/event-palette.ts`).
 * Le typage `EventPaletteRole` interdit un rôle hors palette. La sonde E2E
 * `sprint-103-use-case-frieze` compare la couleur PEINTE au hex du rôle.
 *
 * ACCENT (#615, arbitrage A1). Les étiquettes mono sont en `ink-muted`, pas en accent
 * comme dans la maquette : l'accent est réservé à today / actif / liens / CTA.
 *
 * DISPOSITION (arbitrage A2) — la maquette n'a qu'une grille 4 colonnes fixe :
 *   · < `sm` (640 px) : frise VERTICALE — filet à gauche, jalons empilés ;
 *   · `sm` → `lg` : 2 × 2, une ligne horizontale PAR RANGÉE (elle ne traverse aucun
 *     jalon de la rangée suivante) — 4 colonnes y ont été mesurées trop étroites
 *     (cf. `issue-612-done.md`) ;
 *   · ≥ `lg` (1024 px) : 4 colonnes sur une seule ligne horizontale.
 * Le filet est un segment PAR JALON prolongé sur la gouttière (`-right-7` = gap 28 px,
 * `-bottom-8` = gap 32 px) ; l'`overflow-hidden` de la liste rogne le dernier segment.
 * Un seul mécanisme couvre les trois dispositions, sans calculer « dernier de rangée ».
 * La pastille est peinte APRÈS le filet et porte un halo `shadow-[0_0_0_4px_var(--color-bg)]` (maquette :
 * `box-shadow: 0 0 0 4px var(--color-bg)`) qui « coupe » le filet autour d'elle.
 *
 * PALIERS DS (échelle `ds/tokens/typography.css`, aucune valeur inventée) :
 *   surtitre 11 px → `text-2xs` (13) · étiquette 10.5 px → `text-2xs` (13) ·
 *   titre de jalon 18 px → `text-sm` (17) · texte 14 px → `text-xs` (15) ·
 *   paragraphe 16 px → `text-sm` (17) · h2 35 px → `md:text-xl` (35, exact ; 27 sous `md`) ·
 *   tracking .16em → `tracking-widest` (exact) · .08em → `tracking-wider` (.1em) ·
 *   rayon 4 px → `rounded-xs` (3 px).
 *
 * ⚠ `leading-*` EXPLICITE sur chaque `<p>` porteur de `text-*` — à CONSERVER : le
 * `line-height` de `base.css:53` ne couvre que `h1..h6`, et une utilitaire `text-*`
 * apparie son propre `--text-*--line-height` (défaut Tailwind, non remappé par
 * `@theme inline`). Sans lui l'interligne dérive en silence (mesuré au S59, #348).
 * La règle INVERSE vaut pour le `h2`/`h3` : `base.css:53` est hors layer et pose 1.08 ;
 * un `leading-*` y serait inerte — ne pas en ajouter pour « ranger ».
 *
 * `id="how-it-works"` est CONSERVÉ : CTA secondaire du hero, ancres header/footer,
 * harnais E2E. Ne pas renommer (la nav est refaite au Sprint 104).
 */
type MilestoneKey = 'reminder' | 'recurrence' | 'coverage' | 'deadline'

export const MILESTONES: ReadonlyArray<{ key: MilestoneKey; role: EventPaletteRole }> = [
  { key: 'reminder', role: 'sky' },
  { key: 'recurrence', role: 'periwinkle' },
  { key: 'coverage', role: 'grass' },
  { key: 'deadline', role: 'amber' },
]

export function HowItWorksSection() {
  const t = useTranslations('common.landing.howItWorks')

  return (
    <section id="how-it-works" className="section-animation py-20">
      <div className="container mx-auto px-4">
        <p className="text-ink-muted text-2xs mb-2.5 font-mono leading-normal tracking-widest uppercase">
          {t('eyebrow')}
        </p>
        <h2 className="mb-2 max-w-2xl text-lg text-balance md:text-xl">{t('title')}</h2>
        <p className="text-ink-muted mb-11 max-w-xl text-sm leading-normal">{t('subtitle')}</p>

        <ol
          data-testid="landing-frieze"
          className="relative grid gap-y-8 overflow-hidden sm:grid-cols-2 sm:gap-x-7 sm:gap-y-12 lg:grid-cols-4"
        >
          {MILESTONES.map(({ key, role }) => (
            <li
              key={key}
              data-testid="landing-frieze-milestone"
              data-role={role}
              className="relative pl-8 sm:pt-8 sm:pl-0"
            >
              <span
                aria-hidden="true"
                data-testid="landing-frieze-rule"
                className="bg-rule-strong absolute top-0 -bottom-8 left-[6.5px] w-px sm:top-[11px] sm:-right-7 sm:bottom-auto sm:left-0 sm:h-px sm:w-auto"
              />
              <span
                aria-hidden="true"
                data-testid="landing-frieze-dot"
                className="absolute top-1 left-0 block size-3.5 rounded-xs shadow-[0_0_0_4px_var(--color-bg)] sm:top-0"
                style={{ backgroundColor: `var(--evt-${role})` }}
              />
              <p
                data-testid="landing-frieze-tag"
                className="text-ink-muted text-2xs mb-2 font-mono leading-normal tracking-wider uppercase"
              >
                {t(`milestones.${key}.tag`)}
              </p>
              <h3 className="text-ink mb-1.5 text-sm">{t(`milestones.${key}.title`)}</h3>
              <p className="text-ink-muted text-xs leading-normal">{t(`milestones.${key}.text`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
