# Correctif — spec E2E de #642 (6 tests rouges au run du lead)

**Commit :** `9ccd798` — `:white_check_mark: test(e2e): armer la spec de bascule de thème hors connexion (#642)`
**Vérification lead :** 1 fichier, +100/−9 — `frontend/e2e/landing-auth-theme-toggle.spec.ts`
uniquement. **Aucun fichier applicatif touché** : le correctif ne masque pas un défaut de code.

## Pourquoi ce correctif existe
La spec livrée par #642 n'avait **jamais été exécutée** (exclusivité Playwright réservée au lead).
Au premier run réel : **6 rouges sur 11**. Le lead a d'abord établi au navigateur que le
composant, lui, fonctionnait (clic → `.dark` s'inverse, `localStorage.theme` persiste), donc que
le défaut était dans la spec.

## Diagnostic réel — 3 causes, toutes dans la spec
- **Piste A du lead : CONFIRMÉE**, et elle explique **les 6** rouges, y compris le « testid
  introuvable ». **Un clic sur un bouton visible et activé mais non hydraté est un NO-OP
  silencieux** — Playwright ne signale rien. Pour le test du panneau mobile, le clic perdu est
  celui du **burger** : le panneau n'est donc jamais monté, d'où le « not found ».
  Le piège était déjà écrit mot pour mot dans `landing-mobile-menu.spec.ts:52-63` (`openMenu`).
- **Piste B du lead : INFIRMÉE.** `landing-header-menu` **existe bien**
  (`LandingMobileMenu.tsx:100`), rendu conditionnellement (`if (!open) return null`).
  L'énumération DOM du lead ne le voyait pas parce que **le menu était fermé** — l'absence au
  balayage était le *symptôme* du clic perdu, pas la preuve d'un testid faux. L'assertion
  `toBeHidden()` sur le toggle du header portait déjà correctement sur la visibilité.
- **3e cause, non anticipée par le lead**, découverte en exécutant :
  - `<nextjs-portal>` **recouvre** la bascule du panneau mobile à 375 px → 60 clics interceptés
    jusqu'à expiration ;
  - la sonde anti-flash `firstFrame` est un **faux oracle flaky** (~1 run sur 3, mesuré 3 fois) :
    les feuilles bloquantes du `<head>` suspendent le rendu pendant que le compositeur tique
    déjà, et le `<body>` de Next s'ouvre sur un `<div hidden>` avant le script next-themes.

## Correctif
1. `waitForToggleHydrated()` — barrière **nommée** sur `aria-pressed`, c'est-à-dire sur l'oracle
   de montage du composant lui-même. **Pas** un `toPass` rejouant le clic : `setTheme(inverse)`
   n'est pas idempotent, contrairement à `setMenuOpen(true)`. **Pas** un `waitForTimeout`.
2. `neutralizeDevToolingPointerEvents` — helper canonique déjà présent dans le dépôt, aucune
   exclusion applicative ajoutée.
3. La sonde anti-flash échantillonne désormais la 1re frame portant une **boîte rendue**
   (`getClientRects().length > 0`). C'est un **resserrage** de l'oracle, pas un relâchement :
   elle rejette maintenant `<div hidden>` et l'état pré-layout.

`theme-toggle.tsx` n'a pas été touché.

## Preuve d'exécution
`SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test e2e/landing-auth-theme-toggle.spec.ts`
→ **6 exécutions consécutives, 16 passed / 0 failed** (11 tests de la spec + 5 du projet `setup`).
Le briefing du lead annonçait 8 tests, **il y en a 11**.
`tsc --noEmit` = 0, eslint 0, prettier OK, aucun PNG non suivi.

## Défaut applicatif
**Aucun bloquant.** La bascule exige l'hydratation pour fonctionner, ce qui est inhérent à
`useTheme`/`setTheme` et sans recours en React ; la fenêtre est de quelques centaines de ms sur
une page statique, et l'icône comme le nom accessible sont corrects dès le HTML servi.
Signalé, ni corrigé ni contourné.

## Non vérifié / manquant
- `./scripts/test-quiet.sh frontend` **non relancé** — aucun code applicatif modifié (diff = 1
  spec E2E) ; `tsc --noEmit` couvre la compilation de la spec.
- Suite Playwright complète **non rejouée** par l'agent (interdite par le briefing) : les 12
  autres rouges du run du lead ne sont pas traités ici.
- Comportement sous `next start` (CI Ubuntu) **non observé**. Le neutraliseur `nextjs-portal` y
  est inerte mais inoffensif ; la barrière d'hydratation y est plus rapide, donc a fortiori
  satisfaite.
- Absence de flake établie sur **6 runs locaux à `workers: 2`**, pas au-delà.

## Signaux mémoire
- `[MEMORY:pitfall]` **Un clic Playwright sur un bouton visible et activé mais non hydraté est un
  NO-OP silencieux.** Barrière sur un attribut que le composant ne pose qu'après sa garde
  `mounted` (ici `aria-pressed`). Le `toPass`/rejeu de clic ne vaut **que** pour une action
  idempotente (`setMenuOpen(true)`) ; une **bascule** exige une barrière, pas un réessai.
- `[MEMORY:pitfall]` **Sonde anti-flash de thème :** le premier `requestAnimationFrame` posé par
  `addInitScript` n'est **pas** une borne de peinture (feuilles bloquantes du `<head>` +
  `<div hidden>` en tête de `<body>`). Faux rouge ~1 run/3. Échantillonner la 1re frame où un
  enfant de `<body>` a `getClientRects().length > 0`.
- `[MEMORY:pitfall]` **Sortie Playwright sous le hook RTK :** `--reporter=line` est réécrit en
  `--reporter=json` puis tronqué à 2000 caractères — le résultat est illisible et ressemble à un
  dump de config. Utiliser `rtk proxy npx playwright test …`.
- `[MEMORY:decision]` La piste « testid faux » du lead est **infirmée** : une énumération DOM ne
  voit pas un élément monté conditionnellement. L'absence au balayage ne réfute pas le testid.

STATUS: COMPLETED
