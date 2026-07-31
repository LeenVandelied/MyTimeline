# Audit tests — Sprint 57

> Généré en fin de Phase 6, complété par la Phase 8 (coverage E2E).
> Exécutions réelles par le lead sur `:3000` après diagnostic de l'environnement E2E.

## Couverture par règle métier

| BR | Description | Cross-system flow | Unit backend | Intégration | Unit frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-AUT-008 | `/me` renvoie l'utilisateur courant sans secret — **le follow-up S43 (`SignatureException` → 500) est fermé** | NON | ✅ | ⚠ N/A | ⚠ N/A | ✅ | ⚠ N/A |
| BR-AUT-009 | `/refresh` exige un token valide — **référence de parité, non modifiée** | NON | ✅ | ⚠ N/A | ⚠ N/A | ✅ | ⚠ N/A |
| Garde serveur (#302/S45, ADR-004) | `/[locale]/settings` protégé contre les visiteurs anonymes après déplacement sous `(app)/` | NON | ⚠ N/A | ⚠ N/A | ✅ | ✅ | ⚠ N/A |

**Aucune case manquante.** Aucun flux cross-system (2+ systèmes ou rôles) n'est introduit par ce sprint :
#312 est un chemin d'erreur backend couvert en unitaire, #299/#318/#398 sont frontend et couverts
par la suite E2E settings + `auth-guard.spec.ts`.

## Tests créés

- `AuthControllerSecurityTest` : `me_withInvalidSignature_returns401Generic` (miroir de
  `refresh_withInvalidSignature_returns401AndDoesNotReissue`), `me_withExpiredToken_returns401Generic`,
  `me_withMalformedToken_returns401Generic` — #312
- `frontend/src/components/settings/SettingsShell.test.tsx` : `aria-orientation` horizontal + cas ←/→ — #299
- `frontend/src/lib/auth-guard-paths.test.ts` : garde-fou filesystem `(app)/` (+352 l.), puis
  normalisation de casse et rejet des déclarations en casse mixte (+101 l.) — #318
- `frontend/e2e/settings-preferences.spec.ts` : 5 sélections basculées sur `data-testid` dérivés de
  la valeur — #398

## Résultats des runs (chiffres réels)

| Suite | Résultat |
|---|---|
| Backend (`./scripts/test-quiet.sh backend`) | **455 tests, 455 passed, 0 failed, 0 error** — BUILD SUCCESS |
| Unitaires frontend (`npx vitest run`) | **859/859** (92 fichiers) — 842 au départ du sprint, +13 (#318), +4 (correctif casse) |
| E2E ciblés : 6 specs settings + `auth-guard.spec.ts` | **37 passed / 1 skipped / 0 failed** (19,9 s) |
| E2E suite complète | 127 passed / **3 failed** / 8 skipped (3,0 min) |
| `tsc --noEmit` | 0 erreur |

### Les 3 échecs E2E — d'environnement, pas de code

`forgot-password.spec.ts` et `reset-password-failures.spec.ts` (×2). Cause **établie**, pas
supposée : l'endpoint de test `/api/test-support/password-reset-token` renvoie **401** parce que le
backend docker utilisé ne tourne pas avec `SPRING_PROFILES_ACTIVE` incluant `e2e`. Le fixture
`support/reset-token.ts:106` pose lui-même le diagnostic. **Aucun commit du sprint ne touche au
parcours de réinitialisation de mot de passe.**

### Environnement E2E — diagnostic (a coûté 3 hypothèses fausses)

1. Rien n'écoutait sur `:3000` (serveur de dev arrêté en fin de vague 1) → `PARTIAL` de #398.
2. Relance sur `:3100` → toujours rouge. `curl` register → **201**, ce qui semblait disculper le
   backend. **Piège** : `curl` n'envoie pas d'en-tête `Origin`.
3. Statuts instrumentés par le fixture : **`[403, 403, 403]`**. Le proxy Next transmet
   `Origin: http://localhost:3100`, refusé par le backend (profil `dev` figé sur
   `allowed-origins=http://localhost:3000`) — **piège n°2 du runbook S47**.
4. Frontend relancé sur `:3000` avec `NEXT_PUBLIC_API_URL=/api` +
   `E2E_API_PROXY_TARGET=http://localhost:8080` → vert.

Écartées en chemin : identités périmées dans `e2e/.auth/accounts.json` (`globalSetup` purge bien),
et arithmétique de la fixture username (15 car., conforme à BR-AUT-003 3..20).

## Phase 8 — coverage E2E des nouveaux testids

| Testid ajouté | Specs le référençant |
|---|---|
| `settings-page` | 4 ✅ |
| `settings-back` | 1 ✅ |
| `pref-theme-option-*` | 1 ✅ |
| `pref-density-option-*` | 1 ✅ |
| `pref-language-option-*` | 1 ✅ |
| **`settings-header`** | **0** ⚠ |

`[COVERAGE-E2E] MAJEUR` — `settings-header` (ajouté par #299, marqué « optionnel » par l'arbitrage
`ui-design`) n'a **aucun consommateur**. Conséquence concrète : le **palier 768 px**, où ce header
est la seule sortie de navigation, reste vérifié **uniquement à la main** (vérification navigateur
de #299, observée mais non automatisée).

**Plan** (processus documenté `review-protocol.md` A.4) : `/create-e2e` après merge — invocation
manuelle. Non traité dans ce sprint pour ne pas élargir le périmètre en phase de clôture.

## Vérification navigateur (#299 — non automatisable en unitaire)

4 paliers × clair/sombre, **réellement observés** sur la stack complète :
390 px (0 sidebar, drill-down mobile, tablist absent du DOM) · 768 px (0 nav verticale, onglets
horizontaux pleine largeur) · 1024 px (sidebar 248 px, contenu 776 = 1024 − 248, exactement 1 nav
verticale) · 1280 px (contenu 1032, 0 scroll horizontal). Débordement des onglets testé en locale DE
(libellés les plus longs) : 484/720 px à 768 px, pas de scroll.

## Contraste — mesuré, et en échec

| | Ratio | Verdict |
|---|---|---|
| Clair — onglet actif `#1170E4` / `#DBE9FC` | **3.83:1** | ⚠ **sous AA (4.5)** |
| Clair — onglet inactif | 5.96:1 | ✅ |
| Sombre — actif / inactif | 5.43:1 / 6.26:1 | ✅ |

**Pré-existant, non introduit par ce sprint** : le lien actif de la sidebar `AppShell` mesure
exactement le même 3.83:1, sur le même couple de tokens que l'arbitrage designer imposait de
reprendre. Dette du design system touchant **tout état actif du produit**. **3ᵉ incident de
contraste du projet** (après S48 et S53) → follow-up, correctif au niveau du token.

## Conclusion

**Prêt pour PR.** Suites verte côté backend, frontend et E2E ciblés. Les 3 échecs E2E résiduels sont
imputables au profil du backend local, pas au sprint. Un écart de couverture (`settings-header`) est
consigné et planifié, pas dissimulé.
