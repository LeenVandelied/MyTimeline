# Audit tests — Sprint 53

> Généré en fin de Phase 6. Un marqueur de couverture manquante bloquerait la Phase 9 (PR).

## Nature du sprint

Sprint **100 % CSS + tests**. Aucun fichier `.tsx`, `.ts` applicatif, `.java` ni `.sql` modifié —
seulement 4 feuilles de style et 1 fichier de test. **Aucune BR métier n'est touchée.**

Fichiers modifiés :
- `frontend/src/styles/ds/tokens/base.css`
- `frontend/src/styles/ds/components/core.css`
- `frontend/src/styles/landing.css`
- `frontend/src/styles/globals.css`
- `frontend/src/styles/__tests__/base-layer.test.ts`

## Couverture par comportement livré

Il n'y a pas de BR-XX applicable. La grille porte donc sur les **invariants de cascade**, qui sont l'objet
réel du sprint.

| Invariant livré | Cross-system flow | Test AST (PostCSS réel) | Validé par mutation | Vérif navigateur | E2E métier |
|---|:---:|:---:|:---:|:---:|:---:|
| `h1..h6` dans `@layer base` (#339) | NON | ✅ | ✅ | ✅ clair + sombre | ⚠ N/A |
| `--leading-*` exposées avec la valeur DS 1.08 (#339) | NON | ✅ | ✅ | ✅ mesuré 38,88px/36px | ⚠ N/A |
| `.mt-avatar` dans `@layer components` (#340) | NON | ✅ | ✅ | ❌ **surface authentifiée** | ⚠ N/A |
| `.timeline-preview` dans `@layer components` (#340) | NON | ✅ | ✅ | ✅ mesuré 14px | ⚠ N/A |
| Reset scrollbar `*` dans `@layer base` (#340) | NON | ✅ | ✅ | ❌ **Firefox non lancé** | ⚠ N/A |

`Cross-system flow = NON` partout : aucun flux à 2+ systèmes ou rôles. **Aucun E2E métier n'est donc
requis** (règle : E2E métier obligatoire seulement si cross-system flow = OUI).

Les deux `❌` ne sont pas des trous de **test** mais des trous de **vérification visuelle** — ils sont
tracés comme réserves explicites, cf. § « Réserves » et `browser-verification.md`.

## Tests créés / étendus

`frontend/src/styles/__tests__/base-layer.test.ts` — **5 → 11 tests** (+314 lignes cumulées).

Ce que ces tests font, et qui est inhabituel : ils **compilent la vraie chaîne CSS**
(`globals.css` + `@import 'tailwindcss'`) via PostCSS et le plugin Tailwind 4, puis assertent **sur l'AST
de sortie** l'appartenance des règles à leur `@layer` et la valeur gagnante des custom properties
(helper `winningRootVar`).

Trois garde-fous méthodologiques, tous vérifiés par le reviewer :
1. **Fixtures témoins anti-vacuité** — chaque assertion a sa fixture régressée qui doit être détectée.
2. **`from` unique par fixture** (`REGRESSION` / `HEADING` / `AVATAR` / `SCROLLBAR` / `PREVIEW` /
   `DOCUMENT_FIXTURE`) — le plugin Tailwind **mémoïse par chemin d'entrée** ; un `from` partagé ferait
   compiler le CSS réel et le test **passerait à vide**.
3. **Regex de discrimination** (`--font-display`, `--radius-md`, `scrollbar-width:thin`) — Tailwind émet
   son preflight sous les **mêmes sélecteurs** ; sans discriminant, le test assert sur le reset Tailwind
   et ne prouve rien.

**Validation par mutation** (dé-layeriser la règle de production, exiger le rouge) :
`core.css` → 1 failed/10 · `landing.css` → 1 failed/10 · `base.css` → 1 failed/10 · référence → 11 passed.
**Chaque mutation ne fait tomber que son propre test.**

## Résultats des runs (mesurés par le lead depuis le worktree)

| Suite | Commande | Résultat |
|---|---|---|
| Frontend | `./scripts/test-quiet.sh frontend` | **92 fichiers, 834 passed / 0 failed**, 12,87 s |
| `base-layer.test.ts` seul | `npx vitest run src/styles/__tests__/base-layer.test.ts` | **11 passed / 0 failed** |
| Backend | `./scripts/test-quiet.sh backend` | cf. § ci-dessous |
| E2E Playwright | — | **non lancés** (backend + Postgres absents en local ; l'autorité est la CI) |
| `tsc --noEmit` / `eslint` / `prettier` | — | 0 erreur / 0 / OK |

> **⚠ Un rapport `test-runner` a été écarté après contre-mesure.** Il annonçait
> `814/821 + 1 suite en échec (Cannot find package 'eslint-plugin-storybook')` et
> `base-layer.test.ts : 2 tests`. **Les trois chiffres sont faux** : le paquet est déclaré *et* installé
> dans le worktree, la suite complète y donne **834/834**, et le fichier contient **11** tests. Cause :
> le subagent a exécuté depuis le **dépôt principal** au lieu du worktree — piège connu de ce projet.
> **Ne jamais reprendre un chiffre de test d'un subagent sans vérifier son `cwd`.**

## Revue

`reviewer` sur le diff complet `2966994..HEAD` : **0 CRITIQUE / 0 MAJEUR / 1 MINEUR / 2 NON VÉRIFIÉ**.
Le MINEUR est une dette assumée et documentée (aucun garde-fou automatisé n'attrapera une *future* classe
`.mt-*` mise en concurrence avec une utilitaire). Les 2 `NON VÉRIFIÉ` recoupent exactement les réserves
ci-dessous.

## Couverture E2E (heuristique Phase 8)

`[COVERAGE-E2E] OK` — **aucun `data-testid` ajouté** (aucun `.tsx` modifié). Rien à couvrir.

## Réserves (ne pas les perdre au merge)

1. **Surfaces authentifiées jamais ouvertes** — dashboard, settings, products, timeline. C'est là que
   `ui-design` situait le **risque le plus élevé** : bascule police display → **mono** sur 5 titres du
   dashboard, `mb-2` de `ProductDetailView:211,225`, graisses 600→500 de `settings/`, avatar
   7px → 5px dans `AppShell`. Backend + Postgres absents en local.
2. **Firefox / WebKit non lancés** — or le correctif scrollbar de #340 vise *précisément* Firefox. Il est
   **déduit de la cascade, pas observé**.
3. **Paliers responsive** (320 / 768 / 1024 px) non balayés.
4. Détection de conflit **syntaxique** : un conflit via variable CSS intermédiaire, `style={{}}` inline ou
   classe concaténée dynamiquement échapperait au balayage de l'audit #340.

## Conclusion

**Prêt pour PR.** Aucune couverture manquante : la suite est verte, chaque invariant livré est couvert par un test
AST validé par mutation, et la vérification navigateur clair + sombre est faite sur la landing avec
comparaison avant/après contre `origin/dev`.

Les réserves 1 et 2 sont des **trous de vérification visuelle sur surfaces non atteignables en local**,
pas des trous de test. Elles doivent figurer dans le corps de la PR et être levées au prochain accès à un
environnement authentifié.
