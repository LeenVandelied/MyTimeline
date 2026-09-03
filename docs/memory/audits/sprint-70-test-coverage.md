# Audit tests — Sprint 70

> Écrit en Phase 6, **après** le correctif de review `2955bbb`, sur l'arbre final.
> Mesures relancées par le lead : le premier passage du `test-runner` avait produit un
> verdict faussé (cf. §« Le premier audit a menti »).

## Nature du sprint — pourquoi il n'y a pas de tableau BR

Sprint **100 % frontend présentationnel** : positionnement d'un aperçu déjà existant et
correction de son rendu. **Aucune règle métier n'a changé de comportement**, aucun endpoint,
aucun DTO, aucune migration, aucun fichier `backend/**`. Remplir un tableau BR × niveaux de
test donnerait une illusion de couverture là où il n'y a rien de métier à couvrir.

La seule BR **effleurée** est `BR-EVE-009` (modèle couleur event) : le retrait de l'`opacity:.8`
sur `.mt-evt--draft` change le rendu de la couleur choisie par l'utilisateur, sans changer la
règle. Couverte par 4 tests E2E de contraste (clair + sombre), avec preuve de mutation.

⚠ Rappel consigné pendant ce sprint : `BR-EVE-009` est le **modèle couleur**
(`br-events.md:92`), PAS la perf de l'aperçu — le briefing du lead l'avait mal attribuée, et
deux commentaires du code (`EventEditForm.tsx:174`, `:289`) propagent la même erreur. Laissés
intacts délibérément, tracés en follow-up.

## Couverture par surface livrée

| Livrable | Unitaire | E2E | Preuve de mutation | Verdict |
|---|:---:|:---:|:---:|---|
| Aperçu épinglé hors du corps défilant (#326) | OUI (2 tests) | OUI (`sprint-70-create-preview-pinned.spec.ts`) | OUI — aperçu remis dans le corps → rouge, **dérive 255 px** | COUVERT |
| Non-régression des 3 surfaces d'édition (#326) | OUI (absence du nœud hors `mode="create"`) | — (pas de parcours d'édition ajouté) | OUI — `previewPortalNode={null}` → 2 rouges | COUVERT |
| Contraste des 7 éléments du handoff §6, clair + sombre (#325) | — (jsdom ne met rien en page) | OUI (`sprint-70-preview-visual.spec.ts`) | OUI — `opacity:.8` réintroduite → 2 rouges aux valeurs exactes | COUVERT |
| Variante non-interactive `.mt-evt--preview` (#325) | — | OUI (2 tests, clair + sombre) | OUI — neutralisation retirée → rouge sur le curseur | COUVERT |
| Classe conditionnelle du libellé « Aperçu » (correctif review) | OUI (2 tests, avec / sans portail) | — | OUI — double mutation, chaque test rougit sur SA branche | COUVERT |

**Non couvert, déclaré :** rendu de la bottom sheet `< 1024 px` (hors périmètre du sprint,
inchangée) ; locales autres que `fr` ; unités de récurrence SEMAINE/AN ; survol tactile ;
libellé « Aperçu » sur les 3 surfaces d'édition établi par **lecture de code exhaustive**
(`previewPortalNode` n'est passée que par `NewEventDrawer`), pas par test.

## Résultats mesurés — arbre final (`2955bbb`)

| Suite | Résultat |
|---|---|
| Backend | **476 / 476**, 0 failed (mesuré par le `test-runner`) |
| Frontend unitaire (`vitest run`) | **1056 / 1056**, 0 failed |
| `tsc --noEmit` | 0 erreur |
| `eslint` | 0 |
| **E2E complète** (`CI=1 PLAYWRIGHT_BASE_URL=:3100`) | **243 passed / 9 skipped / 0 failed**, exit 0, 9,7 min |
| E2E specs du sprint seules (filtre `sprint-70`) | **10 / 10 passed**, exit 0, 37,9 s |

Les 9 `skipped` sont la **baseline connue** du projet (9 également au Sprint 68), pas une
conséquence de ce sprint. **0 flaky** sur ce run — les 2 spécs historiquement instables
(`sprint-62-select-focus-indicator`, sheet mobile) sont passées.

## Le premier audit a menti — et comment on l'a su

Le premier passage du `test-runner` a rendu `PARTIAL_FAILURE` avec deux verdicts **faux**,
tous deux étiquetés « pré-existant, non lié au S70 » :

1. **« build FAIL : page `/terms` manquante »** — réfuté : la page existe
   (`frontend/app/[locale]/terms/page.tsx`), et surtout **la CI de `dev` est verte sur
   `fd954b2`**, la base exacte de ce sprint, alors que la CI lance le build. Un échec
   réellement pré-existant aurait rougi cette CI.
2. **« E2E : 4 failed / 247 skipped, serveur `next dev` défaillant »** — ce n'était pas une
   mesure : `auth.setup.ts` échouait sur un 500 `InvariantError: clientReferenceManifest`,
   qui est le **bug de manifeste du serveur de dev documenté au runbook S47**, déclenché par
   un build lancé contre un `next dev` en cours — piège nommé dans ce même runbook.
   L'audit a créé la panne, puis l'a imputée au code.

**Contre-mesure appliquée, réutilisable :** avant de qualifier un échec de « pré-existant »,
le comparer à **la CI de la base du sprint**. C'est gratuit et décisif. Et avant tout run E2E,
sonder les deux oracles du runbook : `curl /fr/register` doit rendre **200** (500 ⇒ redémarrer
le serveur de dev, ne pas chercher dans la spec) et `curl /api/auth/me` doit rendre **401**
(404 ⇒ préfixe `/api` perdu). Les deux étaient verts avant le run ci-dessus ; ils ne l'étaient
pas avant celui de l'audit.

## Conclusion

**Prêt pour PR.** Aucun blocage. Aucune régression imputable au sprint sur 476 + 1056 + 243
tests. Les 5 livrables sont couverts, et chaque couverture est accompagnée d'une mutation qui
prouve que le test sait rougir — ce qui répond directement à `coverage-check-vert-ne-prouve-rien`
et à `jsdom-scroll-tests-prove-nothing`.
