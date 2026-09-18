# ADR-009 — Cible de déploiement du MVP

- Statut : Accepté
- Date : 2026-09-07
- Contexte : issue #369, milestone « Mise en ligne » (jusqu'ici GELÉ — hébergeur à définir)
- Domaine impacté : `devops`, `infrastructure`, et par ricochet `auth` (cookie de session, CORS)
- Débloque : #370 (pipeline CD), #371 (sauvegardes), #249 (rotation des secrets)
- Note de numérotation : #369 réclame `ADR-008-cible-de-deploiement.md`. Ce numéro a été
  consommé entre-temps par `ADR-008-echelle-z-popover-modale.md`. Le présent ADR prend donc
  **009** ; le critère d'acceptation de #369 est à corriger en conséquence.

## Contexte

Au 2026-09-07, **rien n'est déployé** : aucun environnement GitHub, aucun secret posé, aucun
workflow de déploiement (`.github/workflows/ci.yml` est le seul workflow et ne fait que
vérifier), aucun reverse-proxy ni terminaison TLS dans le dépôt. Le runbook
`docs/ops/deploiement-profils.md` liste les variables prod obligatoires mais ne suppose aucune
plateforme — c'était précisément le trou que cet ADR comble.

Le milestone entier était bloqué sur cette décision, elle-même non technique : elle exige un
choix de plateforme et un domaine, que seul le propriétaire du projet peut poser.

## Décision

### 1. Plateforme : instance Oracle Cloud « Always Free » existante, mono-instance

Machine **mesurée** le 2026-09-07 (sonde SSH en lecture seule, pas une reprise de documentation) :

| Élément | Valeur mesurée |
|---|---|
| Shape | `VM.Standard.A1.Flex` (Oracle Always Free) |
| Architecture | `aarch64`, Ampere Neoverse-N1, 2 OCPU |
| RAM | 11 Gi disponibles (407 Mi utilisés au moment de la mesure) |
| Disque | 45 Go, dont **39 Go libres** |
| OS | Ubuntu 22.04.5 LTS |
| Outillage | Docker 29.5.3, Compose v5.1.4 **déjà installés** |
| Occupation | conteneur `ib-gateway` d'un projet antérieur, `Exited` depuis 3 semaines |
| Ports 80/443 | libres, aucun processus en écoute |

Le budget de fonctionnement de MyTimeline (Postgres + Spring Boot + Next.js standalone + Caddy)
est estimé sous **3 Go**, soit une marge de l'ordre de 4× sur les 11 Gi disponibles. Les 2 OCPU
sont un facteur limitant pour un *build*, pas pour le service.

**Topologie retenue : mono-instance, une seule réplique de chaque service.** Le projet antérieur
(bot de trading) est déclaré définitivement abandonné ; son nettoyage fait l'objet d'une issue
distincte et ne conditionne pas le déploiement.

### 2. Domaine canonique : `matimeline.com`

**Quatre** domaines sont détenus : `matimeline.com`, `matimeline.fr`, `ma-timeline.com`,
`ma-timeline.fr` (vérifié dans la console OVH le 2026-09-07). Le canonique est
**`matimeline.com`** :

- se dicte à l'oral sans « tiret », contrairement aux variantes `ma-timeline.*` ;
- `.com` cohérent avec les quatre locales servies (`fr`, `en`, `es`, `de`) — un `.fr` les
  contredirait ;
- aligné sur le package backend `com.matimeline.eventmanager` ;
- écart minimal avec les textes juridiques déjà livrés, qui citent `matimeline.fr`.

Les trois autres domaines sont conservés et **redirigés en 301** vers le canonique, `www.`
compris — soit 7 noms de redirection pour 1 canonique, tous déclarés dans le `Caddyfile`.

`APP_CANONICAL_HOST` accepte déjà une liste séparée par des virgules (comportement épinglé par
`frontend/middleware.test.ts:320`) : aucun code supplémentaire n'est nécessaire pour absorber les
domaines secondaires.

> **Correction des textes juridiques.** Les CGU et la politique de confidentialité
> (`frontend/public/locales/*/legal.json`, 4 locales) désignaient en dur `matimeline.fr` et
> `www.matimeline.fr`. Huit occurrences ont été portées sur `matimeline.com` pour que les
> textes désignent le domaine **canonique**, celui que l'utilisateur voit dans sa barre
> d'adresse ; `matimeline.fr` ne sert plus qu'à rediriger.
>
> ⚠ **Rectification d'une affirmation antérieure de cet ADR.** Une première version disait que
> `matimeline.fr` était **« un domaine non détenu »** et qualifiait le correctif de bloquant à ce
> titre. C'était **faux** : il est bien détenu. L'erreur vient d'une capture d'écran tronquée de
> la liste OVH, prise pour l'inventaire complet au lieu d'être recoupée avec la console. La
> correction reste justifiée — par la cohérence avec le canonique — mais elle n'est **pas**
> bloquante pour l'ouverture au public. Voir [[PIT-S81-006]].

### 3. Topologie réseau : mono-domaine, tout derrière un reverse-proxy

Caddy termine TLS et route sur le **même domaine** :

- `/api/*` → `backend:8080`
- tout le reste → `frontend:3000`

Aucun service applicatif n'est exposé directement. En particulier, `postgres` **ne publie plus
son port 5432 vers l'hôte**, contrairement au `docker-compose.yml` de développement.

Conséquences voulues, toutes favorables :

- navigateur et API en **same-origin** : le cookie de session reste en `SameSite=Lax` sans
  aménagement ;
- **aucun préflight CORS** en fonctionnement nominal ;
- `docs/ops/cors-cookie-samesite.md` est déjà rédigé pour ce cas de figure ;
- `#115` (externaliser `connect-src` de la CSP si l'API est cross-origin) devient **sans objet**
  dans cette topologie.

### 4. Terminaison TLS : Caddy dans le compose, certificats Let's Encrypt automatiques

Caddy est retenu plutôt que Traefik ou nginx : obtention et renouvellement des certificats
automatiques sans configuration, redirection HTTP→HTTPS par défaut, et une configuration tenant
en quelques lignes pour les trois domaines. Pas de load balancer OCI : inutile en mono-instance,
et il ajouterait une surface de configuration sans contrepartie.

### 5. Conséquences explicites sur #212 et #102 (critère d'acceptation de #369)

La mono-instance rend **non bloquantes** les deux dettes que #369 demandait d'arbitrer :

- **#212 — avatars sur volume local.** Un seul backend écrit et lit le volume `avatars-data` :
  aucune incohérence possible. La migration vers du stockage objet reste souhaitable mais
  **sort du chemin critique du MVP**. Contrepartie assumée : le volume doit être sauvegardé au
  même titre que la base (porté par #371).
- **#102 — rate-limiting en mémoire.** Le défaut « N instances = N × seuil » suppose plusieurs
  instances. Avec une seule, les compteurs Bucket4j in-process sont **exacts**. Redis n'est pas
  requis pour le MVP. Le rate-limit **par compte utilisateur** (volet 1 de #102), lui, reste une
  vraie lacune indépendante de la topologie : il est à traiter séparément.

Ces deux arbitrages sont **révocables** : ils redeviennent bloquants au premier passage à deux
instances. Toute évolution de topologie doit donc rouvrir cet ADR.

### 6. Chaîne de build : runners GitHub `arm64`, images sur GHCR

L'hôte est `aarch64` et les runners GitHub par défaut sont `x86_64`. Trois voies existaient ;
la retenue est la première :

1. **Runners GitHub `ubuntu-24.04-arm`** — build natif aarch64. Le dépôt étant **public**, ces
   runners sont gratuits. *À confirmer par un run réel : non testé sur ce dépôt à ce jour.*
2. `buildx` + QEMU sur runner x86 — écarté : l'émulation d'un build Maven puis `next build` est
   de l'ordre de plusieurs dizaines de minutes.
3. Build sur l'hôte de production — écarté : place les sources et la chaîne de build sur la
   machine qui sert les utilisateurs, et monopolise 2 OCPU pendant le build.

Les images sont poussées sur **GHCR** ; l'hôte se contente de `docker compose pull && up -d`.
Aucune source, aucun JDK, aucun Node sur la machine de production.

Les images de base actuelles (`eclipse-temurin:21-jre`, `node:20-alpine`, `postgres:16`)
publient toutes des variantes `arm64` : **aucun `Dockerfile` n'est à réécrire**. Le pinning par
digest (#251) devra en revanche viser des index multi-arch, pas un digest d'image mono-arch.

### 7. Variables d'environnement figées par cette décision

`NEXT_PUBLIC_API_URL` est **bakée au build** de l'image frontend (`ARG` → `ENV` dans
`frontend/Dockerfile`) : changer le domaine impose un **rebuild**, pas un simple redéploiement.
C'est la conséquence la plus contraignante de cet ADR.

| Variable | Valeur | Moment |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://matimeline.com/api` | **build** de l'image frontend |
| `SPRING_PROFILES_ACTIVE` | `prod` | runtime backend |
| `ENVIRONMENT` | `production` | runtime backend (arme le garde-fou #111) |
| `APP_CANONICAL_HOST` | `https://matimeline.com` | runtime frontend |
| `AUTH_JWKS_URL` | `http://backend:8080/.well-known/jwks.json` | runtime frontend |
| `CORS_ALLOWED_ORIGINS` | `https://matimeline.com` | runtime backend |
| `COOKIE_DOMAIN` | `matimeline.com` | runtime backend |
| `STORAGE_AVATAR_PATH` | `/app/var/avatars` | runtime backend |
| `STORAGE_EXPORT_PATH` | `/app/var/exports` | runtime backend |

Trois précisions qui ne se devinent pas, toutes tirées de
`docs/runbook/deploiement-profils.md` :

- **`APP_CANONICAL_HOST` doit porter le schéma** (`https://matimeline.com`), pas l'hôte nu.
  Un hôte nu ne fixe que l'hôte : un `x-forwarded-proto: http` menteur produirait alors un
  `Location` en clair alors que le canonique est en HTTPS.
- **`AUTH_JWKS_URL` est une adresse de serveur à serveur.** Le middleware Next la résout depuis
  le conteneur frontend, dans le réseau Compose : la valeur est le **nom de service interne**,
  jamais l'URL publique. Poser l'URL vue du navigateur est le piège documenté ; la garde
  retombe alors en dégradé « présence du cookie seule », avec pour seul signal un
  `console.warn`.
- ⚠ **`COOKIE_DOMAIN` est OBLIGATOIRE — rectification d'une décision antérieure de cet ADR.**
  Une première version la disait « volontairement omise », au motif qu'en mono-domaine strict le
  cookie host-only est correct. **Le premier déploiement réel a réfuté ce raisonnement** :
  `ProfileSafetyGuard` (#253) refuse le boot sur une valeur blanche sans considérer la topologie,
  et l'omettre revient exactement à la déclarer vide puisque `application-prod.properties:38`
  porte le défaut `${COOKIE_DOMAIN:}`. Le backend a bouclé sur un crash pour cette raison.
  Valeur retenue : l'eTLD+1 `matimeline.com`. Voir [[PIT-S81-009]].

> **Défaut relevé dans le runbook, à corriger.** Sa section « Variables d'environnement de
> production (liste complète) » se déclare faisant foi mais **omet `STORAGE_AVATAR_PATH` et
> `STORAGE_EXPORT_PATH`**, alors que `application-prod.properties` les lit **sans default**
> (lignes 57 et 62) : leur absence fait échouer le boot. Un opérateur suivant le runbook à la
> lettre n'arriverait pas à démarrer. `#213` ne couvre que la première des deux.
> `BREVO_API_KEY` y manque également.

Noms de variables **vérifiés** dans `application-prod.properties` (`COOKIE_DOMAIN` ligne 38,
`CORS_ALLOWED_ORIGINS` ligne 47). Leur défaut vide y est **volontaire** : c'est ce qui permet à
`ProfileSafetyGuard` de détecter une configuration prod incomplète au boot.

> **Piège à ne pas reproduire dans le compose de production.**
> `application-dev.properties:51` l'écrit noir sur blanc : ne jamais déclarer
> `APP_CORS_ALLOWED_ORIGINS` dans un fichier chargé automatiquement (`.env`, `.env.example`,
> `docker-compose.yml`). Une ligne `VAR=` exportée **vide** écrase le défaut Spring au lieu de le
> laisser s'appliquer — la variable est alors définie et vide, et le garde-fou ne la voit plus
> comme absente. Le `docker-compose.prod.yml` doit donc soit poser une **valeur réelle**, soit
> **omettre la clé**, jamais la déclarer vide.

### 8. Sauvegardes hors de l'hôte

La cible retenue pour #371 est **OCI Object Storage** (20 Go inclus dans l'offre Always Free),
donc hors de la machine applicative. Portée : la base **et** le volume `avatars-data`, tant que
#212 n'est pas livrée.

### 9. Durcissement de l'hôte — prérequis bloquant

La machine passe d'un usage privé (port 22 seul, tout le reste rejeté) à un **service public
hébergeant des données personnelles**. L'état constaté le 2026-09-07 :

```
-A INPUT -p tcp -m state --state NEW -m tcp --dport 22 -j ACCEPT
-A INPUT -j REJECT --reject-with icmp-host-prohibited
```

`rpcbind` écoute sur `0.0.0.0:111`, actuellement masqué par la règle `REJECT` finale. Pas de
`ufw`, pas de mises à jour automatiques, SSH ouvert à toute origine.

**Piège d'exploitation à consigner** : ouvrir 80/443 dans la Security List OCI ne suffit pas.
Les règles doivent être **insérées avant la ligne `REJECT`** (une règle ajoutée après elle est
morte) puis persistées via `netfilter-persistent`, faute de quoi elles disparaissent au reboot.

Le durcissement (neutralisation de `rpcbind`, `unattended-upgrades`, politique SSH) devient un
**prérequis du milestone**, pas une amélioration facultative.

## Risques assumés

- **Aucun SLA.** L'offre Always Free n'en offre aucun. Acceptable pour un MVP, à réévaluer avant
  tout engagement de disponibilité vis-à-vis d'utilisateurs.
- **Récupération des instances inactives.** Oracle se réserve de récupérer les ressources Always
  Free inactives. L'instance affiche aujourd'hui une charge de 0.00 sur 81 jours d'uptime — soit
  exactement ce profil. Héberger MyTimeline élève l'utilisation et **réduit** ce risque, mais ne
  l'élimine pas contractuellement. C'est un argument de plus pour des sauvegardes hors hôte.
- **SPOF assumé.** Mono-instance : toute panne machine est une indisponibilité totale. Le couple
  RPO/RTO effectivement atteint sera mesuré et consigné par #371, pas supposé.
- **Le boot réel en profil `prod` n'a jamais été observé.** Les garde-fous #111 et #323 n'ont
  jamais été exercés sur un démarrage réel (réserve déjà portée par #370). Le premier
  déploiement `staging` est donc autant un test de ces garde-fous qu'un déploiement.

## Alternatives écartées

- **PaaS (Railway, Render, Fly.io).** Écarté : coût récurrent là où l'instance Oracle est déjà
  disponible et dimensionnée avec 4× de marge.
- **Postgres managé.** Écarté : aucune offre gratuite dans le périmètre, et l'offre Always Free
  d'Oracle (Autonomous Database) n'est pas du PostgreSQL.
- **Deux sous-domaines `app.` / `api.`.** Écarté : impose du CORS, un cookie cross-site et une
  CSP `connect-src` externalisée (#115), pour aucun gain en mono-instance.
