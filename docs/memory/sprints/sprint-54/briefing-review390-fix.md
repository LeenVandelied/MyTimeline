# BRIEFING CORRECTIF — findings review PR #390 (cycle 2)

> Écrit par le lead le 2026-07-30 après consolidation de 3 reviewers (frontend, playwright, sécurité).
> **Chaque finding ci-dessous a été vérifié dans le code par le lead** — pas de relais aveugle.
> Ancrage : `spawn-ref-review390-fix.txt`.

## ⚠ AVANT TOUT — cwd et HEAD

```
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-52-start-252990 && git rev-parse --abbrev-ref HEAD && git rev-parse --short HEAD && pwd
```

Attendu : branche `claude/sprint-54-start-8ee5a7`, pwd contenant `.claude/worktrees/sprint-52-start-252990`.
**Sinon ARRÊTE et retourne `STATUS: PARTIAL` + `BLOQUE_SUR: mauvais worktree`.**

## Stack E2E — À RELANCER (je l'ai arrêtée)

Les ports `:8080` et `:3100` sont **libres**. Relance selon `docs/memory/sprints/sprint-47/e2e-local-runbook.md` :

```
cd backend && SPRING_PROFILES_ACTIVE=dev,e2e DB_URL=jdbc:postgresql://localhost:5432/eventmanager_e2e DB_USERNAME=eventuser DB_PASSWORD=motdepasse_dev_local RATE_LIMIT_ENABLED=false java -jar target/eventmanager-0.0.1-SNAPSHOT.jar --app.cors.allowed-origins=http://localhost:3000,http://localhost:3100
```
```
cd frontend && NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8080 npm run dev -- -p 3100
```

Le jar existe déjà (`backend/target/eventmanager-0.0.1-SNAPSHOT.jar`) et **aucun fichier backend n'a changé** — pas besoin de rebuild. Prête quand `curl .../fr/register` = **200** et `curl .../api/auth/me` = **401**.

### Règles de mesure — non négociables

- ⚠ **JAMAIS deux runs Playwright en parallèle.** Le lead l'a fait et a obtenu 8 rouges puis 12 rouges sur un code identique : deux mesures contradictoires, inutilisables.
- ⚠ **Runs en AVANT-PLAN.** Trois jobs en arrière-plan ont été perdus sur cette machine.
- ⚠ **JAMAIS `npm run build` / `build-storybook`** pendant qu'un `next dev` tourne : ils le tuent (`ENOENT … _buildManifest.js.tmp`).
- `--workers=1` toujours. `SKIP_DELEGATION=1` requis.
- ⚠ **`git diff` renvoie ~vide sous le hook RTK.** Utilise `rtk proxy git diff` ou `gh pr diff`.

Référence à ne pas dégrader : **134 tests → 125 passed / 0 failed / 9 skipped**, CI 4/4 verte.

---

## Findings à corriger — 4 MAJEURS

### A. [MAJEUR] `frontend/e2e/timeline-mobile.spec.ts:202` — oracle « le texte a changé » (non ancré)

```ts
const before = await level.textContent()
await page.getByTestId('timeline-zoom-out').click()
await expect(level).not.toHaveText(before ?? '')
```

**Scénario d'échec** : si `timeline-zoom-out` était recâblé par erreur sur `zoomIn` (Mois → Semaine), le libellé changerait quand même → **test vert sur un bouton qui fait l'inverse de son nom**. L'état de départ n'est jamais établi.

**Le même sprint fait déjà ça correctement au desktop** : `timeline.spec.ts:603` asserte `toHaveText('Trimestre')` avec le rationale écrit juste au-dessus. Aligne le mobile sur le desktop.

**Correction** : asserter l'état de départ (`Mois`) **puis** l'état d'arrivée (`Trimestre`) explicitement.

### B. [MAJEUR] `frontend/e2e/timeline-mobile.spec.ts:254-266` — la branche « swipe court » est vide de sens

**C'est un défaut de MON correctif précédent (`059030d`), assume-le comme tel.** Le commentaire lignes 243-253 affirme « une mesure FRAÎCHE, juste avant CHAQUE swipe » — c'est vrai du **second** swipe (`boxLong`, ligne 268) mais **faux du premier** : `boxShort` (ligne 254) est pris juste après `toBeVisible()`, c'est-à-dire **exactement dans la fenêtre transitoire de ~24 px** que le commentaire décrit.

**Scénario d'échec** : `boxShort` périmé → `mouse.down()` tombe sur `timeline-sheet-overlay` (sous le panneau) → aucun `pointerdown` sur le grabber → **aucun geste n'est joué** → l'assertion `expect(sheet).toBeVisible()` (ligne 266) **passe quand même**. Le test ne distingue pas « le seuil de 80 px a été respecté » de « le geste n'est jamais parti ».

**Correction** : deux choses, pas une.
1. Mesure fraîche pour le swipe court aussi (ou une seule mesure prise après stabilisation vérifiée).
2. **Un oracle POSITIF que le geste a bien eu lieu** : capturer le `transform`/`translateY` du sheet **pendant** le drag (avant `mouse.up()`) et exiger qu'il ait bougé, puis qu'il revienne. Sans ça, la branche « ne ferme pas » restera satisfaisable par l'inaction.
   Accessoirement, `toBeVisible()` passerait aussi pendant une animation de sortie : `toHaveCount(1)` + position finale est plus discriminant.

### C. [MAJEUR] `frontend/e2e/timeline.spec.ts:945-951` — témoin négatif sans garde de présence

```ts
await expect(
  page.locator('[data-testid="timeline-event-outside-label"]').filter({ hasText: highContrastTitle }),
).toHaveCount(0)
```

**Signalé indépendamment par DEUX reviewers** — c'est le finding le plus consensuel du cycle.

**Scénario d'échec** : si la pastille `#1D4ED8` n'était pas rendue du tout (événement absent du fetch, packing de lane, seed silencieusement ignoré), le compte est **0** → **vert**, sans que la variable *couleur* — l'objet même du test — ait été isolée. Le test devient vacuous.

**Correction** : ancrer par une assertion de présence de l'élément **porteur** avant le compte 0 :
```ts
await expect(
  page.locator(`[data-testid="timeline-event"][data-event-title="${highContrastTitle}"]`),
).toHaveCount(1)
```
puis le `toHaveCount(0)` sur le libellé extérieur.

### D. [MAJEUR] `product-option-<id>` : testid livré avec ZÉRO spec

`frontend/src/components/events/NewEventDrawer.tsx:215-218` pose `data-testid={`product-option-${product.id}`}` (livré par #331). **Aucune spec ne l'utilise.** Vérifié par le lead :

```
grep -rn "product-option" frontend/e2e/
  → frontend/e2e/timeline.spec.ts:41   (un COMMENTAIRE, rien d'autre)
```

C'est **exactement la dette que #330 refermait**, ré-introduite dans le même sprint. Pire : le check COVERAGE-E2E du lead (protocole A.4) a répondu **OK à tort** — mon `grep` a apparié le commentaire de la ligne 41 au lieu d'un usage réel. Piège à retenir : **un grep de testid apparie la prose autant que le code.**

Les specs sélectionnent toujours le produit par libellé : `timeline.spec.ts:218`, `:299`, `:987` utilisent `getByRole('option', { name: product.name })`.

**Correction** : faire consommer `product-option-<id>` par au moins une spec (la sélection du produit dans le drawer de création — `seedProduct` retourne l'`id`, tu l'as donc en main). Le header du fichier (lignes 40-44) annonce déjà cette convention : mets le code en accord avec elle.

---

## Findings à corriger — 4 MINEURS retenus

### E. [MINEUR] `frontend/e2e/timeline.spec.ts:671` — sélecteur par `id`, contraire à la politique du fichier

`const pop = page.locator('#timeline-help-pop')`. Le header du fichier (ligne 40) déclare **« Sélecteurs : `data-testid` UNIQUEMENT »**. L'`id` existe légitimement dans `TimelineView.tsx:1014` comme cible d'`aria-describedby` — **ne le supprime pas** ; ajoute un `data-testid` à côté et cible par lui.

### F. [MINEUR] `frontend/e2e/support/register-page.ts:88-97` — 4ᵉ mode de défaillance mal catégorisé

Le message d'échec de rendu affirme « Piste n°1 — 500 du serveur de dev Next ». Mais si `page.goto` **jette** (frontend éteint, mauvais `baseURL`), `lastStatus` reste `null` → le message affiche « statut inconnu » **et pointe quand même vers la piste 500**. Idem pour un **200 avec formulaire cassé** (testid renommé, error boundary).

**C'est la même famille de défaut que #329 corrige** (un message qui accuse la mauvaise cause) — donc à traiter, pas à reporter. Le lead l'a d'ailleurs observé en vrai : un run a produit ce message avec `ERR_CONNECTION_REFUSED` et « statut inconnu ».

**Correction** : brancher la piste sur `lastStatus` — `null` ⇒ serveur injoignable / `baseURL` faux ; `200` ⇒ régression de rendu applicatif (testid, error boundary) ; `5xx` ⇒ serveur de dev.

### G. [MINEUR] `frontend/e2e/timeline.spec.ts:935` — marge de contraste de 1,2 %

`#787878` a un ratio mesuré **4,445** contre un seuil de **4,5** : 1,2 % de marge. Un ajustement d'`INK_DARK` (`src/lib/color.ts`) ferait basculer l'oracle et rougir ce test **pour une raison étrangère** au libellé extérieur. Prends une couleur franchement sous le seuil (~4,0) pour que le test teste ce qu'il annonce.

### H. [MINEUR] `frontend/e2e/timeline.spec.ts` ~803-816 — `ArrowRight` peut être un no-op selon la largeur du rail

`step = ratio / 2` (`Minimap.tsx:83`) est clampé à `1 - ratio` dès que `ratio >= 0.667`. La garde `scrollWidth > clientWidth` (ligne ~803) **n'exclut pas ce cas** : `ArrowRight` devient un no-op et `aria-valuenow` (arrondi entier, `Minimap.tsx:125`) ne bouge pas → **flake selon la largeur du rail**. Renforce la garde (par exemple exiger `ratio < 0.5`) ou choisis un oracle insensible au clamp.

---

## Explicitement HORS périmètre de ce correctif — ne les traite pas

Je les ai arbitrés, ils partent en follow-up :

- **`aria-pressed` sur `timeline-fullscreen`** : l'oracle plein écran ne repose que sur le compteur du stub, aucun état produit observable ne suit la bascule. Corriger demande de **modifier le composant** (exposer `aria-pressed`) → élargissement de périmètre, follow-up.
- **Accumulation de seeds** sur le compte partagé PROD (~8 produits/run, sans nettoyage) : réel, mais c'est un sujet d'infrastructure de suite, pas de cette PR.
- **`settings-preferences.spec.ts:30,37,48,52,62`** : options encore ciblées par libellé traduit ('Sombre', 'Compact', 'English'). **Hors diff** → follow-up #331.
- **`E2ePass123` en clair dans `support/accounts.ts:112`** (dépôt public) : pré-existant, hors diff, neutralisé par la randomisation des identités et l'absence de déploiement. Follow-up.
- **`timeline-mobile.spec.ts:425-428`** (préexistant #328) : attendu dérivé d'une valeur mesurée après. Hors diff.
- **Oracles sur libellés i18n des niveaux de zoom** : **écarté avec raison, ne change rien.** Le texte de `timeline-zoom-level` est le contrat visible par l'utilisateur ; l'asserter est légitime, et c'est précisément ce que le finding A demande de renforcer. Introduire un attribut technique parallèle dupliquerait le contrat.
- **WEEK/YEAR jamais soumis** (persistance de l'enum couverte par MONTH seulement) : acceptable, les trois branches traversent le même code de soumission.

---

## Contraintes

- **Branche** : `claude/sprint-54-start-8ee5a7` (déjà checkout, ne change pas).
- **1 à 2 commits** (par exemple « oracles » et « message de diagnostic »), gitmoji, messages **en français**, référençant les issues concernées (`#330` pour les specs de la frise, `#329` pour `register-page.ts`, `#331` pour `product-option`).
- **`git add` fichier par fichier**, jamais `git add -A`.
- **TypeScript strict** : aucun `any`, aucun `@ts-ignore`.
- **Correction minimale, pas de refacto.** Tu renforces des oracles, tu ne réécris pas les specs.
- Si tu dois toucher un composant `frontend/src/` (cas E : ajout d'un `data-testid`), c'est autorisé et attendu — **dis-le dans ton retour**.

### Interdit

Ne rends pas un test vert en **affaiblissant** son assertion. Tous les findings ci-dessus disent l'inverse : ils demandent des oracles **plus** discriminants. Un test qui passe alors que la fonctionnalité est cassée est le défaut qu'on corrige ici — n'en crée pas de nouveaux.

## Vérification finale exigée

Un **seul** run complet, en avant-plan, à la fin :

```
cd frontend && SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test --workers=1 --reporter=line
```

Cible : **0 failed**, et le compte de passed **ne doit pas baisser** sous 125 (hors skips justifiés que tu documenterais).

Vérifie aussi la couverture réelle de `product-option`, **en excluant les commentaires** (c'est le piège qui m'a eu) :
```
grep -rn "product-option" frontend/e2e/ | grep -E "getByTestId|locator\("
```
Cette commande doit retourner **au moins une ligne**.

## Livrable attendu (MAX 700 tokens, caveman)

```
RETOUR CORRECTIF REVIEW #390
commits: [<SHA>, ...]
findings:
  A. oracle zoom-out mobile non ancré      -> CORRIGÉ (comment) / NON + raison
  B. swipe court vacuously vert            -> CORRIGÉ (comment) / NON + raison
  C. témoin négatif sans garde présence    -> CORRIGÉ (comment) / NON + raison
  D. product-option sans spec              -> CORRIGÉ (où consommé) / NON + raison
  E. sélecteur #id help-pop                -> CORRIGÉ / NON + raison
  F. 4e mode de défaillance mal catégorisé -> CORRIGÉ / NON + raison
  G. marge contraste 1,2%                  -> CORRIGÉ (nouvelle couleur + ratio) / NON
  H. ArrowRight no-op selon largeur rail   -> CORRIGÉ / NON + raison
preuve_product_option: <sortie du grep excluant les commentaires>
run_final: <N passed / M failed / K skipped> sur <T> — UN SEUL run, avant-plan
composants_modifies: <aucun / lesquels + pourquoi>
assertions_affaiblies: <aucune, j'espère>
premisses_infirmees: <tout finding de ce briefing que le code dément — dis-le, je les ai vérifiés mais je peux me tromper>
[MEMORY:pitfall|pattern] <si applicable>
RECOMMAND_FOLLOWUP: <ou "aucun">
STATUS: COMPLETED
```

Dernière ligne `STATUS: COMPLETED`, ou `STATUS: PARTIAL` + `BLOQUE_SUR:` détaillé.

**Un `PARTIAL` honnête avec 6 findings corrigés et 2 blocages nommés vaut mieux qu'un `COMPLETED` obtenu en édulcorant.** Et si un finding est faux — je les ai vérifiés un par un dans le code, mais je peux me tromper — dis-le avec la preuve plutôt que de « corriger » quelque chose qui n'est pas cassé.
