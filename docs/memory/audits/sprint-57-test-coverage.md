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
| Backend (`./scripts/test-quiet.sh backend`) | **462 tests, 462 passed, 0 failed, 0 error** — BUILD SUCCESS |
| Unitaires frontend (`npx vitest run`) | **875/875** (93 fichiers) — 842 au départ du sprint |
| E2E ciblés : specs settings (dont breakpoints) | **23/23** |
| E2E suite complète | **136 passed / 0 failed / 8 skipped** (3,2 min) |
| `tsc --noEmit` | 0 erreur |
| `npm run lint` | **0 erreur** (l'erreur locale sur `next-env.d.ts` est corrigée — FU8) |

> Chiffres **après** le traitement des 8 follow-ups en Phase 4 (triage `[a] absorb`). Valeurs
> intermédiaires en fin de Phase 6, avant follow-ups : backend 455/455, frontend 859/859,
> E2E 127 passed / 3 failed / 8 skipped.

### Les 3 échecs E2E de reset password — RÉSOLUS (FU5)

`forgot-password.spec.ts` et `reset-password-failures.spec.ts` (×2) échouaient **en local
uniquement**, et passaient en CI. Cause **établie** : l'endpoint de test
`/api/test-support/password-reset-token` renvoyait **401** parce que le backend docker local ne
tournait pas avec `SPRING_PROFILES_ACTIVE` incluant `e2e`. Le fixture `support/reset-token.ts:106`
posait lui-même le diagnostic.

**Corrigé par FU5** : services docker-compose `backend-e2e` (`:8085`) et `postgres-e2e` (`:5435`),
**opt-in** via le profil natif Compose (`docker compose --profile e2e up -d backend-e2e`). Les
services par défaut sont inchangés (vérifié : `docker compose config --services` renvoie
`postgres, backend, frontend` avec et sans le fix). Vérifié par le lead : `test-support` répond
**404** et non 401 sous ce backend — preuve que le profil `e2e` est actif — et **les 3 specs passent**.

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
| **`settings-header`** | **1** ✅ (résolu par FU4) |

`[COVERAGE-E2E]` — **écart fermé.** Il était signalé `MAJEUR` en fin de Phase 6 : `settings-header`
n'avait aucun consommateur, et le palier 768 px n'était vérifié qu'à la main. FU4 a livré
`frontend/e2e/settings-breakpoints.spec.ts` (6 cas).

⚠ **L'énoncé du follow-up était faux, et FU4 l'a corrigé** : `settings-header` n'est **pas**
`lg:hidden` — le `lg:hidden` porte uniquement sur le bouton `settings-back`
(`settings/page.tsx:54`). Le `<h1>` est rendu à **tous** les paliers, délibérément (cf.
DEC-S57-002 : l'unique `h1` du document ne doit pas dépendre de la largeur). Asserter « header
masqué à 1024 » aurait produit une spec **rouge sur du code sain**. La spec ancre le comportement
réel : `settings-header` visible partout, `settings-back` comme complément `lg`.

Couverture livrée : les 4 paliers (390 / 768 / 1024 / 1280) **plus les deux frontières au pixel**
(1023↔1024 et 767↔768, dans les deux sens — ce qui vérifie aussi que l'écouteur `change` de
`useMediaQuery` répercute le redimensionnement). Mesures géométriques réelles : largeur de sidebar
=== 248, comptage des nav verticales par `height > width`, `scrollWidth <= clientWidth`.
Rouge **prouvé** par 2 inversions temporaires de la condition (3 puis 4 cas en échec), restaurées.

## Vérification navigateur (#299 — non automatisable en unitaire)

4 paliers × clair/sombre, **réellement observés** sur la stack complète :
390 px (0 sidebar, drill-down mobile, tablist absent du DOM) · 768 px (0 nav verticale, onglets
horizontaux pleine largeur) · 1024 px (sidebar 248 px, contenu 776 = 1024 − 248, exactement 1 nav
verticale) · 1280 px (contenu 1032, 0 scroll horizontal). Débordement des onglets testé en locale DE
(libellés les plus longs) : 484/720 px à 768 px, pas de scroll.

## Contraste — mesuré, en échec, puis CORRIGÉ (FU1)

| Couple (mode clair) | Avant | Après | Verdict |
|---|---|---|---|
| accent / accent-soft — **état actif** | `#1170E4`/`#DBE9FC` **3.83:1** ❌ | `#0E5FC4`/`#DBE9FC` **4.94:1** | ✅ AA |
| accent-ink / accent — CTA plein | 4.71:1 | **6.08:1** | ✅ |
| accent-ink / accent-hover | 6.08:1 | **7.95:1** | ✅ |
| accent / bg — liens | 4.59:1 | **5.93:1** | ✅ |
| **Mode sombre** (tous couples) | 5.43 – 8.78:1 | **inchangé** | ✅ |

Correctif : `--color-accent` assombri de `--blue-500` à `--blue-600` en mode clair, plus un
`--blue-700` introduit pour `--color-accent-hover` (sinon survol == repos) ; `--color-focus` et
`--color-ongoing` suivent l'accent pour ne pas faire cohabiter deux bleus voisins.

**Pourquoi un token dédié (`--color-accent-on-soft`) a été écarté — et c'est le point qui compte** :
la liste des consommateurs du couple fautif est **ouverte**, pas fermée. `base.css:121` pose
`a { color: var(--color-accent) }`, tandis que `ui/dropdown-menu.tsx` et `ui/button.tsx` posent
`focus:bg-accent-soft` / `hover:bg-accent-soft` sur **n'importe quel** `<a>` — le couple se forme
donc dans du code pas encore écrit. Preuve empirique : `ui/dropdown-menu.tsx:29` **documentait déjà
ce même 3.83:1 depuis le S52** sans le corriger. Un token dédié aurait couvert `AppShell` et
`SettingsShell` en laissant passer ce troisième cas.

Méthode de mesure : sRGB **composés** lus par `getComputedStyle` dans Chromium (encre + premier
ancêtre au fond non transparent), l'« avant » mesuré sur la **même page live** par réinjection de
l'ancien token. À noter : la première tentative d'override était un **no-op silencieux** affichant
4.94 partout — détectée et corrigée, sans quoi l'« amélioration » aurait été confirmée à tort.

Vérification navigateur, clair **et** sombre : sidebar `/fr/dashboard`, onglets `/fr/settings` à
1280 px, `/fr/timeline`, landing `/fr` (échantillon choisi **par le risque** : page publique où
l'accent est le plus présent), panneau burger à 375 px. L'état actif conserve **trois** signaux non
partagés (aplat teinté, encre chromatique, graisse 500) là où inactif et survol ne diffèrent que par
la surface.

**Non observé, déclaré** : le trait « aujourd'hui » de la frise (`.mt-tlv__today`) — aucune donnée
seedée, l'élément n'existait pas dans le DOM. C'est un aplat 2 px en `--color-accent` (critère
1.4.11, seuil 3:1) qui passe de 4.59 à 5.93 vs `bg` : il ne peut que s'améliorer, mais ce n'est pas
une observation.

## Conclusion

**Prêt pour merge.** Backend, frontend, E2E complets et lint tous verts, après traitement des
**8 follow-ups** en Phase 4. Les 3 échecs E2E qui subsistaient en fin de Phase 6 sont résolus (FU5),
l'écart de couverture E2E est fermé (FU4), et le contraste sous AA — 3ᵉ incident du projet — est
corrigé et mesuré (FU1).

**Trois énoncés de follow-up se sont révélés faux à l'exécution** et ont été rectifiés plutôt
qu'appliqués : le bug i18n n'était pas où on le disait (FU6), la « divergence CI/local » du lint
n'existait pas — c'était le hook RTK local qui élargissait le périmètre (FU8), et `settings-header`
n'est pas `lg:hidden` (FU4). Chacun aurait produit un correctif faux ou une spec rouge sur du code
sain s'il avait été appliqué tel quel.
