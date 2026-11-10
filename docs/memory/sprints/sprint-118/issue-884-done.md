# Issue #884 — vitest et @vitest/coverage-v8 en 5.x

## Résumé

Fait par le lead. Commit `7c7d3b0f`.

- `vitest` + `@vitest/coverage-v8` 3.2.7 → 5.1.0 (même version ; peer exact `vitest@5.1.0`).
- `@types/node` ^20 → ^22 : sans lui, ERESOLVE (peer optionnel de vitest 5 : `^22 || >=24`).
- 2 tests TimelineView (`fullscreen-overlays`, `modal-shortcuts`) : `ReturnType<typeof vi.fn>` vaut désormais
  `Mock<Procedure | Constructable>`, non assignable à `document.exitFullscreen` → typé `Mock<() => Promise<void>>`.
- `.vitest/` (répertoire d'artefacts de la v5) ignoré par git et prettier.
- Commentaire de `vitest.config.mts` sur l'alignement du provider mis à jour.

**Ruptures recensées** (guides officiels `docs/guide/migration.md` v4.1.12 et `docs/guide/migration/index.md` v5.1.0) :
| Rupture | Statut |
|---|---|
| v4 coverage V8 : remappage AST, `all`/`extensions`/`ignoreEmptyLines`/`experimentalAstAwareRemapping` retirés | sans objet (non utilisés) ; totaux 89,75 % stmts |
| v4 `exclude` simplifié (node_modules, .git) | sans objet : `exclude` explicite dans la config |
| v4 mocks de constructeurs (`function`/`class`), `getMockName`, `restoreAllMocks`, `invocationCallOrder` à 1 | suite verte ; `invocationCallOrder` seulement comparé entre mocks |
| v4 vite-node → Module Runner ; `deps.*` → `server.deps.*` | déjà `server.deps.inline` |
| v4 `workspace`, `poolOptions`, `minWorkers`, 3e argument d'options de `test` | sans objet |
| v4 reporters (`basic` retiré, `verbose` à plat) | sans objet (reporter par défaut) |
| v5 Node ≥ 22.12, Vite ≥ 6.4 | #883 ; vite 6.4.5 installé |
| v5 `clearMocks: true` par défaut | suite verte (aucun test ne dépendait d'un historique hérité) |
| v5 `vi.mock`/`vi.hoisted` hors top-level → erreur | aucun cas (suite verte) |
| v5 `toThrow("")`, `expect.poll` borné, assertions async non attendues en échec | aucun cas (suite verte) |
| v5 types `Assertion<R, T>` / `Mock` | 2 tests retypés (ci-dessus) |
| v5 artefacts sous `.vitest/`, reporters json/junit vers fichier | `.vitest/` ignoré ; CI n'utilise ni json ni junit ; `--outputFile` explicite respecté |
| v5 coverage `include`/`exclude` plus stricts | sans objet (pas d'`include`) |
| v5 entrées dépréciées retirées (`vitest/coverage`, `vitest/reporters`…) | aucune importée |

## Tests
177 fichiers, 2359 tests, 0 échec — identique à la base 3.2.7 (mesure JSON avant/après). `npm run test:coverage`
produit `coverage/lcov.info` (183,9 Ko).

## Recommandations suite
- Pas de RECOMMAND_* : outillage de test seul.

[MEMORY:pitfall] vitest 5 : `ReturnType<typeof vi.fn>` n'est plus assignable à une méthode DOM (union
`Procedure | Constructable`) → typer `Mock<() => …>` ; et `@types/node` doit être ≥ 22 sinon ERESOLVE.

STATUS: COMPLETED
