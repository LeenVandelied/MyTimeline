# Audit tests — Sprint 52

> Généré en fin de Phase 6 (test-runner spawné par le lead), complété par le lead.
> Sprint **frontend + documentation uniquement** : aucun fichier Java, aucune migration Flyway,
> aucun DTO ni schéma Zod touché.

## Couverture par issue

| Issue | Nature | Cross-system flow | Unit frontend | Garde-fou AST | E2E Playwright | Vérification navigateur |
|---|---|:---:|:---:|:---:|:---:|:---:|
| #346 — découplage fond/encre au focus | rendu / a11y | NON | ✅ | ✅ étendu | ✅ | ✅ ratios mesurés |
| correctif #346 — locale active lisible | rendu / a11y | NON | ✅ | ✅ | ✅ 2 specs ciblées | ✅ 6,08:1 clair / 8,78:1 sombre |
| #347 — bascule burger `md` → `lg` | responsive | NON | ✅ +2 tests | — | ✅ +9 tests | ✅ 24 combinaisons |
| #372 — README racine | documentation | NON | — | — | — | pile réellement démarrée |

Aucune issue de ce sprint n'est un flux cross-system (2+ systèmes ou rôles) : aucune E2E métier
n'est donc requise par la règle du projet. Les E2E ajoutées sont des E2E de parcours / de rendu.

**Aucune BR (règle métier) n'est impactée** — les 3 issues déclarent « BR impactées : aucune », et
le diff ne touche ni `domain/`, ni `application/`, ni `infrastructure/`.

## Tests créés

- `frontend/src/components/landing/HeaderSection.test.tsx` — +2 tests (bascule `lg`)
- `frontend/e2e/landing-mobile-menu.spec.ts` — +9 tests (paliers 768 / 820 / 1024 × 4 locales,
  frontière exacte 1023↔1024, non-régression 320 / 375 / 390)
- `frontend/src/components/landing/landing.hover-pairing.test.ts` — garde-fou AST élargi au
  préfixe `focus:` et au périmètre `components/ui/`, avec 3 témoins de régression

## Résultats des runs

Exécutés par le `test-runner` (Phase 6), sur `sprint/52` @ `788d5f7` :

| Suite | Commande | Résultat |
|---|---|---|
| Backend | `./scripts/test-quiet.sh` (scope backend) | **452 / 452 passed**, 0 failed |
| Frontend | `./scripts/test-quiet.sh` (scope frontend) | **825 / 825 passed**, 0 failed, 0 erreur TS |
| E2E | Playwright, `workers=1`, docker compose local | **78 passed / 28 failed / 8 skipped** |

Contrôles supplémentaires exécutés par les agents d'implémentation :
- `npx tsc --noEmit` → 0 erreur · `eslint` + `prettier --check` → 0 problème
- **Contrôle négatif** (#347) : classes remises à `md:` → 5/5 tests rouges, puis fichier restauré
  à l'identique. Le filet n'est pas aveugle.
- Spec `landing-mobile-menu.spec.ts` complète → **21 passed** (dont les 2 tests « sélecteur de
  langue » qui étaient rouges avant le correctif `df93b63`).

## ⚠ Réserve ouverte — 28 échecs E2E locaux, cause non démontrée

Les 28 échecs ont **tous la même signature** : `GET /auth/me` → 404, perte de session après
l'étape `auth.setup`. Ils frappent les specs dépendant d'un compte (categories, products,
timeline, golden-path, reset-password), **pas** les specs de rendu de ce sprint.

**Ce qui est établi :**
- La CI sur `dev` @ `473ed65` — **exactement la base de cette branche** — avait ses 4 jobs verts,
  **job `e2e` compris** (runs `30431774200` et `30431771562`, 2026-07-29 07:28).
- Aucune spec touchée par ce sprint n'est dans les 28 : `landing-mobile-menu.spec.ts` est verte.
- Le diff du sprint est exclusivement CSS / classes utilitaires / markdown : il ne touche ni
  l'authentification, ni un endpoint, ni un appel réseau.

**Ce qui n'est PAS établi :** que ces 28 échecs ne soient pas une régression. Le raisonnement
« c'est du CSS, donc ça ne peut pas casser l'auth » est une déduction, pas une mesure.

**Hypothèse la plus probable, non prouvée :** l'environnement local. Sans `JWT_PRIVATE_KEY` dans
`.env`, le backend génère une paire **éphémère** — toute session meurt au redémarrage du backend
(piège documenté dans le README livré par #372). Or trois agents ont fait tourner des piles Docker
concurrentes pendant ce sprint, et l'un d'eux a explicitement mesuré le backend d'un autre
(port 8080 déjà pris — cf. `issue-347-done.md`). Deux agents ont par ailleurs noté ce 404 sur
`/auth/me` comme **préexistant** à leur travail.

**Arbitrage retenu :** faire trancher la CI, dont le job `e2e` monte un Postgres 16 en service
container et un backend neuf — environnement propre, sans contention. Le job `e2e` n'est
**pas un check requis** sur `dev` (issue #361 ouverte à ce sujet) : son résultat doit donc être
lu explicitement, il ne bloquera pas le merge tout seul.

**Condition de merge :** si le job `e2e` de la PR est vert, la cause locale est environnementale
et la réserve est levée. **S'il est rouge, il y a une régression réelle à corriger avant merge** —
ne pas fusionner sur la foi du raisonnement ci-dessus.

## Ce qui n'a pas été couvert

- **Firefox et WebKit non testés** alors que la conformité WCAG 2.4.7 du correctif `df93b63`
  repose sur le contour `:focus-visible` de `base.css` (comportement potentiellement différent).
- **Modalité pointeur pure** (`:focus-visible = false`) : aucun contour, seul retour visuel = delta
  de surface 1,29:1. Mesuré et documenté, non corrigé.
- `select.tsx`, `DropdownMenuCheckboxItem`, `RadioItem`, `SubTrigger` : corrigés par #346 mais
  **jamais rendus au navigateur** — aucun consommateur dans le dépôt.
- **Palier ≥ 1280 px non vérifié** pour #347 ; aucun test sur appareil tactile réel.
- Le premier `docker compose up -d --build` de #372 a eu un comportement anormal
  (`frontend` resté en `Created`, code de sortie 0) **non reproduit** au run de contrôle —
  non documenté dans le README faute de reproduction.

## Conclusion

Suites unitaires backend et frontend **vertes** (452/452 et 825/825), review batch **0 finding**,
garde-fous vérifiés non aveugles par contrôle négatif.

**Prêt pour PR, avec une réserve explicite** : les 28 échecs E2E locaux doivent être arbitrés par
le job `e2e` de la CI avant merge. Ce n'est pas une formalité — c'est la condition de merge.
