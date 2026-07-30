# BRIEFING CORRECTIF — 6 specs rouges de #330 (Sprint 54, Phase 6 gate)

> Écrit par le lead le 2026-07-30 après mesure propre. Ancrage : `spawn-ref-fix-330.txt`.
> **Cette gate bloque la PR.** Pas de Phase 7 tant que la suite est rouge.

## ⚠ AVANT TOUT — cwd et HEAD

```
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-52-start-252990 && git rev-parse --abbrev-ref HEAD && git rev-parse --short HEAD && pwd
```

Attendu : branche `claude/sprint-54-start-8ee5a7`, pwd contenant `.claude/worktrees/sprint-52-start-252990`.
**Si tu vois `main`, `dev`, ou un pwd sans `.claude/worktrees/` : ARRÊTE et signale-le.**

## La stack E2E TOURNE DÉJÀ — ne la relance pas, ne la casse pas

Backend `:8080` (PID 43511) et `next dev :3100` (PID 43613) sont **vivants**, base `eventmanager_e2e`.
Vérifie avant de commencer :

```
curl -s -o /dev/null -w "front=%{http_code}\n" --max-time 20 http://localhost:3100/fr/register
curl -s -o /dev/null -w "proxy=%{http_code}\n" --max-time 10 http://localhost:3100/api/auth/me
```

Attendu : `front=200`, `proxy=401`. Si ce n'est pas le cas, relance selon `docs/memory/sprints/sprint-47/e2e-local-runbook.md`.

⚠ **NE LANCE JAMAIS `npm run build` ni `build-storybook`** : ils réécrivent `.next` sous les pieds du `next dev` et le tuent.
⚠ **NE LANCE JAMAIS DEUX RUNS PLAYWRIGHT EN PARALLÈLE.** Le lead l'a fait par erreur et a obtenu deux résultats contradictoires (8 rouges vs 12 rouges) sur le même code. Un seul run à la fois, `--workers=1`, et **en avant-plan** (un job en arrière-plan a été perdu deux fois de suite sur cette machine).

Commande de référence :
```
cd frontend && SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test <cible> --workers=1 --reporter=line
```

## Mesure propre de référence (run unique, sans concurrence)

**6 failed / 120 passed / 8 skipped** sur 134 tests, 4,5 min.

**Aucune régression sur l'existant** : 120 = les 108 de la baseline pré-#330 + 12 des 18 nouveaux tests. Les 6 rouges sont **tous** des specs neuves de #330. Tu ne cherches donc pas une régression, tu répares des specs neuves.

> Note utile : `timeline.spec.ts:838` (`event-outside-label`) **PASSE** au run propre. Il n'échouait que sous concurrence. Ne le touche pas.

## Ta mission — et la question à trancher pour CHACUNE des 6

Pour chaque échec, dis explicitement laquelle des trois causes s'applique :

- **(A) bug de spec** — la spec suppose un comportement ou un précondition faux → corriger la spec.
- **(B) bug produit** — l'élément ou le comportement est réellement cassé/inaccessible → **NE PAS** maquiller la spec ; signaler en `RECOMMAND_FOLLOWUP` (ou corriger le composant SI c'est trivial et sans risque, en le disant).
- **(C) test non déterministe** — vrai flake → stabiliser avec un oracle observable, jamais avec un `waitForTimeout` arbitraire.

**Interdit** : rendre une spec verte en affaiblissant son assertion (remplacer un comportement par une simple présence, supprimer l'assertion qui gêne, ou `test.skip()` sans justification écrite). Tout l'objet de #330 était d'écrire des specs qui testent un **comportement**. Une spec verte qui ne teste rien est un recul, pas une correction — c'est écrit noir sur blanc dans le briefing d'origine (`briefing-330.md`).

Si une spec ne peut pas être sauvée honnêtement, `test.skip()` **avec un commentaire qui nomme la cause et pointe l'issue de suivi** est une réponse acceptable. Le maquillage ne l'est pas.

---

## Les 6 échecs, avec la sortie réelle mesurée par le lead

### 1. `frontend/e2e/timeline-mobile.spec.ts:233` — grabber, swipe-down ne ferme pas le sheet

```
Error: expect(locator).toHaveCount(expected) failed
Locator:  getByTestId('timeline-sheet')
Expected: 0
Received: 1
  14 × locator resolved to 1 element
at timeline-mobile.spec.ts:257
      255 |     await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2 + 120, { steps: 5 })
      256 |     await page.mouse.up()
    > 257 |     await expect(sheet).toHaveCount(0)
```

Échoue **aussi en isolation** (5 autres passent) — ce n'est donc pas un effet d'ordre.
Piste : le sheet se ferme-t-il sur des événements **touch** (`onTouchStart/Move/End`) plutôt que sur des événements **souris** ? `page.mouse.*` ne produit pas de `TouchEvent`. Regarde `TimelineBottomSheet.tsx` pour savoir quels handlers existent réellement, et si besoin utilise `page.touchscreen` / `dispatchEvent`, ou le contexte `hasTouch: true`. **Vérifie dans le composant avant de supposer.**

### 2. `frontend/e2e/timeline.spec.ts:603` — weekend : `timeline-zoom-in` INTROUVABLE

```
Test timeout of 30000ms exceeded.
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('timeline-zoom-in')
at timeline.spec.ts:609
      607 |     await expect(page.getByTestId('timeline-weekend')).toHaveCount(0)
    > 609 |     await page.getByTestId('timeline-zoom-in').click()
```

Le locator n'est **jamais résolu** — l'élément n'est pas dans le DOM du contexte testé. Ce n'est pas une assertion qui échoue, c'est un précondition faux.
`timeline-zoom-in` existe bien dans la source (le lead l'a grepé), donc la question est **où** et **sous quelles conditions** il est rendu (viewport ? variante desktop vs mobile ? toolbar replié ?). Le run utilise le projet `chromium` = `devices['Desktop Chrome']`.

### 3. `frontend/e2e/timeline.spec.ts:656` — plein écran : `timeline-fullscreen` INTROUVABLE

```
Test timeout of 30000ms exceeded.
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('timeline-fullscreen')
at timeline.spec.ts:688
      687 |     await gotoTimeline(page)
    > 688 |     await page.getByTestId('timeline-fullscreen').click()
```

Même nature que le n°2. `timeline-fullscreen` est déclaré dans `TimelineView.tsx` d'après le grep du lead, mais absent du DOM au moment du clic.

> **Les n°2 et n°3 ensemble sont un signal.** Le retour de #330 affirmait au lead que « `timeline-zoom-out`/`-today`/`-weekend` existent AUSSI en desktop dans `TimelineView.tsx` ». Vérifie cette affirmation au lieu de la reprendre : le grep prouve qu'un testid est **écrit** dans un fichier, jamais qu'il est **rendu** dans le contexte que la spec exerce. C'est le même piège que le lead a documenté pour `timeline-loading` (grep limité à `frontend/src/` alors que le fichier est sous `frontend/app/`). Si ces contrôles ne sont rendus qu'en mobile, la spec « Toolbar desktop » est mal conçue et doit changer de contexte — pas être rafistolée.

### 4. `frontend/e2e/timeline.spec.ts:734` — minimap-viewport : `aria-valuenow` reste `"0"` après ArrowRight

```
Error: expect(received).not.toBe(expected)
Expected: not "0"
- Test timeout of 30000ms exceeded
at timeline.spec.ts:751
      749 |     await expect(async () => {
      750 |       expect(await viewport.getAttribute('aria-valuenow')).not.toBe(before)
    > 751 |     }).toPass()
```

Ici l'élément **est** trouvé (`before` valait `"0"`), mais la flèche clavier ne change pas la valeur. Trois hypothèses à départager par la mesure : le focus n'est pas sur le bon élément ; le handler clavier n'existe pas (ou écoute une autre touche) ; ou il n'y a pas d'overflow donc rien à déplacer (rail ≤ viewport). Regarde `Minimap.tsx`.
Si le clavier n'est réellement pas implémenté, c'est un **(B)** — accessibilité clavier manquante sur un `role="slider"` — et ça vaut un follow-up, pas une spec édulcorée.

### 5. `frontend/e2e/timeline.spec.ts:782` — loading : `timeline-loading` INTROUVABLE

```
Error: expect(locator).toBeVisible() failed
Locator: getByTestId('timeline-loading')
Expected: visible
Error: element(s) not found
at timeline.spec.ts:805
      804 |     const loading = page.getByTestId('timeline-loading')
    > 805 |     await expect(loading).toBeVisible()
```

La spec retarde `**/api/auth/me` via `page.route()` pour rendre l'état observable, mais l'état n'apparaît pas. Hypothèses : le `storageState` court-circuite l'appel `/me` (donc pas de phase `loading`) ; ou le pattern de route ne matche pas l'URL réelle (le proxy est `/api/*` sur `:3100`) ; ou le composant rend `timeline-loading` seulement au tout premier montage.
`timeline-loading` est bien dans `frontend/app/[locale]/(app)/timeline/page.tsx:47`. Le commentaire de la spec distingue ce testid de `timeline-data-loading` — cette distinction est probablement juste, garde-la.

### 6. `frontend/e2e/timeline.spec.ts:816` — live-region : clic sur la pastille INTERCEPTÉ

```
Test timeout of 30000ms exceeded.
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - locator resolved to <button ... data-testid="timeline-event" data-event-title="Live Prod ..." ...>
  - attempting click action
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <button type="button" aria-expanded="true" title="Live Prod ..." data-testid="timeline-resource-head"
       class="mt-tlv__lane-label mt-tlv__lane-head">…</button> intercepts pointer events
  - retrying click action  (56 × )
```

**C'est le plus intéressant des six, et potentiellement un vrai défaut produit.** Playwright dit que la pastille est « visible, enabled and stable », mais que `timeline-resource-head` (l'en-tête de ligne, `mt-tlv__lane-label`) **intercepte les événements de pointeur** à cet endroit. Autrement dit : à cette position, un utilisateur réel cliquerait sur l'en-tête de ligne, pas sur l'événement.

Tranche honnêtement entre :
- **(A)** la pastille est hors du viewport horizontal et il faut scroller la frise avant de cliquer (l'en-tête est *sticky* et la recouvre) → bug de spec, corriger en scrollant ou en visant un événement visible ;
- **(B)** l'en-tête sticky recouvre réellement la première colonne d'événements et les rend inatteignables à la souris → **bug d'accessibilité/UX réel**, à signaler.

Deux autres specs de #330 cliquent des pastilles avec succès (`timeline.spec.ts:519/533/545`, drawer) — compare leur préparation avec celle-ci, la différence te dira laquelle des deux hypothèses tient.

---

## Contraintes

- **Branche** : `claude/sprint-54-start-8ee5a7` (déjà checkout, ne change pas).
- **1 commit** (ou 2 si tu sépares « corrections de specs » et « correctif produit »), gitmoji, message **en français**, référençant `(#330)`.
- **`git add` fichier par fichier**, jamais `git add -A`.
- **TypeScript strict**, pas de `any`, pas de `@ts-ignore`.
- **Ne touche pas** `timeline.spec.ts:838` (`event-outside-label`) : il passe au run propre.
- Si tu modifies un composant de `frontend/src/`, dis-le et justifie — le périmètre initial de #330 était « specs uniquement ».

## Vérification finale exigée

Un **seul** run complet, en avant-plan, à la fin :

```
cd frontend && SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test --workers=1 --reporter=line
```

Cible : **0 failed**. Le compte de référence est **134 tests, dont 8 skipped structurels** (ils étaient déjà skipped avant #330 — ne cherche pas à les activer).

Si tu ajoutes des `test.skip()` justifiés, le compte de skipped montera : dis lesquels et pourquoi.

## Livrable attendu (MAX 600 tokens, caveman)

```
RETOUR CORRECTIF #330
commits: [<SHA>]
diagnostic par échec:
  1. grabber (mobile:233)        -> (A|B|C) + cause en 1 ligne + ce que tu as changé
  2. weekend / zoom-in (603)     -> (A|B|C) + ...
  3. fullscreen (656)            -> (A|B|C) + ...
  4. minimap clavier (734)       -> (A|B|C) + ...
  5. loading (782)               -> (A|B|C) + ...
  6. live-region intercepté (816)-> (A|B|C) + ...
affirmation_330_verifiee: "zoom-out/today/weekend existent aussi en desktop" -> VRAI / FAUX + où c'est réellement rendu
run_final: <N passed / M failed / K skipped> sur <T> tests — UN SEUL run, avant-plan
assertions_affaiblies: <aucune, j'espère — sinon lesquelles et pourquoi c'était inévitable>
skips_ajoutes: <aucun / liste + justification + follow-up associé>
composants_modifies: <aucun / lesquels + pourquoi>
bugs_produit_trouves: <liste — c'est la valeur ajoutée de ce correctif>
premisses_infirmees: <du briefing correctif lui-même>
[MEMORY:pitfall|pattern] <si applicable>
RECOMMAND_FOLLOWUP: <desc> [triage] (ou "aucun")
STATUS: COMPLETED
```

Dernière ligne `STATUS: COMPLETED`, ou `STATUS: PARTIAL` + `BLOQUE_SUR:` détaillé.

**Un `PARTIAL` honnête avec 4 specs réparées, 2 bugs produit documentés et un run mesuré vaut mieux qu'un COMPLETED obtenu en affaiblissant les assertions.** La gate existe pour attraper du rouge réel, pas pour être contournée.
