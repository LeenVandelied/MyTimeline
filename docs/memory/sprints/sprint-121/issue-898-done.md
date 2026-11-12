# Issue #898 — Densité persistée appliquée sur toutes les pages

## Commits

- `6faaa4ef` :bug: fix(frontend): densité persistée appliquée sur toutes les pages dès le chargement (#898)

## Résumé

**Objectif** : après rechargement, la densité choisie (compact / normal / confortable) s'applique sur toutes les pages, pas seulement dans Réglages › Préférences.

**Fichiers clés**
- `frontend/src/lib/density.ts` (nouveau) — source unique : `DENSITY_OPTIONS`, `DENSITY_STORAGE_KEY`, `DEFAULT_DENSITY`, `DENSITY_ATTRIBUTE`, `isDensity`, `DENSITY_INIT_SCRIPT`. Module sans dépendance (ni `@/`, ni zod) pour être importable par la spec Playwright.
- `frontend/src/types/settings.ts` — réexporte les constantes depuis `@/lib/density` (consommateurs historiques inchangés).
- `frontend/app/[locale]/layout.tsx` — `<script dangerouslySetInnerHTML={{ __html: DENSITY_INIT_SCRIPT }} />` en premier enfant de `<body>`.
- `frontend/src/hooks/useDensity.ts` — garde `if (!hydrated) return` dans l'effet d'application ; `try/catch` autour de `localStorage`.
- Tests : `src/lib/density.test.ts`, `src/hooks/useDensity.test.tsx`, `e2e/sprint-121-density-persisted.spec.ts`.

**Choix technique : (a) script inline pré-hydratation, rendu par le layout SERVEUR `[locale]`**
- Zéro flash : script bloquant en tête de `<body>`, exécuté avant l'analyse du reste du corps ; la densité change `font-size` de `<html>` (rem), un flash serait un saut de mise en page complet.
- (b) composant client monté dans le layout connecté écarté : application en effet → première peinture en 16px puis saut à 15/17px.
- Layout `[locale]` plutôt que `(app)` : (1) c'est lui qui porte `<html>` ; (2) un script rendu par `(app)/layout.tsx` ne s'exécuterait PAS lors de la navigation client login → dashboard (React ne lance jamais un `<script>` créé côté client), donc la densité manquerait juste après connexion. Conséquence assumée : les pages publiques (landing, login) suivent aussi la densité de l'appareil — comme le thème.
- CSP / nonce : vérifié, le frontend ne pose aucune CSP (`proxy.ts`, `next.config.mjs`, layouts : aucun `nonce`/`Content-Security-Policy`) ; seul le backend émet des en-têtes de sécurité pour l'API. Même situation que le script next-themes.
- `<html>` porte déjà `suppressHydrationWarning` (l. ~67) : l'attribut posé avant React ne déclenche pas de mismatch.
- React 19 : `releaseSingletonInstance` (react-dom 19.3) ne réinitialise que les props gérées par React → `data-density` survit au remontage de `<html>` (changement de locale). Seul `clearSingletonPreambleContribution` (récupération d'erreur d'hydratation d'une frontière qui contribue au préambule) efface tous les attributs — cas rare, non couvert (next-themes, lui, réapplique par effet).
- Script généré depuis les constantes via `JSON.stringify` (aucune donnée utilisateur interpolée), ES5, `try/catch` : stockage bloqué → défaut. La valeur par défaut est posée explicitement (`data-density="normal"`) sur toutes les pages : sans effet CSS (aucune règle `normal`).
- Correctif annexe dans `useDensity` : pendant l'hydratation `density` vaut `DEFAULT_DENSITY` par construction ; l'effet écrivait `normal` par-dessus la valeur du script puis `compact` au rendu suivant (flash sur une page qui monte Préférences au chargement). Prouvé par le test unitaire d'hydratation, rouge sans la garde (`expected [ 'normal', 'compact' ] to not include 'normal'`).

**Tests et résultats**
- `npx vitest run src/lib/density.test.ts src/hooks/useDensity.test.tsx` : 2 fichiers, 14 tests verts. Contrôle négatif : garde retirée → 1 rouge, rétablie → vert.
- Appelants : `vitest run src/components/settings src/hooks src/lib/density.test.ts src/components/__tests__/date-time-semantics.test.tsx` : 29 fichiers, 208 tests verts.
- `npx tsc --noEmit` : 0 erreur. `npx eslint <7 fichiers>` : 0 problème. `rtk proxy npx prettier --check <7 fichiers>` : conforme.
- E2E `e2e/sprint-121-density-persisted.spec.ts` (3 tests) : **écrite et typecheckée, NON exécutée** (consigne : le lead joue Playwright).

## Mesure demandée par l'issue

Non mesurée en navigateur par moi (Playwright/next interdits dans ce briefing). La spec mesure, pour le lead :
1. Compact choisi dans Préférences → rechargement `/fr/dashboard` puis `/fr/settings` (onglet Profil, Préférences non monté) puis reload : `data-density === 'compact'` ET `getComputedStyle(html).fontSize === '15px'`.
2. Anti-flash : interception de `Element.prototype.setAttribute` posée par `addInitScript` → la séquence des écritures de `data-density` vaut exactement `['compact']` (jamais `normal`).
3. Valeur invalide `'huge'` en localStorage → `normal` / 16px.
4. Valeur `comfortable` persistée → `comfortable` / 17px.

Points à surveiller au premier run : `toEqual(['compact'])` suppose qu'aucun autre code n'écrit `data-density` sur ces pages (vrai à ce jour : seul `useDensity`, monté uniquement par `PreferencesSection`) ; la mesure 16px suppose la taille de police par défaut de Chromium (16px).

## Signaux mémoire

- [MEMORY:pitfall] Context: test d'absence de flash d'un attribut via `MutationObserver` qui relit l'attribut dans son callback. Solution: intercepter `setAttribute` (ou exploiter `attributeOldValue`). Prevention: le callback est une microtâche qui voit la valeur FINALE d'un lot d'écritures — un flash `normal → compact` écrit dans la même tâche est invisible ; oracle vacant constaté au contrôle négatif (#898).
- [MEMORY:pattern] Problem: préférence d'affichage locale (localStorage) à appliquer avant la première peinture sur toutes les pages. Solution: script inline généré depuis les constantes, rendu en tête de `<body>` par le layout SERVEUR qui porte `<html>` (`suppressHydrationWarning`), hook client réservé au choix et muet tant que `useHydrated()` est faux. Anti-pattern: l'appliquer dans un layout imbriqué (`(app)`) — un `<script>` rendu lors d'une navigation client ne s'exécute jamais.

## Recommandations suite

aucune

STATUS: COMPLETED
