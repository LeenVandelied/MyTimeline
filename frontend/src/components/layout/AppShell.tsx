'use client'

import React, { useCallback, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import {
  CalendarDays,
  LayoutDashboard,
  GanttChartSquare,
  Package,
  Plus,
  Settings,
  LogOut,
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { LanguageSelector } from '@/components/ui/language-selector'
import { NewEventDrawer } from '@/components/events/NewEventDrawer'
import { safeErrorMessage } from '@/lib/safe-error'
import { CreateEventProvider } from './CreateEventContext'

/**
 * #210 — Shell applicatif (handoff §8). Nav latérale persistante 248px
 * (`w-sidebar`, token `--sidebar-width`) enveloppant les segments connectés via
 * le layout de groupe de routes `app/[locale]/(app)/layout.tsx`.
 *
 * Segments enveloppés par le shell (sous `(app)/`) : dashboard, timeline,
 * produits (`products` + détail `products/[productId]`) et — depuis #299 —
 * `settings`. Le route group `(app)` est transparent → les URLs publiques
 * restent inchangées.
 *
 * #299 — `settings` était volontairement hors-shell tant que sa coquille portait
 * une sidebar de 220px (l'imbriquer aurait produit une double nav verticale).
 * `SettingsShell` ayant basculé ses chapitres en onglets HORIZONTAUX, cette
 * sidebar-ci est désormais la SEULE nav verticale de l'application, y compris
 * sur les Réglages. Le lien « Réglages » du pied de cette nav pointe donc vers
 * une route sœur du même groupe (pas de re-montage du shell à la navigation).
 *
 * Responsive — TROIS états depuis #298 (décisions Designer, cf. briefing) :
 *  - `>= lg` (1024px, même seuil que `SettingsShell`) : sidebar persistante 248px
 *    (logo, nav Tableau de bord / Timeline / Produits, bouton Nouvel événement,
 *    langue, thème, profil avatar carré, réglages, déconnexion). INCHANGÉ.
 *  - `md`..`lg` (768–1023px) : sidebar REPLIÉE icon-only 64px
 *    (`w-sidebar-collapsed`, token `--sidebar-width-collapsed`). Mêmes cibles, mêmes
 *    `data-testid`, seuls les libellés textuels passent en `hidden lg:inline`.
 *    A11y : chaque cible porte `aria-label` + `title` INCONDITIONNELS — pattern déjà
 *    en prod dans `dashboard/CompactRail.tsx` (`RailButton`), pas le `<Tooltip>` custom.
 *  - `< md` (<=767px) : la sidebar est masquée (`hidden md:flex`). Le shell DÉLÈGUE la
 *    nav mobile à l'écran enveloppé (`CompactRail` / `MobileDrawer` du dashboard) —
 *    zéro duplication de logique nav.
 *
 * DEC-S40-001 CORRIGÉE (le commentaire précédent était FAUX, vérifié au #298) : il
 * affirmait que la tablette « bascule en mode mobile CompactRail/MobileDrawer ». Ni
 * l'un ni l'autre ne couvrait 768–1024 px —
 *  · `CompactRail` est monté sur `useMediaQuery('(orientation: landscape) and
 *    (max-height: 500px)')` (`dashboard/page.tsx:63`) : un critère de HAUTEUR, pas un
 *    palier de largeur tablette ;
 *  · `MobileDrawer` suit `isMobile` = `'(max-width: 767px)'` (`dashboard/page.tsx:60`).
 * Il y avait donc un TROU : entre 768 et 1023 px, aucune nav n'était rendue par le
 * shell ni par l'écran (hors dashboard, qui garde sa propre chrome `lg:hidden`).
 * #298 comble ce trou par l'état icon-only.
 *
 * #455 — CRÉATION D'ÉVÉNEMENT SOUS 768 px (bouton flottant `md:hidden`).
 * La délégation ci-dessus vaut pour la NAV, pas pour l'ACTION : le seul
 * déclencheur de `NewEventDrawer` vivait dans l'`<aside>` `hidden … lg:flex`, donc
 * la création d'événement était INATTEIGNABLE sous 1024 px, et aucun écran
 * enveloppé n'en portait de substitut — seul le dashboard a une chrome mobile,
 * `timeline`/`products`/`settings` n'en ont aucune. Le déclencheur flottant vit
 * donc ICI, au seul point d'ancrage commun aux 4 écrans du groupe `(app)`. Il
 * appelle le MÊME `setShowCreate(true)` que le bouton de la sidebar : un SEUL état,
 * donc un SEUL `NewEventDrawer` monté (un second état monterait un second drawer).
 * Le drawer bascule seul en bottom sheet `.mt-sheet` sous 1024 px (`NewEventDrawer` :
 * `useMediaQuery('(max-width: 1023px)')`) — rien à lui passer.
 *
 * INVARIANT #455, RÉÉCRIT POUR LES 3 ÉTATS DE #298. Le miroir doit rester EXACT,
 * sinon un palier se retrouve avec zéro déclencheur (le défaut d'origine) ou deux.
 * `hidden md:flex` sur l'`<aside>` ⇔ `md:hidden` sur le bouton flottant, donc :
 *   · `< md`      → bouton flottant SEUL ;
 *   · `md`..`lg`  → bouton de sidebar SEUL, icon-only (libellé `hidden lg:inline`) ;
 *   · `>= lg`     → bouton de sidebar SEUL, libellé visible.
 * Exactement un des deux déclencheurs DU SHELL est peint, à TOUTE largeur. Le
 * `data-testid` `shell-sidebar-new-event-button` et le handler sont INCHANGÉS.
 *
 * #602 (DEC-S85-003) — UN TROISIÈME DÉCLENCHEUR, sur `/timeline` seulement : le
 * bouton « Nouvel événement » de la barre d'outils de la frise (`TimelineView`,
 * `layout="screen"`, testid `timeline-new-event`). Il n'a NI état NI drawer à
 * lui : il appelle `openCreate` ci-dessous, reçu par `useOpenCreateEvent()`
 * (`CreateEventContext.tsx`, provider qui enveloppe `children`). Toujours un seul
 * `showCreate`, donc toujours un seul `NewEventDrawer`. Règle de peinture :
 *   · `< md`  → `hidden md:inline-flex` : JAMAIS en même temps que le bouton
 *              flottant (seul déclencheur sous 768 px, l'invariant ci-dessus tient) ;
 *   · `>= md` → coexiste avec le bouton de sidebar, comme la maquette (bouton du
 *              shell + bouton accent de l'en-tête Vue Timeline).
 * Le miroir `hidden md:flex` ⇔ `md:hidden` reste la seule chose qui garantit
 * « au moins un » ; le 3e ne compense aucun palier et ne doit jamais descendre
 * sous `md`.
 *
 * #578 — ÉTAT ACTIF ET CTA : LA RÉFÉRENCE EST LA MAQUETTE, PAS UN ÉCRAN VOISIN.
 * Le commentaire précédent disait que la classe active était « calquée sur
 * `SettingsShell` » (`bg-accent-soft text-accent font-medium`). C'était la
 * description exacte d'un précédent INTERNE, jamais rattaché à une maquette :
 * le motif naît dans `SettingsShell` (#86, 43d9e14) et a été recopié ici. Ne
 * plus invoquer un composant frère comme source de vérité visuelle — la source
 * est le handoff (`design_handoff_mytimeline/README.md`, projet Claude Design).
 *
 * Conforme à la maquette depuis #578, et les deux couleurs étaient INVERSÉES :
 *  · lien actif : PILULE GRAPHITE PLEINE — `bg-primary text-primary-ink`
 *    (+ `aria-current="page"`), jamais la classe legacy `.is-active`. S'inverse
 *    seule en sombre (`--color-primary` → #ECEDEF, encre → #0B0C0E) ;
 *    contraste encre/pilule 17.8:1 en clair, 16.7:1 en sombre.
 *  · bouton Nouvel événement : BLEU ACCENT —
 *    `bg-accent hover:bg-accent-hover text-accent-ink`, le trio déjà porté par
 *    tous les CTA primaires du produit (login, register, AddProductButton…),
 *    et non le `bg-primary` par défaut du `Button`.
 * `SettingsShell` (la source du motif) a reçu le MÊME état actif au même
 * commit : les deux doivent rester alignés sur la maquette, pas l'un sur l'autre.
 *
 * #575 (DEC-S84-002) — CASSE ET POLICE DES LIBELLÉS DE NAV : la maquette pose
 * `font-mono; 12px; letter-spacing:.06em; uppercase` sur chaque lien. Rendu par
 * `.mt-nav-label` (DS `i18n.css` §2bis) + `text-2xs` (13px, token le plus proche :
 * l'échelle n'a pas de 12px). Classe dédiée et non `.mt-eyebrow`, dont la couleur
 * hors layer battrait l'encre de la pilule active. Périmètre : les 3 liens de
 * `NAV_ITEMS` ; le lien « Réglages » du pied n'est pas un lien de la `<nav>` et
 * garde son sentence case (point non tranché par la maquette recopiée).
 *
 * Overlay du bouton = `NewEventDrawer` (drawer 452px du handoff §6, #300 —
 * remplace le Dialog minimal placeholder de #210).
 */
type NavId = 'dashboard' | 'timeline' | 'products'

const NAV_ITEMS: { id: NavId; icon: LucideIcon }[] = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'timeline', icon: GanttChartSquare },
  { id: 'products', icon: Package },
]

export interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const t = useTranslations('shell')
  const locale = useLocale()
  const pathname = usePathname() || ''
  const router = useRouter()
  const { logout } = useAuth()
  // #210 — Garde au niveau du shell : la sidebar authentifiée (nav protégée,
  // profil, déconnexion) ne doit jamais flasher pour un anonyme atteignant
  // directement une route protégée. La garde (redirection incluse) DOIT vivre
  // ici : le shell enveloppe `children`, donc un spinner anticipé sans monter
  // `children` empêcherait la garde d'une page enfant de se déclencher.
  const { user, loading } = useAuthGuard()
  const { resolvedTheme, setTheme } = useTheme()
  const [showCreate, setShowCreate] = useState(false)

  // #300 — identité STABLE obligatoire : `NewEventDrawer` la passe en `onEscape` à
  // `useFocusTrap`, dont l'effet a `onEscape` en dépendance. Une lambda inline
  // recréerait l'effet à chaque rendu du shell (thème, pathname…) → re-focus du
  // premier focusable, donc vol de focus pendant la saisie du formulaire.
  const closeCreate = useCallback(() => setShowCreate(false), [])
  // #602 — même exigence d'identité stable : c'est la valeur du contexte
  // `CreateEventProvider` ; une lambda inline re-rendrait tous ses consommateurs
  // (dont la frise) à chaque rendu du shell.
  const openCreate = useCallback(() => setShowCreate(true), [])

  const isDark = resolvedTheme === 'dark'

  const handleLogout = async () => {
    try {
      await logout()
      router.push(`/${locale}/login`)
    } catch (error) {
      console.error('Erreur lors de la déconnexion :', safeErrorMessage(error))
    }
  }

  const displayName = user?.name || user?.username || ''
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || undefined

  // Anti-flash anonyme : tant que la session se restaure (`loading`) ou qu'aucun
  // `user` n'est présent (anonyme, avant la redirection déclenchée par la garde),
  // on rend un spinner plein écran — jamais la chrome authentifiée.
  if (loading || !user) {
    return (
      <div
        className="bg-bg flex h-screen items-center justify-center"
        data-testid="app-shell-loading"
      >
        <div
          className="border-accent h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
          role="status"
        >
          <span className="sr-only">{t('loading')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg text-ink flex min-h-screen" data-testid="app-shell">
      {/* -------- Sidebar persistante : 64px icon-only (md..lg), 248px (>= lg) -------- */}
      <aside
        className="bg-surface border-rule w-sidebar-collapsed lg:w-sidebar sticky top-0 hidden h-screen shrink-0 flex-col border-r md:flex"
        data-testid="shell-sidebar"
      >
        {/* Logo / marque — l'icône seule tient le rôle de marque en replié. */}
        <div className="border-rule flex h-14 shrink-0 items-center justify-center gap-2 border-b px-3 lg:justify-start lg:px-4">
          <CalendarDays className="text-accent h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="text-ink hidden text-sm font-semibold tracking-tight lg:inline">
            {t('brand')}
          </span>
        </div>

        {/* Bouton Nouvel événement (overlay) — bleu accent (#578, cf. en-tête).
            Replié : icône seule, le nom accessible vient d'`aria-label`+`title`
            (pattern `RailButton`). `px-0 lg:px-4` évite que le padding du Button
            n'écrase l'icône dans les 48px utiles du rail. */}
        <div className="px-2 pt-4 lg:px-3">
          <Button
            type="button"
            onClick={openCreate}
            aria-label={t('newEvent')}
            title={t('newEvent')}
            className="bg-accent hover:bg-accent-hover text-accent-ink w-full px-0 lg:px-4"
            data-testid="shell-sidebar-new-event-button"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden lg:inline">{t('newEvent')}</span>
          </Button>
        </div>

        {/* Navigation principale */}
        <nav
          aria-label={t('nav.aria')}
          className="flex flex-1 flex-col gap-1 px-2 pt-4 lg:px-3"
          data-testid="shell-sidebar-nav"
        >
          {NAV_ITEMS.map(({ id, icon: Icon }) => {
            const href = `/${locale}/${id}`
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={id}
                href={href}
                aria-current={active ? 'page' : undefined}
                aria-label={t(`nav.${id}`)}
                title={t(`nav.${id}`)}
                data-testid={`shell-sidebar-nav-link-${id}`}
                className={cn(
                  'flex h-11 items-center justify-center gap-3 rounded-md px-0 text-sm transition-colors lg:justify-start lg:px-3',
                  active
                    ? 'bg-primary text-primary-ink font-medium'
                    : 'text-ink-muted hover:bg-surface-2',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {/* #575 — mono capitales espacées de la maquette (`.mt-nav-label`,
                    DS i18n.css §2bis, détendue en allemand). Reste le 1er `<span>`
                    du lien : `e2e/sprint-73-tablet-sidebar.spec.ts:144` le cible. */}
                <span className="mt-nav-label text-2xs hidden lg:inline">{t(`nav.${id}`)}</span>
              </Link>
            )
          })}
        </nav>

        {/* Pied : langue + thème + réglages + profil + déconnexion */}
        <div className="border-rule flex flex-col gap-2 border-t p-2 lg:p-3">
          {/* Replié : les deux contrôles s'empilent (48px utiles ne tiennent pas
              deux cibles de 44px côte à côte). `LanguageSelector` est déjà
              `size="icon"` → aucun changement à lui apporter. */}
          <div className="flex flex-col items-center gap-2 lg:flex-row lg:justify-between">
            <LanguageSelector />
            <button
              type="button"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-pressed={isDark}
              aria-label={isDark ? t('theme.toLight') : t('theme.toDark')}
              title={isDark ? t('theme.toLight') : t('theme.toDark')}
              data-testid="shell-sidebar-theme-toggle"
              className="text-ink-muted hover:bg-surface-2 flex h-11 w-11 items-center justify-center rounded-md transition-colors"
            >
              {isDark ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <Link
            href={`/${locale}/settings`}
            aria-label={t('settings')}
            title={t('settings')}
            data-testid="shell-sidebar-settings-link"
            className="text-ink-muted hover:bg-surface-2 flex h-11 items-center justify-center gap-3 rounded-md px-0 text-sm transition-colors lg:justify-start lg:px-3"
          >
            <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden lg:inline">{t('settings')}</span>
          </Link>

          <div className="flex flex-col items-center gap-2 px-0 pt-1 lg:flex-row lg:gap-3 lg:px-1">
            {/* Avatar carré (rounded-sm) — override local, `avatar.tsx` inchangé. */}
            <Avatar
              className="rounded-sm"
              src={user?.avatarUrl ?? undefined}
              initials={initials}
              size="sm"
              data-testid="shell-sidebar-avatar"
            />
            {/* Replié : l'avatar seul identifie le profil (`truncate` exige un
                bloc, d'où `lg:block` et non `lg:inline`). */}
            <span className="text-ink hidden min-w-0 flex-1 truncate text-sm font-medium lg:block">
              {displayName || t('profile')}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              aria-label={t('logout')}
              title={t('logout')}
              data-testid="shell-sidebar-logout"
              className="text-ink-muted hover:bg-surface-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      {/* -------- Contenu de l'écran enveloppé -------- */}
      <main className="min-w-0 flex-1" data-testid="shell-main">
        {/* #602 — les écrans enveloppés peuvent ouvrir LE drawer du shell. */}
        <CreateEventProvider onOpenCreate={openCreate}>{children}</CreateEventProvider>
      </main>

      {/* #455 — Bouton flottant « Nouvel événement », `md:hidden` depuis #298 (miroir
          exact du `hidden … md:flex` de l'`<aside>` : exactement un des deux
          déclencheurs est rendu, jamais zéro, jamais deux — sous `md` c'est celui-ci,
          au-dessus c'est celui de la sidebar, replié puis plein). Spec Designer :
            · 52×52 (`h-13 w-13`, token `--space-13`) — au-dessus du minimum tactile
              WCAG 2.5.5 (44 px) ; `Button size="icon"` (36 px) serait sous le seuil ;
            · `rounded-xl` (`--radius-xl`), le pill étant réservé aux switches ;
            · `z-10` = `--z-sticky`, donc SOUS `--z-modal` (70) : l'overlay de la sheet
              recouvre le bouton pendant la saisie, sans `aria-hidden` ni démontage ;
            · offset bas = `--space-6` + `env(safe-area-inset-bottom)` (encoche iOS,
              même parade que `settings/mobile/BottomSheet.tsx`).
          Icône seule → le nom accessible vient d'`aria-label` (clé i18n EXISTANTE
          `shell.newEvent`, aucune clé ajoutée) ; `aria-haspopup="dialog"` annonce
          l'ouverture du drawer. La restauration du focus est déjà assurée par
          `useFocusTrap` (cleanup au démontage du drawer) — rien à ajouter ici. */}
      <button
        type="button"
        onClick={openCreate}
        aria-label={t('newEvent')}
        aria-haspopup="dialog"
        data-testid="shell-mobile-new-event-button"
        className="bg-primary text-primary-foreground hover:bg-primary/90 fixed right-4 bottom-[calc(var(--space-6)+env(safe-area-inset-bottom))] z-10 flex h-13 w-13 items-center justify-center rounded-xl shadow-lg transition-colors md:hidden"
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* #300 — Flux de création réel : le Dialog placeholder (#210, testid
          `shell-new-event-dialog`) est REMPLACÉ par le drawer 452px du handoff §6.
          Montage CONDITIONNEL (et pas seulement `open={showCreate}`) : c'est LUI qui
          démonte réellement le drawer à la fermeture, donc qui purge son état interne
          (produit choisi, erreur produit, état de la mutation). Un `return null` interne
          ne démonte PAS le composant — React garde l'instance et ses hooks vivants, et
          une erreur de soumission réapparaissait telle quelle à la réouverture suivante
          (revue PR #313). La restauration du focus reste assurée : `useFocusTrap` la fait
          dans son cleanup, que React exécute au démontage. */}
      {showCreate && <NewEventDrawer open onClose={closeCreate} />}
    </div>
  )
}

export default AppShell
