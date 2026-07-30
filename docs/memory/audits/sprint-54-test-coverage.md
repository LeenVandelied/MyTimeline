# Audit tests — Sprint 54

> Généré en fin de Phase 6 (2026-07-30). Réarmement du filet E2E de la frise.
> Toutes les valeurs de ce document sont **mesurées**, jamais estimées. Les runs
> concurrents accidentels du lead ont été écartés (cf. §6).

## 1. Couverture par règle métier

**Aucune BR impactée par ce sprint.** Les trois issues (#331, #329, #330) le déclarent
explicitement dans leur corps, et la vérification du diff le confirme : le périmètre est
`frontend/e2e/**` plus deux ajouts d'attributs DOM non fonctionnels dans
`frontend/src/components/`. Zéro fichier backend, zéro migration Flyway, zéro schéma Zod,
zéro logique métier touchée.

Un tableau BR × niveaux de test serait donc du remplissage. Le tableau qui a du sens pour
ce sprint est celui de la couverture par testid, ci-dessous.

Deux BR ont été **lues** (pas modifiées) pour cadrer des specs :
- `BR-EVE-006` — enum `WEEK`/`MONTH`/`YEAR`, source des 3 valeurs du contrat de testid de #331.
- `BR-EVE-014` — `color` n'est exposé qu'au create DIRECT d'événement, ce qui a imposé un
  helper `seedEventWithColor` distinct de `seedProduct` pour la spec de contraste.

## 2. Couverture des testids de la frise — l'objet du sprint

Cible d'origine de #330 : « les 18 `data-testid` encore sans spec E2E ».
**Cible réelle après vérification : 15 atteignables.** Trois écarts, tous étayés.

### 2.1 Les 15 testids couverts et exercés

| Testid | Spec | Comportement asserté (pas seulement la présence) |
|---|---|---|
| `timeline-drawer` | `timeline.spec.ts:519` | clic pastille → drawer + overlay visibles avec le détail réel |
| `timeline-drawer-overlay` | `timeline.spec.ts:533` | clic overlay → **démontage** du drawer, pas simple masquage |
| `timeline-drawer-close` | `timeline.spec.ts:545` | bouton close → démontage |
| `timeline-landscape-drawer-overlay` | `timeline-mobile.spec.ts` | overlay de la variante paysage |
| `timeline-actionsheet-overlay` | `timeline-mobile.spec.ts` | overlay de l'action sheet |
| `timeline-sheet-overlay` | `timeline-mobile.spec.ts` | overlay du bottom sheet |
| `timeline-sheet-grabber` | `timeline-mobile.spec.ts:233` | swipe court (30px) laisse ouvert / swipe long (120px) ferme — **seuil** exercé |
| `timeline-zoom-out` | `timeline.spec.ts` (desktop + portrait) | change réellement `timeline-zoom-level` |
| `timeline-today` | `timeline.spec.ts` | position suit le zoom (badge positionnel, **pas** un bouton — cf. §3) |
| `timeline-weekend` | `timeline.spec.ts:603` | motif calendaire réel : paire samedi/dimanche, écarts mesurés au zoom Semaine |
| `timeline-help` | `timeline.spec.ts` | ouvre le panneau d'aide |
| `timeline-fullscreen` | `timeline.spec.ts:656` | bascule `requestFullscreen`/`exitFullscreen` (API stubée, rationale en commentaire) |
| `timeline-live-region` | `timeline.spec.ts:816` | **vide au montage** (pas d'annonce parasite), puis contenu exact après zoom, puis après sélection |
| `timeline-minimap-viewport` | `timeline.spec.ts:734` | `aria-valuenow` change au clavier ; `style.left` change au scroll du rail |
| `timeline-event-outside-label` | `timeline.spec.ts:838` | dépend du **contraste** de couleur : cas sous seuil AA affiché, cas au-dessus absent (contrôle négatif) |

### 2.2 Écart 1 — deux entrées de la liste ne sont pas des éléments d'interface

`desktop-edit-trigger` et `mobile-delete-trigger` n'existent **que** dans
`frontend/src/components/timeline/TimelineEditHost.test.tsx` (déclarations lignes 63 et 72,
clics RTL aux lignes 131-240). Ce sont des doublures RTL — exactement le motif pour lequel
l'issue exclut déjà `timeline-edit-host-stub` et `timeline-responsive-stub`, **et dans le
même fichier**. Le composant réel `TimelineEditHost.tsx` n'expose que `timeline-edit-dialog`.

Aucune spec Playwright ne peut les exercer : un navigateur ne rend pas un testid déclaré
dans un `*.test.tsx`. Le critère d'acceptation n°1 de #330 (« chacun des 18 ») était donc
**inatteignable par construction**.

**C'est une régression d'audit, traçable :** `audits/sprint-46-test-coverage.md:47`
identifiait déjà `mobile-delete-trigger` comme faux positif ; `audits/sprint-47-test-coverage.md`
§4 — source de la liste reprise par l'issue — l'a réintégré tout en excluant les deux autres
stubs du même fichier. Consigné ici pour que le prochain audit ne les réintègre pas une
troisième fois.

### 2.3 Écart 2 — `timeline-loading` est du code mort

`frontend/app/[locale]/(app)/timeline/page.tsx:47` contient bien
`if (loading) return <div data-testid="timeline-loading">`, mais cette branche **ne peut
plus s'exécuter**. `AppShell` (`components/layout/AppShell.tsx:80/114`, livré par #210
*après* ce testid) porte sa propre garde `useAuthGuard()` au niveau du shell et retourne
`app-shell-loading` **sans monter `children`** tant que `loading` est vrai. `TimelinePage`
étant un `children` de ce shell, sa propre branche loading est inatteignable.

Mesuré (route `/api/auth/me` gatée, run isolé) : `app-shell-loading` compte **1**,
`timeline-loading` compte **0** — 100 % reproductible, ce n'est pas un timing serré.

La spec est `test.skip()` avec la cause nommée en commentaire. **Substituer
`app-shell-loading` a été refusé délibérément** : cela aurait couvert discrètement un
testid *différent* de celui déclaré par l'issue, en donnant l'illusion de la couverture.
Suivi ouvert (§5) pour trancher entre retirer la branche morte et déplacer le contrat.

### 2.4 Écart 3 — le nombre de départ de l'audit S47 est corrigé

Bilan : **18 annoncés → 2 faux positifs (§2.2) → 1 code mort (§2.3) → 15 réellement couverts.**
Le §4 de l'audit S47 est donc à lire avec cette correction ; son décompte de 18 ne
correspond pas à 18 éléments d'interface exerçables.

## 3. Prémisses infirmées par la mesure

Cinq affirmations sont tombées, dont **trois écrites par le lead** dans les briefings :

| Prémisse | Source | Réalité mesurée |
|---|---|---|
| Le retry 429 de `auth.setup.ts` fonctionne | issue #329 + runbook S47 (2 sprints) | **Mort** : backoff 8 s + 20 s = 28 s > budget Playwright 30 s → la 2ᵉ tentative expirait toujours. 4/4 provisions en `Test timeout of 30000ms exceeded`, zéro diagnostic. Corrigé par `PROVISION_TIMEOUT_MS = 150_000`. |
| `timeline-today` ramène le viewport sur aujourd'hui au clic | **briefing du lead** | Badge positionnel **sans `onClick`** (`TimelineView.tsx:211`). Le raccourci « T » (`scrollToToday`) est un mécanisme séparé. |
| `timeline-event-outside-label` apparaît quand le libellé dépasse la pastille | **briefing du lead** | Dépend du **contraste de couleur** (`eventLabelReadableInside`, `lib.ts:60`), pas de la longueur du titre ni du zoom. |
| `timeline-zoom-in` / `timeline-fullscreen` sont montés dans le contexte desktop exercé | **briefing du lead** (table des sources) | Locators **jamais résolus** au run. Le grep prouvait qu'ils sont *écrits* dans un fichier, pas qu'ils sont *rendus*. |
| `EventEditForm.tsx` est sous `components/events/` | plan architecte (auto-corrigé) | À la **racine** de `components/`. La correction de l'architecte était juste. |

## 4. Bugs produit découverts (valeur ajoutée hors périmètre)

Deux défauts réels, trouvés parce que les specs testent des comportements et non des présences :

1. **En-tête de lane sticky rendant des événements inatteignables à la souris.** Au zoom
   Trimestre, un événement proche de `rangeStart` (`computeRange` = 30 j avant le 1er event)
   se positionne à `30 × 5 = 150 px`, alors que `--lane-header-w` vaut **168 px**
   (`spacing.css:48`). `.mt-tlv__lane-label` (`position:sticky;left:0`,
   `TimelineView.tsx:331`) recouvre la pastille — Playwright confirme
   « intercepts pointer events ». **Aucun scroll ne dégage** la pastille : à ce zoom, pour un
   seul produit, le rail tient dans le viewport, donc il n'y a pas d'overflow. Un utilisateur
   réel ne peut pas cliquer cet événement.
2. **`DEFAULT_COLOR` sous le seuil AA.** `#6366f1` (`types/event.ts:128`) a un ratio mesuré
   **4,467 < 4,5**. Tout événement sans couleur explicite déclenche donc déjà
   `timeline-event-outside-label` en production : le garde-fou de contraste est l'état
   **normal**, pas un cas limite. À trancher côté produit.

## 5. Tests créés

- `frontend/e2e/timeline.spec.ts` — +13 tests, 4 nouveaux `describe` (drawer desktop,
  toolbar desktop, minimap/états/contraste, options de récurrence)
- `frontend/e2e/timeline-mobile.spec.ts` — +5 tests (overlays et grabber)
- **18 nouvelles specs au total.** Aucun fichier créé : extension des deux fichiers
  existants, conformément à la convention de #314/#205.

Couverture complémentaire hors énoncé de #330 : `recurrence-unit-option-WEEK` et
`recurrence-unit-option-YEAR`, posés par #331 mais exercés par aucune spec (écart relevé par
le lead entre les deux vagues, remonté en majeur par l'heuristique du protocole A.4). Les
deux sont désormais exercés avec l'oracle de #331 pour `MONTH` — le trigger et la preview
affichent la bonne unité, et aucune trace de l'unité précédente ne subsiste après bascule.

## 6. Résultats des runs

**Run final retenu** (unique, avant-plan, `--workers=1`, aucun run concurrent) :

- **E2E : 134 tests → 125 passed / 0 failed / 9 skipped** — 11,4 min
- Frontend unitaire : **836 / 836** (mesuré en vague 1, aucun fichier `src/` modifié depuis
  hors les deux ajouts d'attributs)
- Backend : **non exécuté — aucun fichier backend touché par ce sprint** (0 `.java`, 0 `.sql`)
- `tsc --noEmit` : 0 erreur · `eslint` : 0 issue

Les 9 skipped = 8 skips structurels préexistants + le skip justifié de §2.3.
125 = les 108 de la baseline pré-#330 + 17 des 18 nouveaux tests.
**Aucune régression** : les 108 tests préexistants passent tous.

### Mesures écartées, et pourquoi

Deux runs antérieurs ont donné **8 rouges** puis **12 rouges** sur un code identique. Cause :
le lead a lancé deux suites Playwright **concurrentes** contre un backend et une base uniques
— la contention produisait des échecs non reproductibles (`event-outside-label` échouait dans
les deux runs contendus et **passe** au run propre). Les deux mesures sont écartées ; seule la
mesure isolée fait foi. Erreur de méthode du lead, consignée plutôt qu'effacée.

Un troisième run a échoué au `setup` sur `net::ERR_CONNECTION_REFUSED` (le `next dev` était
mort). Le message d'échec réécrit par #329 a **correctement** diagnostiqué : « ce n'est PAS un
rate-limit register 429 : le formulaire ne s'est JAMAIS affiché » — validation en conditions
réelles de l'objet même de l'issue.

## 7. Conclusion

**Prêt pour la PR.** Aucun écart de couverture non résolu sur le périmètre atteignable : les
15 testids exerçables le sont par un comportement, pas par une assertion de présence. Les
trois écarts au décompte d'origine (§2.2, §2.3) sont étayés par la mesure et par la chaîne
d'audits du dépôt, pas par un arbitrage de confort.

Réserves assumées, à ne pas lire comme un feu vert plus large que ce sprint :
- Les deux bugs produit du §4 sont **signalés, non corrigés** — hors périmètre de specs.
- `timeline-today`, `timeline-weekend`, `timeline-help` et `timeline-fullscreen` sont couverts
  en **desktop uniquement** ; la matrice complète par orientation mobile n'est pas faite.
- L'API `requestFullscreen` est **stubée** dans sa spec : la bascule plein écran réelle du
  navigateur n'est pas observée.
- Aucun test backend n'a été lancé — justifié ici (zéro fichier backend), mais cela signifie
  que la CI reste le seul juge de la non-régression backend sur cette branche.
- #330 a été exécutée par un modèle **Sonnet**, pas Opus comme le prévoyait le triage
  (capacité Opus indisponible, six échecs `529` consécutifs). Le travail a été vérifié à la
  mesure par le lead, mais la dérogation est consignée.
