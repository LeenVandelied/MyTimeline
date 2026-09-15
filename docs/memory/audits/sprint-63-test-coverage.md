# Audit tests — Sprint 63

> Phase 6. Contient deux **corrections de rapports d'agent** : un `next build` annoncé vert sans
> être reproductible (il l'est devenu, mais seulement après réparation de `node_modules`), et
> 4 échecs E2E excusés par un pitfall qui ne s'y applique pas.

## Résultats vérifiés

| Suite | Résultat | Vérifié par |
|---|---|---|
| Backend unit | **462/462**, 0 failed | test-runner |
| Frontend unit | **1004/1004**, 0 failed | test-runner, recoupé par 3 agents d'implémentation |
| `tsc --noEmit` | **0 erreur** | lead, run direct |
| E2E | **226 passed / 4 failed / 8 skipped** | test-runner |
| `next build` | **EXIT=0**, compilé, 52 pages statiques générées | lead, run direct après réparation de `node_modules` |

## `next build` — franchi, après une fausse alerte et une réparation

Séquence, consignée parce qu'elle a coûté du temps et failli produire deux conclusions fausses :

1. Le premier audit rapporte « Next Build: 0 errors | 2 warnings ».
2. Run direct du lead : **EXIT=1**, `Failed to load next.config.mjs`,
   `No prebuild of @parcel/watcher found (darwin-arm64)`. Le build mourait **avant toute
   compilation**, sur un binaire natif absent.
3. Puis la suite unitaire, jusque-là verte, se met elle aussi à échouer — `rollup` natif
   introuvable. **`node_modules` était cassé sur cette machine** (dépendances natives optionnelles
   disparues, mtime 13:25), pas le code : `package.json` et `package-lock.json` sont **intacts**,
   aucune dépendance touchée par le sprint.
4. Réparation par `npm ci` (restaure exactement le lockfile, ce que fait la CI).
5. Re-run : **`next build` EXIT=0**, compilé en 7 s, **52 pages statiques générées**. Suite
   unitaire **1004/1004**.

**Le gate est donc réellement franchi**, mesuré par le lead. Il l'est aussi en CI par construction :
le job `frontend` (check requis, `.github/workflows/ci.yml:79-101`) fait `npm ci` puis
`npm run build` sur `ubuntu-latest` / Node 20.

**Leçon** : les 6 agents d'implémentation avaient refusé `next build` pour une raison légitime
(`.next` partagé, `PIT-S62-009`). Le premier audit l'a annoncé vert sans que ce soit reproductible.
Ce n'est qu'un run direct, après réparation, qui a établi le fait.

## Les 4 échecs E2E — non résolus, et non imputables à macOS

Les 4 échecs sont les tests `event-form` de `frontend/e2e/sprint-63-de-overflow-audit.spec.ts`
(un par locale), tous en `Test timeout of 300000ms exceeded`.

**Le premier audit les a excusés en invoquant `PIT-S52-001`** (« mesures de largeur non concluantes
sur macOS »). **C'est une erreur de catégorie** : `PIT-S52-001` porte sur des écarts de *métrique de
police* entre macOS et Ubuntu. Un test qui expire à 300 s n'a produit **aucune** mesure — il n'a
jamais abouti. Le pitfall ne s'applique pas.

Tentative de rejeu dans l'image `mcr.microsoft.com/playwright:v1.61.1-jammy`, conditions de
l'auteur : **échec de reproduction**, pour deux raisons d'infrastructure et non de spec —
serveur front non démarrable (même cause `@parcel/watcher`) et crash du forwarder `socat`
(`Connection refused`, réseau Docker Desktop macOS). **Les 4 tests n'ont donc jamais pu s'exécuter
ici, ni sur macOS ni en docker.**

État des connaissances, honnêtement :

- L'auteur (#74) rapporte ces 4 tests **verts en jammy**, 48 cellules à 0 débordement, consignées
  dans `docs/memory/audits/sprint-63-debordements-de.md`. Ce relevé n'a pas pu être reproduit.
- La CI **exécutera** cette spec : le job `e2e` (check requis) lance `npm run test:e2e`, qui joue
  tous les projets et toutes les specs, avec `CI=true` → `retries: 2`, `workers: 1`.
- Deux issues possibles en CI : soit les tests passent (macOS était un artefact d'environnement),
  soit ils échouent — **et dans ce cas probablement au setup d'authentification, pas par timeout de
  la spec elle-même**.

**Verdict : INDÉTERMINÉ.** Ni « prêt », ni « bloquant » — la question n'est tranchable que par un
run CI.

## Couverture par issue

| Issue | Ce qui la couvre | Exécuté ? |
|---|---|---|
| #446 | `sprint-62-select-focus-indicator.spec.ts` (les 2 `test.fail()` retirés passent au vert) | ✅ |
| #447 | `control-border-tier.test.ts`, 19 tests + contrôle négatif par assertion | ✅ |
| #442 | `sprint-61-archived-events.spec.ts`, 1 test E2E + contrôle négatif | ✅ |
| #441 | `i18n-namespaces.test.ts` (7) + 2 fichiers `.intl.test.tsx` (9), garde prouvée rouge | ✅ |
| #423 | `landing-header-logo.spec.ts`, plancher relevé à 10, contrôle négatif joué | ✅ |
| #74 | `sprint-63-de-overflow-audit.spec.ts` — frise + réglages ✅ / **`event-form` ⚠ jamais exécuté ici** | ⚠ partiel |

## Couverture E2E des nouveaux testids (Phase 8)

Un seul testid ajouté, **dynamique** : `` `product-detail-unarchive-error-${event.id}` ``
(`ProductDetailView.tsx`). Le check heuristique du skill ne l'apparie pas — il ne cherche que des
littéraux, il était donc **aveugle, pas satisfait**.

Vérifié à la main : le préfixe est cité **et asserté** dans `sprint-61-archived-events.spec.ts:290`
(`toBeVisible()` + assertion sur `data-kind`), dans une spec qui a réellement tourné verte.
Aucun `[MISSING]`.

## Ce qui n'a été vérifié par personne

- **Les 4 tests `event-form`** — voir ci-dessus. CI seulement.
- **La suite E2E complète dans un environnement stable.** Un second run — la suite **COMPLÈTE**
  (projets `setup` + `chromium` + `firefox`), et **non** « le projet Firefox » comme l'écrivait
  d'abord cette ligne : celui-ci est restreint par `testMatch` à une seule spec depuis le Sprint 62
  (cf. le point « Firefox » plus bas, qui le dit déjà), il ne peut pas produire 230 tests — a rendu
  168 passed / **62 failed**, toutes en `NS_ERROR_CONNECTION_REFUSED` / `ECONNREFUSED ::1:3000` :
  le serveur dev local est mort en cours de run. Ces 62 échecs sont un artefact d'infrastructure,
  **pas un signal sur le code** — mais ils signifient qu'aucun run E2E complet et fiable n'existe
  en local.
- **`jammy` ≠ `ubuntu-latest`** : jeux de polices possiblement différents. Toutes les mesures de
  largeur du sprint portent cette limite, y compris celles de #423 et #74.
- **Aucune inspection visuelle** de quoi que ce soit : le sprint a produit des nombres et des
  assertions, pas un jugement esthétique. Trois changements sont pourtant visibles (bouton
  d'inscription resserré sous 360 px, pied de page replié en `de`, popovers désormais peints).
- **Firefox** : 8 tests skippés (le projet est restreint par `testMatch` à une seule spec).
  WebKit hors harnais.
- **Portrait seul** pour l'audit #74 ; 7 des 8 pages portant le footer non mesurées.

## Conclusion

**Pas de `[MISSING]` de couverture.** Le sprint est complet fonctionnellement, avec des gardes
prouvées rouges sur 4 des 6 issues.

**`next build` est franchi** (EXIT=0, mesuré par le lead après réparation de `node_modules`).

**Un gate reste ouvert et n'est franchissable qu'en CI** : les 4 tests `event-form`. Le poste local
n'a pas permis de les exécuter — ni sur macOS (timeout), ni en docker (front non démarrable +
crash du forwarder), et un second run E2E a vu le serveur dev mourir en cours de route.

La PR peut être ouverte — c'est la seule façon de trancher — mais elle **ne doit pas être présentée
comme validée sur l'E2E**, et **ne doit pas être mergée avant CI verte**.

---

## Cycle 2 — la CI a démenti l'audit local, et le sprint est désormais vert

Ce document a été écrit **avant** le premier run CI. Ce qu'il classait `INDÉTERMINÉ` est tranché :

- **Les 4 tests `event-form` avaient un vrai défaut**, pas un artefact macOS. Cause : routage
  responsive par `locator.count()` (qui n'auto-attend pas) contre un `useMediaQuery` rendant
  `false` au premier rendu, plus `.tsqd-parent-container` interceptant le clic. Corrigé en
  `f4082f1`, durées passées de 300 s (timeout) à **~11 s** par test.
- **`timeline.spec.ts:966` était une contamination d'exécution**, confirmée : la spec passe sur
  `f4082f1` **sans avoir été touchée**.

**CI sur `f4082f1` : 7 jobs sur 7 verts.** Job `e2e` : 43 min 50 s / échec → **11 min 11 s /
succès**. Playwright : 225 passed / 2 failed / 3 flaky → **229 passed / 0 failed / 0 flaky**.

Détail complet : `docs/memory/sprints/sprint-63/correctif-ci-e2e-done.md`.

**Leçon de méthode** : l'audit local avait excusé les échecs par `PIT-S52-001`. Invoquer un pitfall
de *métrique de police* pour expliquer un **timeout** est une erreur de catégorie — un test qui
expire n'a produit aucune mesure. Le refus d'accepter ce raisonnement est ce qui a conduit au vrai
diagnostic.
