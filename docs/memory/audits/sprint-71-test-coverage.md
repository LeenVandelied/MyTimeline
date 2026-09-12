# Audit tests — Sprint 71

> Généré en fin de Phase 6, complété après le cycle de correction post-review et la review de
> cycle 2. Les chiffres sont ceux réellement observés, pas ceux annoncés par les agents.

## Couverture par règle métier

| Règle | Description | Cross-system flow | Unit backend | Integration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-AUT-003 (amendée) | Politique mot de passe 8..100 + majuscule + chiffre, création/modification uniquement | OUI (form + serveur) | ✅ `PasswordPolicyTest` (29) | ✅ `AuthControllerLegacyPasswordLoginTest` (3) | ✅ `password-policy.test.ts` (49) | ⚠ indirect | ⚠ indirect |
| BR-AUT-004 (corrigée) | Énoncé qui surdécrivait le backend — remis en cohérence | NON | ✅ | ⚠ N/A | ⚠ N/A | ⚠ N/A | ⚠ N/A |
| Login non durci | Un compte legacy à 6 caractères doit toujours pouvoir se connecter — contrainte DURE de l'arbitrage dev | OUI | ✅ | ✅ `login_withPreExistingSixCharPassword_stillSucceeds_andIssuesJwtCookie` | ⚠ N/A | ⚠ indirect | ⚠ indirect |
| Anti-énumération username (#134) | 409 conservé, corps neutralisé, identique sur `register` et `PATCH /api/me` | OUI | ✅ `UserControllerTest` (23) | ✅ | ✅ `ProfileSection.test.tsx` (7) | ⚠ N/A | ⚠ N/A |
| Rate-limit `/api/me` (#134) | `change-password` 5/min/IP, `PATCH /api/me` 10/min/IP | NON | ⚠ N/A | ✅ `RateLimitingAndHeadersIntegrationTest` (18) | ⚠ N/A | ❌ impossible | ❌ impossible |
| WCAG 1.4.11 — plancher 3:1 (#497) | Traits peints dans la couleur utilisateur, mélange progressif vers l'encre du thème | NON | ⚠ N/A | ⚠ N/A | ✅ (+21) | ✅ `sprint-70-preview-visual.spec.ts` (9) | ✅ |
| PAT-S70-001 étendu (#495) | Aperçu épinglé sur la surface d'édition, repli en flux < 640px | NON | ⚠ N/A | ⚠ N/A | ✅ (+4) | ✅ `sprint-71-edit-preview-pinned.spec.ts` (6) | ✅ |
| BR-EVE-017 (créée, #496) | Aperçu live débouncé à 150 ms | NON | ⚠ N/A | ⚠ N/A | ❌ **aucun test ne la protège** | ❌ | ❌ |

### Justification des cases non vertes — aucune n'est un oubli

- **Rate-limit `/api/me` — `❌ impossible` en E2E, et non une lacune de couverture.** Le job E2E de la CI pose
  `RATE_LIMIT_ENABLED=false` au démarrage du backend (`ci.yml:242`) : le filtre est
  court-circuité par construction. La couverture réelle est portée par les tests d'intégration,
  qui pilotent le temps via le `TimeMeter` surchargeable de `RateLimitConfig` (429 au seuil +
  réarmement de fenêtre). Un E2E ici testerait un filtre désactivé.
- **BR-EVE-017 — trou assumé, remonté en follow-up.** L'agent #496 le signale lui-même :
  rebrancher l'aperçu sur `form.watch()` brut ne rendrait aucun test rouge. La règle vient
  d'être créée par ce sprint ; la couvrir dépasse le périmètre documentaire de l'issue.
- **`⚠ indirect` sur les E2E de la politique de mot de passe.** Aucune spec ne teste le rejet
  d'un mot de passe non conforme de bout en bout. Les specs existantes traversent le flux avec
  des fixtures conformes (`E2ePass123`, `NewStrong123!` — vérifiées par le lead), donc elles
  prouvent la non-régression, pas l'application de la règle.

## Tests créés par le sprint

- `backend/src/test/.../PasswordPolicyTest.java` (29 — dont `@ParameterizedTest`)
- `backend/src/test/.../AuthControllerLegacyPasswordLoginTest.java` (3)
- `backend/src/test/.../UserControllerTest.java` (+1 : `patchMe_conflictBody_leaksNoUsernameExistenceHint`)
- `backend/src/test/.../RateLimitingAndHeadersIntegrationTest.java` (13 → 18)
- `frontend/src/lib/password-policy.test.ts` (49)
- `frontend/e2e/sprint-71-edit-preview-pinned.spec.ts` (6, nouvelle)
- `frontend/e2e/sprint-70-preview-visual.spec.ts` (assertions durcies, exemption levée)

## Résultats des runs

| Suite | Résultat | Qui l'a lancé |
|---|---|---|
| Backend | **514 / 514**, 0 failed, 0 skipped | audit test-runner (2 runs) + cycle de correction (2 runs) |
| Frontend Vitest | **1132 / 1132**, 104 fichiers | idem |
| `tsc --noEmit` | 0 erreur | audit + review cycle 2 (vérification indépendante) |
| ESLint | 0 | audit + cycle de correction |
| Prettier | exit 0 | cycle de correction |
| `gen-pit-packs.sh --check` | exit 0 | #496 + cycle de correction |
| `check-rules-jit-drift.sh` | exit 0 | cycle de correction |
| E2E Playwright | **partiellement exécutés** — voir ci-dessous | — |

## Ce qui n'a PAS été vérifié — à lire avant de merger

1. **La suite E2E complète n'a jamais tourné sur cette branche.** L'audit n'a pas pu la lancer
   (backend `:8080` absent). Seuls deux runs partiels existent, chacun mené par l'auteur du
   changement qu'il validait : #497 (9/9, `sprint-70-preview-visual`) et #495 (6/6,
   `sprint-71-edit-preview-pinned`). **Aucune exécution E2E indépendante.** C'est la CI qui
   tranchera.
2. **`AuthControllerLegacyPasswordLoginTest` a été observé FLAKY** au premier boot de conteneur
   (2 échecs sur 3), puis n'a jamais été reproduit : 3 conteneurs neufs, tous verts. La cause
   n'est **pas élucidée**. Le correctif appliqué (`setRemoteAddr` pour isoler le bucket de
   rate-limit) est le seul couplage réellement mesuré, mais **ce n'est pas une déflakisation
   prouvée**. À surveiller sur plusieurs runs CI ; capturer le statut reçu (429 vs 401) avant
   toute nouvelle hypothèse.
3. **Section frontend du pack `coverage-auth.md` (99) non recomptée** — porte un disclaimer
   explicite. La section backend, elle, a été recomptée par surefire (155 → 172) après
   découverte que le comptage historique par `grep -c '@Test'` ignore les `@ParameterizedTest`.
4. **Vérification navigateur** : menée séparément, voir
   `docs/memory/sprints/sprint-71/browser-verification.md`.

## Conclusion

Prêt pour PR : aucune lacune de couverture bloquante, aucun `[CRITIQUE]`/`[MAJEUR]` sur deux cycles de
review. Les deux réserves réelles — suite E2E jamais exécutée intégralement, flaky non élucidé —
sont portées dans le corps de la PR plutôt que soldées ici, parce que c'est la CI qui peut les
trancher, pas un agent local.
