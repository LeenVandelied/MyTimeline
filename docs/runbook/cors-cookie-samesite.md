# Runbook — CORS, cookie JWT & SameSite (#120)

> Liste consolidée des variables d'environnement prod obligatoires :
> [`deploiement-profils.md`](deploiement-profils.md) (hub déploiement). Ce
> document détaille uniquement CORS, cookie `jwt` et SameSite.

## Contexte

Trois durcissements appliqués à `infrastructure/security/SecurityConfig`
(bean `corsConfigurationSource`) et aux profils, suite au triage de clôture
Sprint 4 (PR #113).

## 1. Origines CORS externalisées par profil

`allowedOrigins` n'est plus en dur dans le code. Lu depuis la propriété
`app.cors.allowed-origins` (liste séparée par virgules), injectée via
`@Value` dans le constructeur de `SecurityConfig`.

| Profil | Source | Valeur |
|--------|--------|--------|
| dev | `application-dev.properties` ← env `APP_CORS_ALLOWED_ORIGINS` | `http://localhost:3000` par défaut, surchargeable (#428) |
| prod | `application-prod.properties` ← env `CORS_ALLOWED_ORIGINS` | OBLIGATOIRE, aucun default |
| fallback `@Value` | défaut intégré | `http://localhost:3000` (fail-safe dev, jamais wildcard) |

> ⚠️ `allowCredentials=true` INTERDIT le wildcard `*`. Chaque origine doit être
> listée explicitement. Plusieurs origines : séparer par virgules
> (ex : `https://app.mytimeline.fr,https://www.mytimeline.fr`).

### Déploiement prod

```bash
export CORS_ALLOWED_ORIGINS=https://app.mytimeline.fr
```

Valeur manquante en prod => le bean CORS échoue au boot (fail-fast) plutôt que
d'autoriser silencieusement une mauvaise origine.

### Dev local — port 3000 déjà pris (#428)

Symptôme : un autre projet du poste occupe `:3000`, le front bascule sur `:3100`
et **relaie** `Origin: http://localhost:3100` au backend. Le backend dev répond
**403**, que `auth.setup.ts` rapporte comme un « rate-limit probable ».

> ⚠️ Un `curl` de contrôle **réussit** et semble disculper le backend : il n'envoie
> aucun en-tête `Origin`, donc ne déclenche jamais le filtre CORS (PIT-S57-003).
> Pour reproduire un vrai préflight : `curl -i -X OPTIONS <url> -H 'Origin: http://localhost:3100' -H 'Access-Control-Request-Method: GET'`.

Correctif : surcharger la liste (multi-ports acceptés) au lancement du backend.

```bash
APP_CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3100 ./mvnw spring-boot:run
```

**Mesuré au S79** : cette surcharge fonctionnait **déjà** avant #428 — les variables
d'environnement priment sur les `application-*.properties` dans l'ordre de précédence
Spring Boot. Le placeholder ajouté en #428 ne débloque rien de nouveau : il rend le
levier **découvrable** dans le fichier qu'on ouvre en débogant. Le vrai défaut était
documentaire, pas fonctionnel.

> ⚠️ **Ne jamais déclarer `APP_CORS_ALLOWED_ORIGINS` dans un fichier chargé
> automatiquement** (`.env`, `.env.example`, `docker-compose`). Une ligne
> `APP_CORS_ALLOWED_ORIGINS=` exportée **vide** écrase le défaut et produit une origine
> BLANCHE — un CORS qui refuse **tout**, avec le même 403 trompeur (PIT-S55-001).
> Décision assumée : aucun garde-fou « blanc → défaut » côté code, il ferait diverger
> dev et prod (où le vide DOIT rester un fail-fast, `ProfileSafetyGuard` #253).

Comportement épinglé par
`backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/CorsAllowedOriginsConfigIntegrationTest.java`
(7 cas : défaut, surcharge mono/multi/espaces, variable vide, non-régression prod).

## 2. `Authorization` retiré de `exposedHeaders`

Depuis le passage cookie-only JWT (#104), le token vit dans le cookie HttpOnly
(illisible en JS). Le front ne lit jamais le header de réponse `Authorization`.
`exposedHeaders` ne contient plus que `Set-Cookie`.

## 3. Décision SameSite — maintien de `Lax` (PAS Strict)

Le cookie `jwt` reste posé en `SameSite=Lax`
(`AuthController.COOKIE_SAME_SITE`). **Décision : NE PAS passer à Strict.**

### Justification

- Le front Next.js est une **origine séparée** de l'API (dev : `localhost:3000`
  vs API ; prod : origine front distincte). Les requêtes authentifiées sont
  cross-site (CORS + `allowCredentials`).
- `SameSite=Strict` bloque l'envoi du cookie sur **toute** requête initiée par
  une autre origine, y compris les **navigations entrantes** depuis un lien
  externe (email de confirmation, lien partagé). Cela casserait le flux SPA.
- La protection CSRF est déjà assurée autrement : API JSON sans form-POST
  navigateur, cookie HttpOnly, clients `fetch` soumis à CORS. `Lax` suffit.

### Si un passage à Strict est reconsidéré plus tard

Le changement se fait dans `AuthController.COOKIE_SAME_SITE` (hors périmètre
#120). Pré-requis : confirmer qu'aucun flux d'auth n'est initié depuis un lien
externe, et que front + API partagent le même site (eTLD+1) en prod.
