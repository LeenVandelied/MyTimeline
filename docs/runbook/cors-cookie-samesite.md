# Runbook — CORS, cookie JWT & SameSite (#120)

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
| dev | `application-dev.properties` | `http://localhost:3000` |
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
