# Issue #254 — done

**Titre :** [SECURITY] Fail-fast : refuser le boot prod si `app.cookie.secure=false` en environnement prod effectif
**Vague :** 1 | **Taille :** S | **Modèle :** opus-high

## Commits
- `32c473a` — :lock: #254 fail-fast boot prod si app.cookie.secure=false
- `5d21a57` — :pencil2: #254 correctifs review S35 : message d'erreur mentionne `(COOKIE_SECURE)` + javadoc corrigée (défaut fail-safe garde ≠ défaut applicatif `true` ; numérotation = ordre d'exécution)

## Résumé
Étend `ProfileSafetyGuard` avec un 3e garde-fou (#254), symétrie stricte du check #216 (rate-limit).
- `ProfileSafetyGuard.java` : constante `COOKIE_SECURE_KEY = "app.cookie.secure"`, méthode
  `checkCookieInsecureInProduction` + helper `isCookieInsecure`, appel dans `onApplicationEvent`.
- `ProfileSafetyGuardTest.java` : +7 tests #254.
- `application-prod.properties` déjà `app.cookie.secure=true` (l.16) → prod réel boote, aucune modif.

**Choix de conception clé :** défaut fail-safe DIVERGENT du check source. `app.cookie.secure` absent
en prod effectif → **BLOQUE** (`Boolean.FALSE`, exige `true` explicite), à l'inverse du rate-limit
(absent = sûr = `true`). Documenté en javadoc. Message d'erreur contient `#254` + `app.cookie.secure` + `Secure`.

## Tests
- 20/20 verts (`ProfileSafetyGuardTest`, testable sans Docker — instanciation directe + ConfigurableEnvironment).

## [MEMORY:pattern]
Extension `ProfileSafetyGuard` = 3e garde-fou fail-fast boot (cookie.secure). Anti-pattern évité :
**défaut fail-safe dépend de la sémantique de la property** — rate-limit absent=sûr(`true`),
cookie.secure absent=dangereux(`false`) ; ne pas copier aveuglément le défaut du check source.
Pitfall test : cas marker-only doit poser `spring.profiles.active=prod`, sinon le check #111
(fallback dev) se déclenche AVANT #254.

## Recommandations suite
- Pas de RECOMMAND_TEST_RUNNER (20 tests, <1s).
- Handoff #253 (Vague 2) : modifie le MÊME fichier `ProfileSafetyGuard.java` → doit rebaser sur ce HEAD (`32c473a`).

STATUS: COMPLETED
