# Audit tests — Sprint 58

> Généré en fin de Phase 6, complété après le correctif de clôture.
> Base : `origin/dev` = `f13c4fa`. Branche : `claude/sprint-58-start-26b185`. 17 commits.

## Nature du sprint — pourquoi le tableau BR est vide

Sprint **frontend / design system exclusivement** : 0 fichier backend, 0 migration Flyway,
0 endpoint, 0 DTO, 0 schéma Zod. **Aucune règle métier n'est touchée** — les 4 issues portent sur
la cascade CSS, l'indicateur de focus, les tiers de bordure et l'i18n d'un libellé accessible.

Le tableau de couverture par BR du gabarit est donc **sans objet**, et le remplir de `N/A` sur
toute la ligne n'apprendrait rien. Ce qu'il faut vérifier ici est d'une autre nature : **le rendu
réel dans un navigateur**, sur plusieurs moteurs et les deux thèmes.

| BR | Description | Cross-system flow | Couverture |
|----|-------------|:---:|---|
| — | Aucune BR impactée par ce sprint | NON | sans objet |

⚠ **Point de méthode, valable pour tout sprint de rendu sur ce dépôt.** `jsdom` ne résout **ni la
précédence des `@layer` CSS ni aucune mise en page** — c'est-à-dire précisément le mécanisme que
#383 corrige. Aucun test unitaire ne peut prouver ces correctifs. Un vert de `vitest` ici atteste
la non-régression de structure et de nom de token, **rien de plus**. La preuve est navigateur, et
elle est consignée ci-dessous.

## Couverture par issue

| Issue | Objet | Unit frontend | E2E | Vérification navigateur (la preuve réelle) |
|---|---|:---:|:---:|---|
| **#383** | `:focus-visible` layerisé, 32 sites nettoyés | ✅ garde-fou de layer (nouveau) | ✅ assertion ajoutée | ✅ **356 arrêts clavier comparés avant/après**, Chromium 149 / Firefox 151 / WebKit 26.5, clair + sombre, écrans derrière authentification inclus → 0 différence, 0 arrêt sans contour |
| **#353** | Cible tactile 44×44 + i18n du libellé | ✅ `language-selector.i18n.test.ts` (10) | ✅ `landing-mobile-menu` 21/21 | ✅ bounding box **mesurée par dichotomie** sur `elementFromPoint` = 44,49 × 44,49 sur 6 contextes ; `scrollWidth == clientWidth` à 320 / 375 / 390 |
| **#352** | 7 filets migrés au tier fonctionnel + checkbox | ✅ `control-border-tier.test.ts` | ⚠ N/A (aucun `data-testid` touché) | ✅ **ratios lus au pixel** sur le dashboard réel, clair + sombre, y compris les 3 filets sur `surface-2` que l'arbitrage déclarait non vérifiés |
| **#375** | Mesure multi-moteurs du contour | ⚠ N/A (mesure seule) | ⚠ N/A | ✅ 6 combinaisons moteur × thème, ratios au pixel, contrôle souris (`fv=false`) |

## Tests créés

- `frontend/src/components/ui/language-selector.i18n.test.ts` — 10 tests (#353) : clé présente
  dans les 4 locales, valeurs distinctes du français, aucune chaîne en dur, ordre verrouillé.
- `frontend/src/styles/__tests__/base-layer.test.ts` — **2 tests ajoutés** (correctif de clôture,
  MAJEUR 3 de la revue) : `:focus-visible` est déclaré dans `@layer base`, `.outline-hidden` est
  dans `utilities`, et `base` précède `utilities`. Témoin qui rougit si la règle repasse hors layer.
- `frontend/e2e/landing-mobile-menu.spec.ts` — assertion `outlineStyle !== 'none'` sur l'item de
  menu focalisé au clavier (#383).

### Ce que le nouveau garde-fou n'attrape PAS — dit explicitement

Il fait du **parsing CSS source**, pas du rendu. Il verrouille la layerisation acquise par #383.
Il **ne détecte pas** la réintroduction d'un `ring-2` dans un `.tsx` : aucun composant n'est lu.
Un `grep` sur les `.tsx` a été écarté comme fragile (`cn` / `cva` / classes injectées par Radix).
Cette limite est écrite dans le fichier de test **et** dans `ds/a11y-audit.md`, pour que la
garantie annoncée corresponde à la garantie réelle — c'est précisément le défaut que la revue
avait relevé (une doc citait un garde-fou inexistant).

## Résultats des runs

| Suite | Résultat |
|---|---|
| Backend (JUnit) | **462 / 462** — aucun fichier backend touché |
| Frontend (Vitest) | **887 / 887** (94 fichiers) |
| E2E (Playwright) | **136 passed / 0 failed / 8 skipped** (144) |
| `tsc --noEmit` | 0 erreur source |
| `next build` | exit 0 |

## ⚠ Les 5 échecs E2E de la Phase 6 — résolus, et voici comment

L'audit de Phase 6 rapportait **131 passed / 4 failed / 1 timedOut / 8 skipped**, dont 3 échecs
concentrés sur `timeline.spec.ts` — le fichier dont #352 a le plus modifié le CSS. L'hypothèse
d'une régression du sprint était sérieuse, et l'un des tests portait littéralement sur un label
« qui dépend du CONTRASTE ».

**Ligne de base prise avant tout correctif** (code du sprint restauré à `f13c4fa`) :
**les 5 tests sont VERTS sur la base — et VERTS sur `HEAD` aussi**, suite complète
136 / 0 / 8 dans les deux cas. Rejoués en isolation : 4/4 `timeline` en 5,9 s, 3/3
`settings-security` en 5,0 s.

**Verdict : ni régression du sprint, ni défaut pré-existant.** Les échecs ne reproduisent pas.
L'hypothèse #352 / `timeline.css` est **infirmée** : le test de contraste dépend de
`eventLabelReadableInside(event.color)`, une fonction TypeScript, pas du CSS.
**Aucun correctif E2E n'a été écrit, aucune spec n'a été touchée.**

Cause la plus probable, **constatée mais non démontrée** — et c'est dit tel quel : une erreur de
configuration de l'environnement de l'audit. Le correctif a documenté le piège correspondant :
`NEXT_PUBLIC_API_URL=/api` et `E2E_API_PROXY_TARGET` doivent être posés **au `next build`** (les
rewrites sont sérialisés dans `routes-manifest.json`), pas au `next start`. Sans le premier,
`apiClient` perd son préfixe `/api` et produit des 404 invisibles pour le watcher d'`auth.setup.ts`,
qui accuse alors le rate-limit, le CORS ou un 409. Oracle fiable : `curl /api/auth/me` → **401**.

## Ce qui N'A PAS été vérifié — à lire avant de conclure que le sprint est étanche

- **Safari natif.** Playwright pilote WebKit, qui n'est pas Safari. Le critère d'acceptation de
  #375 demandait Safari : il est **partiellement tenu**, et l'issue le consigne ainsi. Ne pas
  répéter l'erreur du S52 (annoncer une conformité sur un seul moteur) en la remplaçant par
  « trois moteurs headless donc tous les navigateurs ».
- **`forced-colors: active`** (contraste forcé Windows) : le CSS émis a été lu, rien n'a été rendu
  dans ce mode.
- **Viewports mobiles** pour une partie des sites de #383 (réglages mobile notamment), et
  8 des 9 sites de montage du sélecteur de langue.
- **`dpr ≠ 1`** : Chromium rapporte déjà des bordures mélangées à `dpr=1`.
- **Le défaut `Select` sous Firefox** (options n'obtenant jamais `:focus-visible`) reste **ouvert** :
  non reproduit sur le composant isolé, non infirmé dans ses montages réels.

## Conclusion

**Prêt pour PR.** Aucun `[MISSING]`. Les trois suites sont vertes, le build passe, la couverture
navigateur est documentée moteur par moteur, et les limites de cette couverture sont écrites
plutôt que passées sous silence.

Quatre follow-ups sont proposés au triage de clôture (glyphe de coche sur pastille sélectionnée,
rognage pré-existant de `.mt-zoom`, `Select` sous Firefox, report de la recette E2E dans le
runbook), plus ceux remontés en cours de sprint.
