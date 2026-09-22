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

## ✅ RÉSERVE LEVÉE — arbitrage CI du 2026-07-29 (section ci-dessous conservée pour mémoire)

La CI a tranché les deux questions ouvertes ci-dessous. **Les deux réponses sont désormais
mesurées, plus supposées.**

**1. Les 28 échecs E2E locaux étaient bien environnementaux.** Run CI `30452165133`, job `e2e` :
**105 passed / 1 failed**, et **aucun** `GET /auth/me` en 404. Même code, environnement propre
(Postgres 16 en service container, backend neuf) → la cause était locale, conformément à
l'hypothèse « paire JWT éphémère + piles Docker concurrentes ». Prouvé par construction.

**2. L'unique échec CI n'était PAS causé par ce sprint.** Le test en échec était
`landing-mobile-menu.spec.ts:392 — 320 px, non-régression #334, les 4 locales` :
`débordement à 320 px en de : scrollWidth=321 > clientWidth=320` — **un pixel, en allemand**.

Verdict **mesuré, pas déduit** : la spec du HEAD a été exécutée contre le code de `origin/dev`
(seuil encore `md`, zéro changement de #347) dans l'image `mcr.microsoft.com/playwright:v1.61.1-jammy`,
et sort **la chaîne d'erreur identique à la CI**. C'est l'**OS qui bascule, pas le code** :
#347 n'a fait qu'étendre l'assertion de 375 px aux 6 paliers × 4 locales, ce qui a **révélé** un
défaut pré-existant. #334 (S49) avait conclu « 320/375/390 propres » — depuis macOS.

**Correctif `9350a77` — sur le palier, pas sur la locale.** Mesure du groupe droit du header à
320 px : `en` 16 px de marge · `fr` 13 px · **`es` 4 px** · **`de` −1 px (échec)**. Corriger `de`
seul aurait laissé `es` à 4 px du même basculement d'OS. Sous `max-[360px]`, le CTA reprend les
métriques **horizontales** de la taille `sm` du DS (`px-3` + `text-xs`) **sans sa hauteur** :
`h-11` conservé, donc la **cible tactile de 44 px de #334 est préservée**. Les 4 locales
finissent à 304 px — **16 px de marge**. Seuil purement CSS, aucun `matchMedia` ne le double,
le seuil `lg` de #347 est intact, et `HeaderSection.tsx` (paire `hover:` sanctionnée) non touché.

**Le test n'a pas été affaibli** : aucune tolérance, aucune locale retirée, aucun `skip`.

> **`PIT-S52` — deux sprints de suite ont conclu « écart 0 partout » depuis macOS, et la CI Ubuntu
> les a démentis les deux fois** (#334 au S49, #347 au S52). Les métriques de police diffèrent
> entre macOS et Ubuntu ; `de` est la locale la plus large. **Un correctif de mise en page qui
> laisse 0 à 4 px de marge est un échec CI en attente.** Mesurer dans l'image Playwright jammy et
> viser une marge à deux chiffres.

### Réserve d'origine — texte conservé tel quel

> Ce qui suit était l'état des connaissances **avant** l'arbitrage CI. Conservé sans retouche :
> l'hypothèse s'est révélée juste sur le point 1 mais le raisonnement « c'est du CSS donc ça ne
> peut pas casser » restait, à ce moment-là, une déduction non mesurée — et il masquait un
> second défaut, réel, que seule la CI a fait apparaître.

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
garde-fous vérifiés non aveugles par contrôle négatif, **réserve E2E levée par arbitrage CI**.

Les deux anomalies de l'audit initial ont été tranchées **par la mesure** :
les 28 échecs locaux étaient environnementaux (CI : 105 passed, 0 `/auth/me` 404), et l'unique
échec CI était un défaut **pré-existant** révélé — non causé — par le nouveau test de #347,
corrigé par `9350a77` sur le palier plutôt que sur la locale.

**Ce sprint a produit un test qui a trouvé un vrai défaut que deux sprints avaient manqué.**
C'est la valeur du filet ajouté par #347, pas un accident.

**Condition de merge restante :** le job `e2e` de la CI doit être vert sur le SHA final
(`e968d74`). Tant que ce n'est pas constaté, ne pas fusionner.
