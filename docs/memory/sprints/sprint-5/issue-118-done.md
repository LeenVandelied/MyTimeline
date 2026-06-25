# Issue #118 — Définir COOKIE_DOMAIN prod + runbook — DONE

**Commit :** 0f01b4b
**Fichiers :** application-prod.properties (commentaire) + docs/runbook/deploiement-profils.md (hub) + docs/runbook/cors-cookie-samesite.md (renvoi)
**Résumé :** Config + doc only (aucun code applicatif). Cookie lit déjà app.cookie.domain=${COOKIE_DOMAIN:} (#99).
- application-prod.properties : commentaire COOKIE_DOMAIN = étape pré-prod obligatoire si sous-domaines ; vide = cookie host-only → auth cassée silencieusement en multi-sous-domaines. Lignes #120 (CORS) non écrasées.
- deploiement-profils.md promu HUB : tableau consolidé env prod obligatoires (SPRING_PROFILES_ACTIVE, ENVIRONMENT, DB_PASSWORD, JWT_SECRET, CORS_ALLOWED_ORIGINS, COOKIE_DOMAIN + colonne « si absente »).
- cors-cookie-samesite.md renvoie au hub. UNE liste cohérente, pas de 3e runbook isolé.
**Tests :** sanity test-quiet.sh unit → 56/56 (inchangé).

**[MEMORY:decision]** deploiement-profils.md = source unique (hub) de la liste env prod obligatoires ; les autres docs référencent. Évite la dérive doc (COOKIE_DOMAIN « optionnel » vs CORS absent).

## Recommandations suite
- RECOMMAND_FOLLOWUP [S | infra, post-MVP] : aucun runtime check ne vérifie COOKIE_DOMAIN/CORS_ALLOWED_ORIGINS cohérents avec les origines réelles — la doc reste la seule garde. Envisager un health/startup log affichant la config cookie/CORS effective en prod.

STATUS: COMPLETED
