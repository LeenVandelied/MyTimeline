# Issue #461 — Un échec E2E en CI ne laisse aucun artefact exploitable

**Sprint 64, vague 1** · priority:P1 · size:S · `epic:infrastructure`
**Commit :** `7375a69` — `:bug: fix(ci): produit un artefact E2E exploitable en cas d'echec (#461)`
**Diff :** 2 fichiers, +29 / -2

## Ce qui a été livré

| Fichier | Changement |
|---|---|
| `frontend/playwright.config.ts:22` | Reporter **composite** sous CI : `[['github'], ['html', { open: 'never' }]]`. Le reporter `list` en local est **inchangé**. Commentaire expliquant pourquoi `github` seul ne suffit pas (il n'écrit rien sur disque). |
| `.github/workflows/ci.yml:310-329` | `path:` multiligne — `frontend/playwright-report/` **et** `frontend/test-results/` — plus `if-no-files-found: warn`, sans quoi un dossier absent fait rougir le step d'upload et **masque l'échec de test réel**. |

Hors périmètre, non touchés comme demandé : `workers` (21), bloc `projects` (27-70),
bloc `webServer` (72-79).

## Preuve sur échec provoqué (critère d'acceptation dur de l'issue)

Aucune CI ne tourne sur `sprint/64` (`ci.yml:35-39`). La preuve a donc été faite via une **PR draft
jetable** : PR **#466** (`chore/461-artifact-proof` → `dev`), run **33563972215**, SHA `104b209`.
Job `e2e` = `failure` ; `frontend`, `backend`, `security`, `flyway`, `secret-scan`, `ai-env-packs`
= `success`. PR **fermée**, jamais mergée.

Artefact `playwright-report` téléchargé : **8 939 127 octets** compressés, **10 Mo / 33 fichiers**
décompressés.

```
$ find -name index.html
 1112946  artifact461/playwright-report/index.html
    2363  artifact461/playwright-report/trace/index.html

$ find -name '*.zip'
 2638794  playwright-report/data/94df66d2….zip
 1319926  playwright-report/data/0b6f9cf4….zip
 2638794  test-results/timeline--330-Minimap-…-chromium-retry1/trace.zip
 1319926  test-results/zz-461-proof-…-chromium-retry1/trace.zip

$ unzip -l test-results/zz-461-proof-…-retry1/trace.zip
 1 936 984 octets, 56 fichiers : test.trace, 0-trace.trace, 0-trace.network,
 0-trace.stacks, resources/*.jpeg (captures), resources/src@*.txt
```

`test-results/zz-461-proof-*/` contient 3 dossiers (chromium, retry1, retry2), chacun avec un
`error-context.md` de 6 683 octets.

Contenu du rapport après décodage (cf. pitfall ci-dessous) :

```
titre : #461 — echec delibere : prouve le contenu de l'artefact CI
3 tentatives, toutes failed ; tentative 1 attachments = ['error-context', 'trace']
Error: expect(locator).toBeVisible() failed
Locator: getByTestId('does-not-exist-461') / Expected: visible / Timeout: 3000ms
```

Statistiques du run : total 240, expected 230, **unexpected 2**, flaky 0, skipped 8.

## Écart assumé au protocole

Le briefing prescrivait `git checkout -b chore/461-artifact-proof sprint/64` **dans le worktree du
sprint**. Le dev a créé la branche dans un **worktree séparé**, pour ne pas déplacer le `HEAD` de
`sprint/64` — le working tree est partagé entre agents. Résultat identique, risque en moins :
c'est la meilleure forme, et elle est promue en `[MEMORY:pattern]` ci-dessous.

## Vérifications faites par le lead (pas seulement rapportées par le subagent)

- `git log sprint/64` : `7375a69` est bien le seul commit d'implémentation ; `104b209` n'y est pas.
- Contenu réel du reporter et du bloc d'upload relus sur disque.
- `git grep 461-proof -- frontend/` → **aucun résidu**.
- PR #466 : `CLOSED`, `chore/461-artifact-proof` → `dev`, draft.
- `git worktree list` : le worktree jetable a bien été retiré.

## [MEMORY:*] signaux

- **[MEMORY:pitfall]** Un `tsc` sur la config Playwright ne prouve **rien** du reporter :
  `ReporterDescription` accepte `[string, any]`, donc `['html', { open: 'jamais' }]` compile.
  Contrôle négatif joué : `tsc` EXIT=0 sur la valeur invalide. Seul un run CI réel atteste.
- **[MEMORY:pitfall]** Greper `playwright-report/index.html` pour prouver qu'un échec y figure est
  un **faux négatif garanti** : le reporter `html` embarque un zip **base64** dans
  `<template id="playwrightReportBase64">` (441 088 octets décodés → `report.json` + 32 JSON).
  Il faut décoder avant de conclure. Même famille que « coverage vert ne prouve rien ».
- **[MEMORY:pattern]** Prouver un comportement CI sur un dépôt où **aucune CI ne tourne sur la
  branche de sprint** : branche jetable dans un **worktree séparé** + PR draft vers `dev`, jamais
  `checkout -b` dans le worktree partagé.
- **[MEMORY:decision]** `if-no-files-found: warn` sur l'upload : sans lui, un dossier absent fait
  rougir le step et masque l'échec de test réellement à diagnostiquer.

## Recommandations suite

- **RECOMMAND_FOLLOWUP** — supprimer la branche distante `chore/461-artifact-proof` (`104b209`).
  `git push origin --delete` est une opération destructive : **laissée en place volontairement**,
  à reconfirmer avec le dev. PR #466 déjà CLOSED.
- **RECOMMAND_TEST_RUNNER** — **second échec, non lié à ce diff** :
  `timeline.spec.ts :: live-region : contenu réel annoncé (zoom puis event sélectionné)`,
  **3/3 tentatives rouges** sur le run 33563972215.
  Le lead a vérifié : la CI sur `dev` au commit `a5f4636` était **verte** (run `33431893101`,
  2026-08-31), et `sprint/64` n'ajoute que le reporter et de la documentation — rien qui touche la
  timeline. C'est donc un **rouge latent**, pas une régression du sprint. La cause n'est **pas
  diagnostiquée**. Il fera rougir le check requis `e2e` sur la PR de sprint s'il persiste.
  La trace est disponible : `test-results/timeline--330-Minimap-…-retry1/trace.zip` (2 638 794 o),
  artefact du run 33563972215, rétention 7 jours → **expire le 2026-09-08**.
  C'est exactement le service que #461 vient de rendre.

## Non vérifié

- Le rapport HTML n'a **pas** été ouvert dans un navigateur : son contenu est prouvé par décodage
  du bloc base64 seul.
- `npm run test:e2e` n'a pas été joué en local (interdit par le briefing — c'est l'objet de #465).
- Le surcoût en durée du job `e2e` dû au reporter `html` n'a pas été mesuré.

STATUS: COMPLETED
