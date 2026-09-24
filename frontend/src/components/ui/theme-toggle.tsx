'use client'

import { Moon, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { useThemeChoice } from '@/hooks/useThemeChoice'
import { Button } from './button'

/**
 * #642 (DEC-S82-009) puis #655 — LA bascule de thème de l'application, en trois
 * gabarits.
 *
 * HISTORIQUE. #642 a extrait ce composant pour exposer la bascule HORS
 * CONNEXION, sous le seul gabarit dont les surfaces publiques avaient besoin
 * (icône seule). Deux bascules écrites en ligne subsistaient alors, derrière
 * l'authentification, sans garde de montage : le carré 44×44 du pied de
 * `layout/AppShell.tsx` et le bouton libellé pleine largeur de
 * `dashboard/MobileDrawer.tsx`. #655 les a converties : il n'existe plus
 * qu'UNE implémentation, avec une `variant` par gabarit.
 *
 *  - `icon` (défaut) — surfaces publiques : landing desktop, panneau mobile de
 *    la landing, 4 pages d'auth. Visuel 36×36, jumeau de `ui/language-selector`,
 *    cible étendue à 44×44 par pseudo-élément (cf. plus bas).
 *  - `square` — pied de sidebar du shell : carré 44×44 plein, qui tient dans la
 *    colonne de 48 px utiles de la sidebar repliée (#298).
 *  - `labeled` — tiroir mobile du dashboard : bouton bordé, icône + libellé
 *    VISIBLE nommant le thème de destination (« Sombre » en clair, « Clair » en
 *    sombre). Le libellé est le nom accessible : pas d'`aria-label`.
 *
 * Classes et `data-testid` de chaque gabarit sont repris à l'identique de leur
 * ancien emplacement (`shell-sidebar-theme-toggle`,
 * `dashboard-mobile-drawer-theme-toggle`). Libellés : les trois gabarits lisent
 * le seul namespace `common` (`theme.*`). Les clés `shell.theme.*` (valeurs
 * identiques à `common.theme.*` dans les 4 locales) et
 * `dashboard.mobile.drawer.themeLight/themeDark` (déplacées en
 * `common.theme.light/dark`, mêmes valeurs) ont été retirées.
 *
 * ÉCRITURE DU THÈME. Ce composant n'appelle pas next-themes : il passe par
 * `useThemeChoice` (`hooks/useThemeChoice.ts`), SEUL point d'écriture du thème
 * de l'application, où #653 branche la persistance sur le compte.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * L'ICÔNE EST CHOISIE PAR CSS, PAS PAR JS — ET C'EST LE POINT CENTRAL.
 *
 * Les deux bascules applicatives d'avant #655 lisaient `resolvedTheme` SANS
 * garde de montage et rendaient `isDark ? <Sun/> : <Moon/>`. Côté serveur
 * `resolvedTheme` vaut `undefined`, donc le HTML servi contenait TOUJOURS la
 * lune ; après hydratation
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
 * Les TROIS gabarits servent cette paire d'icônes : aucun ne choisit son icône
 * en JS, donc aucun n'a d'icône dépendant du thème avant montage.
 *
 * LE NOM ACCESSIBLE, LUI, NE PEUT PAS ÊTRE FAIT EN CSS. Il dépend donc de la
 * garde `mounted` de `useThemeChoice` : avant montage (et donc dans le HTML
 * servi) le bouton annonce l'action GÉNÉRIQUE `common.theme.toggle` (« Changer
 * de thème »), qui est vraie dans les deux thèmes ; après montage il annonce la
 * destination exacte (`toLight` / `toDark` en `aria-label` pour `icon` et
 * `square`, `light` / `dark` en libellé visible pour `labeled`) et expose
 * `aria-pressed`. Le premier rendu client est identique au HTML serveur — c'est
 * ce qui rend l'hydratation propre. Même garde que
 * `settings/PreferencesSection.tsx`, qui lit le même hook.
 *
 * ⚠ NE PAS remplacer la paire d'icônes par `isDark ? … : …` « pour simplifier » :
 * cela réintroduirait exactement l'écart d'hydratation décrit plus haut sur les
 * pages statiques.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * GABARIT VISUEL ET CIBLE TACTILE (variante `icon`) — PAT-S24-002.
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
 * MESURÉ AU NAVIGATEUR (variante `icon`, Chromium, `next start` de production,
 * macOS, #642) —
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
export type ThemeToggleVariant = 'icon' | 'square' | 'labeled'

export interface ThemeToggleProps {
  /**
   * `data-testid` OBLIGATOIRE et propre au point de montage : sur la landing, le
   * groupe desktop (`hidden lg:flex`) et le panneau mobile sont tous deux dans
   * le DOM quand le menu est ouvert, un identifiant partagé y serait ambigu.
   */
  testId: string
  /** Gabarit — cf. pavé d'en-tête. Défaut : `icon` (surfaces publiques). */
  variant?: ThemeToggleVariant
  className?: string
}

/** Paire d'icônes commune aux trois gabarits : la variante `dark:` tranche. */
function ThemeIcons() {
  return (
    <>
      <Sun className="hidden h-4 w-4 dark:block" aria-hidden="true" />
      <Moon className="h-4 w-4 dark:hidden" aria-hidden="true" />
    </>
  )
}

export function ThemeToggle({ testId, variant = 'icon', className }: ThemeToggleProps) {
  const t = useTranslations('common')
  const { mounted, isDark, toggle } = useThemeChoice()

  // `aria-pressed` n'existe qu'après montage : c'est aussi la barrière
  // d'hydratation des specs E2E (`waitForToggleHydrated`, PIT-S83-001).
  const pressed = mounted ? isDark : undefined

  if (variant === 'labeled') {
    const text = mounted ? (isDark ? t('theme.light') : t('theme.dark')) : t('theme.toggle')
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={toggle}
        aria-pressed={pressed}
        data-testid={testId}
        className={cn(
          'text-ink hover:bg-accent-soft border-rule flex items-center justify-start gap-2 border',
          className,
        )}
      >
        <ThemeIcons />
        <span>{text}</span>
      </Button>
    )
  }

  const label = mounted ? (isDark ? t('theme.toLight') : t('theme.toDark')) : t('theme.toggle')

  if (variant === 'square') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={pressed}
        aria-label={label}
        title={label}
        data-testid={testId}
        className={cn(
          'text-ink-muted hover:bg-surface-2 flex h-11 w-11 items-center justify-center rounded-md transition-colors',
          className,
        )}
      >
        <ThemeIcons />
      </button>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      data-testid={testId}
      className={cn(
        "relative h-9 w-9 rounded-full before:absolute before:top-1/2 before:left-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']",
        className,
      )}
    >
      {/* Une seule des deux est peinte, la variante `dark:` tranche — cf. pavé. */}
      <ThemeIcons />
    </Button>
  )
}
