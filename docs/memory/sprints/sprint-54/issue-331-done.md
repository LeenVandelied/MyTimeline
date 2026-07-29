# Issue #331 — Exposer des data-testid sur les SelectItem Radix

> Sprint 54, vague 1. Briefing : `briefing-331.md` (45 Ko). Ancrage pré-spawn : `spawn-ref-331.txt` (`68a924c`).

## Commit

`9791d61` — `:white_check_mark: test(e2e): expose des data-testid sur les options de <Select> (#331)`
3 fichiers, +27 / −16.

## Contrat de nommage (consommé par #330)

```
product-option-<uuid>                       (valeur = product.id)
recurrence-unit-option-<WEEK|MONTH|YEAR>     (valeur = enum BR-EVE-006)
```

Dérivés de la **`value`**, jamais du libellé i18n — un testid dérivé d'un libellé traduit changerait avec la locale.

## Fichiers

| Fichier | Lignes | Quoi |
|---|---|---|
| `frontend/src/components/events/NewEventDrawer.tsx` | 215-221 | `data-testid` sur l'option produit |
| `frontend/src/components/EventEditForm.tsx` | 436-448 | `data-testid` sur WEEK / MONTH / YEAR |
| `frontend/e2e/timeline.spec.ts` | 27-31, 213-219 | ciblage par testid au lieu de `.nth(1)` + commentaires corrigés |

## Tests (mesurés, pas supposés)

- Unitaires frontend : **836 passed / 0 failed** (`vitest run --silent`)
- E2E `timeline.spec.ts` : **15 passed / 0 failed** (stack réelle `:3100` + backend `eventmanager_e2e`, `--workers=1`)
- `tsc --noEmit` : 0 erreur
- **Contrat #330 vérifié au navigateur** (spec jetable, supprimée) : `product-option-<id>` visible et cliquable ; les 3 `recurrence-unit-option-*` visibles ; clic sur YEAR → le trigger affiche « an/year ». Ce dernier point prouve que le testid sélectionne la **bonne** valeur, pas seulement « une » option — c'est précisément ce que `.nth(1)` ne garantissait pas.

## Prémisses du briefing — vérifiées, et deux ajouts

Aucune prémisse infirmée sur les chemins ni les numéros de ligne : `EventEditForm.tsx` à la racine de `src/components/`, `SelectItem` 436-438, `NewEventDrawer.tsx` 215-217, `timeline.spec.ts:221` `.nth(1)`, et la référence `product-category-option-${category.id}` bien à `ProductDrawer.tsx:315` — **tout exact**. Le briefing demandait explicitement de vérifier cette dernière (le lead ne l'avait pas ouverte) ; elle tient.

Deux constats en plus :
1. **Le commentaire menteur n'était pas seulement aux lignes 213-218** : l'en-tête du fichier (lignes 27-30) affirmait aussi le ciblage « par INDEX ». Corrigé — sinon un lecteur futur aurait cru la doc plutôt que le code.
2. **Le doute du briefing sur l'exploitabilité de `product-option-<uuid>` est levé** : `seedProduct` retourne l'id, les specs l'ont donc en main. Le testid par id est utilisable tel quel par #330.

## [MEMORY:pitfall] E2E rouge sur worktree partagé — isoler par stash avant d'accuser son propre diff

La 1re passe E2E est sortie **entièrement rouge dès le `setup`** (`getByTestId('dashboard')` absent), alors que le diff touché n'a aucun rapport avec l'authentification : #329 éditait `auth.setup.ts` **en direct, dans le même working tree**, pendant le run.

Résolution : `git stash push -- <ses 3 fichiers>` → re-run → **15/0 sur arbre propre**, échec donc non imputable ; `stash pop` → re-run → **15/0** également.

Prévention : sur un worktree partagé par plusieurs agents, un E2E rouge dans un fichier appartenant à un autre agent doit être **isolé par stash ciblé AVANT** d'accuser son propre diff. Et un `POST /api/auth/register` en direct (201 ici) départage API vs UI en deux secondes.

## Pack

`pack_lu: OUI` — `cp-frontend.md` §« Tests (Vitest + RTL) — pièges » (tout nouveau `data-testid` doit être référencé dans une spec, sinon coverage-e2e MAJEUR) + `br-events.md` §BR-EVE-006 (enum WEEK/MONTH/YEAR, source des 3 valeurs).

## Recommandations suite

**`RECOMMAND_FOLLOWUP`** — les 2 autres `<Select>` d'`EventEditForm` restent sans testid : type d'événement (290-291, `duration`/`single`) et unité de durée (334-337, `days`/`weeks`/`months`/`years`). **Abstention délibérée**, pas un oubli : hors critères d'acceptation, et `weeks` collisionnerait sémantiquement avec `WEEK` de la convention posée. Des préfixes distincts sont requis (`event-type-option-*` / `duration-unit-option-*`). [triage XS | domaine events]

- `RECOMMAND_TEST_RUNNER` : **non** — suites lancées et mesurées ici (836 unit + 15 E2E).
- `RECOMMAND_SECURITY` : **non** — aucun changement d'authentification, d'autorisation ni de donnée personnelle ; ajout d'attributs DOM uniquement.
- `RECOMMAND_DB_EXPERT` : **non** — zéro migration, zéro requête, zéro schéma.
- `RECOMMAND_UI_DESIGN` : **non** — aucun changement visuel (attributs non rendus).

## Hygiène

Commit limité aux 3 fichiers du périmètre (`git add` ciblé) : `auth.setup.ts`, `auth-setup-render-retry.spec.ts` et `support/register-page.ts` de #329 laissés non stagés.

STATUS: COMPLETED
