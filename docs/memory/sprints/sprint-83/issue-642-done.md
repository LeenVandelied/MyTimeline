# Issue #642 — Exposer la bascule de thème hors connexion (DEC-S82-009)

**Commit :** `ef8581e` — `:sparkles: feat(theme): exposer la bascule de thème hors connexion (#642)`
**Vérification lead :** `git show --stat ef8581e` → 14 fichiers, +700/−6, tous dans le périmètre.
`AppShell.tsx`, `SettingsShell.tsx`, `date-iso.ts`, `sprint-77-theme-visual.spec.ts` **non touchés**.

## Fichiers de contexte lus (déclarés par l'agent)
`.ai-env/context-packs/pit-frontend.md` (grep thème/hydratation/flash → **0 PIT applicable**),
`settings/PreferencesSection.tsx`, `types/settings.ts`, `e2e/sprint-77-theme-visual.spec.ts`,
`HeaderSection.tsx`, `LandingMobileMenu.tsx`, `ui/language-selector.tsx`, `ui/button.tsx`,
`theme-provider.tsx`, `app/layout.tsx`, `app/[locale]/layout.tsx`, les 4 pages auth,
`AppShell.tsx`, `MobileDrawer.tsx`, `globals.css`, `e2e/landing-header-logo.spec.ts`,
`e2e/landing-mobile-menu.spec.ts`, `language-selector.i18n.test.ts`, `scripts/test-quiet.sh`.
Non lus : `.claude/rules/frontend-stack.md`, `.claude/rules/conventions.md`.

## Résumé
- Surfaces exposées : landing desktop (`landing-header-theme-toggle`, groupe `hidden lg:flex`),
  menu mobile (`landing-mobile-menu-theme-toggle`), **4 pages auth** (`auth-theme-toggle`, coin
  haut-droit à côté du `LanguageSelector`).
- Composant **extrait** en `frontend/src/components/ui/theme-toggle.tsx`. Aucun composant
  réutilisable n'existait : `AppShell.tsx` et `MobileDrawer.tsx` portaient **deux toggles écrits
  en ligne, de gabarits différents**, et `AppShell` était hors périmètre par contrainte dure.
  Seul le gabarit utile au public a été extrait (icône seule, jumeau du sélecteur de langue).
- Clés i18n `common.theme.{toggle,toLight,toDark}` dans les **4 locales**.
- Tests : `./scripts/test-quiet.sh frontend` complet → build + **1385/1385** vitest + tsc + lint,
  **exit 0** (base 1359 confirmée, +26 = les 2 fichiers de test ajoutés).

## Prémisse « préférence de compte » — CONFIRMÉE INEXISTANTE
`grep -ril theme backend/src/main/java` → 0 · `…/db/migration` → 0 ·
`grep -rn theme frontend/src/services/ frontend/src/types/user.ts` → 0 ·
`types/settings.ts:36` : « Thème : next-themes ».
**L'estimation « S » de l'issue reposait bien sur une prémisse fausse.**

## Critères d'acceptation NON tenus (à ne pas cocher)
- **« Le choix fait avant connexion est conservé après »** — le choix survit en `localStorage`
  (reload + navigation entre routes publiques : vérifié), mais **rien ne l'adopte comme
  préférence de compte** à la connexion : cette préférence n'existe pas.
- **« Un compte avec préférence explicite n'est pas écrasé par le choix local »** — sans objet
  tant qu'il n'y a pas de préférence de compte.

Les 3 autres critères sont tenus, sous les réserves ci-dessous.

## Anti-flash — établi sur le mécanisme, pas sur le pixel
Vérifié sur un `next start` de **production** (port 3311, arrêté depuis), à 3 niveaux :
1. HTML servi de `/fr` et `/fr/login` : le script inline de pré-hydratation next-themes
   (`document.documentElement` + `localStorage`) est placé **52 octets après `<body>`**, donc
   avant tout contenu ; le `<html>` servi ne porte **aucune** classe de thème → elle vient bien
   du script.
2. CSS compilé : `.dark\:block:where(.dark,.dark *)` / `.dark\:hidden` → le choix d'icône est
   **purement CSS**, gated par cette même classe → zéro écart d'hydratation.
3. Markup servi du bouton : les **deux** `<svg>` présents, `aria-label` générique, pas
   d'`aria-pressed` → premier rendu client identique au serveur.

**Ce que ça ne prouve pas :** qu'aucune frame n'a été peinte en clair. Aucune API ne donne les
frames intermédiaires ; la sonde `requestAnimationFrame` de la spec E2E est une borne, pas une
observation du pixel.

## Non vérifié / manquant (à retenir)
- **E2E jamais exécuté** — `landing-auth-theme-toggle.spec.ts` (8 tests) écrit mais non joué
  (exclusivité lead). Les 3 nouveaux `data-testid` y sont cités.
- **`generateStaticParams` ne prérend PAS les routes d'auth** : `prerender-manifest.json` ne
  liste que `/` et `/_not-found`. Le mot « statiques » du critère d'acceptation est donc
  **inexact** — ces routes sont SSR. L'anti-flash tient quand même (script émis au rendu
  serveur), mais le fait mérite d'être su.
- **Contrastes non mesurés** (repos / survol / focus, clair + sombre) sur le nouveau bouton —
  **le trou le plus sérieux** vu l'historique du dépôt (S48, S49, #346).
- **Métriques de largeur mesurées sur macOS, pas sur jammy.** À 1024 px après correctif :
  marge logo→nav `fr` 46,0 / `es` 57,9 / `de` 68,3 / `en` 130,2 px (plancher 24), débordement 0 ;
  à 320 px en `de` la bascule desktop est `display:none`, groupe à 146,6 px (inchangé).
  **C'est `landing-header-logo.spec.ts` en CI Ubuntu qui tranche.**
- Aucun snapshot régénéré ; `sprint-77-theme-visual.spec.ts` non touché (le coin haut-droit ne
  croise pas `AUTH_CARD` — carte à y=163,9 vs bouton à y=16 ; le hero est
  `section.section-animation`, pas le `<header>`).
- **`AppShell.tsx` / `MobileDrawer.tsx` gardent leurs toggles en ligne**, tous deux **sans garde
  `mounted`** — sans effet visible sur routes protégées, mais duplication non résorbée.

## Signaux mémoire
- `[MEMORY:pattern]` Exposer un contrôle dépendant du thème sur une route rendue côté serveur :
  choisir l'icône par la variante `dark:` (classe posée avant peinture par next-themes) et ne
  mettre sous garde `mounted` que le **nom accessible**, avec un libellé générique côté serveur.
  Anti-pattern : `resolvedTheme === 'dark' ? <Sun/> : <Moon/>`, qui sert toujours la lune et fait
  sauter l'icône après hydratation.
- `[MEMORY:pitfall]` `language-selector.i18n.test.ts` assère la liste **exacte** des clés de
  `common.navigation` dans les 4 locales — toute addition la fait rougir. Ouvrir un objet frère
  (ici `common.theme`) plutôt qu'élargir `navigation`.
- `[MEMORY:decision]` #642 demandait un motif de persistance en 3 temps ; **seul le temps 1
  (local) est livré**. Les temps 2 et 3 supposent une préférence de thème au niveau du compte,
  absente du backend, des migrations et de l'API — hors d'une taille S.

## Recommandations suite
- `RECOMMAND_FOLLOWUP` : **préférence de thème au niveau du COMPTE** — migration V16 (colonne sur
  `users`), endpoint lecture/écriture, mapping entité, puis règle d'arbitrage à la connexion
  (compte prioritaire s'il existe, sinon adoption du choix local qui devient celui du compte).
  Ferme les 2 critères d'acceptation non tenus de #642. `[triage: M | backend+frontend]`.
- `RECOMMAND_TEST_RUNNER` : jouer `landing-auth-theme-toggle.spec.ts` (8 tests, anonyme, sans
  seed) + les 2 spécs de non-régression touchées indirectement, `landing-header-logo.spec.ts` et
  `landing-mobile-menu.spec.ts`.
- `RECOMMAND_UI_DESIGN` : mesurer les contrastes repos/survol/focus du nouveau bouton dans les
  2 thèmes sur les 3 surfaces.

STATUS: COMPLETED
