'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Button } from './button'

/**
 * #642 (DEC-S82-009) — Bascule de thème EXPOSABLE HORS CONNEXION.
 *
 * POURQUOI CE COMPOSANT EXISTE. Avant #642 le dépôt portait DEUX bascules de
 * thème, toutes deux derrière l'authentification et toutes deux écrites en
 * ligne dans leur hôte : `layout/AppShell.tsx` (pied de sidebar) et
 * `dashboard/MobileDrawer.tsx` (rangée étiquetée du tiroir). Aucune n'était
 * réutilisable — l'une est un carré 44×44 dans une colonne de 48 px, l'autre un
 * `<Button>` pleine largeur avec libellé visible. Les exposer sur la landing et
 * les pages d'auth aurait donc voulu dire recopier une troisième fois la même
 * logique `useTheme` + `mounted`. Ce fichier extrait cette logique UNE fois,
 * sous la forme du seul gabarit dont les surfaces publiques ont besoin : un
 * bouton à ICÔNE SEULE, jumeau visuel de `ui/language-selector.tsx`, avec lequel
 * il est systématiquement monté (landing desktop, panneau mobile, 4 pages
 * d'auth). Les deux bascules applicatives N'ONT PAS été converties (`AppShell`
 * est hors périmètre de l'issue) : leur convergence est laissée en suivi.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * L'ICÔNE EST CHOISIE PAR CSS, PAS PAR JS — ET C'EST LE POINT CENTRAL.
 *
 * Les deux bascules préexistantes lisent `resolvedTheme` SANS garde de montage
 * et rendent `isDark ? <Sun/> : <Moon/>`. Côté serveur `resolvedTheme` vaut
 * `undefined`, donc le HTML servi contient TOUJOURS la lune ; après hydratation
 * next-themes résout le thème et l'icône peut sauter. Sur une route protégée
 * c'est invisible (rien n'est prérendu de toute façon) ; sur les routes
 * PUBLIQUES, qui sont statiques (`generateStaticParams` de
 * `app/[locale]/layout.tsx`), ce serait un écart d'hydratation servi à chaque
 * visiteur.
 *
 * Ici les DEUX icônes sont toujours dans le DOM et c'est la variante `dark:` qui
 * en masque une. `globals.css:34` définit `@custom-variant dark
 * (&:where(.dark, .dark *))` : la variante suit donc la CLASSE `.dark` posée sur
 * `<html>` par le script de pré-hydratation de next-themes, pas
 * `prefers-color-scheme`. Le script s'exécutant avant la peinture, la bonne
 * icône est affichée dès le premier rendu, sans JS et sans écart serveur/client
 * — même mécanisme que le reste du DS Graphite, dont tous les tokens sont déjà
 * commutés par cette classe.
 *
 * LE NOM ACCESSIBLE, LUI, NE PEUT PAS ÊTRE FAIT EN CSS. Il dépend donc d'un
 * `mounted` : avant montage (et donc dans le HTML servi) le bouton annonce
 * l'action GÉNÉRIQUE `common.theme.toggle` (« Changer de thème »), qui est vraie
 * dans les deux thèmes ; après montage il annonce la destination exacte
 * (`toLight` / `toDark`) et expose `aria-pressed`. Le premier rendu client est
 * identique au HTML serveur — c'est ce qui rend l'hydratation propre. C'est la
 * même garde `mounted` que `settings/PreferencesSection.tsx`.
 *
 * ⚠ NE PAS remplacer la paire d'icônes par `isDark ? … : …` « pour simplifier » :
 * cela réintroduirait exactement l'écart d'hydratation décrit plus haut sur les
 * pages statiques.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * GABARIT VISUEL ET CIBLE TACTILE — PAT-S24-002.
 *
 * Le visuel est 36×36 (`h-9 w-9`, comme le déclencheur du sélecteur de langue,
 * dont ce bouton est le voisin immédiat partout où il est monté) ; un `::before`
 * transparent 44×44 centré étend la zone cliquable aux 44 px de WCAG 2.5.5 sans
 * rien changer au flux — donc sans toucher au budget de largeur du header de la
 * landing, qui est le contexte le plus contraint du dépôt (cf. le pavé de
 * `landing/HeaderSection.tsx`). ⚠ Le pseudo déborde de 4 px sur chaque bord : un
 * ancêtre en `overflow:hidden` le clipperait en silence. Aucun `ring-*` ni
 * `outline-*` n'est posé : l'indicateur de focus canonique est le contour
 * `:focus-visible` du DS, layerisé dans `@layer base` (#383).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * MESURÉ AU NAVIGATEUR (Chromium, `next start` de production, macOS, #642) —
 * ⚠ métriques macOS, PAS celles de l'image jammy de la CI (PIT du header : c'est
 * Ubuntu qui fait basculer les budgets de largeur, cf. `HeaderSection`).
 *
 *  - boîte du bouton 36×36, `::before` calculé à 44×44 aux trois points de
 *    montage ; aucun ancêtre ne le clippe (aucun débordement relevé) ;
 *  - `documentElement.scrollWidth - clientWidth === 0` à 320 px et 1024 px, sur
 *    la landing (4 locales) comme sur les 4 pages d'auth ;
 *  - sur `/fr/login` à 320 px, le bloc du coin ne croise PAS la carte
 *    (carte à y=163,9 ; bouton à y=16, bord droit 264) ;
 *  - clic → la classe de `<html>` passe de `dark` à `light`, `localStorage.theme`
 *    passe de `null` à `"light"`, et le `display` calculé des deux icônes
 *    s'inverse bien par CSS (`sun: none` / `moon: block`) ;
 *  - le nom accessible suit la locale : relevé « Zum hellen Design wechseln » sur
 *    `/de` en thème sombre.
 *
 * PAS mesuré : les CONTRASTES (repos/survol/focus) dans les deux thèmes, et le
 * comportement sous les métriques de police de la CI. jsdom, lui, ne résout
 * aucune mise en page.
 */
export interface ThemeToggleProps {
  /**
   * `data-testid` OBLIGATOIRE et propre au point de montage : sur la landing, le
   * groupe desktop (`hidden lg:flex`) et le panneau mobile sont tous deux dans
   * le DOM quand le menu est ouvert, un identifiant partagé y serait ambigu.
   */
  testId: string
  className?: string
}

export function ThemeToggle({ testId, className }: ThemeToggleProps) {
  const t = useTranslations('common')
  const { resolvedTheme, setTheme } = useTheme()

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'
  const label = mounted ? (isDark ? t('theme.toLight') : t('theme.toDark')) : t('theme.toggle')

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-pressed={mounted ? isDark : undefined}
      aria-label={label}
      title={label}
      data-testid={testId}
      className={cn(
        "relative h-9 w-9 rounded-full before:absolute before:top-1/2 before:left-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']",
        className,
      )}
    >
      {/* Une seule des deux est peinte, la variante `dark:` tranche — cf. pavé. */}
      <Sun className="hidden h-4 w-4 dark:block" aria-hidden="true" />
      <Moon className="h-4 w-4 dark:hidden" aria-hidden="true" />
    </Button>
  )
}
