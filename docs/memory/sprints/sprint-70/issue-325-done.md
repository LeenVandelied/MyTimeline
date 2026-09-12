# Issue #325 — Vérification visuelle de la mini-frise d'aperçu — TERMINÉE

**Commit :** `297d160` — vague 2
**Fichiers (5, +487 / −14) :** `e2e/sprint-70-preview-visual.spec.ts` (nouveau, 395 l.) ·
`e2e/support/contrast.ts` (+74) · `EventEditForm.tsx` · `events/EventPreviewTimeline.tsx` ·
`styles/ds/components/timeline.css`

## Résultat de la vérification (mesurée, pas déduite)

Ratios WCAG lus par `getComputedStyle` sur fond composité, drawer 1280×700, 3 couleurs
d'événement × 2 thèmes, récurrence MOIS (seul état rendant connecteur + fantôme).

| Élément handoff §6 | Clair | Sombre | Verdict |
|---|---|---|---|
| Règle (graduation) | 16,14:1 | 14,25:1 | CONFORME |
| Marqueur TODAY (barre / badge) | 6,08:1 | 6,48 / 6,94:1 | CONFORME |
| Barre pleine — libellé | 5,41 · citron 8,91 · nuit 18,61 | idem | CONFORME (`contrastInk` tient) |
| Connecteur pointillé | 5,41:1 · **citron 2,20** | 3,38:1 · **nuit 1,02** | défaut CONFORME / **ÉCART** couleurs extrêmes |
| Fantôme — contour | corrigé · **citron 2,07** | **2,49 → ~3,15** · **nuit 1,02** | CORRIGÉ défaut / **ÉCART** extrêmes |
| Fantôme — date | **3,59 → ~5,5** | 5,50:1 | CORRIGÉ |
| Légende | 6,11 / 17,76 / 6,08 | 5,85 / 15,60 / 6,48 | CONFORME |
| `.mt-evt--preview` | `cursor:default` au repos ET au survol, `filter`/`box-shadow` inchangés | idem | CONFORME |

## Trois écarts corrigés

1. **`opacity:.8` retiré de `.mt-evt--draft`** (`timeline.css:74`). C'était un dimmer
   **redondant** : la variante est déjà faible par son fond à 8 %, son pointillé, son encre
   `muted` et l'absence d'ombre. Il ne retirait pas de l'insistance, il retirait du
   **contraste** — sur les deux seuls traits qui portent l'objet (contour 2,49:1 en sombre,
   sous le seuil WCAG 1.4.11 de 3:1 ; date du fantôme 3,59:1 en clair, sous 4.5:1).
   **Vérifié par le lead : `.mt-evt--draft` n'a qu'UN consommateur applicatif**
   (`EventPreviewTimeline.tsx:180`) — aucune régression possible sur la frise réelle.
2. **Repli du connecteur** `--color-rule-strong` (~1,5:1, décoratif) → `--color-rule-emphasis`
   (≥3:1), `EventPreviewTimeline.tsx:152`.
3. **Libellé « Aperçu »** : 17 px Archivo (vs 19 px du titre du drawer — concurrence de
   hiérarchie créée par le déplacement de #326) → `.mt-drawer__label` mono 10 px,
   `EventEditForm.tsx:345`.

## Un écart de la checklist d'entrée a été RÉFUTÉ

Le « double filet » header/aperçu annoncé par la vague 1 (et repris tel quel par le lead
dans le briefing de la vague 2) **n'existe pas** : les deux filets sont distants de **207 px**
en clair et **187 px** en sombre. De même, le bandeau occupe **29,6 % / 26,8 %** de 700 px et
laisse **418 px** au corps défilant → pas d'amputation, pas de `max-height` à poser
(`[MEMORY:decision]` : ne rien plafonner, un seuil serait spéculatif).

**Leçon de méthode :** 2 des 4 « écarts connus » transmis par la vague 1 étaient des
**hypothèses de lecture de code**, pas des observations. Elles ont été propagées par le lead
sans mesure. Un écart annoncé par un agent qui n'a pas ouvert de navigateur reste une
hypothèse — l'étiqueter comme tel dans le briefing suivant.

## Écart NON corrigé, remonté comme arbitrage

Le connecteur et le contour du fantôme reprennent la **couleur choisie par l'utilisateur sans
plancher de lisibilité** : 2,20:1 et 2,07:1 pour un citron en thème clair, **1,02:1** pour un
quasi-noir en thème sombre. Poser un plancher change la **doctrine couleur du DS** (#352 a
classé ce pointillé « tier fonctionnel » sans mesurer le cas nominal). L'agent a refusé de
trancher seul — conforme à la consigne « si c'est un arbitrage, remonte-le ».
→ `RECOMMAND_FOLLOWUP`.

## Preuve que la mesure sait dire NON

1. `opacity:.8` réintroduit → 2 assertions rouges aux valeurs exactes (2,49 sombre / 3,59 clair).
2. `.mt-evt--preview` neutralisé → rouge sur le curseur.
3. Deux **hypothèses de l'agent lui-même** tuées avant tout correctif (sélecteur `.mt-stamp`,
   cellule `bg-accent-soft` inexistante) — la sonde a bien détrompé son auteur.

Une garde a été ajoutée à `contrast.ts` : `border-*-color` vaut `currentColor` quand aucune
bordure n'est déclarée — la sonde répondait, mais à une autre question.

## Échantillon — ce qui N'A PAS été mesuré

Bottom sheet `< 1024 px` (inchangée par #326 : tout écart y est **pré-existant**), autres
locales que `fr`, unités de récurrence SEMAINE/AN, survol tactile. Déclaré, non masqué.

## Preuve de lecture du contexte — AUDITÉE, complète

Ancrages fournis et vérifiables : `pit-frontend.md` (PIT-S53-001, PIT-S58-001 l.311,
PIT-S58-002, PIT-S61-004, PIT-S45-003) · `br-events.md:92` · `graphite-handoff.md:197` ·
`e2e-local-runbook.md` piège #2 · `frontend/e2e/README.md` · et **les 2 sections que la
vague 1 avait avoué ne pas lire** (`briefing-325.md` l.1223-1320 et l.1321-1530).

**L'agent a confirmé l'avertissement du lead sur BR-EVE-009** par sa propre mesure
(`grep -ci debounc` = 0) et a laissé les 2 commentaires fautifs intacts.

## ⚠ Découverte : `rules-jit/frontend.md` est un placeholder d'un AUTRE projet

Vérifié par le lead : le fichier injecté dans les briefings porte le bandeau
« ⚠️ EXEMPLE Layer B (instance **EdelWheels / Quarkus-Next**). À RÉGÉNÉRER par
`/ai-env:setup` ». Sa consigne `./scripts/test-quiet.sh e2e` **contredit** le runbook E2E du
projet ; l'agent a suivi le runbook. Conséquence rétroactive : la « lacune » de la vague 1
(2 sections non lues) est **moins grave que le lead ne l'a écrite** — l'une des deux est du
contenu générique inapplicable. Cela ne disculpe pas le pointeur non contraignant, mais cela
corrige le verdict porté dans `issue-326-done.md`.

## Signaux mémoire

- `[MEMORY:pitfall]` — un `opacity` cumulé à un traitement déjà « faible » se paie sur **le
  trait qui porte l'objet**. Retirer le dimmer, pas assouplir le seuil. Mesurer avant d'empiler.
- `[MEMORY:pitfall]` — `border-*-color` vaut `currentColor` sans bordure déclarée : la sonde
  répond, mais à une autre question (famille PIT-S53-001).
- `[MEMORY:bug]` — RTK a affiché « All files formatted » avec **exit 1** sur `prettier --check`.
  PIT-S45-003 toujours actif au S70 : lire le code de sortie, pas le texte.
- `[MEMORY:decision]` — pas de `max-height` sur `.mt-drawer__preview` (mesuré 29,6 %/26,8 %).

## Recommandations suite

- `RECOMMAND_FOLLOWUP` — plancher de lisibilité ≥3:1 pour les traits peints dans la couleur
  utilisateur (connecteur + contour fantôme), avec les 4 mesures ci-dessus. Décision de
  doctrine DS, à arbitrer face à #352.
- Signalé pour arbitrage en review : le correctif n°3 (libellé « Aperçu ») **touche aussi la
  bottom sheet**, alors que le reste du sprint l'a laissée hors périmètre.
- Pas de `RECOMMAND_TEST_RUNNER` : suites lancées par l'agent, exit codes lus.
- Pas de `RECOMMAND_DB_EXPERT` : aucun schéma, aucune migration, aucun fichier backend touché.
- Pas de `RECOMMAND_SECURITY` : aucune surface d'auth, aucune PII, aucun appel réseau nouveau.

## Réserve du lead

Les deux valeurs « après correction » diffèrent entre le message de commit (3,15 et 5,52) et
le rapport de l'agent (3,18 et 5,47). Écart non matériel — les deux franchissent le seuil —
mais **l'un des deux relevés est périmé**. Les chiffres exacts post-correctif ne sont donc pas
re-certifiés par le lead ; les seuils franchis, si.

STATUS: COMPLETED
