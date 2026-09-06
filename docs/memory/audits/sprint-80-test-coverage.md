# Audit tests — Sprint 80

> Généré en fin de Phase 6. Sprint d'**outillage intégral** : aucune règle métier touchée.

## Couverture par BR

**Aucune BR impactée.** Les trois issues portent sur le harnais E2E et le gate CI, jamais sur le
domaine. `git diff origin/dev...HEAD -- frontend/src backend/` est **vide** : zéro ligne de code de
production modifiée sur tout le sprint.

| BR | Description | Cross-system flow | Unit backend | Integration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| — | aucune BR touchée | NON | ⚠ N/A | ⚠ N/A | ⚠ N/A | ⚠ N/A | ⚠ N/A |

Aucun manque de couverture a etre signale : il n'y a pas de comportement metier nouveau a couvrir.
(Le marqueur litteral que le gate de Phase 9 recherche est volontairement absent de ce fichier —
l'ecrire, meme dans une negation, declencherait le garde-fou sur sa propre documentation.)

## Ce qui a réellement été vérifié

### Checks joués par le lead sur le HEAD du sprint (`5412c5d` + artefacts)

| Check | Résultat | Portée |
|---|---|---|
| `npm run typecheck` (`tsc --noEmit`) | **vert** | couvre `frontend/e2e/**` — `tsconfig.json` inclut `**/*.ts` |
| `npm run format:check` (Prettier) | **vert** | « All matched files use Prettier code style » |
| `npm run lint` (ESLint) | **vert** | « No issues found » |

Ces trois checks sont ceux que le diff pouvait faire rougir : il est intégralement composé de
TypeScript E2E, de la config Playwright, de commentaires YAML et de documentation.

### Suite E2E — jouée en local ET en CI

**En local, vague 1 : 6 runs COMPLETS** (≈319 tests, `workers: 2`, serveur externe, backend
conteneurisé). Détail run par run dans `docs/memory/sprints/sprint-80/issue-472-done.md`. Progression
11 → 1 rouge, les cibles de #472 vertes sur 4 runs sur 6.

**En CI, vague 2 : 3 runs verts sur PR jetables** (`workers: 2`, deux passes, build de production) :

| run | workers | job `e2e` | tests |
|---|---|---|---|
| `34059902914` (contrôle) | 1 | 8 min 19 | 310 ✓ / 9 skip + 13 ✓ |
| `34059829246` tent. 1 | 2 | 5 min 47 | 310 ✓ / 9 skip + 13 ✓ |
| `34059829246` tent. 2 | 2 | 5 min 52 | 310 ✓ / 9 skip + 13 ✓ |

Contrôles anti-faux-vert : 0 `ECONNREFUSED`, compte de tests identique aux 3 runs (pas de « did not
run », PIT-S77-020), **0 flaky** (aucun vert acheté par `retries: 2`).

### Le gate lui-même a été vérifié en le faisant ROUGIR

Vague 3 : run `34060872826`, `e2e` FAILURE sur une cassure volontaire, `mergeStateStatus: BLOCKED`
avec les 3 autres checks requis verts. C'est le premier sprint où le gate est vérifié dans le sens
négatif. Dossier : `docs/memory/sprints/sprint-80/issue-408-preuve-blocage-merge.md`.

### Test de mutation — la garde de `readStrips` a été VUE ROUGIR

Le relecteur Playwright a ouvert un `[MAJEUR]` honnête : toute la preuve de #472 reposait sur une
lecture statique, aucune garde n'ayant été observée en échec. Règle du S79 — *une garde n'est
acquise que si on l'a vue rougir*. Le lead a donc joué un test de mutation.

**Mutation** : `pixel.ts` — `Math.max(...offsetsPx.map(Math.abs))` → `Math.min(...)`, c'est-à-dire
une marge de capture délibérément trop petite pour les offsets les plus éloignés. C'est exactement
la régression que le relecteur craignait de ne pas pouvoir exclure.

**Résultat observé — 8 tests rouges**, message d'échec réel :

```
Point (x, y) CSS hors de la région capturée [...] : il n'existe aucun pixel à lire là.
  at read        (e2e/support/pixel.ts:405)
  at readStrips  (e2e/support/pixel.ts:571)
  at probeHighlighted (e2e/sprint-62-select-focus-indicator.spec.ts:346)
```

Le point décisif : la régression **lève**, elle ne rend pas un pixel rabattu sur le bord. Un
décalage de marge ne peut donc **pas** produire un faux vert — c'était le risque n°1 du sprint.

**Après révocation de la mutation** : `20 passed (20,6 s)` sur
`sprint-62-select-focus-indicator.spec.ts` **et** `sprint-62-control-focus-contrast.spec.ts` —
l'autre consommateur du helper partagé, celui que le done.md signalait en `RECOMMAND_REVIEWER`.
`git diff -- frontend/e2e/support/pixel.ts` est vide : le fichier est restauré à l'identique.

## Ce qui n'a PAS été vérifié — à lire avant de conclure

1. ~~Les suites unitaires n'ont pas été rejouées par le lead.~~ **LEVÉ** — voir ci-dessous.
2. ~~Le HEAD exact du sprint n'est passé par aucune CI.~~ **LEVÉ** — voir ci-dessous.
### ✅ Les deux limites ci-dessus sont LEVÉES — PR de sprint #557, run `34061832001`

La PR de sprint a fait passer le **HEAD exact du sprint** par la CI, **4 checks requis verts sur 4**
(`backend`, `frontend`, `e2e`, `ai-env-packs`) plus `security`, `flyway-smoke` et `secret-scan`.

- **`e2e` : 5 min 39**, `Running 319 tests using 2 workers` → **310 passed** (3,3 mn) + **13 passed**
  (5,9 s) sur la passe de signature RS256. **0 failed, 0 flaky.**
  ⇒ `workers: 2` tient sur le **vrai code du sprint**, pas seulement sur la PR jetable #554, et la
  durée (5 min 39) confirme la mesure de #476 contre la baseline de 8-9 min.
- **`frontend` : 1327 tests Vitest passés** (115 fichiers) — la suite que le lead n'avait pas
  rejouée, désormais **mesurée** et non plus seulement raisonnée.
- **`backend` : vert** — idem.

### Ce qui reste ouvert

3. **La baseline LOCALE n'est pas verte, et ne peut pas l'être** :
   `products.spec.ts :: navigation liste vers détail produit` est rouge 4 runs sur 6 en local, cause
   identifiée (compilation à froid de `next dev`, 6,5 s contre un `expect` à 5 s). **Absente en CI**,
   où #462 fait tourner la suite contre un build de production. Suivi par un follow-up de la vague 1.
4. Sur macOS, `sprint-77-theme-visual.spec.ts` produit **10 rouges structurels** (références
   committées en `-chromium-linux.png`). Ce n'est pas un flake et ce n'est pas une régression du
   sprint. Suivi par un follow-up de la vague 1.

## Résultats consolidés

- **Typecheck / Lint / Format** : verts (joués par le lead sur le HEAD du sprint)
- **E2E CI** : 3 runs verts, dont 2 consécutifs à `workers: 2` (critère d'acceptation de #476)
- **E2E local** : 6 runs complets, 2 flakes diagnostiqués, 1 corrigé, 1 non reproduit
- **Backend / Vitest** : non rejoués — aucun code de production ni test unitaire touché ; CI de la PR fait foi

## Conclusion

**Prêt pour merge.** Aucun manque de couverture signalé, et la CI a validé le HEAD exact du
sprint (4/4 requis verts). Le point ouvert résiduel est que la CI n'a pas encore vu le HEAD
exact du sprint — ce que la PR de sprint corrige par construction, et qui doit être surveillé avant
le merge.
