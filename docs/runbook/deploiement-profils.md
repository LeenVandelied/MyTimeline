# Runbook — Profils Spring & garde-fou démarrage (#111)

## Contexte

`application.properties` définit :

```properties
spring.profiles.active=${SPRING_PROFILES_ACTIVE:dev}
```

Le default `:dev` est **conservé volontairement** : `mvnw`, l'IDE et les tests
démarrent sans variable d'environnement (confort dev). Le risque historique :
en production, si `SPRING_PROFILES_ACTIVE` est oublié, Spring active
**silencieusement** le profil `dev` avec ses defaults non-secrets (`localhost`,
cookies `Secure=false`, etc.) au lieu du profil `prod` fail-fast.

## Garde-fou : `ProfileSafetyGuard` (#111)

`infrastructure/config/ProfileSafetyGuard` est un
`ApplicationListener<ApplicationEnvironmentPreparedEvent>` enregistré via
`META-INF/spring.factories`. Il s'exécute **avant** la création du contexte.

Règle :

> Si le profil **`dev`** est actif (explicite OU par fallback) **ET** qu'un
> marqueur d'environnement de production est présent
> (`ENVIRONMENT=production|prod` ou `APP_ENV=production|prod`, casse ignorée),
> le démarrage est **REFUSÉ** (`IllegalStateException`).

| Profil actif | Marqueur `ENVIRONMENT`/`APP_ENV` | Résultat boot |
|--------------|----------------------------------|---------------|
| `dev` (ou défaut) | absent / vide / `staging` | ✅ démarre (confort dev intact) |
| `dev` (ou défaut) | `production` / `prod` | ❌ **refusé** (fail-fast #111) |
| `prod` | `production` / `prod` | ✅ démarre |
| `prod` | absent | ✅ démarre |

## Procédure de déploiement production

Poser **les deux** variables (ceinture + bretelles) :

```bash
export SPRING_PROFILES_ACTIVE=prod
export ENVIRONMENT=production
# + secrets obligatoires (sinon le profil prod échoue de toute façon) :
export DB_PASSWORD=...      # via secret manager
export JWT_SECRET=...       # openssl rand -hex 64
export COOKIE_DOMAIN=app.exemple.tld   # optionnel (host-only sinon)
```

- `SPRING_PROFILES_ACTIVE=prod` : active le bon profil.
- `ENVIRONMENT=production` : arme le garde-fou. Si un oubli laisse retomber le
  profil sur `dev`, le boot échoue immédiatement et bruyamment au lieu de tourner
  en configuration dev exposée.

## Diagnostic — boot refusé

Message au démarrage :

```
ARRÊT FAIL-FAST (#111) : un marqueur d'environnement de production est présent
(ENVIRONMENT/APP_ENV) mais le profil Spring actif est 'dev'. ...
```

Action : vérifier que `SPRING_PROFILES_ACTIVE=prod` est bien exporté dans
l'environnement du process (conteneur / systemd / CI). Ne PAS retirer
`ENVIRONMENT` pour contourner — c'est le filet de sécurité.

## Impact confort dev

Aucun. En développement local, `ENVIRONMENT` n'est pas posé (ou vaut `staging`),
donc le garde-fou ne se déclenche jamais et le fallback `:dev` reste effectif.
