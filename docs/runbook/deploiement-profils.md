# Runbook — Profils Spring & garde-fou démarrage (#111)

> **Hub déploiement prod.** Ce runbook porte la **liste consolidée des variables
> d'environnement de production obligatoires** (section dédiée ci-dessous). Les
> détails CORS / cookie / SameSite vivent dans
> [`cors-cookie-samesite.md`](cors-cookie-samesite.md) — référencé, pas dupliqué.

## Variables d'environnement de production (liste complète)

À poser **avant** tout déploiement avec `SPRING_PROFILES_ACTIVE=prod`. Aucune
n'a de default deviné : une variable manquante fait soit échouer le boot
(fail-fast), soit dégrader silencieusement la sécurité — voir colonne « si absente ».

| Variable | Rôle | Obligatoire | Si absente |
|----------|------|:-----------:|------------|
| `SPRING_PROFILES_ACTIVE=prod` | Active le profil prod (fail-fast secrets, `ddl-auto=validate`) | ✅ | Fallback `:dev` silencieux → bloqué par le garde-fou #111 si `ENVIRONMENT` posé |
| `ENVIRONMENT=production` | Arme le garde-fou #111 (ceinture + bretelles) | ✅ | Pas de filet : un oubli de profil ferait tourner la config `dev` exposée |
| `DB_PASSWORD` | Mot de passe datasource | ✅ | **Boot échoue** (fail-fast, aucun default secret) |
| `JWT_PRIVATE_KEY` | Clé PRIVÉE RS256 de signature des JWT, PKCS#8 Base64, ≥ 2048 bits (#323) | ✅ | **Boot échoue** (garde-fou #323). ⚠ Sans ce garde-fou l'app démarrerait sur une paire **éphémère** : déconnexion globale à chaque redéploiement, sans symptôme |
| `EXPORT_TOKEN_SECRET` | Secret HMAC DÉDIÉ des tokens de download d'export RGPD (#323), Base64 ≥ 32 o. | ✅ | **Boot échoue** (garde-fou #323) |
| `AUTH_JWT_PUBLIC_KEY` *(frontend)* | Clé PUBLIQUE SPKI Base64 — vérification de signature du cookie `jwt` dans le middleware Next (#323). **Pas un secret** | ⚠️ recommandé | Garde **dégradée** : présence du cookie seule (comportement d'avant #323). Aucun garde-fou frontend ne le détecte |
| `CORS_ALLOWED_ORIGINS` | Origine(s) front autorisée(s), liste CSV (#120) | ✅ | **Boot échoue** (bean CORS fail-fast) — détails : [`cors-cookie-samesite.md`](cors-cookie-samesite.md) §1 |
| `COOKIE_DOMAIN` | Domaine du cookie `jwt` (#118), eTLD+1 pour les sous-domaines | ⚠️ conditionnel | Cookie **host-only** : OK en mono-domaine, **auth cassée silencieusement** en multi-sous-domaines |

> `COOKIE_DOMAIN` est **obligatoire dès que** front et API sont sur des
> sous-domaines distincts du même site (ex. `app.mytimeline.app` + `api.mytimeline.app`) :
> poser `COOKIE_DOMAIN=mytimeline.app` (l'eTLD+1, pas un sous-domaine) pour que le
> cookie couvre tous les sous-domaines. En mono-domaine strict, l'omettre est
> acceptable (host-only). Détails cookie / SameSite : [`cors-cookie-samesite.md`](cors-cookie-samesite.md).

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

Poser **toutes** les variables de la section « Variables d'environnement de
production » ci-dessus (la liste fait foi). Exemple :

```bash
# Profil + garde-fou (ceinture + bretelles)
export SPRING_PROFILES_ACTIVE=prod
export ENVIRONMENT=production
# Secrets obligatoires (sinon le profil prod échoue au boot) :
export DB_PASSWORD=...      # via secret manager
# #323 — JWT_SECRET (HS256) N'EXISTE PLUS. Signature asymétrique RS256 :
#   openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out jwt.pem
#   openssl pkcs8 -topk8 -nocrypt -in jwt.pem -outform DER | base64   # -> JWT_PRIVATE_KEY
#   openssl rsa -in jwt.pem -pubout -outform DER | base64             # -> AUTH_JWT_PUBLIC_KEY
export JWT_PRIVATE_KEY=...       # via secret manager, JAMAIS committée
export EXPORT_TOKEN_SECRET=...   # openssl rand -base64 48
# Côté FRONTEND (variable de runtime, non secrète — doit correspondre à JWT_PRIVATE_KEY) :
export AUTH_JWT_PUBLIC_KEY=...
# CORS — origine(s) front, obligatoire, aucun default (#120) :
export CORS_ALLOWED_ORIGINS=https://app.mytimeline.app
# Cookie — obligatoire dès qu'il y a des sous-domaines (#118), eTLD+1 :
export COOKIE_DOMAIN=mytimeline.app
```

- `SPRING_PROFILES_ACTIVE=prod` : active le bon profil.
- `ENVIRONMENT=production` : arme le garde-fou. Si un oubli laisse retomber le
  profil sur `dev`, le boot échoue immédiatement et bruyamment au lieu de tourner
  en configuration dev exposée.
- `CORS_ALLOWED_ORIGINS` / `COOKIE_DOMAIN` : voir le tableau et
  [`cors-cookie-samesite.md`](cors-cookie-samesite.md) pour le détail.

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
