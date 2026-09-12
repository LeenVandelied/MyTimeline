# Issue #423 — marge du header à 320 px en `de` sous le plancher PIT-S52-001

**Vague :** 3 | **Taille :** S | **Commit :** `759eaea` — 2 fichiers, +65/-32

## Mesures — image Docker imposée, respectée

`mcr.microsoft.com/playwright:v1.61.1-jammy`, `--workers=1`. Marge logo ↔ groupe droit :

| Largeur | Locale | AVANT | APRÈS |
|---|---|---|---|
| 320 | **de** | **5** | **13** |
| 320 | es | 10 | 18 |
| 320 | fr | 18 | 26 |
| 320 | en | 40 | 48 |
| 375 | de/es/fr/en | 38 / 43 / 52 / 77 | inchangé |
| 390 | de/es/fr/en | 53 / 58 / 67 / 92 | inchangé |
| ≥768 | 4 locales | 58,5 au pire | inchangé |

**Le relevé AVANT reproduit à l'identique les 4 chiffres de référence de l'issue** (en 40 / fr 18 /
es 10 / de 5) — l'environnement de mesure est donc comparable à celui du S59, ce qui rend le relevé
APRÈS évaluable. C'est le point que `PIT-S52-001` exige et que les S49 et S52 avaient tous deux
manqué en mesurant depuis macOS.

Citation du pitfall, rapportée par l'agent : « viser une marge à deux chiffres — un correctif qui
laisse 0 à 4 px est un échec CI en attente ».

## Contrôle négatif

Plancher relevé à 10 **avant** tout correctif → `EXIT=1`, **un seul rouge, nommé** :
« marge entre le wordmark et le bloc suivant à 320 px en `de` — mesuré 5px, plancher 10px ».
Les 10 autres tests verts, **dont 375 et 390 px**.

## Le levier, et pourquoi celui-là

`max-[360px]:px-3` → **`max-[360px]:px-2`** sur le CTA d'inscription (`HeaderSection.tsx:243`).

Méthode : classer les 3 blocs du header en **invariants prouvés** et **degrés de liberté**.
Le wordmark est figé à 21 px par l'assertion `EXPECTED_FONT_PX` de la spec (#381) ; le burger est
figé à 44 px de cible tactile (#334) ; `gap-1` est déjà au minimum. Le rembourrage horizontal du CTA
était **le seul degré de liberté restant**. 8 px récupérés dans les 4 locales à la fois.

Écartés, avec raison : raccourcir le libellé `de` (change la copie à **toutes** les largeurs),
réduire le `px-4` du header (échange la respiration au bord d'écran contre la marge interne),
`text-2xs` (13 px, trop petit pour un CTA).

## Changement visible

**Oui, mais marginal, et uniquement sous 360 px** : le bouton « Registrieren » perd 8 px de largeur
(131 → 105 px en `de`). Hauteur, taille de police (15 px, déjà `text-xs` depuis #347) et cible
tactile **inchangées**. Aucun changement au-dessus de 359 px.

## La garde n'a pas été affaiblie

`MIN_GAP_PX` passe de `width < 768 ? 1 : 24` à `width < 768 ? 10 : 24` — **plancher unique, aucune
différenciation par largeur**. *Vérifié par le lead : `landing-header-logo.spec.ts:97`.*

C'était le risque le plus sérieux du briefing : restreindre l'assertion à 320 px pour la faire
passer aurait affaibli la garde (`DEC-S52-004`). Il ne s'est pas matérialisé, parce qu'il n'a pas eu
à l'être — voir ci-dessous.

## Écarts au plan

1. **Le `risque_regression` de l'architect est FAUX.** Il prédisait que relever le plancher pour
   toutes les largeurs < 768 ferait rougir `es`/`de` à 375 ou 390 px. Mesuré : **38 px au minimum**
   à 375 px, soit ~4× le plancher. Aucun rouge. Prouvé par le contrôle négatif lui-même (plancher à
   10 sans correctif → 375/390 verts).
2. **L'architect concluait qu'il fallait chercher le levier « ailleurs »** (gap, libellé, bascule
   burger) puisque `max-[360px]:px-3` avait déjà servi au S52. Faux : **le même levier n'était pas
   épuisé**, `px-3` n'est pas le minimum. Quatrième erreur de l'architect sur ce sprint, et la
   deuxième fois qu'un agent trouve une voie plus simple que celles proposées.
3. **Découverte non mentionnée ni par l'issue ni par le plan** : en Tailwind v4, `max-[360px]`
   compile en `width < 360`, **pas** `width <= 360`. Vérifié deux fois indépendamment
   (`columnGap` 4 px à 359 / 8 px à 360 ; `paddingLeft` 8 px à 359 / 16 px à 360). Le palier compact
   s'arrête donc à 359 px, et **360 px est un second creux local** de marge (23 px en `de`). La
   grille `WIDTHS` de la spec saute de 320 à 375 : elle est **aveugle à ce creux**. Ce n'est pas un
   défaut aujourd'hui (23 px > 10), mais c'est un angle mort documenté.

## Tests

vitest **1004/1004** (101 fichiers) ; `tsc --noEmit` 0 ; `eslint` 0 ; E2E `landing-*` en jammy
**68/68**.

## Non vérifié — déclaré par l'agent

- **`next build` non lancé** (`PIT-S62-009` — réécrit `.next` partagé). Atténuation : `eslint` sur
  les 2 fichiers (c'est le gate que `next build` ajoute, `PIT-S41-005`) + `tsc`. Le diff
  n'introduit ni import ni variable.
- **`jammy` ≠ `ubuntu-latest` GitHub** : jeu de polices possiblement différent. Rien n'est poussé,
  la CI réelle n'a pas tourné. **C'est la limite de fond de cette vérification.**
- Suites E2E hors `landing-*` non rejouées. Le header ne change qu'en dessous de 360 px, largeur
  qu'aucune n'utilise — mais l'agent ne l'a pas prouvé.
- **Aucune vérification visuelle** (capture) du bouton resserré : il n'a que les nombres, pas de
  jugement esthétique sur `px-2`.

## Pour #74 (vague 4)

Une **seule** modification fonctionnelle dans `HeaderSection.tsx` : `px-3` → `px-2` dans le
`className` du `<Button>` d'inscription, au palier `max-[360px]` uniquement. Tout le reste du diff
est du commentaire — tableau de relevé **remplacé** (pas doublé, conformément à la consigne),
mention « Dette connue, non traitée ici » **retirée** *(vérifié par le lead : 0 occurrence)*, ajout
du relevé 2026-08-31 et de la frontière 359/360.

Le header en `de` à 320 px a désormais **13 px** de marge ; à 360 px il en a 23.
`landing-header-logo.spec.ts` couvre 8 largeurs × 4 locales, plancher mordant à 10 px.

## Signaux mémoire

- `[MEMORY:pitfall]` — en Tailwind v4, `max-[Npx]` compile en `width < N`, **pas** `width <= N`.
  Le palier s'arrête à `N-1` et `N` devient un **second creux local**. Mesurer `N-1` **et** `N` pour
  tout palier `max-[]`, comme `PIT-S59-001` l'exige déjà pour les seuils `min-`. Une grille de
  largeurs qui saute de 320 à 375 est aveugle à ce creux.
- `[MEMORY:pattern]` — trouver le levier sur un budget de largeur saturé : classer les blocs en
  **invariants prouvés** (figés par une assertion de spec ou une règle a11y) et **degrés de
  liberté** ; le levier est ce qui reste. Anti-pattern : chercher « ailleurs » parce que le levier
  évident a déjà servi une fois — il n'était pas au minimum.
- `[MEMORY:decision]` — plancher `MIN_GAP_PX` **unique** à 10 px, non différencié par largeur. La
  mesure montre 38 px au pire à 375/390 : différencier n'aurait servi qu'à masquer un cas tendu, ce
  que `DEC-S52-004` interdit.

## Recommandations suite

`RECOMMAND_TEST_RUNNER` — faire jouer la suite E2E **complète** en jammy avant la PR (seul
`landing-*` a tourné, 68/68) et confirmer que `next build` passe, délibérément non lancé pour ne pas
casser le serveur dev partagé.

Négations explicites : pas de `RECOMMAND_DB_EXPERT` ni `RECOMMAND_SECURITY` — diff purement
CSS/commentaire, aucune couche backend, aucune clé i18n touchée (les 4 `common.json` sont intacts,
le garde-fou `i18n-namespaces.test.ts` de #441 n'a pas été sollicité).

STATUS: COMPLETED
