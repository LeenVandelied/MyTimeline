# Issue #330 — Couvrir les data-testid de la frise sans spec E2E

> Sprint 54, vague 2 + cycle correctif. Briefings : `briefing-330.md` (53 Ko), `briefing-fix-330.md`.
> Ancrages : `spawn-ref-330.txt` (`431fe16`), `spawn-ref-fix-330.txt` (`a885e0c`).
> ⚠ Exécutée par un modèle **Sonnet**, pas Opus comme prévu au triage (capacité Opus
> indisponible — six `API Error: 529` consécutifs). Dérogation consignée ; travail vérifié
> à la mesure par le lead.

## Commits

| SHA | Lot |
|---|---|
| `900a48f` | (a) drawer / overlays — 7 testids |
| `9972cf6` | (b) contrôles de la toolbar — 5 testids |
| `e851d2b` | (c) minimap / états transitoires / contraste — 4 testids |
| `5ddc7a9` | (1bis) options de récurrence WEEK / YEAR — écart relevé par le lead entre les vagues |
| `059030d` | correctif des 6 specs rouges (3 prémisses fausses, 2 bugs produit) |

Volume : +567 lignes de specs (vague 2) puis +156/−64 (correctif). **18 nouveaux tests.**
Aucun fichier créé — extension de `timeline.spec.ts` et `timeline-mobile.spec.ts`.

## Cible réelle : 15 testids, pas 18

L'énoncé de l'issue et le §4 de l'audit S47 annoncent 18. Trois écarts, tous étayés — détail
complet dans `docs/memory/audits/sprint-54-test-coverage.md` §2 :

1. **2 faux positifs** — `desktop-edit-trigger` et `mobile-delete-trigger` n'existent que dans
   `TimelineEditHost.test.tsx` (doublures RTL). Le critère d'acceptation n°1 était
   **inatteignable par construction**. Régression d'audit traçable : le S46 les avait déjà
   identifiés, le S47 les a réintégrés.
2. **1 code mort** — `timeline-loading` (cf. bug produit n°1 ci-dessous).
3. **15 restants**, tous couverts et exercés par un **comportement**, pas une présence.

## Résultat mesuré

**E2E : 134 tests → 125 passed / 0 failed / 9 skipped** (11,4 min, `--workers=1`, run unique
sans concurrence). 125 = les 108 de la baseline pré-#330 + 17 des 18 nouveaux.
**Aucune régression** sur les 108 préexistants. `tsc --noEmit` 0 erreur, `eslint` 0 issue.

## ⚠ Deux bugs produit découverts — signalés, pas maquillés

### 1. `timeline-loading` est du code mort

`app/[locale]/(app)/timeline/page.tsx:47` porte bien
`if (loading) return <div data-testid="timeline-loading">`, mais `AppShell`
(`components/layout/AppShell.tsx:80/114`, livré par #210 **après** ce testid) pose sa propre
garde `useAuthGuard()` au niveau du shell et retourne `app-shell-loading` **sans monter
`children`**. `TimelinePage` étant un `children`, sa branche loading est inatteignable.

Mesuré route `/api/auth/me` gatée, run isolé : `app-shell-loading` = **1**,
`timeline-loading` = **0**, 100 % reproductible.

`test.skip()` avec cause nommée. **Substituer `app-shell-loading` a été refusé
délibérément** : cela aurait couvert un testid *différent* de celui déclaré par l'issue, en
donnant l'illusion de la couverture. C'est le bon arbitrage.

### 2. En-tête de lane sticky rendant des événements inatteignables à la souris

Au zoom Trimestre, un événement proche de `rangeStart` (`computeRange` = 30 j avant le 1er
event) se place à `30 × 5 = 150 px`, alors que `--lane-header-w` vaut **168 px**
(`spacing.css:48`). `.mt-tlv__lane-label` (`position:sticky;left:0`, `TimelineView.tsx:331`,
testid `timeline-resource-head`) recouvre la pastille — Playwright confirme
« intercepts pointer events ». **Aucun scroll ne la dégage** : à ce zoom, pour un seul
produit, le rail tient dans le viewport, donc pas d'overflow.

Assertion **conservée** (contenu de la live-region sur sélection) ; activation au clavier
(`Enter`, chemin natif du `<button>`, même `onSelect` que le clic). La spec teste le contenu
annoncé, pas le mode d'interaction — le défaut est remonté, pas contourné en silence.

## Diagnostic du cycle correctif — 6 specs rouges, aucune assertion affaiblie

| Spec | Cause | Traitement |
|---|---|---|
| `timeline-mobile.spec.ts:233` grabber | (C) `boundingBox()` mesurée une fois puis réutilisée capturait une position **transitoire** (décalage de **24 px** mesuré après stabilisation du panneau) ; le 2ᵉ swipe retombait sur l'overlay | mesure **fraîche** avant chaque swipe, aucune temporisation arbitraire |
| `timeline.spec.ts:603` weekend | (A) `timeline-zoom-in` jamais résolu — non monté dans le contexte exercé | précondition corrigée |
| `timeline.spec.ts:656` plein écran | (A) `timeline-fullscreen` jamais résolu + stub `addInitScript` ne survivait pas à la relecture de `document.fullscreenElement` | précondition + stub corrigés |
| `timeline.spec.ts:734` minimap clavier | (A) le clavier était exercé **avant** tout overflow du rail — rien à déplacer | ordre corrigé (zoom Jour d'abord) |
| `timeline.spec.ts:782` loading | **(B) bug produit** — code mort | `test.skip()` justifié + suivi |
| `timeline.spec.ts:816` live-region | **(B) bug produit** — pointeur intercepté | activation clavier, assertion conservée |

`timeline.spec.ts:838` (`event-outside-label`) **n'a pas été touché** : il ne rougissait que
sous les runs concurrents du lead, et passe au run propre.

## Prémisses infirmées — dont trois écrites par le lead

1. **`timeline-today` n'est pas un bouton** — badge positionnel sans `onClick`
   (`TimelineView.tsx:211`). Le raccourci « T » (`scrollToToday`) est un mécanisme séparé. Mon
   briefing demandait d'asserter que le clic ramène le viewport : faux.
2. **`timeline-event-outside-label` dépend du contraste de couleur**
   (`eventLabelReadableInside`, `lib.ts:60`), **pas** de la longueur du titre ni du zoom comme
   je l'avais écrit.
3. **`timeline-zoom-in` / `timeline-fullscreen` ne sont pas montés** dans le contexte desktop
   vers lequel ma table des sources pointait. Mon grep prouvait qu'ils sont *écrits* dans un
   fichier, pas qu'ils sont *rendus* — exactement le piège dont j'avertissais l'agent.
4. `timeline-zoom-out`/`-today`/`-weekend` existent **aussi** en desktop (`TimelineView.tsx`),
   pas seulement dans les deux fichiers mobiles de ma table.

## [MEMORY:pitfall] Un grep de testid ne prouve pas qu'il est rendu

`grep data-testid="x"` prouve que le testid est **écrit** dans un fichier, jamais qu'il est
**monté** dans le contexte qu'une spec exerce. Trois des six specs rouges de ce sprint
échouaient sur un locator **jamais résolu** (`timeline-zoom-in`, `timeline-fullscreen`,
`timeline-loading`), pas sur une assertion. Deux causes distinctes : rendu conditionnel au
viewport, et **code mort masqué par un composant parent ajouté plus tard**. Prévention : avant
d'écrire une spec contre un testid, vérifier au **runtime** (`toHaveCount(1)` dans le contexte
visé) et non au grep. Corollaire mesuré : un testid peut survivre des mois après que son
chemin de rendu a été neutralisé par un refactor de shell (#210 vs `timeline-loading`).

## [MEMORY:pitfall] `boundingBox()` d'un panneau animé se périme entre deux gestes

Une mesure `boundingBox()` prise après l'ouverture d'un panneau animé capture une position
transitoire : ici **24 px** de dérive après stabilisation (animation d'entrée puis
réajustement de layout au moment où le focus-trap et le scroll-lock se posent). Réutiliser
cette mesure pour un second geste fait viser des coordonnées obsolètes, qui retombent sur
l'élément *sous* le panneau — le geste ne déclenche rien et l'échec ressemble à un bug
fonctionnel. Prévention : une mesure fraîche avant **chaque** geste, jamais une mesure mise en
cache ; et pas de `waitForTimeout` pour « laisser le temps » — la mesure fraîche **est**
l'oracle.

## [MEMORY:pattern] Contourner un bug produit sans effacer l'assertion

Quand un défaut réel empêche le **mode d'interaction** mais pas le **comportement** visé,
changer de mode d'activation en conservant l'assertion — et signaler le défaut. Ici : la
pastille est inatteignable à la souris (en-tête sticky), donc activation au clavier (`Enter`,
même `onSelect`) tout en gardant l'assertion sur le contenu de la live-region. La spec reste
vraie et le bug reste visible. Anti-pattern : affaiblir l'assertion en `toBeVisible()`, ce qui
rendrait la spec verte **et** muette.

## Pack

`pack_lu: OUI` — `cp-frontend.md` §« Tests (Vitest + RTL) — pièges » ; `br-events.md`
§BR-EVE-006 (enum WEEK/MONTH/YEAR) et §BR-EVE-014 (`color` exposé au create direct
uniquement, d'où le helper `seedEventWithColor`).

## Recommandations suite

- **`RECOMMAND_FOLLOWUP`** — `timeline-loading` code mort : retirer la branche de
  `page.tsx:47`, ou déplacer le contrat sur `app-shell-loading` s'il est le nouveau testid
  canonique. [triage XS | domaine frontend]
- **`RECOMMAND_FOLLOWUP`** — en-tête de lane sticky recouvrant les événements proches de
  `rangeStart` au zoom Trimestre (150 px < 168 px) : événements inatteignables à la souris.
  [triage S | domaine frontend]
- **`RECOMMAND_FOLLOWUP`** — `DEFAULT_COLOR` `#6366f1` à un ratio de **4,467 < 4,5** (seuil
  AA) : tout événement sans couleur explicite déclenche déjà le libellé extérieur en
  production. Décision produit. [triage XS | domaine design]
- **`RECOMMAND_FOLLOWUP`** — matrice mobile portrait/paysage non faite pour `today`,
  `weekend`, `help`, `fullscreen` (couverts desktop seulement). [triage S | domaine frontend]
- **`RECOMMAND_FOLLOWUP`** — `auth.setup.ts:128` : `expect(dashboard).toBeVisible()` sans
  timeout explicite (5 s) a échoué une fois sur compilation à froid. [triage XS | domaine auth]
- **`RECOMMAND_UI_DESIGN`** : **oui, léger** — trancher `DEFAULT_COLOR` sous le seuil AA.
- `RECOMMAND_TEST_RUNNER` : **non** — suite mesurée par le lead lui-même (125/0/9).
- `RECOMMAND_SECURITY` : **non** — aucun contrôle d'accès, aucun secret, aucune donnée
  personnelle ; specs et attributs DOM uniquement.
- `RECOMMAND_DB_EXPERT` : **non** — zéro migration, zéro schéma, zéro requête.

STATUS: COMPLETED
