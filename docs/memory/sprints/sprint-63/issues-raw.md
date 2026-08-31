===== ISSUE #74 =====
TITRE: [CHORE] i18n : appliquer les règles de fallback i18n.css (débordements DE)
LABELS: chore, epic:transversal, priority:P2, size:S, sprint-63

## Contexte
L'allemand (DE) est une langue à mots longs qui fait déborder certains composants conçus pour le français ou l'anglais. Le Design System fournit un fichier `i18n.css` avec des utilitaires spécifiquement prévus pour absorber ces débordements sans modifier la logique des composants.

## À faire
1. Identifier les composants qui débordent en locale DE (tests visuels sur les 4 locales)
2. Appliquer les utilitaires `i18n.css` du DS :
   - `segmented → Select` au-delà du seuil de longueur de libellé
   - `eyebrow` : activer wrap/title
   - `button` : activer wrap
   - `tabs` : activer mode collapsible
3. Vérifier qu'aucun composant ne tronque silencieusement du texte sans indicateur visuel

## BR impactées
Aucune

## Critères d'acceptation
- [ ] Aucun débordement (overflow) visible en locale DE sur les écrans principaux (Timeline, formulaire événement, réglages)
- [ ] Les composants segmented avec libellés longs basculent en Select selon le seuil défini dans `i18n.css`
- [ ] Les boutons avec texte long wrap proprement sans casser le layout
- [ ] Les tabs avec libellés longs activent le mode collapsible
- [ ] Le comportement FR/EN n'est pas régressé

## Piste technique
- Fichier `i18n.css` dans le Design System tokens (chemin à vérifier dans `src/styles/` ou `packages/ds/`)
- Composants à prioriser : `SegmentedControl`, `Button`, `Tabs`, labels `eyebrow`
- Tester avec les traductions DE réelles une fois l'issue 6.1 complétée

## Dépendances
Bloqué par #45 (les tokens Tailwind doivent être en place pour que les classes `i18n.css` fonctionnent)

## Risques techniques
Aucun risque majeur — modifications purement CSS/classe, sans impact sur la logique métier

## Estimation
S — application de classes utilitaires existantes, pas de nouveau code logique ; le temps principal est l'audit visuel sur 4 locales


===== ISSUE #423 =====
TITRE: [BUG] Marge du header à 320 px en de : 5 px, sous le plancher de PIT-S52-001
LABELS: bug, epic:design, priority:P2, size:S, frontend, sprint-63

## Contexte
Sur un très petit écran (320 px de large, le plancher des smartphones bas de gamme), l'en-tête du site doit garder un peu d'espace de respiration entre son contenu et le bord de l'écran. Une règle du projet (PIT-S52-001) impose que cette marge reste confortable — « à deux chiffres » de pixels — pour ne pas risquer un écrasement visuel au moindre ajout futur dans l'en-tête.

En allemand (`de`), cette marge n'est plus que de **5 pixels**. Ce n'est pas encore cassé, mais c'est la langue la plus proche du seuil critique : le prochain élément ajouté au groupe de droite de l'en-tête (bouton, badge, etc.) la fera très probablement passer sous la barre.

## À faire
Mesurer précisément la largeur nécessaire du header en `de` à 320 px et ajuster (texte, espacement, ou logique responsive) pour ramener la marge à deux chiffres, conformément à PIT-S52-001.

## BR impactées
Aucune

## Critères d'acceptation
- [ ] À 320 px de large, en langue `de`, la marge disponible dans le header est ≥ 10 px
- [ ] Les autres langues (`en`, `fr`, `es`) restent au-dessus de 10 px de marge après le correctif
- [ ] Vérification par mesure automatisée (Playwright), pas seulement visuelle

## Piste technique
- Mesures de référence (Playwright, `mcr.microsoft.com/playwright:v1.61.1-jammy`, 2026-08-16), header à 320 px (288 px utiles) :
  - `en` : 248 px requis → 40 px de marge
  - `fr` : 270 px requis → 18 px de marge
  - `es` : 278 px requis → 10 px de marge
  - `de` : 283 px requis → **5 px de marge**
- Composant probable : header / navigation principale (voir `HeaderSection.tsx` et ses sous-composants)
- Règle à respecter : `PIT-S52-001` (viser une marge à deux chiffres ; 0–4 px = échec CI en attente)

## Dépendances
Aucune

## Risques techniques
Le terrain est déjà connu et documenté depuis le Sprint 52 (#347) : toute correction doit être revérifiée sur les 4 langues, pas seulement `de`, pour ne pas déplacer le problème sur une autre locale.

## Estimation
S — ajustement CSS/responsive ciblé + vérification multi-langue

## Antériorité
Ce problème est **antérieur au Sprint 59** (terrain de #347, Sprint 52) et n'a pas été modifié par lui — le Sprint 59 s'est contenté de le chiffrer précisément.

Détecté pendant le Sprint 59 (PR #421). Source : `docs/memory/sprints/sprint-59/review-corrections-done.md`.


===== ISSUE #441 =====
TITRE: [BUG] Les dialogs de suppression et de conflit pointent des namespaces i18n inexistants
LABELS: bug, priority:P2, size:S, epic:infrastructure, frontend, sprint-63

## Contexte
Deux boîtes de dialogue importantes de l'application — la confirmation de suppression et la résolution de conflit — appellent chacune un namespace de traduction (i18n) qui n'existe pas en tant que fichier. Concrètement, elles demandent une "catégorie de traductions" (`deleteDialog`, `conflictDialog`) qui n'est pas indexée par le système de traduction, ce qui laisse penser que le texte affiché à l'utilisateur pourrait être la clé brute (ex. `deleteDialog.title`) au lieu d'un texte traduit lisible, dans les 4 langues du produit.

## À faire
- `frontend/src/components/shared/DeleteConfirmDialog.tsx:93` appelle `useTranslations('deleteDialog')`.
- `frontend/src/components/shared/ConflictDialog.tsx:104` appelle `useTranslations('conflictDialog')`.
- Or `deleteDialog` et `conflictDialog` sont des **clés à l'intérieur de** `frontend/public/locales/<locale>/common.json`, pas des fichiers-namespaces distincts.
- `frontend/i18n.ts` indexe les namespaces **par nom de fichier** (`common`, `products`, `auth`, etc.).
- Il faut donc soit passer au namespace `common` avec les bonnes clés imbriquées, soit créer les namespaces dédiés — après avoir confirmé le comportement réel en navigateur.

## BR impactées
Aucune identifiée explicitement, mais impacte l'expérience utilisateur sur les parcours de suppression et de gestion de conflit (fonctionnalités transverses).

## Critères d'acceptation
- [ ] **Premier critère, à faire avant toute correction** : ouvrir en navigateur un dialog de suppression (`DeleteConfirmDialog`) et un dialog de conflit (`ConflictDialog`) dans les 4 locales (`fr`, `en`, `de`, `es`) et noter précisément ce qui s'affiche (texte traduit correct, clé brute, ou texte de repli).
- [ ] Correctif appliqué de façon cohérente dans les 4 locales (`fr`, `en`, `de`, `es`).
- [ ] Ajout d'une assertion de texte (unitaire ou E2E) qui aurait pu détecter cette régression — actuellement aucun test du dépôt ne peut l'attraper.
- [ ] Vérification manuelle post-correction dans au moins 2 locales.

## Piste technique
- `frontend/src/components/shared/DeleteConfirmDialog.tsx:93`
- `frontend/src/components/shared/ConflictDialog.tsx:104`
- `frontend/i18n.ts` (indexation des namespaces par fichier)
- `frontend/public/locales/<locale>/common.json` (clés `deleteDialog`, `conflictDialog`)
- Piège identifié : `frontend/src/components/shared/DeleteConfirmDialog.test.tsx:23` mocke `useTranslations` en `` `${namespace}.${key}` `` — un mauvais namespace produit exactement le même résultat de test qu'un bon namespace. Les E2E ciblent des `data-testid` sans jamais asserter de texte. Il faudra donc changer la stratégie de test, pas seulement corriger le code.

## Dépendances
Aucune.

## Risques techniques
- Le mock de test actuel masque structurellement ce type de bug (namespace invalide indétectable) — le corriger sans améliorer les tests laisse la régression invisible pour le futur.
- Correctif transverse aux 4 locales : risque d'oubli d'une langue si non vérifié systématiquement.

## Estimation
S — correction ciblée sur 2 composants + fichiers de traduction dans 4 locales, mais nécessite une vérification manuelle navigateur préalable et un ajustement de la stratégie de test.

---
Source : rapport de review batch du Sprint 61 (`docs/memory/sprints/sprint-61/`).


===== ISSUE #442 =====
TITRE: [TEST] Couvrir en E2E le conflit 409 au désarchivage d'un événement
LABELS: enhancement, epic:events, priority:P2, size:S, frontend, sprint-63

## Contexte
Quand un événement archivé est désarchivé alors que sa "version" en base a changé entre-temps (par exemple un autre onglet ou un autre utilisateur a modifié l'événement pendant que la page était ouverte), le serveur refuse l'action avec une erreur de conflit (HTTP 409). Le code frontend a une logique spécifique pour éviter que l'utilisateur reste bloqué à re-cliquer sans succès, mais rien ne vérifie automatiquement aujourd'hui que cette logique fonctionne réellement.

## À faire
- `frontend/src/hooks/useSetEventArchived.ts` porte une logique dédiée au 409 (BR-EVE-015) : invalidation de `queryKeys.products.all` y compris en cas de conflit, précisément pour éviter que l'utilisateur reste bloqué à re-cliquer avec une `version` périmée (boucle de 409).
- `frontend/e2e/sprint-61-archived-events.spec.ts` couvre 5 parcours d'archivage mais aucun ne simule une version périmée / un conflit 409 sur le désarchivage.
- Ajouter un test E2E qui simule ce scénario de conflit sur le désarchivage.

## BR impactées
BR-EVE-015

## Critères d'acceptation
- [ ] Le test simule une version périmée sur le désarchivage d'un événement archivé (ex. deux contextes navigateur sur le même compte, à l'image du parcours de référence).
- [ ] Le test vérifie que le message de conflit est affiché de façon inline (pas de crash, pas de blocage silencieux).
- [ ] Le test vérifie que les données sont re-fetchées après le conflit (`queryKeys.products.all` invalidé).
- [ ] Le test vérifie qu'un second clic, après re-fetch, réussit — sans boucle de 409.

## Piste technique
- `frontend/src/hooks/useSetEventArchived.ts` (logique de gestion du 409)
- `frontend/e2e/sprint-61-archived-events.spec.ts` (fichier à compléter)
- Parcours de référence à réutiliser comme modèle : `frontend/e2e/sprint-42-events.spec.ts` (produit un vrai 409 avec deux contextes navigateur sur le même compte)

## Dépendances
Aucune.

## Risques techniques
Aucun identifié — le mécanisme de gestion du conflit existe déjà côté code, il s'agit de le couvrir par un test, pas de le développer.

## Estimation
S — un nouveau scénario E2E à ajouter en s'appuyant sur un pattern déjà existant dans le dépôt.

---
Source : signalé par le reviewer du rapport de review batch du Sprint 61 (`docs/memory/sprints/sprint-61/`).


===== ISSUE #446 =====
TITRE: [BUG] Le menu déroulant du formulaire d'événement est invisible (recouvert par le drawer)
LABELS: bug, epic:design, priority:P1, size:M, frontend, sprint-63

## Contexte

Dans le panneau de création d'événement, quand on ouvre une liste déroulante (le sélecteur de
produit), **le menu s'ouvre mais reste invisible** : il est peint derrière le panneau lui-même. La
personne ne voit rien s'afficher et ne peut pas choisir. Le défaut touche la souris **comme** le
clavier, sur **desktop et mobile**.

## À faire

Constat mesuré au Sprint 62 (#414) — c'est un conflit de plans d'empilement (`z-index`) :

- `frontend/src/components/ui/select.tsx:92` — `SelectContent` porte `z-50`, soit `--z-popover`
- `frontend/src/styles/ds/tokens/spacing.css:62,64` — `--z-popover: 50`, `--z-modal: 70`
- `frontend/src/styles/ds/components/timeline.css:271` — `.mt-drawer { z-index: var(--z-modal) }`.
  **`.mt-sheet` (l.406) et `.mt-actionsheet` (l.432) portent le même token** : même exposition, à
  traiter dans la même passe
- `frontend/src/components/events/NewEventDrawer.tsx:141` rend le drawer **en ligne**, non
  portalisé : son `z` l'emporte quel que soit l'ordre du DOM
- Profil de pixels sous l'option surlignée : **100 % panneau du drawer sur les 15 offsets**

**Un seul des 6 consommateurs de `ui/select` est affecté.** `PreferencesSection`,
`ProductsListView` et `ExportDataFlow` ne sont pas dans un drawer. `ProductDrawer` et
`DeleteConfirmDialog` y échappent parce que leur `Dialog` Radix est **portalisé** au même palier de
`z` : le portail du Select, ajouté plus tard dans `body`, le surmonte.

**Marqueur exécutable déjà en place** : `frontend/e2e/sprint-62-select-focus-indicator.spec.ts:487`
porte **2 `test.fail()`** (thème clair et sombre) dont le message nomme les valeurs de `z`.
⚠ Ils **rougiront le jour de la correction** — il faudra **RETIRER l'annotation**, pas la
contourner ni la neutraliser.

## BR impactées

Aucune.

## Critères d'acceptation

- [ ] Les 2 `test.fail()` de `sprint-62-select-focus-indicator.spec.ts:487` sont **retirés** et les
      tests passent au vert (annotation supprimée, pas contournée)
- [ ] Le popover est mesuré **peint** (lecture de pixel) dans `NewEventDrawer`, en clair **et** en
      sombre
- [ ] Aucune régression sur les **5 autres consommateurs** de `ui/select` (`PreferencesSection`,
      `ProductsListView`, `ExportDataFlow`, `ProductDrawer`, `DeleteConfirmDialog`)
- [ ] Vérification navigateur effectuée, **desktop et mobile**
- [ ] `.mt-sheet` et `.mt-actionsheet` sont statués : soit corrigés, soit démontrés hors risque

## Piste technique

`frontend/src/components/ui/select.tsx:92`,
`frontend/src/components/events/NewEventDrawer.tsx:141`,
`frontend/src/styles/ds/components/timeline.css:271,406,432`,
`frontend/src/styles/ds/tokens/spacing.css:62-64`.
Sonde de mesure : `frontend/e2e/support/pixel.ts` (livrée au S62).

## Dépendances

Aucune bloquante. Fait suite à #414.

## Risques techniques

- **Piège de diagnostic majeur** : `document.elementsFromPoint()` place l'option **en tête de pile,
  sans aucun élément du drawer**, alors que la lecture de pixel montre 100 % de drawer. Une couche
  Radix ouverte pose `body { pointer-events: none }` — le hit-testing et la peinture **divergent**.
  Ne rien conclure sur `elementsFromPoint` : utiliser la sonde de pixel.
- Remonter le `z` du Select au niveau modal peut le faire passer **au-dessus** de couches qui
  doivent le recouvrir : vérifier les 5 autres consommateurs, pas seulement celui qui est cassé.
- Portaliser `NewEventDrawer` change son contexte d'empilement et peut déplacer le défaut ailleurs
  (focus trap, animations) plutôt que le supprimer.

## Estimation

M — la cause est identifiée et mesurée, mais la correction touche un token partagé et impose une
non-régression sur 6 consommateurs, en 2 thèmes et 2 formats d'écran.

## Sources

`docs/memory/sprints/sprint-62/issue-414-done.md`, `docs/memory/bugs-resolved.md` (`BUG-S62-002`).


===== ISSUE #447 =====
TITRE: [TEST] Aucun garde-fou source n'empêche de réintroduire un focus invisible sur les contrôles du DS
LABELS: enhancement, epic:design, priority:P2, size:S, frontend, sprint-63

## Contexte

Le Sprint 62 vient de corriger des contrôles (bouton radio, interrupteur) dont l'indicateur de
focus au clavier était **2,5× trop pâle pour être vu**. Aujourd'hui, **rien n'empêche que le même
défaut soit réintroduit** par une simple modification de style : la CI resterait verte et personne
ne le verrait passer.

## À faire

Constat issu de #415 : `frontend/src/styles/__tests__/control-border-tier.test.ts:53-55` surveille
bien `.mt-check__box`, `.mt-radio__dot` et `.mt-switch__track`, mais **ne lit que les déclarations
`border*`** de la règle au sélecteur exact. Reposer un `box-shadow` comme **unique** indicateur de
focus — exactement le défaut que #415 vient de corriger — **passerait ce test sans le rougir**.

Le seul filet réel aujourd'hui est la spec E2E
`frontend/e2e/sprint-62-control-focus-contrast.spec.ts`. C'est la famille `PIT-S58-004` : une
garantie **citée mais inexistante** au niveau source.

Travail attendu : étendre `control-border-tier.test.ts` pour asserter que l'indicateur de focus des
3 sélecteurs surveillés est bien un **`outline`**, et non un `box-shadow` seul.

## BR impactées

Aucune.

## Critères d'acceptation

- [ ] `control-border-tier.test.ts` échoue si l'indicateur de focus de l'un des 3 sélecteurs
      surveillés devient un `box-shadow` seul
- [ ] **Chaque assertion ajoutée est prouvée rouge quand la garde est retirée**, avec contrôle
      négatif consigné (méthode du S62 : voir `frontend/src/__tests__/e2e-pixel-guards.test.ts`)
- [ ] La règle de charte `DEC-S58-001` reste tenue : contour `@layer base` = unique indicateur de
      focus du DS, aucun `ring-*`, aucun `outline-none`
- [ ] Aucun faux positif sur le CSS existant (la suite passe sur `dev` sans modifier les styles)

## Piste technique

`frontend/src/styles/__tests__/control-border-tier.test.ts:53-55` (les 3 sélecteurs surveillés).
Méthode d'armement de référence : `frontend/src/__tests__/e2e-pixel-guards.test.ts` — le Sprint 62 a
fait exactement ce travail sur `frontend/e2e/support/pixel.ts`.
Filet E2E existant, à conserver : `frontend/e2e/sprint-62-control-focus-contrast.spec.ts`.

## Dépendances

Aucune bloquante. Fait suite à #415 (correction déjà livrée ; ici on la verrouille).

## Risques techniques

- Un test qui n'est pas prouvé rouge quand la garde saute ne prouve rien : c'est précisément le
  défaut qu'on corrige — ne pas le reproduire.
- L'analyse ne porte que sur la règle au **sélecteur exact** : un focus déclaré sur un sélecteur
  voisin ou dans une autre couche échapperait encore à la garde. Statuer sur ce périmètre.
- Une assertion trop stricte peut rougir sur du CSS légitime (transitions, `box-shadow` décoratif
  cumulé à un `outline`) : viser le `box-shadow` **seul**, pas toute présence de `box-shadow`.

## Estimation

S — un seul fichier de test à étendre, périmètre de 3 sélecteurs connus ; le coût réel est le
contrôle négatif à produire pour chaque assertion.

## Sources

`docs/memory/sprints/sprint-62/issue-415-done.md`.


