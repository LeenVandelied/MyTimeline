# Issue #310 — Garde anti-boucle sur le retry « garder mes modifications » (409)

Fichiers de contexte lus : `docs/memory/sprints/sprint-76/pitfalls-310.md` (intégral) ;
`frontend/src/hooks/useEventEditConflict.ts` (intégral) ;
`frontend/src/components/shared/ConflictDialog.tsx` (intégral) ;
`frontend/src/components/shared/ConflictDialog.intl.test.tsx` (intégral) ;
`frontend/src/components/EventEditForm.tsx` (extraits l.108-125, l.198-210, l.880-960 + grep ciblé) ;
`frontend/src/components/EventContent.tsx` (extraits l.250-275) ;
`frontend/src/components/EventContent.test.tsx` (extraits l.1-60, l.120-140) ;
`frontend/src/components/timeline/TimelineEditHost.tsx` (extraits l.80-125 + grep) ;
`frontend/src/components/shared/ConflictDialog.test.tsx` (extraits l.1-40, l.145-200) ;
`frontend/src/hooks/useSetEventArchived.test.tsx` (l.1-45, motif de mock) ;
`frontend/public/locales/{fr,en,es,de}/common.json` (bloc `conflictDialog`) ;
le context-pack `cp-frontend` inliné dans le briefing.

## Vérification de l'énoncé (PIT-S74-003 / PIT-S71-001)

L'énoncé ne nomme aucun fichier. La recon du lead a été **confirmée par mesure**, pas recopiée :

- `grep -rn "useEventEditConflict" frontend/src frontend/app` → **2 points de montage réels**
  (`EventContent.tsx:45`, `timeline/TimelineEditHost.tsx:86`). Une garde posée dans un composant
  n'aurait couvert qu'un chemin sur deux → le hook est bien le bon endroit.
- État initial confirmé : aucun compteur, aucun backoff, aucun plafond. L'issue décrit un vrai manque.
- `useCreateEvent.ts:27` documente explicitement qu'il ne réutilise PAS ce hook → hors périmètre.

## Distinction nominal / contention (le point que l'énoncé ne dit pas)

`onKeepMine` **ré-aligne déjà** la version sur celle du corps 409 (`conflict.server.version`).
C'est l'anti-boucle du cas **nominal** : un seul écrivain concurrent ⇒ la 2ᵉ soumission passe.
La boucle résiduelle à borner est donc la **contention réelle** — un tiers réécrit entre notre 409
et notre re-soumission, le serveur peut alors répondre 409 indéfiniment.

Conséquence directe sur la conception : le compteur ne borne pas « un bug de version » (qui serait
permanent et justifierait un plafond global collant), mais un **épisode de contention** — il doit
donc se **réinitialiser dès que l'épisode se termine**, quelle qu'en soit la façon.

## Ce qui a été implémenté

`frontend/src/hooks/useEventEditConflict.ts` :

- `export const MAX_KEEP_MINE_ATTEMPTS = 3` (plafond, pas de délai).
- `runSubmit(data, fromKeepMine)` — soumission unique interne ; `onSubmit` = `runSubmit(data, false)`.
  `fromKeepMine` ne change QUE la comptabilité du plafond : l'API publique `onSubmit` est inchangée.
- `keepMineAttempts` (state) + `keepMineExhausted = keepMineAttempts >= MAX_KEEP_MINE_ATTEMPTS`,
  ajouté à `UseEventEditConflict`.
- `onKeepMine` : `if (!conflict || keepMineExhausted) return` — le callback devient **inerte**.

### Où l'incrément est posé, et pourquoi (arbitrage demandé par le briefing)

Le briefing pose l'alternative : incrémenter dans `onSubmit` (on compte aussi les soumissions
normales) ou dans `onKeepMine` (on compte les **clics**, pas les **409**). **Aucun des deux n'a été
retenu.** L'incrément est posé dans la **branche `catch` 409 de `runSubmit`, conditionné à
`fromKeepMine`** :

```ts
setKeepMineAttempts((attempts) => (fromKeepMine ? attempts + 1 : 0))
```

Raison : le critère d'acceptation borne « les 409 répétés », pas les clics. Compter les clics
serait faux dès qu'un clic aboutit à autre chose qu'un 409 (succès, 500, réseau) ; compter dans
`onSubmit` mélangerait soumissions initiales et re-soumissions. Ici, une tentative n'est consommée
que si elle a **réellement produit un 409 sur une re-soumission**. Le `updater` fonctionnel évite
toute lecture périmée du compteur.

### Sémantique de réinitialisation (tranchée explicitement)

| Événement | Compteur | Raison |
|---|---|---|
| Succès (`runSubmit` OK) | **0** | Épisode de contention clos. |
| 409 sur soumission **initiale** | **0** | Nouvel épisode ; sinon un utilisateur légitime qui rouvre le formulaire hériterait du plafond précédent. |
| 409 sur **re-soumission** keep-mine | **+1** | Seul cas comptabilisé. |
| Erreur non-409 | **0** | On quitte le flux conflit (`submitState = 'error'`), le plafond n'a plus d'objet. |
| `onConflictDismiss` / `onReload` / `onTakeServer` | **0** | L'utilisateur a abandonné/tranché le flux. |
| `reset()` | **0** | Réinitialisation explicite du parent (`EventContent` l'appelle sur `onCancel`). |
| Changement d'`eventId` | **0** (`useEffect`) | Le hook est monté une fois par host et `eventId` varie (`TimelineEditHost` passe `editing?.id`) : le plafond ne doit pas se traîner d'un événement à l'autre. |

`onTakeServer` est un alias de `onReload` dans ce hook — la remise à zéro y est donc couverte par
la même ligne, ce qui a été vérifié et non supposé.

### Plafond vs backoff

**Plafond retenu**, conformément à PIT-S54-001 : un backoff temporel aurait exigé une horloge
injectable et aurait risqué de dépasser le budget de timeout du test, rendant le retry ET son
diagnostic inatteignables. Aucun délai n'a été introduit ; **aucun test ne dépend d'une horloge**
(ni réelle, ni simulée). Pire cas d'appels réseau : `1 + MAX_KEEP_MINE_ATTEMPTS = 4`.

### État terminal et message utilisateur

- `submitState` reste **`'conflict'`** au plafond : le dialog demeure ouvert pour porter le message.
  Aucune valeur n'a été ajoutée à `EventSubmitState` (évite de propager un état dans tout
  `EventEditForm`).
- `ConflictDialog` reçoit `keepMineExhausted?: boolean` :
  - rend `<p role="alert" data-testid="conflict-dialog-keep-mine-exhausted">` ;
  - `disabled={isSubmitting || keepMineExhausted}` sur `conflict-dialog-keep-mine` — la
    désactivation de la PR #306 ne couvrait QUE `isSubmitting`, elle a donc été **étendue** ;
  - « prendre la version serveur » reste actionnable : c'est la sortie du flux.
- Threading : `useEventEditConflict` → `EventContent` / `TimelineEditHost` → `EventEditForm`
  (nouvelle prop optionnelle, défaut `false`) → `ConflictDialog`.

### Couleurs

**Aucune couleur littérale posée.** Le message réutilise `text-destructive text-sm`, jeton
sémantique déjà employé par le titre du `ConflictDialog` (icône `AlertTriangle`) et par l'erreur
inline d'`EventEditForm` (`data-testid="event-form-error"`). Aucune surface nouvelle, aucun couple
fond/texte inédit ⇒ pas de mesure de contraste requise à mon sens ; le lead tranche.

### i18n

Clé **`common.conflictDialog.keepMineExhausted`** ajoutée dans les **4 locales**
(`fr`/`en`/`es`/`de`), insérée juste après `keepMine`. Parité vérifiée par script : 16 clés
identiques dans les 4 fichiers. Diff = **1 ligne ajoutée par fichier** (pas de reformatage JSON).

## Tests

Nouveaux : `frontend/src/hooks/useEventEditConflict.test.tsx` (4 tests) —

1. sous 409 permanents (version serveur qui **bouge** à chaque réponse, donc le ré-alignement de
   version ne suffit pas : vraie contention), 4 clics **au-delà** du plafond ⇒ exactement
   `1 + MAX_KEEP_MINE_ATTEMPTS` appels à `updateEvent`, `keepMineExhausted === true`,
   `submitState === 'conflict'` ;
2. **succès intercalé ⇒ compteur à zéro**, et le budget complet est de nouveau disponible pour
   l'épisode suivant ;
3. deux soumissions **initiales** en 409 n'entament pas le budget de re-soumissions ;
4. `onConflictDismiss` libère le budget.

Étendus : `ConflictDialog.test.tsx` (+2 — message rendu avec `role="alert"`, keep-mine `disabled`
et clic sans effet, take-server toujours actionnable ; et absence du message hors plafond) ;
`ConflictDialog.intl.test.tsx` (+1 — la nouvelle clé résout en **français réel** sous
`NextIntlClientProvider` alimenté par les vrais messages, collecteur `onError` vide, garde
PIT-S63-006 contre un namespace faux).

Pièges de test respectés : `useAuth` et `useQueryClient` **mockés au niveau du hook**, sans
`QueryClientProvider` (PIT-S69-001) ; `updateEventMock` **recréé** par un `vi.fn()` neuf à chaque
test au lieu de `mockReset()`/`mockClear()` sur un mock partagé rendant des promesses rejetées
(PIT-S61-001) ; `console.error` espionné puis `mockRestore()` (le hook logue l'erreur interceptée).
Le nouveau `data-testid` est consommé par des `getByTestId` réels, pas seulement cité (PIT-S54-002).

### Contrôle négatif — JOUÉ, résultat mesuré

Guard retirée (`if (!conflict || keepMineExhausted) return` → `if (!conflict) return`), suite
rejouée : **exit 1**, `Tests 2 failed | 2 passed`, avec
`expected "spy" to be called 4 times, but got 8 times` et `... 8 times, but got 10 times`.
Guard restaurée ⇒ exit 0, 4/4. Le test ne passe donc PAS avant le correctif.

Note honnête sur la portée du contrôle : seuls **2 des 4** tests rougissent sans la garde — les
deux qui sur-cliquent au-delà du plafond. Les tests 3 et 4 cliquent exactement `MAX` fois et
vérifient la sémantique de reset, pas la borne ; ils restent verts sans la garde. C'est attendu,
mais cela signifie que **la preuve de la borne repose sur les tests 1 et 2 seuls**.

## Mesures (codes de sortie lus, jamais le texte RTK)

Toutes les commandes passées en `rtk proxy` + `SKIP_DELEGATION=1` (PIT-S71-002, PIT-S45-003,
PIT-S74-007) :

- `npx tsc --noEmit` → **exit 0**, `grep -c "error TS"` = **0**.
- 6 suites impactées (`useEventEditConflict`, `ConflictDialog` ×2, `EventEditForm`, `EventContent`,
  `TimelineEditHost`) → **exit 0**, 98/98.
- Suite frontend complète `npx vitest run` → **exit 0**, **111 fichiers / 1261 tests**.
- Parité i18n 4 locales → 16 clés identiques, OK.

## Ce qui n'a PAS été vérifié

- **`next build` non lancé** (interdit par la contrainte de vague : la stack Next/Playwright est
  réservée à l'agent #527). PIT-S22-001 est explicite : le lint gate de `next build` attrape des
  erreurs invisibles à `tsc` et à Vitest. Un `tsc` vert **ne suffit donc pas** à conclure « rien à
  signaler » — le build de non-régression de fin de vague reste le juge.
- **Aucun E2E** : pas de vérification navigateur du rendu réel du message ni du contraste mesuré.
- **Aucune vérification runtime** que le backend produit effectivement des 409 répétés sous
  contention réelle (le test simule cette réponse).
- Valeur du plafond (**3**) : choisie par jugement, non calibrée sur des données de production.

## Recommandations suite

Pas de `RECOMMAND_TEST_RUNNER` car la preuve exigée par le critère 3 est unitaire, elle est écrite,
elle est verte (exit 0) et son contrôle négatif rougit — un E2E n'ajouterait pas de garantie que le
test unitaire ne fournit pas déjà, et la stack E2E appartient à l'agent #527 sur cette vague ; pas
de `RECOMMAND_DB_EXPERT` ni de `RECOMMAND_SECURITY_EXPERT` car le diff est purement frontend
(hook + présentation + libellés), sans schéma ni surface d'authentification, et le flux est déjà
gardé par l'ownership.

STATUS: COMPLETED
