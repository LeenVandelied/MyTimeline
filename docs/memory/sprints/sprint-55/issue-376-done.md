# Issue #376 — Healthcheck frontend : cibler 127.0.0.1

RETOUR :
- commits: 1 commit, `:bug: fix(docker): cibler 127.0.0.1 dans le healthcheck frontend (#376)`.
  Ce rapport étant inclus DANS ce commit, son SHA ne peut pas y figurer (contrainte « 1 seul
  commit » du briefing) — SHA remonté au lead dans le retour d'agent, et lisible via
  `git log --oneline --grep '#376'`.
- resume:
  - `docker-compose.yml:90` — `http://localhost:3000` → `http://127.0.0.1:3000` dans la sonde
    `wget` du service `frontend`, + commentaire de 4 lignes expliquant la cause (résolution
    `::1` vs Next standalone en IPv4 seul) pour qu'un futur lecteur ne « simplifie » pas
    l'adresse en `localhost`.
  - `README.md` — **piège n° 4 SUPPRIMÉ** (section « `docker compose ps` affiche le frontend
    `unhealthy` alors qu'il fonctionne », ex-l.167-178). Arbitrage : le piège décrivait un
    comportement observable qui n'existe plus ; le réécrire en « pourquoi la sonde vise
    127.0.0.1 » aurait mis dans une section « Pièges connus » destinée à l'utilisateur une
    explication qui concerne le mainteneur du compose — elle vit désormais en commentaire
    dans `docker-compose.yml`, au contact du code.
  - `README.md:76-79` — la phrase « Ne vous fiez pas à la colonne santé de `docker compose ps`
    pour le frontend, elle est fausse — voir « Pièges connus » n° 4 » remplacée par « `docker
    compose ps` reflète fidèlement l'état des trois services ».
  - Renumérotation : **aucune nécessaire**, le n° 4 était la dernière section. Le seul autre
    renvoi du dépôt (`README.md:49`, « voir « Pièges connus » pour 5432 ») vise le n° 1,
    intact. `docs/memory/**` non touché (mémoire historique).
- verif: `docker compose up -d --build frontend` (pile absente au départ : `docker compose ps`
  = « 0 services »), attente du start_period puis relevé :

  ```
  sprint-52-start-252990-backend-1  ... Up 18 seconds (healthy) [8080, 8080]
  sprint-52-start-252990-frontend-1 ... Up 18 seconds (healthy) [3000, 3000]
  sprint-52-start-252990-postgres-1 ... Up 24 seconds (healthy) [5432, 5432]
  ```

  `docker inspect` du conteneur frontend : `"Status":"healthy"`, `"FailingStreak":0`, deux
  sondes consécutives `ExitCode: 0` — la sonde passe réellement, ce n'est pas un état résiduel.
  `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/fr` → **200**.

  Pile laissée EN MARCHE (démarrée par moi, arbitrage lead). Aucun `down -v`, aucun volume touché.
- [MEMORY:*] signaux:
  - `[MEMORY:pitfall]` PIT-S52-005 **résolu en #376**. Contexte : sonde `wget`/`curl` sur
    `localhost` dans une image alpine. Solution : viser `127.0.0.1` explicitement. Prévention :
    toute nouvelle sonde HTTP d'un compose doit cibler `127.0.0.1`, jamais `localhost` — le
    conteneur résout `localhost` en `::1` d'abord et la plupart des serveurs applicatifs de ce
    dépôt n'écoutent qu'en IPv4.
  - `[MEMORY:decision]` Contexte : une section « Pièges connus » du README documentait le bug
    corrigé. Décision : supprimer la section plutôt que la réécrire, et déplacer l'explication
    technique en commentaire dans `docker-compose.yml`. Pourquoi : « Pièges connus » s'adresse
    à l'utilisateur qui démarre la pile ; le « pourquoi 127.0.0.1 » s'adresse au mainteneur qui
    éditerait le YAML — c'est là qu'il empêche la régression.
- recommandations suite: `RECOMMAND_FOLLOWUP` — `docs/memory/pitfalls.md:564` (PIT-S52-005)
  laissé **inchangé** conformément au briefing (un pitfall historique reste vrai à sa date).
  Il mérite une mention « résolu en #376 » lors de la consolidation mémoire de fin de sprint,
  sinon un futur lecteur croira le bug encore ouvert. Idem `docs/memory/sprint-history.md:1658`.
  Second point, hors périmètre : `backend` et `postgres` sondent eux aussi `localhost`
  (`docker-compose.yml:23` et `:59`) — ils sont verts ici (`pg_isready` et `curl` retombent sur
  IPv4), donc **aucune urgence**, mais l'uniformisation en `127.0.0.1` supprimerait la
  dépendance à ce comportement de repli.

STATUS: COMPLETED
