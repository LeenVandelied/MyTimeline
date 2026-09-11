# Sprint 83 — Charte : surfaces, navigation, thème + sémantique des dates

Milestone [Sprint 83](https://github.com/LeenVandelied/MyTimeline/milestone/84) · cohésion 0.53 · 10 points · **aucune migration, aucun fichier backend**

Sprint de fondation sur l'écart maquette ↔ production relevé par l'audit du 7 septembre, plus une dette de sémantique HTML.

## Issues traitées

| # | Titre | Vague | Commit |
|---|---|---|---|
| #578 | Nav active : le précédent interne a remplacé la maquette (cause racine) | V1 | `3a18e7f` |
| #518 | ~15 composants rendent des dates dans un `<span>` au lieu d'un `<time datetime>` | V1 | `dcfa62e` |
| #574 | Ombre au repos contre filet 1px : surfaces hors charte | V2 | `ca788e1` |
| #642 | Exposer la bascule de thème hors connexion (DEC-S82-009) | V3 | `ef8581e` + `9ccd798` |

Plus deux commits issus de la review : `75f37c4` (convention des horodatages naïfs) et
`17b2d6a` (contamination du fuseau entre tests).

## Changements clés

**#578 — la cause racine est corrigée à la source.** `SettingsShell.tsx` avait introduit
`bg-accent-soft text-accent` sans référence à une maquette ; `AppShell.tsx` l'avait recopié *et
documenté en commentaire comme référence*. Les deux passent à la pilule graphite pleine, le CTA
sidebar retrouve le bleu accent, et le commentaire ne désigne plus un composant frère comme
source de vérité visuelle.

**#518 — le recensement de l'issue était partiellement faux.** 14 composants concernés (pas ~15),
**12 migrés**, 3 hors d'atteinte (dates uniquement en `title`/`aria-label`). `CompactAgenda`,
nommé par l'issue, n'affiche aucune date. Le nouveau `src/lib/date-iso.ts` corrige un défaut réel
au passage : `WeekAgenda` posait `toISOString()`, donc l'attribut `datetime` pouvait nommer un
autre jour que le libellé. Premier `t.rich` du dépôt pour la date en milieu de phrase ICU
(l'allemand postpose « ab »).

**#574 — 9 surfaces, pas 8**, et **2 inversions de survol, pas 1** (`TestimonialCard` en avait une
via `landing.css`, invisible dans le `.tsx`). Surtout : le locator `AUTH_CARD` de
`sprint-77-theme-visual.spec.ts` était **ancré sur la `shadow-lg` que l'issue retire** — les 8
tests auth seraient tombés en « élément introuvable », pas en écart de pixels. Réancré sur
l'invariant de charte.

**#642 — périmètre réduit, en connaissance de cause.** Les points 2 et 3 du motif de persistance
supposent une préférence de thème **au niveau du compte**, qui n'existe pas
(`grep -ri theme backend/src/main/java` → 0 ; 0 migration ; `types/settings.ts:36` l'écrit en
clair). Livré : l'exposition du contrôle (landing desktop + menu mobile + 4 pages auth), la
persistance locale, et l'anti-flash. Non livré et signalé en follow-up : la préférence de compte.

## BR impactées

**Aucune.** Les 4 issues portent « BR impactées : Aucune » — conformité à la charte et sémantique
HTML, pas de règle métier.

## Tests

- **Unitaires / build / typecheck / lint** : `./scripts/test-quiet.sh frontend` → **1392 / 1392
  (121 fichiers), exit 0** (base d'entrée 1350).
- **E2E Playwright**, suite complète jouée en local (recette worktree, webpack) :
  **314 passed / 11 failed / 8 skipped**.
- Backend **non exécuté** : le sprint ne touche aucun fichier backend (`git diff --name-only
  origin/dev..HEAD | grep -c '^backend/'` → **0**).

Audit détaillé : `docs/memory/audits/sprint-83-test-coverage.md`.

### ⚠ Deux rouges E2E attendus, aucun n'est une régression

**10 × `sprint-77-theme-visual.spec.ts`** — sur macOS, message `A snapshot doesn't exist …
-chromium-darwin.png` (et **non** `did not match`) : ces 10 écrans n'ont que des références
`-chromium-linux.png`, donc la suite échoue localement quel que soit le code. **Aucun snapshot
n'a été régénéré** et les PNG darwin produits ont été supprimés.
**Conséquence à assumer : l'invalidation des 10 références par #574 n'est ni confirmée ni
infirmée en local — c'est cette CI qui tranche.** Si ce spec est rouge ici, il faudra régénérer
ses références **sur Linux** après merge.

**1 × `sprint-82-recurrence-capped-hint.spec.ts`** — le backend e2e local utilisé provient d'une
image construite le **2026-08-30**, alors que le flag `capped` a été livré le **2026-09-03**
(`ba8f585`) : l'image ne peut pas contenir la fonctionnalité. La CI, qui construit le backend
depuis la branche, doit le rendre vert.

### Un défaut réel trouvé et corrigé

La spec E2E de #642 **n'avait jamais été exécutée** et tombait **6 fois sur 11**. Cause racine :
**un clic Playwright sur un bouton visible et activé mais non hydraté est un NO-OP silencieux**.
Corrigé côté spec (`9ccd798`, barrière d'hydratation sur `aria-pressed`), composant applicatif
non touché — un diagnostic navigateur avait d'abord établi qu'il fonctionnait.
**6 exécutions consécutives, 0 échec.**

## Review — deux cycles

**Cycle 1 (sprint complet) : 0 CRITIQUE / 1 MAJEUR / 2 MINEUR.**

Le MAJEUR : le backend expose `LocalDateTime` (chaînes ISO **sans offset**) sur
`SessionResponse` et `ExportJobResponse` ; `ExportDataFlow` les lisait en UTC (convention
documentée #58), `SessionList` en **heure locale du navigateur**. Vérification faite avant
d'agir : `formatDate` de `SessionList` est **inchangé depuis avant #518** — le défaut est
**pré-existant**, et son libellé s'accordait avec son attribut. Ce qui a changé, c'est que #518
promeut ce décalage en **affirmation lisible par la machine**, contre l'objet même de l'issue.
Corrigé par `75f37c4` : helpers `parseServerDateTime` / `serverDateTime` dans `lib/date-iso.ts`,
convention documentée **dans le helper** et non au point d'appel — c'est l'absence de point
unique qui avait permis la divergence. 7 tests sous `TZ='Asia/Tokyo'`, avec contre-épreuve :
en restaurant l'ancien `new Date(iso)`, **4 tests rougissent en fuseau local et 3 sous `TZ=UTC`**.
**Impact utilisateur assumé** : l'heure de « dernière activité » change sur Réglages > Sécurité
du décalage local. C'est une correction de bug — l'ancienne valeur était fausse.

**Cycle 2 (sur les commits correctifs uniquement) : 0 CRITIQUE / 1 MAJEUR / 1 MINEUR.**

Les corrections de review sont elles-mêmes relues, et ce cycle a payé. Le MAJEUR :
`afterAll` restaurait le fuseau par `process.env.TZ = previousTz`, or **`TZ` n'est settée ni en
CI ni dans un shell local**, donc `previousTz` vaut presque toujours `undefined` — et Node
**coerce l'affectation en la chaîne `"undefined"`**, zone invalide qui retombe sur UTC. Tout test
suivant du même worker comptant sur le fuseau ambiant était silencieusement contaminé.
Mesuré : `getTimezoneOffset()` rend **0** au lieu de **-120**. Corrigé par `17b2d6a`
(`delete process.env.TZ` quand il n'y avait pas de valeur).
Le MINEUR relevait que le vert de la spec E2E de #642 n'avait été qu'auto-rapporté : il a depuis
été **rejoué indépendamment** (`settings-security` + `landing-auth-theme-toggle` → **19 passed,
exit 0**).

## Ce qui n'a pas été vérifié

Trois des quatre issues sont des issues de **charte visuelle**, et **aucun contrôle visuel humain
ni aucune mesure de contraste au pixel n'a été fait**. Trois agents sur quatre ont remonté
`RECOMMAND_UI_DESIGN`. En particulier :

- **#574** — la lisibilité des cartes Auth privées d'ombre franche (`--color-bg` #FCFCFD vs
  `--color-surface` #FFFFFF ≈ 1,01:1). `shadow-xs` a été conservé *parce que le filet seul
  paraissait insuffisant*, **sans preuve**. C'est le risque que l'issue elle-même désignait.
- **#518** — un delta 15→13px assumé sur 3 surfaces, `SessionList` en tête (date 13px mono à côté
  d'une IP restée à 15px, **sur la même ligne**).
- **#578** — contrastes 17,76:1 / 16,70:1 **calculés sur les tokens déclarés**, pas sur des pixels
  peints ; la maquette de référence n'a pas été ouverte.
- **#518** est une issue d'accessibilité : **aucun test avec un lecteur d'écran réel**.
- Les métriques de largeur du header ont été prises sur macOS, pas sur l'image jammy de la CI.

## Follow-ups identifiés (à arbitrer en `/sprint end`)

- Préférence de thème au niveau du **compte** — migration V16, endpoint, arbitrage à la connexion. Ferme les 2 critères non tenus de #642. `[M | backend+frontend]`
- Régénérer les 10 références PNG de `sprint-77-theme-visual` **sur Linux** + mesurer au pixel le contraste carte Auth / fond. `[XS | frontend]`
- Casse et police des libellés de navigation — **à rattacher à #575**. `[XS | frontend]`
- **#517** à fermer ou requalifier : `.mt-date--short` reste délibérément inutilisée. `[XS | ui-design]`
- Vérification navigateur du delta 15→13px, `SessionList` en priorité. `[XS | frontend/ui-design]`
- Dates en `title`/`aria-label` (`DensityRibbon`, `TimelineView`) — hors d'atteinte de `<time>`. `[XS | frontend]`
- Convergence des 2 bascules de thème en ligne restantes (`AppShell`, `MobileDrawer`), toutes deux sans garde `mounted`. `[XS | frontend]`
- **#505 n'est PAS redondante** avec #574 (cible `shadow-md`, hors périmètre) — à laisser ouverte.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
