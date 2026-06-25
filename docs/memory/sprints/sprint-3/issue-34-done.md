# Issue #34 — Externaliser secrets + rotation jwt.secret — DONE

**Commits :** ff5dca3 (sur sprint/3 — cherry-pick depuis 4fa4e203 qui avait été committé par erreur sur `dev` du checkout principal ; voir note workflow)
**Vague :** V1

## Résumé
Externalisation des secrets DB + JWT vers variables d'env, rotation des 2 secrets compromis, séparation profils dev/prod. BR-AUT-002 (JWT signé via clé configurée).

## Fichiers clés
- `application.properties` — secrets via `${DB_PASSWORD}` / `${JWT_SECRET}` (aucun default), `spring.profiles.active=${SPRING_PROFILES_ACTIVE:dev}`
- `application-dev.properties` (NEW) — defaults locaux (ddl-auto=update, show-sql)
- `application-prod.properties` (NEW) — fail-fast, aucun default secret, ddl-auto=validate
- `application.properties.example` (NEW) — doc toutes variables, zéro valeur
- `frontend/.env.example` (NEW) — NEXT_PUBLIC_API_URL
- `.gitignore` — corrigé

## Choix technique
`application.properties` était tracké (secrets committés) → corriger `.gitignore` ne dé-tracke PAS. Choix : garder le fichier tracké mais secret-free (valeurs `${VAR}`), approche Spring recommandée, non disruptive. Pas de `git rm --cached`.

## Tests
Boot OK : `EventmanagerApplicationTests` (contextLoads, @SpringBootTest) profil dev → BUILD SUCCESS, placeholders résolus, Hikari connecté. Profil prod sans JWT_SECRET → fail-fast confirmé. Commande : `cd backend && mvn test -Dtest=EventmanagerApplicationTests`.
⚠ `./scripts/test-quiet.sh` ABSENT du repo — utiliser `mvn` direct.

## Signaux mémoire
- [MEMORY:pitfall] corriger `.gitignore` ne dé-tracke pas un fichier déjà suivi par git — neutraliser le fichier (secrets→`${VAR}`) ou `git rm --cached`.
- [MEMORY:decision] `application.properties` reste tracké (valeurs `${VAR}`), profils `-dev` (defaults) / `-prod` (fail-fast). Prod refuse boot sans secret.
- [MEMORY:pattern] profil prod sans default sur `${JWT_SECRET}`/`${DB_PASSWORD}` → fail-fast au boot.

## Recommandations suite
- RECOMMAND_FOLLOWUP : nettoyage historique git (BFG/filter-branch) — anciens secrets restent dans l'historique. NON exécuté (réécriture historique = validation dev requise).
- RECOMMAND_FOLLOWUP : `./scripts/test-quiet.sh` absent du repo — créer le helper OU adapter les skills sprint qui le référencent.

STATUS: COMPLETED
