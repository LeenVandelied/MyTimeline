# Sprint 88 — security-expert (audit #547 + #568)

> Spawné par le lead (Phase 5, chemins `infrastructure/security/` + `ProfileSafetyGuard`), 2026-09-14. Lecture statique, aucun boot.

**VERDICT : 0 CRITIQUE / 0 MAJEUR / 3 MINEUR**

## OK
- Défauts prod inchangés : login 10 / reset 5 / register 5 (`RateLimitingFilter.java:124-130`), aucun override en dev/prod ; vérifiés par `RateLimitDefaultCeilingsIntegrationTest:74-87`.
- Env vide → null → défaut (raisonné, non testé) ; `0`/négatif/non numérique → boot refusé.
- `ProfileSafetyGuard` : diff = javadoc + libellés ; checks #283 (e2e + marqueur prod) et #216 (enabled=false en prod) intacts.
- Clé `ip|METHOD path` : seaux login/reset distincts ; throttle par token reset (5) intact, appliqué après le seau IP.
- #568 : aucune réactivation de l'impression MockMvc ; `surefire-reports` non uploadés.
- `ci.yml` : permissions et secrets du job e2e inchangés.

## MINEUR
1. `RateLimitingFilter.java:380-384` — plancher >= 1 mais **aucun plafond haut en prod** : `APP_RATE_LIMIT_LOGIN_PER_MINUTE=100000` supprime de fait le throttle login (simple WARN). Surface NOUVELLE de ce sprint (login devient réglable). Mitigation : refuser en prod toute valeur > défaut, sur le modèle de `checkRateLimitDisabledInProduction`.
2. Aucun test ne couvre `tunableCeiling` à 0 / négatif / vide.
3. Prémisse du brief fausse : `trust-forwarded-header=true` en prod (`docker-compose.prod.yml:128`, antérieur 7db42bf, Caddy écrase XFF, backend sans `ports:`). Redevient faille si un proxy amont / `trusted_proxies` est ajouté. Et `trace: on-first-retry` (playwright.config.ts:270, ci.yml:592) publie en artefact public cookies jwt de la paire CI jetable (impact faible, antérieur).

## Signaux mémoire
- [MEMORY:pitfall] Un plafond de rate-limit réglable n'a qu'un plancher (>=1) : sans plafond haut en prod, une env très grande coupe le throttle sans échouer au boot.
- [MEMORY:pitfall] `trust-forwarded-header=false` n'est vrai qu'en dev/e2e ; la prod le met à true et sa sûreté dépend de Caddy.

## Suite donnée par le lead
- MINEUR 1 + 2 : à corriger dans le cycle de corrections post-revue (surface introduite par le sprint).
- MINEUR 3 : hors périmètre (antérieur) — candidat follow-up au triage `/sprint end`.
