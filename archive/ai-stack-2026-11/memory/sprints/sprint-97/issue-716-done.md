# Issue #716 — Clés i18n mortes `add.event.remove` / `add.events.remove`

## Objectif

Vérifier par recherche exhaustive que `add.event.remove` (fr l.22) et `add.events.remove` (fr l.59)
sont mortes depuis #605, puis les supprimer dans les 4 locales si confirmé.

## Fichiers modifiés

- `frontend/public/locales/fr/products.json` (2 clés `remove` supprimées)
- `frontend/public/locales/en/products.json` (idem)
- `frontend/public/locales/es/products.json` (idem)
- `frontend/public/locales/de/products.json` (idem)

Positions identiques dans les 4 locales avant édition : `add.event.remove` l.22, `add.events.remove` l.59.

## Recherche exhaustive tracée (commandes + résultats)

```
grep -n '"remove"' frontend/public/locales/fr/products.json
→ 22:      "remove": "Supprimer",   59:      "remove": "Supprimer"
```

Confirmation des chemins complets par lecture du fichier fr (add.event.remove ligne 22 = enfant
de `add.event`, add.events.remove ligne 59 = enfant de `add.events`, deux parents distincts avec
même nom de feuille `remove` — piège signalé par l'architect, vérifié avant suppression).

```
grep -rn "add\.event\.remove\|add\.events\.remove" frontend/src frontend/e2e frontend/*.config.*
→ 0 résultat
grep -rn "t\(['\"]remove['\"]\)" frontend/src
→ 0 résultat (dans un contexte products/event)
grep -rn "useTranslations\(['\"]products\.add" frontend/src
→ EventEditForm.tsx:222-224 : useTranslations('products.add.event.form'|'.units'|'.types')
  (namespaces enfants form/units/types — PAS `remove`, PAS le namespace `add.event` racine)
grep -rn '`.*remove`' frontend/src
→ 1 faux positif (commentaire toaster.tsx mentionnant `toast.remove`, sans rapport)
grep -rn "event\.remove\|events\.remove" frontend --include='*.ts' --include='*.tsx' --include='*.json'
→ 0 résultat
grep -rn "useTranslations\(['\"]products\.add['\"]\)" frontend/src
→ 0 résultat (aucun composant ne prend le namespace racine `add` puis fait t('event.remove'))
grep -rn "t\(\`" frontend/src | grep -i "event|remove"
→ 4 résultats, tous `dashboard.timeline.status.${event.status}` ou services HTTP — aucun rapport
  avec `remove`
grep -rln "add.event|add.events|event.remove|events.remove" frontend/e2e
→ 0 résultat (aucune spec Playwright ne cite ces clés)
grep -rln "add\.event|add\.events" frontend/src --include='*.stories.tsx'
→ 0 résultat
grep -n "remove\|useTranslations" EventEditForm.tsx NewEventDrawer.tsx ProductDrawer.tsx
→ aucun de ces 3 composants (les seuls rendant le formulaire/tiroir d'ajout d'événement) n'utilise
  `remove`, ni même les clés sœurs `list`/`empty` de `add.event`/`add.events`
```

**Verdict : aucun appelant statique ni dynamique.** Cohérent avec le commit `ec7a076e`
(#605 : « Archiver » au lieu de « Supprimer » et « Nouvel événement » prérempli sur le détail
produit) — le bouton qui consommait `remove` a été remplacé par « Archiver » (`archiveDialog.confirm`
/ `detail.archive`) à ce sprint.

## Écarts d'énoncé constatés

- Aucun écart majeur : l'issue décrit correctement l'état (clés mortes depuis #605). Un point non
  demandé par le scope : les clés **sœurs** `add.event.list`/`add.event.empty` et
  `add.events.list`/`add.events.empty` sont ÉGALEMENT sans appelant statique trouvé (mêmes
  recherches, 0 résultat sur `add.event.list`/`add.event.empty`/`add.events.list`/`add.events.empty`
  dans `frontend/src` et `frontend/e2e`). Hors scope de #716 (qui ne visait que `remove`) → non
  touché, signalé en recommandation suite ci-dessous.
- Le test cité par les critères (`i18n-namespaces`) vérifie la résolution des **racines de
  namespace** (`useTranslations('...')` doit exister comme fichier), pas la parité de clés
  individuelles entre locales — il ne peut donc pas, par construction, attraper une clé morte ou
  une désynchronisation de clé. Aucun test de parité de clés n'existe dans le dépôt (recherché :
  `frontend/src/i18n/locales.test.ts` ne teste que `SUPPORTED_LOCALES`, pas les clés JSON). Le
  critère « test i18n-namespaces vert » est donc trivialement respecté mais ne constitue pas une
  preuve de non-régression sur les clés — la preuve réelle est la recherche exhaustive ci-dessus
  + les tests ciblés listés plus bas.

## Tests (commandes exactes + résultats chiffrés)

```
node -e "JSON.parse(require('fs').readFileSync(p))" sur les 4 fichiers → 4x OK (JSON valide)
rtk proxy npx prettier --check public/locales/{fr,en,es,de}/products.json → "All matched files use Prettier code style!", rc=0
npx vitest run src/__tests__/i18n-namespaces.test.ts src/components/products/ → PASS (117) FAIL (0)
npx vitest run src/components/EventEditForm.test.tsx src/components/EventEditForm.debounce.test.tsx src/components/events/ → PASS (143) FAIL (0)
```

Pas de run Playwright (interdit cette vague — réservé à l'agent #670, cf. briefing). Aucune spec
E2E ne cite ces clés (recherche ci-dessus) donc pas de risque identifié à ne pas l'exécuter.

## Recommandations suite

- Pas de RECOMMAND_DB_EXPERT : aucun impact schéma/DB.
- Pas de RECOMMAND_SECURITY : simple suppression de clés de traduction statiques, aucune surface
  sécurité touchée.
- Pas de RECOMMAND_TEST_RUNNER : suite ciblée déjà exécutée en direct (260 tests), pas de suite
  lourde (>500 tests backend / Playwright complet) nécessaire pour ce changement XS.
- Pas de RECOMMAND_UI_DESIGN : aucun changement visuel (clés déjà mortes, aucun rendu affecté).
- `RECOMMAND_FOLLOWUP: clés i18n add.event.{list,empty} / add.events.{list,empty} (products.json,
  4 locales) potentiellement mortes elles aussi depuis #605 — même recherche exhaustive à refaire
  avant suppression (0 appelant statique trouvé lors de #716, non vérifié pour les cas dynamiques
  au-delà de ce qui a été fait ici) [triage XS | frontend]`
- `RECOMMAND_FOLLOWUP: aucun test de parité de clés i18n entre les 4 locales n'existe dans le
  dépôt — un ajout de clé dans une seule locale (ou une suppression partielle comme celle-ci
  aurait pu l'être) ne serait détecté par aucune garde automatisée [triage S | frontend]`

## [MEMORY:*]

- `[MEMORY:pattern] Problem: distinguer clé i18n morte vs vivante sous next-intl 4 quand deux
  clés portent le même nom de feuille (remove) sous deux parents (event singulier/events pluriel).
  Solution: vérifier les CHEMINS COMPLETS via useTranslations(namespace) + t('sous-clé') ou
  useTranslations(namespace complet), jamais juste le nom de feuille — grep sur le nom de feuille
  seul (remove) donne des faux positifs (ex. toast.remove dans un commentaire sans rapport).
  Anti-pattern: supprimer sur la seule base d'un grep "remove" sans tracer les namespaces
  useTranslations() réellement appelés dans les composants consommateurs.`
- `[MEMORY:pitfall] Context: le test i18n-namespaces.test.ts (#441) est souvent invoqué comme
  garde-fou de complétude pour une suppression/ajout de clé de traduction. Solution: il ne teste
  QUE la résolution des racines de namespace (fichier existe), jamais la présence/absence d'une
  clé individuelle ni la parité inter-locales. Prevention: ne pas le citer comme preuve de
  non-régression sur une clé — documenter la recherche exhaustive manuelle comme preuve réelle.`

STATUS: COMPLETED
