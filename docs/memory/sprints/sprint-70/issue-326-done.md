# Issue #326 — Aperçu épinglé en haut du drawer de création — TERMINÉE

**Commit :** `22d6eeb` — `:lipstick: feat(events): épingle l'aperçu en haut du drawer de création (#326)`
**Vague :** V1 (seule issue de la vague)
**Fichiers (6, +368 / −21) :** `EventEditForm.tsx` · `events/NewEventDrawer.tsx` ·
`styles/ds/components/timeline.css` · `EventEditForm.test.tsx` · `events/NewEventDrawer.test.tsx` ·
`e2e/sprint-70-create-preview-pinned.spec.ts` (nouveau)

## Ce qui a été livré

Épinglage **structurel**, pas `position:sticky` : le bloc d'aperçu est extrait en variable et
portalisé via une nouvelle prop `previewPortalNode` sur `EventEditForm` ; `NewEventDrawer` monte le
nœud hôte `.mt-drawer__preview` **entre le header et `.mt-drawer__body`**, donc hors du seul élément
à `overflow:auto`. Conséquence : **aucun z-index posé**, le palier `--z-modal` partagé
`.mt-drawer`/`.mt-sheet` (#446) reste intouché.

Réutilisation du pattern maison de #79 (`footerPortalNode`) comme demandé — pas de second mécanisme.
**Zéro ligne** touchée dans `EventDrawer`, `TimelineEditHost`, `ConflictDialog` (`PAT-S44-001`
respecté). Périmètre création tenu.

## Tests — vérifiés par le lead sur le commit

- `npx vitest run` → **1056 passed / 0 failed** · `tsc --noEmit` 0 · eslint 0 · prettier OK · `npm run build` OK
- E2E `sprint-70-create-preview-pinned.spec.ts` contre `next dev :3100` + backend profil `e2e` `:8085`
  → **6 passed (5,9 s)**. La recette du runbook S47 a donc réellement tourné.
- **Mutation testing aux deux niveaux** (ce qui distingue un test porteur d'un test décoratif) :
  `previewPortalNode={null}` → 2 tests unitaires rouges + E2E rouge ; aperçu remis dans
  `.mt-drawer__body` → E2E rouge, **dérive mesurée 255 px** (seuil ≤ 1,5). Implémentation restaurée
  et re-vérifiée verte après chaque mutation. C'est la réponse directe à
  `jsdom-scroll-tests-prove-nothing` : le comportement d'épinglage est prouvé par un moteur de rendu,
  pas par jsdom.

## Preuve de lecture du contexte (protocole introduit à ce sprint — AUDITÉ)

L'agent a fourni la ligne `fichiers de contexte lus` exigée, avec ancrages vérifiables, **et un aveu
explicite** : il n'a **pas** ouvert les sections `rules-jit/frontend.md` / `ux-patterns.md` recopiées
dans `briefing-326.md`. Il a lu `br-events.md` (§BR-EVE-009 l.92), `pit-frontend.md` (PIT-S69-001,
PIT-S63-009/014/015, PIT-S69-002), le handoff §6 l.197, le runbook E2E S47 l.1-140.

**Verdict lead : le protocole fonctionne.** Le S69 ne pouvait produire qu'une preuve indirecte ; ici
la preuve est directe et, surtout, elle a rendu visible une **lacune** (2 fichiers non lus) qui serait
restée invisible autrement. À conserver.

## ⚠ Le briefing du lead contenait une erreur — corrigée par l'agent

Le briefing affirmait « **BR-EVE-009** = perf de l'aperçu live, débounce 150 ms ».
**FAUX, vérifié par le lead** : `br-events.md:92` définit BR-EVE-009 comme le **modèle couleur event**
(migration design v3 #44), et `grep -ci debounc` sur le pack rend **0**.

Origine de l'erreur du lead : les commentaires **pré-existants** `EventEditForm.tsx:174` et `:289`
attribuent déjà le débounce 150 ms à BR-EVE-009 ; le lead a recopié le code sans grepper le pack.
C'est la famille [[upstream-blocker-verdict-expires]] — l'énoncé n'est pas la source. L'agent a
**signalé** l'écart sans « corriger » silencieusement les 2 commentaires (vérifié : ils sont intacts
sur `HEAD`), ce qui est le bon arbitrage : renommer une BR est une décision, pas un nettoyage.

Le lead avait mis en garde contre exactement ce piège dans ce même briefing, et l'a quand même commis.
**Deuxième sprint consécutif où le fullstack-dev corrige une affirmation du briefing** (S68 : la
section « retombée CI » ; S70 : l'attribution d'une BR).

## Écarts visuels connus → checklist d'entrée de l'issue #325 (vague 2)

1. `.mt-drawer__preview` est un **nouveau conteneur peint** (`padding --space-4/--space-5`,
   `border-bottom --color-rule`, `background --color-surface`) : à valider clair ET sombre,
   notamment le **double filet** header/aperçu (deux `border-bottom --color-rule` à ~1 interligne).
2. Le libellé « Aperçu » est désormais **au-dessus du pli**, jouxtant `mt-drawer__subtitle`
   (mono/uppercase) : hiérarchie typographique à revoir dans ce nouveau contexte.
3. **Aucune hauteur max** sur le bandeau : une mini-frise haute (récurrence + légende) réduit d'autant
   le corps défilant. **Non mesuré** aux petites hauteurs desktop (< 700 px).
4. `.mt-drawer__preview` n'est **pas** stylé en variante sheet — l'aperçu **mobile est inchangé** par
   ce commit (choix assumé : la sheet garde l'aperçu en flux).

## Signaux mémoire

- `[MEMORY:pattern]` — épingler un fragment de formulaire à une extrémité d'un drawer sans dupliquer
  le markup ni régresser les surfaces partagées : prop `<x>PortalNode?: HTMLElement | null` (un NŒUD
  porté par `useState`, jamais un `RefObject`), bloc extrait en variable, `createPortal` si la prop
  est fournie / rendu en flux sinon ; nœud hôte frère de la zone `overflow:auto`, dans le panneau
  (contrainte `useFocusTrap`). Anti-pattern : `position:sticky` + z-index sur un descendant du
  conteneur défilant. **2ᵉ occurrence** (#79 puis #326) → candidat `PAT-S70-001`.
- `[MEMORY:pitfall]` — un briefing peut citer un identifiant `BR-*` **inexistant ou mal attribué**.
  Prévention : grepper l'identifiant dans le pack **avant** de s'y appuyer. Candidat `PIT-S70-001`.
- `[MEMORY:pitfall]` — RTK avale aussi la sortie de `playwright test` et de `vitest --reporter=verbose`
  (pas seulement `git diff`) → `rtk proxy`. Extension de [[rtk-git-diff-empty-output]].

## Recommandations suite

- `RECOMMAND_FOLLOWUP` — étendre l'aperçu épinglé aux 3 surfaces d'édition. Techniquement trivial
  (la prop est générique), **non trivial en risque** : `TimelineEditHost` et `ConflictDialog` n'ont
  pas la structure `header / body(overflow:auto) / footer`. Non fait, conformément à la consigne.
- `RECOMMAND_FOLLOWUP` — corriger l'attribution BR-EVE-009 : créer une BR dédiée « perf aperçu live /
  débounce » ou corriger les renvois du code (`EventEditForm.tsx:174`, `:289`).
- Pas de `RECOMMAND_UI_DESIGN` à spawner : la revue visuelle EST l'issue #325, vague 2 de ce
  même sprint, à qui la checklist ci-dessus a été transmise en entrée.
- Pas de `RECOMMAND_DB_EXPERT` / `RECOMMAND_SECURITY` / `RECOMMAND_TEST_RUNNER` : changement 100 %
  frontend présentationnel, aucun appel réseau nouveau, aucune donnée ; les suites ont tourné en local.

STATUS: COMPLETED
