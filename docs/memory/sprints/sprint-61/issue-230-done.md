# Issue #230 — [FRONTEND] Clarifier l'UX de l'archivage d'un événement (effet sur le quota)

**Sprint :** 61 · **Vague :** 2 · **Taille :** M · **Modèle :** opus / effort high
**Commit :** `17c73f8` — 25 fichiers, +792 / −64

## Décision UX appliquée

Les **trois** comportements retenus par le dev ont été implémentés.

1. **Confirmation au TOGGLE, pas au submit.** `ArchiveConfirmDialog` (nouveau) énonce l'effet sur le
   quota **sans chiffre** — contrainte imposée au briefing : `PlanPolicy` est un no-op (BR-EVE-011
   non appliquée) et l'API n'expose aucun plafond, donc afficher « il vous reste N/20 » aurait été
   une invention. Le dialog mentionne aussi la réversibilité via la vue livrée par #307 et le
   passage en lecture seule. Annuler ne bascule rien (checkbox contrôlée). Le désarchivage reste
   immédiat, sans confirmation.
2. **Grisage dans la frise** : `filter:grayscale(1)` + contour pointillé sur la barre, **sans
   opacité**. `.mt-evt--archived` réutilisée telle quelle sur la seule pastille décorative.
   « archivé » ajouté à l'`aria-label` partagé (WCAG 1.4.1 — l'information ne passe pas que par la
   couleur), ce qui couvre desktop + mobile portrait + paysage via un seul helper.
3. **Verrou des champs** : `disabled` posé sur le **nœud DOM**, jamais via l'option `disabled` de
   RHF — cette dernière met la valeur à `undefined` et **viderait les dates du PATCH**
   (BR-EVE-016 / BR-EVE-006). Note `role="note"` liée en `aria-describedby`. Toggle et submit
   restent actifs.

## BR touchées

- **BR-EVE-011** — effet quota communiqué, **non régressée** (compteur `active` intact).
- **BR-EVE-013** — archived PATCH-only respecté.
- **BR-EVE-006 / BR-EVE-016** — payload PATCH préservé grâce au choix `disabled` DOM vs RHF.

## Bug préexistant découvert et corrigé (ABSORBED)

`mapToFullCalendarEvent` **jetait** `durationValue` / `durationUnit`. Conséquence : un formulaire
ouvert depuis la frise naissait **invalide** sur `durationUnit` (refine BR-EVE-004/006) alors même
que `type='duration'`. Bug silencieux jusqu'ici — le submit était simplement refusé — mais devenu
**bloquant** dès qu'on verrouille les champs. Corrigé par propagation au view-model + pré-remplissage
dans `TimelineEditHost`, prérequis du verrou.

> **[MEMORY:pitfall]** Avant de désactiver des champs de formulaire, vérifier que le schéma reste
> satisfiable avec les **valeurs réellement pré-remplies**, pas avec celles du fixture de test.

## Signaux mémoire

- **[MEMORY:decision]** Grisage d'état sur du texte : `grayscale(1)` plutôt qu'`opacity`. L'opacité
  détruit le ratio de contraste ; la désaturation le préserve (fond et encre décalés ensemble).
  L'opacité reste admise sur du décoratif `aria-hidden`. Prolonge la décision de #307.
- **[MEMORY:pitfall]** Voir ci-dessus (schéma satisfiable vs champs désactivés).

## Tests

- **Vitest : 920/920 verts** (exit 0 lu) · `tsc` 0 · `eslint` 0 · `next build` 0.
- ⚠️ **E2E NON JOUÉ** — 2 specs ajoutées à `sprint-61-archived-events.spec.ts` (grisage ; parcours
  confirmation → verrou → PATCH). Compilation prouvée uniquement.

### Pitfalls d'outillage rencontrés
- **PIT-S45-003** — RTK a affiché « All files formatted correctly » **avec exit 1** : 10 fichiers
  étaient réellement non formatés.
- **PIT-S41-004** — `test-quiet.sh` lancé depuis `frontend/` → exit 127 ; rejoué depuis la racine.
- **PIT-S60-009** — le wrapper ne lance QUE vitest ; `tsc` / `eslint` / `build` lancés séparément.

## Recommandations suite

- **RECOMMAND_TEST_RUNNER — E2E non joué** (aucun serveur `:3000` / `:8080`). À traiter en Phase 6
  avec les 3 specs de #307, soit **5 specs au total** jamais exécutées. **Bloquant pour la PR.**
- **RECOMMAND_FOLLOWUP — bug i18n préexistant, vérifié par le lead.** `DeleteConfirmDialog.tsx:93`
  appelle `useTranslations('deleteDialog')` et `ConflictDialog.tsx:104` `useTranslations('conflictDialog')`,
  mais ces deux entrées sont des **clés à l'intérieur de `common.json`**, pas des fichiers-namespaces —
  or `i18n.ts` indexe les namespaces **par nom de fichier**. Les deux dialogs rendent donc
  vraisemblablement leurs clés brutes.
  **Pourquoi la suite ne l'attrape pas** (vérifié par le lead) : `DeleteConfirmDialog.test.tsx:23`
  mocke `useTranslations` en `` `${namespace}.${key}` `` — un mauvais namespace produit exactement le
  même résultat qu'un bon ; et les E2E ciblent `data-testid` sans jamais asserter de texte.
  **Non constaté en navigateur.** Hors périmètre du sprint, transverse aux 4 locales.
  [triage S | domaine frontend/i18n]
- **RECOMMAND_FOLLOWUP** — `ui/popoverPicker.tsx` n'était déjà pas conforme prettier au HEAD (comme
  `TimelineView.tsx`) ; **prettier n'est gaté par aucun job CI**. [triage XS | domaine frontend]
- Pas de RECOMMAND_SECURITY : aucun changement d'auth, de PII ni d'appel réseau.
- Pas de RECOMMAND_UI_DESIGN : une seule règle CSS ajoutée sur des tokens DS existants
  (`--color-rule-strong`), aucun nouveau token ni primitive.

## ⚠️ Écart assumé, NON arbitré par le dev

La **suppression reste ACTIVE** sur un événement archivé. Le critère d'acceptation disait « seul le
désarchivage reste possible » ; l'interdire empêcherait de supprimer un archivé, ce qui a été jugé
pire. **À arbitrer par le dev** — c'est le seul écart au périmètre demandé.

## Non vérifié (déclaré par le subagent)

- **Rendu réel en navigateur : jamais ouvert.** Thème sombre, mobile et paysage non regardés.
- **Contraste MESURÉ du titre grisé** : « grayscale préserve le ratio » est un *raisonnement*, pas
  une mesure ; le filtre CSS opère en sRGB non linéaire, donc l'égalité n'est qu'approchée. Aucun
  ratio chiffré n'est produit.
- Lisibilité du contour pointillé `outline-offset:-1px` sur une pastille de 26 px.
- Comportement du 409 et des PATCH contre un vrai backend.
- Le verrou n'a **pas** été testé au clavier réel : les assertions portent sur `toBeDisabled`, pas
  sur une tentative de frappe (jsdom ne prouve rien là-dessus).

## ABSORBED

Propagation `durationValue` / `durationUnit` au view-model + pré-remplissage dans `TimelineEditHost`
(corrige un formulaire non soumissible depuis la frise — prérequis du verrou).

STATUS: COMPLETED
