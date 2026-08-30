# Audit tests — Sprint 62

> Généré en fin de Phase 6, sur l'état **commité** (`3e2f90c`). Tous les compteurs ci-dessous ont été
> lus sur des **exit codes réels**, et les suites E2E ont été rejouées **indépendamment** des
> développeurs qui les avaient annoncées.

## Périmètre

Sprint **100 % frontend**. Zéro backend, zéro migration, **zéro BR métier impactée** — les trois
issues portent sur l'accessibilité du design system et de l'app router. Le tableau « couverture par
BR » du gabarit habituel est donc sans objet ici ; il est remplacé par une couverture par défaut
traité.

## Couverture par défaut traité

| Défaut | Cross-system | Unitaire | E2E | Vérif. navigateur | Statut |
|---|:---:|:---:|:---:|:---:|---|
| #415 — focus radio/switch à 1,23:1 | NON | ✅ `control-border-tier.test.ts` | ✅ `sprint-62-control-focus-contrast.spec.ts` (10) | ✅ pixel, clair+sombre | **couvert** |
| #413 — `lang` non localisé | NON | ✅ `global-error.test.tsx`, `global-not-found.test.tsx` | ✅ `document-lang.spec.ts` (13) | ✅ HTML SSR `curl`, 4 locales | **couvert** |
| #413 — 404 sans document | NON | ✅ | ✅ `document-lang.spec.ts` | ✅ 4 environnements | **couvert** |
| #413 — `<title>` perdu | NON | ✅ 2 tests `metadata` | ✅ assertion sur contenu, prouvée non vacuous | ✅ `curl` | **couvert** |
| #414 — focus Select sous Firefox | NON | ⚠ N/A (jsdom ne peint pas) | ✅ `sprint-62-select-focus-indicator.spec.ts` (8, ×2 moteurs) | ✅ pixel, Firefox 153 + Chromium | **INFIRMÉ, couvert par garde-fou** |
| Défaut z-index `NewEventDrawer` | NON | ⚠ N/A | ✅ 2 `test.fail()` exécutables | ⚠ pixel non mesurable (c'est le défaut) | **non corrigé, marqué** |

Aucun `[MISSING]`.

## Résultats des runs (exit codes lus)

| Suite | Résultat | Exit |
|---|---|:---:|
| vitest (frontend) | **950 passed / 97 fichiers** | 0 |
| `tsc --noEmit` | 0 erreur | 0 |
| `eslint` | 0 erreur | 0 |
| `next build` | **`✓ Generating static pages (52/52)`**, `✓ globalNotFound`, `○ /_not-found` statique | 0 |
| E2E chromium (complète) | **200 passed / 0 failed / 8 skipped** (6,0 min) | 0 |
| E2E firefox (projet restreint) | **13 passed / 0 failed** (1,7 min) | 0 |

### Les 8 skips chromium — décompte réel

La description initiale (« conditionnels `auth-guard` / `auth-signature` ») était **inexacte**.
`auth-guard.spec.ts` ne skippe **aucun** test — ses 13 passent. Décompte vérifié : **7 + 1**.

- `auth-signature.spec.ts` ×7 (l.135/157/177/206/226/247/293) —
  `test.skip(!SIGNATURE_VERIFICATION_CONFIGURED)`, `AUTH_JWT_PUBLIC_KEY` absente en local
- `settings-profile.spec.ts:36` — un **`test.fixme`** (upload avatar), 401 multipart sur le proxy
  Next, **sans rapport avec RS256**

### Les 2 `test.fail()` ne sont pas des rouges

`sprint-62-select-focus-indicator.spec.ts` (~l.487) porte deux `test.fail()` marquant le défaut de
z-index non corrigé. Ils échouent comme prévu ; le reporter `list` les affiche `✘`, mais ils sont
comptés dans **`passed`**, jamais dans `failed` ni `skipped`, et l'exit reste 0.
Donc **chromium 200 = 198 vrais verts + 2 échecs attendus** ; **firefox 13 = 11 + 2**.

## Coverage E2E (Phase 8) — OK, après levée d'un faux positif

Le check heuristique signale 3 `data-testid` ajoutés, dont 2 non cités dans `frontend/e2e/` :
`global-error-retry` et `global-error-home-link`.

**Faux positif de renommage, vérifié** : ces deux testids existent **à l'identique sur `origin/dev`**
dans `frontend/app/error.tsx`, et n'y étaient **pas non plus** cités en E2E. Ils n'apparaissent comme
« ajoutés » que parce que le fichier a été renommé `error.tsx` → `global-error.tsx`. Ils portent
**5 assertions unitaires** dans `global-not-found.test.tsx` / `global-error.test.tsx`.
Le troisième, `global-not-found-home-link`, **est** couvert en E2E.

Aucun plan `/create-e2e` requis.

> Rappel de méthode : ce check vérifie qu'un testid est **cité**, pas qu'une spec **passe**. Il ne
> vaut donc rien seul — c'est pourquoi chaque spec ajoutée ce sprint a été **exécutée**, et deux
> d'entre elles **prouvées non vacuous** contre le build antérieur (#413 `<title>` : 4 échecs / 4 ;
> correctif 404 : 5 échecs / 5).

## Tests créés pendant le sprint

- `frontend/e2e/support/pixel.ts` — sonde de lecture de pixel (`PAT-S58-002`), **outillage neuf**,
  jamais implémenté auparavant dans le dépôt
- `frontend/e2e/sprint-62-control-focus-contrast.spec.ts` (#415)
- `frontend/e2e/sprint-62-select-focus-indicator.spec.ts` (#414, dont 2 `test.fail()`)
- `frontend/e2e/document-lang.spec.ts` (#413, + assertions 404 et `<title>`)
- `frontend/app/global-not-found.test.tsx`, `frontend/app/global-error.test.tsx`

## Incident d'audit à consigner

Un premier passage d'audit a conclu **« BLOQUANT — register POST n'atteint pas le backend »** et
recommandé de ne pas merger. **Diagnostic faux, et de la famille exacte que la mémoire projet met en
garde** (`e2e-cors-origin-proxy-trap` : un échec de proxy se déguise en rate-limit).

Statuts bruts qui tranchent : `:3000/api/auth/me` → **404** (proxy absent),
`:8086/api/auth/me` → **401** (backend sain). Cause : `playwright.config.ts:11` fait
`baseURL = PLAYWRIGHT_BASE_URL ?? localhost:3000` et, sans cette variable, démarre son propre
`webServer` (`npm run dev`) **sans** `E2E_API_PROXY_TARGET` — le rewrite `/api/*` n'existe pas, le
`POST /api/auth/register` du projet `setup` tombe en 404, les 4 comptes échouent et les 203 tests ne
démarrent jamais.

**Recette correcte** : `next dev` détaché sur :3100 avec `NEXT_PUBLIC_API_URL=/api` et
`E2E_API_PROXY_TARGET=http://localhost:8086`, **oracle `401` vérifié**, puis
`PLAYWRIGHT_BASE_URL=http://localhost:3100`, `--workers=1`, préfixe `SKIP_DELEGATION=1`.

## Non vérifié (assumé)

- **WebKit** — hors périmètre par décision dev (#414)
- **Firefox 151** — le verdict de #414 porte sur **153.0** (build Playwright), non épinglable ici.
  Une divergence d'heuristique entre les deux n'est pas exclue. **C'est la réserve la plus sérieuse
  du sprint.**
- Les **7 skips `auth-signature`** : la *condition* de skip est confirmée, pas que ces tests passent
- Le **`fixme` avatar** reste non exercé (401 multipart connu)
- **HiDPI** : l'assertion `decoded ≈ clip × dpr` de la sonde n'est éprouvée qu'à `dpr = 1`
  (`devices['Desktop Chrome']` fixe `deviceScaleFactor: 1`)
- Les fixtures prouvant les nouvelles gardes de `pixel.ts` sont **synthétiques** : elles prouvent que
  la garde lève, pas qu'un composant réel du dépôt était affecté
- **Suite backend non rejouée** — aucun fichier backend touché par le sprint
- `forced-colors: active` non testé

## Conclusion

**Prêt pour PR.** Aucun `[MISSING]`, toutes les suites vertes sur l'état commité, `next build` à
52/52, et les 3 MAJEUR de la review batch corrigés avec preuve de déclenchement des gardes.
