# Findings assumés — MyTimeline

> Findings d'audit couverts par une décision documentée : exclus du scoring
> (classés ASSUME). Initialisé par l'audit du 2026-07-02 à partir de
> `docs/memory/decisions.md`. À maintenir à la main : ajouter une entrée quand une
> dette est acceptée, la retirer quand elle est soldée.

| ID | Finding | Décision source | Condition de réexamen |
|----|---------|-----------------|----------------------|
| ACK-001 | CSRF désactivé + cookie JWT SameSite=Lax | DEC-S5-003 + runbook cors-cookie-samesite | Si front et API passent sur le même eTLD+1 en prod |
| ACK-002 | Identité résolue par `@CookieValue("jwt")` dans les controllers (pas `SecurityContextHolder`) | DEC-S1-003 | Follow-up #93 (migration actée) |
| ACK-003 | Rate-limiting Bucket4j in-memory mono-instance | DEC-S2-001 | Au passage multi-replicas / load-balancer → bucket4j-redis |
| ACK-004 | `BrevoEmailService` no-op silencieux sans clé API | DEC-S8-001 | Follow-up ouvert : fail-fast prod / health indicator |
| ACK-005 | Fallbacks dev committés (`jwt.secret`, `DB_PASSWORD`) dans `application-dev.properties` | DEC-S3-003 (prod fail-fast sans default) | Si le profil dev devient accessible hors localhost |
| ACK-006 | BR-EVE-011 quota par tier no-op (`PlanPolicy` renvoie toujours `true`) | Anticipation monétisation, issue #88 | À l'activation de la monétisation |
| ACK-007 | Valeurs legacy `recurrence_unit` invalides sous le CHECK V7 | PIT-S9-001 | Migration V10 planifiée S12 |
