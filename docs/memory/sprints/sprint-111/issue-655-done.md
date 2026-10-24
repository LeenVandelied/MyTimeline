# Issue #655 — Unifier les trois bascules de thème

fichiers de contexte lus: briefing-655 (pack cp-frontend inline), .ai-env/context-packs/pit-frontend.md (grep theme/mounted/hydrat : PIT-S83-001/002/003), frontend/src/components/ui/theme-toggle.tsx, layout/AppShell.tsx, dashboard/MobileDrawer.tsx, settings/PreferencesSection.tsx, hooks/useDensity.ts, types/settings.ts, i18n.ts, e2e/landing-auth-theme-toggle.spec.ts, e2e/sprint-73-tablet-sidebar.spec.ts, tests unitaires AppShell/dashboard-mobile/theme-toggle(.i18n)

## Résumé

Objectif : UNE bascule de thème (3 gabarits) et UN point d'écriture du thème, où #653 branchera la persistance serveur.

Fichiers clés :
- `frontend/src/hooks/useThemeChoice.ts` (nouveau) — seul appelant de `setTheme` (next-themes) hors tests.
- `frontend/src/components/ui/theme-toggle.tsx` — `variant: 'icon' | 'square' | 'labeled'` (défaut `icon`).
- `layout/AppShell.tsx` → `<ThemeToggle variant="square" testId="shell-sidebar-theme-toggle" />`
- `dashboard/MobileDrawer.tsx` → `<ThemeToggle variant="labeled" testId="dashboard-mobile-drawer-theme-toggle" />`
- `settings/PreferencesSection.tsx` → `useThemeChoice()` (`theme`, `setThemeChoice`), garde `mounted` locale supprimée, cast `as ThemeOption` remplacé par le garde `isThemeChoice`.

API du hook (volet frontend de #653 : brancher la persistance DANS `setThemeChoice`) :
```ts
export type ThemeChoice = ThemeOption // 'light' | 'dark' | 'system' (types/settings.ts)
export function isThemeChoice(value: unknown): value is ThemeChoice
export function useThemeChoice(): {
  mounted: boolean                          // false au SSR + pendant l'hydratation
  isDark: boolean                           // mounted && resolvedTheme === 'dark'
  theme: ThemeChoice | undefined            // choix enregistré, undefined avant montage
  resolvedTheme: 'light' | 'dark' | undefined
  setThemeChoice(choice: ThemeChoice): void // SEUL point d'écriture (useCallback)
  toggle(): void                            // passe par setThemeChoice
}
```

Choix faits :
- Garde `mounted` par `useSyncExternalStore` (instantané serveur `false`, client `true`) au lieu de `useState`+`useEffect` : même garantie à l'hydratation, et `true` dès le 1er rendu pour un montage purement client (tiroir mobile monté à l'ouverture → pas de rendu intermédiaire au libellé générique).
- Les 3 gabarits servent la paire d'icônes CSS (`hidden dark:block` / `dark:hidden`) : aucune icône choisie en JS, donc aucune icône dépendant du thème avant montage. Avant montage : libellé générique `common.theme.toggle`, `aria-pressed` absent (toutes variantes).
- Classes et testids repris à l'identique ; `square` reste un `<button>` natif (pas `<Button>`) pour ne pas changer le rendu.
- i18n : les 3 gabarits lisent `common` seul. `shell.theme.toLight/toDark` supprimées (valeurs identiques à `common.theme.*` dans les 4 locales, vérifié par script) ; `dashboard.mobile.drawer.themeLight/themeDark` déplacées en `common.theme.light/dark` (mêmes valeurs). Textes affichés inchangés.
- Garde-fou « un seul écrivain » : `useThemeChoice.test.tsx` balaye `src/` + `app/` (hors tests) et échoue si un fichier autre que le hook appelle `setTheme(` ou importe `useTheme` de next-themes.

Vérif `/usr/bin/grep -rn "setTheme" frontend/src frontend/app` hors tests : seul `src/hooks/useThemeChoice.ts` appelle `setTheme` (PreferencesSection ne sort que pour `setThemeChoice`).

## Commits

- `a78d4485` ♻️ refactor(theme): une seule bascule de thème et un seul point d'écriture (#655) — 23 fichiers, tous les miens (`git show --stat HEAD` vérifié).

## Tests

- `npx vitest run` ciblé (hook, theme-toggle, theme-toggle.i18n, AppShell, dashboard-mobile, settings/, eyebrow-consumers, i18n-namespaces) : 18 fichiers, 201 + 11 tests verts (1 échec intermédiaire attendu corrigé : `AppShell.test.tsx` assertait `shell.theme.toDark` → `common.theme.toDark`).
- Suite vitest complète : 170 fichiers, 2239 tests, 0 échec. Lignes stderr dans AccountSection, DeleteConfirmDialog(.intl), exportService (hors de ma surface ; je n'ai pas vérifié si elles existent aussi sur la base).
- `npx tsc --noEmit` : 0 erreur (spec E2E comprise).
- `npm run lint` : 0 warning/erreur.
- `rtk proxy npx prettier --check` sur les 11 fichiers TS/TSX : conforme (JSON des locales ignorés par `.prettierignore`, réécrits en `indent=2` avec un aller-retour identique vérifié avant édition).
- NON exécutés (interdits) : Playwright, `next build`.

## Specs E2E à jouer par le lead

Créée (jamais exécutée) :
- `frontend/e2e/sprint-111-theme-toggle-unified.spec.ts` — shell desktop 1280 (square : 44×44, aria-label fr, `.dark` sur `<html>`, aria-pressed, icône peinte) + tiroir 375 px (labeled : libellé « Sombre »/« Clair »). Compte `SHARED`, `localStorage.theme` semé à `light` par `addInitScript`.

Impactées (citent un testid/libellé de la surface ou la mesurent) :
- `e2e/landing-auth-theme-toggle.spec.ts` (gabarit `icon`, barrière `aria-pressed`)
- `e2e/settings-preferences.spec.ts` (`pref-theme` → `useThemeChoice`)
- `e2e/settings-navigation.spec.ts`
- `e2e/sprint-73-tablet-sidebar.spec.ts` (pied de sidebar + tiroir)
- `e2e/sprint-77-theme-visual.spec.ts`
- `e2e/sprint-96-auth-banner-overlap.spec.ts`
- `e2e/sprint-99-touch-targets.spec.ts`
Conseillées (surface shell, captures/débordement) : `e2e/sprint-63-de-overflow-audit.spec.ts`, `e2e/sprint-70-preview-visual.spec.ts`.

## Signaux mémoire

- [MEMORY:decision] Context: #653 doit persister le thème sur le compte, 4 composants écrivaient le thème. Decision: `hooks/useThemeChoice.ts` est le SEUL appelant de `setTheme` ; `setThemeChoice` est le point de branchement de la persistance ; garde-fou textuel dans `useThemeChoice.test.tsx`. Why: une bascule oubliée contournerait la persistance en silence.
- [MEMORY:pattern] Problem: garde `mounted` par `useState(false)`+`useEffect` impose un rendu « non monté » à chaque montage client (tiroir, dialog) même après hydratation. Solution: `useSyncExternalStore(noop, () => true, () => false)` — `false` au SSR/hydratation, `true` dès le 1er rendu d'un montage client ; testable via `renderToString`. Anti-pattern: `useEffect(() => setMounted(true))` dans un composant monté à l'ouverture.
- [MEMORY:pitfall] Context: spec E2E qui bascule le thème sur le compte `SHARED`. Solution: aujourd'hui sans effet (thème en localStorage, isolé par contexte). Prevention: quand #653 persiste le thème côté serveur, `sprint-111-theme-toggle-unified` et `landing-auth-theme-toggle` (après connexion ?) muteront l'état du compte partagé → compte dédié ou restauration en fin de test.

## Recommandations suite

- RECOMMAND_FOLLOWUP: le gabarit `labeled` (tiroir mobile) hérite de `<Button>` taille par défaut `h-9` = 36 px de haut, sous la cible tactile de 44 px de la convention — repris à l'identique par consigne, à corriger (ex. `h-11`) avec vérif visuelle [triage XS | frontend]
- RECOMMAND_FOLLOWUP: #653 doit mettre à jour la note « COMPTE PARTAGÉ » de `e2e/sprint-111-theme-toggle-unified.spec.ts` (compte dédié ou restauration du choix) dès que la persistance serveur est branchée [triage XS | frontend/e2e]

Écarts par rapport au briefing :
- Clés i18n déplacées/supprimées (`shell.theme`, `dashboard.mobile.drawer.themeLight/themeDark`) pour qu'un composant `ui/` ne lise que `common` ; libellés affichés inchangés. Conséquence : `AppShell.test.tsx` attend désormais `common.theme.toDark`.
- Garde `mounted` par `useSyncExternalStore` plutôt que `useEffect` (justification ci-dessus).
- Prémisses du briefing confirmées : 4 points d'écriture (dont `PreferencesSection`), aucune spec E2E ne citait les testids du shell et du tiroir.

STATUS: COMPLETED
