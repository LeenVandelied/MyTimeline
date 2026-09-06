# Audit tests — Sprint 78

> Généré en Phase 6 par le lead, le 2026-09-06, sur la branche du sprint
> (`claude/sprint-78-start-5c9db2`, fast-forward de `sprint/78`) @ `f835111`.
>
> ⚠ Ce fichier n'emploie volontairement PAS le jeton littéral que le garde-fou de Phase 9
> recherche : ce garde-fou grep la chaîne telle quelle et se déclencherait sur la phrase même
> qui la documente (PIT-S76-007). Les manques éventuels sont écrits « LACUNE ».

## Périmètre — aucune règle métier touchée

Les trois issues du sprint sont d'outillage et de CI. Le diff ne contient **aucun changement de
code métier** : ni `backend/src/main/java/**`, ni logique frontend. La table « couverture par
BR-XX » du gabarit est donc sans objet ici — il n'y a pas de règle métier à couvrir. Ce qui doit
être audité, ce sont **les gates eux-mêmes**, puisque le sprint consistait à réparer trois
contrôles verts qui ne prouvaient pas ce qu'ils prétendaient.

| Gate | Avant le sprint | Après | Prouvé par |
|---|---|---|---|
| Formatage (`format:check`) | déclaré, jamais exécuté, rouge à HEAD (119 fichiers) | step CI bloquant, vert à HEAD | `npm run format:check` EXIT=0 ; parse YAML du job |
| `test-quiet.sh frontend` | Vitest seul, doc annonçant build+typecheck+lint | build → vitest → typecheck → lint | sonde TS2322 → EXIT=1 dès le build ; contrôle négatif `frontend-unit` → EXIT=0 |
| Couverture mesurable | aucun rapport, ni back ni front | JaCoCo (`verify`) + vitest `--coverage` (lcov), 2 artefacts CI | `ls -la` des deux rapports ; `help:effective-pom` |

## Résultats de runs

Tous les codes de sortie ci-dessous ont été lus **sans pipe**, commandes préfixées `rtk proxy`
(PIT-S45-003, PIT-S75-002, PIT-S74-008 : le hook falsifie build, prettier et vitest).

### Backend — agent #169, Docker 29.2.1 présent
- `./mvnw --batch-mode verify` → **EXIT=0**, `Tests run: 566, Failures: 0, Errors: 0`
- `./mvnw jacoco:report` (rapport écarté au préalable, régénéré) → EXIT=0
- Couverture initiale mesurée : **90,49 % instructions / 72,18 % branches**

### Frontend — agents #528 / #434 / #169
- `npx vitest run` → **EXIT=0**, **1313/1313** (113 fichiers)
- `npm run typecheck` → EXIT=0 · `npm run lint` → EXIT=0
- `npm run build` → EXIT=0, **52/52 pages** (99+ lignes de sortie : le vrai build, pas le
  résumé « 2 routes » de PIT-S75-002)
- `npm run format:check` → EXIT=0
- Couverture initiale mesurée : **70,77 % statements / 85,33 % branches** — chiffre BRUT,
  gonflé par des configs racine happées par v8, pas une cible.

### E2E — run réel exécuté par le LEAD (pas délégué : PIT-S73-004)

Stack montée pour l'occasion, **isolée de l'environnement du poste** : conteneur Postgres dédié
sur `:5436` (le Postgres local du poste est en V6 sur 15 — le migrer aurait été un effet de bord
non demandé), backend natif `:8080` contre cette base, `npx next dev -p 3000` en **webpack** et
non turbopack (recette worktree de `playwright.config.ts`, PIT-S61-007). Oracle de proxy vérifié
AVANT le run : `curl /api/auth/me` → **401** (401 = proxy en place, 404 = absent).
Stack démontée et conteneur supprimé après le run ; ports rendus.

```
PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test --ignore-snapshots
→ 304 passed · 5 failed · 9 skipped · 6,3 min (318 tests)
```

`--ignore-snapshots` est délibéré : les références sont suffixées `-chromium-linux`, ce poste est
darwin. Sans ce drapeau Playwright **écrirait de nouvelles références** au lieu de comparer, ce
qui polluerait le dépôt sans produire aucun signal (PIT-S77-019).

**Les 5 échecs, instruits un par un — aucun n'est imputable au diff du sprint :**

1. `sprint-77-theme-visual.spec.ts:559` — *armement de la comparaison*. Message du test :
   « Référence absente (`landing-hero-light-chromium-darwin.png`). Ce test COMPARE, il ne génère
   pas. » **Le garde-fou de la spec a fonctionné exactement comme prévu** : il refuse d'écrire une
   référence sur une plateforme étrangère. Conséquence mécanique de `--ignore-snapshots` + darwin.
2-4. `forgot-password.spec.ts:40`, `reset-password-failures.spec.ts:136` et `:157` — les trois
   échouent sur « aucun token de réinitialisation exploitable … dernier symptôme : HTTP 401 ».
   Cause trouvée dans le log backend : `BREVO_API_KEY absente : envoi d'email de réinitialisation
   ignoré (no-op)`. **Défaut d'environnement** (pas de clé mail sur ce poste, endpoint test-only
   non autorisé), sans rapport avec le sprint.
5. `golden-path.spec.ts:85` — l'inscription échoue (`alert: Une erreur est survenue lors de
   l'inscription`), donc pas de redirection vers `/fr/login`. **Rejoué en isolation : EXIT=0,
   6 passed en 7,8 s.**

**Ce que le rejeu isolé prouve, et ce qu'il ne prouve pas.** Il ne suffit pas de dire « vert en
isolation donc flaky » : l'isolation ne prouve l'instabilité que si elle ne supprime pas aussi la
CAUSE (PIT-S73-007). Ici elle supprime précisément la charge concurrente, qui est la cause
soupçonnée — c'est donc cohérent, pas concluant. L'argument qui tranche est ailleurs et il est
structurel : **le sprint ne modifie aucune ligne de code backend exécutable** (seul `pom.xml`
change, et uniquement le build). Or l'échec est un refus côté serveur sur `POST /api/auth/register`.
Un réordonnancement de classes Tailwind dans un `.tsx` ne peut pas produire cet effet. Le suspect
réel est la contention d'identités / le budget de rate-limit sur `register` — soit exactement
**#475 et #463, déjà planifiées au Sprint 79**.

## Contrôle de couverture E2E (Phase 8) — MAJEUR réfuté

L'heuristique bash a rendu **9 testids « sans spec »**. Vérification faite avant d'y croire :
les 9 existent **déjà sur `origin/dev`** (`git grep` sur la base). Le faux positif vient du
reformatage : le check compte les lignes `^+` du diff, et 119 fichiers reformatés font apparaître
chaque ligne comme ajoutée. **Le sprint n'introduit aucun nouveau testid** (aucune surface UI
nouvelle). Verdict réel : conforme, pas de LACUNE.

## Non vérifié — à lire avant de conclure quoi que ce soit

- **Les comparaisons de captures n'ont pas tourné.** C'est le seul risque réel du reformatage
  (réordonnancement des classes Tailwind), et il n'est mesurable que sur Linux avec les
  références du dépôt. **Le job `e2e` de la CI de la PR est la seule instance qui peut le juger.**
  L'agent de #528 a néanmoins produit une preuve indirecte forte : empreinte du multi-ensemble
  de classes par fichier sur les 119 fichiers (aucune classe ajoutée, retirée ni altérée — seul
  l'ordre change) + audit des 1354 littéraux pour les conflits `twMerge` (1 seul auto-conflictuel,
  laissé intact).
- **Le téléchargement effectif des deux artefacts de couverture n'est pas prouvé** et ne peut pas
  l'être ici : aucune CI ne tourne sur les branches de sprint (PIT-S64-008). Prouvé à la place :
  rapports réellement produits (`ls -la`), `path:` d'`upload-artifact` corrects vis-à-vis de la
  racine du dépôt (et non du `working-directory` — mode d'échec classique qui produit un artefact
  vide sans faire rougir le job), YAML valide à 7 jobs.
- `if-no-files-found: error` n'a jamais été déclenché : son comportement est raisonné, pas mesuré.
- Le surcoût de durée dû à `--coverage` n'a pas été chronométré (machine chargée en parallèle).
- Le coût du scope `frontend` étendu a été mesuré à cache `.next` **chaud** (53 s) ; à froid il
  sera plus élevé, non mesuré.

## Review (Phase 7) et son cycle 2 — dont un contrôle du lead réfuté

Cycle 1 : **0 CRITIQUE / 2 MAJEUR / 5 MINEUR**. Les deux MAJEUR portaient sur le correctif de
#434 lui-même — le sprint réintroduisait par la porte de derrière le défaut qu'il corrigeait
(une étape sautée en silence, un verdict final qui l'annonce quand même). Corrigés en `81e405f`.

Cycle 2 (les commits de correction sont eux-mêmes relus — angle mort mesuré au S62) :
**0 CRITIQUE / 0 MAJEUR / 5 MINEUR**, traités en `1123660` sauf un, assumé.

**Un contrôle écrit par le lead a été réfuté par le cycle 2, et c'est le constat le plus utile de
cette review.** Pour prouver l'armement du MAJEUR 1 (propagation d'échec qui ne dépend plus du
contexte d'appel), j'avais lancé `if ./scripts/test-quiet.sh frontend ; then …`. Vacuous : le
script tourne dans son **propre processus**, dont le `set -e` n'est jamais désarmé par le `if` de
l'appelant. Ce contrôle serait passé au vert **avant** le correctif aussi — il ne mesurait rien.

Contrôle refait correctement (fonctions extraites avant le dispatcher, sourcées, `run_frontend`
appelée en contexte conditionnel **dans** le shell, sonde TS2322 en place) :

| Version | Résultat |
|---|---|
| `fb8c21a` — avant le correctif | build **ROUGE**, typecheck **ROUGE**, et pourtant `✓ Frontend : OK (build + tests unitaires + typecheck + lint)`, **return 0** |
| après `81e405f` / `1123660` | **return 1** dès le build, aucune étape ultérieure atteinte |

C'est la seule forme acceptable ici : une expérience qui **change** le verdict entre les deux
versions. Leçon transposable : un contrôle qui franchit une frontière de processus ne teste pas
le comportement interne d'une fonction — la frontière restaure ce qu'on prétendait désarmer.

MINEUR assumé sans correction : la prescription de version `~3.2.7` vs `^3.2.7` sur
`@vitest/coverage-v8`. Le commentaire est plus strict que la contrainte réelle ; le lock est à
3.2.7 et la CI n'y est pas exposée.

## Verdict CI de la PR #538 — ce que le local ne pouvait pas juger

Run `34030803910` sur `b2a5bea` : **7 jobs sur 7 verts**, `e2e` compris
(`backend`, `frontend`, `e2e`, `flyway-smoke`, `security`, `secret-scan`, `ai-env-packs`).

Trois incertitudes explicitement laissées ouvertes plus haut sont **closes par ce run**, et
aucune ne l'aurait été par une mesure locale :

1. **Les comparaisons de captures.** C'était le seul risque réel du reformatage de 119 fichiers,
   et il n'était jugeable que sur Linux avec les références `-chromium-linux` du dépôt. `e2e`
   vert : le réordonnancement des classes Tailwind n'a cassé aucune comparaison visuelle. La
   preuve indirecte du multi-ensemble de classes est confirmée par l'exécution.
2. **Les artefacts de couverture sont réellement produits et non vides** —
   `vitest-coverage-report` **1 208 873 o**, `jacoco-coverage-report` **917 764 o**. Le 3ᵉ critère
   d'acceptation de #169 est constaté, pas déduit. Le `path:` d'`upload-artifact` était donc bien
   relatif à la racine du dépôt : l'erreur classique aurait produit des artefacts VIDES sans
   faire rougir le job — un artefact non vide est ici la seule preuve qui vaille.
3. **Le nouveau gate `format:check` passe en CI** (job `frontend` vert), et **JaCoCo n'a pas
   détaché l'agent ni cassé Testcontainers** (job `backend` vert, 566 tests). C'étaient les deux
   modes d'échec brutaux redoutés.

Note de méthode : `gh pr checks` interrogé juste après le push a répondu « no checks reported on
the branch ». Ce n'est PAS une CI verte — c'est l'absence de checks encore créés, exactement le
faux positif de PIT-S65-004. Le statut a été relu par SHA (`headSha == b2a5bea`) jusqu'à
`completed`, jamais par la présence d'un mot dans une sortie texte.

## Conclusion

Prêt pour la PR. Les trois gates du sprint sont armés et prouvés par des expériences qui
**changent le verdict** (sonde de typecheck, rapports régénérés après suppression), pas par des
runs verts. Le seul contrôle qui manque — la comparaison visuelle — est structurellement hors de
portée de ce poste et relève du job `e2e` de la CI, qui est un check requis de la PR.
