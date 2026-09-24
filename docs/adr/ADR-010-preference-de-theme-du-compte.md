# ADR-010 — Préférence de thème portée par le compte, arbitrée à la connexion

- Statut : Accepté (validé tel quel par le propriétaire du projet le 2026-09-24)
- Date : 2026-09-24
- Contexte : Sprint 111, issue #653 — follow-up de #642 (Sprint 83, PR #650)
- Domaine impacté : `auth` (profil de l'utilisateur courant, projection `/me`, export RGPD)
- Décisions amont : DEC-S82-009 (`docs/memory/decisions.md:773` — bascule de thème globale,
  exposée hors connexion, persistance en 3 temps) ; DEC-S83-003 (seul le temps 1, local, livré)

## Contexte

DEC-S82-009 a posé un motif de persistance en trois temps :

1. **avant connexion** : le choix vit dans le stockage local du navigateur (`next-themes`) ;
2. **à la connexion** : la préférence du compte gagne si elle existe, sinon le choix local est
   adopté et devient celle du compte ;
3. **ensuite** : la préférence du compte fait foi, y compris sur un autre appareil.

#642 (Sprint 83) n'a livré que le temps 1 (DEC-S83-003) : aucune préférence de thème n'existait
côté serveur — ni colonne, ni champ domaine, ni route. Deux critères d'acceptation de #642 sont
restés non tenus : « le choix fait avant connexion est conservé après » et « un compte avec
préférence explicite n'est pas écrasé par le choix local ».

Le point délicat est de distinguer **« le compte n'a jamais choisi »** de **« le compte a choisi
de suivre le système »**. Sans cette distinction, la règle d'arbitrage du temps 2 est
indécidable : un compte neuf écraserait le choix local par un défaut qu'il n'a jamais exprimé.

## Décision

### 1. Stockage : colonne `users.theme_preference`, NULLABLE, bornée par CHECK

Migration `V16__user_theme_preference.sql` :

- `theme_preference varchar(16)` **NULLABLE**, sans défaut ;
- contrainte nommée `ck_users_theme_preference CHECK (theme_preference IN ('light','dark','system'))`
  (un `NULL` satisfait un CHECK en SQL : la contrainte ne borne que les valeurs posées) ;
- **`NULL` = « pas encore de choix explicite »**, sémantique porteuse de la règle d'arbitrage ;
  `system` est un choix explicite (« suivre l'OS »), distinct de `NULL`.

Aucun backfill : tous les comptes existants partent à `NULL`, donc adopteront leur choix local à
leur prochaine connexion — c'est exactement le temps 2.

Valeurs en **minuscules** en base comme dans l'API : ce sont celles de `next-themes`
(`light`/`dark`/`system`), consommées telles quelles par le front. Le domaine porte une enum
`ThemePreference { LIGHT, DARK, SYSTEM }` ; un `AttributeConverter` JPA dédié
(`ThemePreferenceConverter`) traduit enum ↔ minuscules. `@Enumerated(STRING)` est écarté : il
écrirait les noms de constantes (`LIGHT`), en majuscules, contraires au CHECK.

### 2. Écriture : endpoint dédié `PUT /api/me/preferences`

```
PUT /api/me/preferences
{ "themePreference": "light" | "dark" | "system" }
→ 200 + UserResponse à jour
```

- validation stricte (`@NotNull` + `@Pattern` à correspondance exacte, sensible à la casse) :
  toute autre valeur — `null`, absente, `""`, `"LIGHT"`, `" dark"`, `"auto"` — donne **400**
  `VALIDATION_FAILED`. Un corps absent ou illisible donne 400 (Spring) ;
- sémantique de remplacement idempotente (`PUT`) : deux appels identiques laissent le même état ;
- identité **toujours** dérivée du JWT (`CallerResolver`), jamais du corps : pas d'id client,
  ownership structurel comme les autres routes `/api/me` ;
- on ne remet **pas** un compte à `NULL` par l'API : une fois un choix explicite posé, le compte
  en porte toujours un. Revenir à « suivre l'OS » passe par `system`.

**`PATCH /api/me` n'est PAS assoupli.** Il exige `name`/`username`/`email` en `@NotBlank`
(`UserUpdateRequest.java:15,19,23`) : y ajouter un champ optionnel obligerait le front à renvoyer
tout le profil pour basculer un thème, et mêlerait une préférence d'affichage à la route qui porte
l'oracle 409 du username (throttlée pour cette raison, #134).

### 3. Écriture isolée côté persistance (pas de recopie générique)

`UserRepositoryJpaImpl.save` recopie les champs mutables du `User` domaine sur l'entité gérée
(`copyMutableFields`). Cinq chemins reconstruisent un `User` pour le sauver (PATCH profil,
change-password, reset-password, upload et suppression d'avatar). Si `copyMutableFields`
recopiait aussi le thème, chacun de ces chemins **effacerait** la préférence à la moindre
modification de profil tant qu'il n'est pas mis à jour — et tout nouveau chemin futur aussi.

Retenu : `copyMutableFields` **ne touche pas** `theme_preference` ; la préférence ne s'écrit que
par le port dédié `UserRepository.updateThemePreference(userId, preference)`. Les autres
écritures du profil la préservent par construction.

La lecture est hydratée **dans l'adaptateur** (`UserRepositoryJpaImpl.toDomain` →
`User.withThemePreference`), pas dans `UserMapper` : ce mapper vit en couche `application` et
chaque nouvel accès à `UserEntity` y ajouterait une dépendance application → infrastructure,
refusée par `ArchitectureTest` (règle 2, dette gelée). Même motif que
`ProductRepositoryJpaImpl.toDomainWithoutEvents` (#711). Conséquence assumée : le `User`
propriétaire embarqué dans un `Product` (via `ProductMapper`) porte `themePreference = null` ;
il n'est jamais projeté en `UserResponse`.

### 4. Lecture : `UserResponse.themePreference`

`UserResponse` gagne `themePreference` (`"light"` | `"dark"` | `"system"` | `null`), toujours
présent dans le JSON (clé à `null` quand aucun choix). La même projection sert **`GET /api/me`**
(`UserController`) **et `GET /api/auth/me`** (`AuthController`, lu par l'`AuthContext` du front au
montage) : c'est ce dernier que le front lira à la connexion.

### 5. Export RGPD

La préférence est une donnée personnelle de configuration : `UserDataExport.ExportedProfile`
porte `themePreference` (valeur minuscule ou `null`), rendue par les renderers JSON, CSV et
Markdown (le ZIP réutilise les trois).

### 6. Règle d'arbitrage (exécutée côté FRONT)

> **Précisé au Sprint 111, vague 2 (volet front, décision du lead)** — la première rédaction
> arbitrait aussi « au montage de l'`AuthContext` sur une session existante » et envoyait
> `system` à défaut de choix local. Les deux points ont été resserrés ci-dessous ; le
> pourquoi est dans les Conséquences.

À la **connexion explicite** (succès de `login` dans `AuthContext`) — et **pas** à la
restauration d'une session existante au montage (`GET /api/auth/me` sur cookie) :

- si `themePreference` du compte est **non nulle** → elle s'applique localement et **écrase**
  le choix local ; elle n'est **pas** réécrite sur le compte ;
- si elle est **nulle** et qu'un choix local **explicite** existe (clé `theme` présente dans
  `localStorage` : next-themes ne l'écrit que sur un choix) → ce choix est envoyé par
  `PUT /api/me/preferences` et devient celui du compte ;
- si elle est **nulle** et qu'il n'y a **aucun** choix local → rien n'est écrit, le compte
  reste `null` (le thème affiché, `system` par défaut, n'est pas un choix) ;
- ensuite, toute bascule écrit **localement et**, si un utilisateur est authentifié, sur le
  compte (pas d'appel si la valeur est déjà celle du compte). Un `PUT` en échec laisse le
  thème local appliqué, sans retour arrière visuel ni message bloquant.

`register` n'est pas un point d'arbitrage : l'inscription n'ouvre pas de session (aucun cookie
posé, l'écran renvoie vers la connexion) — l'arbitrage a lieu au login qui suit.

Le serveur ne tranche pas : il n'a pas connaissance du choix local. Il garantit seulement les
deux primitives (lecture avec `null` distinguable, écriture stricte).

### 7. Rate-limit et CSRF

- **Rate-limit : hors périmètre, délibérément** (rangé dans la liste « DELIBERATELY out of
  scope » de `RateLimitingFilter`). La route n'expose aucun oracle inter-comptes (ownership
  structurel, réponse identique quel que soit l'état des autres comptes), elle est idempotente
  et coûte un `UPDATE` mono-ligne sur l'enregistrement du caller. Un plafond par IP pénaliserait
  une bascule répétée légitime et les utilisateurs derrière un NAT partagé. L'abus reste
  authentifié, donc attribuable et révocable (sessions).
- **CSRF** : aucune mesure spécifique, alignement sur les autres routes mutantes `/api/me`
  (`csrf.disable()` global, mitigation par le cookie `SameSite=Lax` — BR-AUT-007 — qu'un `PUT`
  cross-site n'emporte pas, et par le pré-vol CORS qu'impose un `PUT` JSON).

## Conséquences

- BR-AUT-013 (nouvelle) consigne la règle ; BR-AUT-008 mentionne le champ dans la projection.
- Le contrat Zod `UserSchema` du front (vague 2) doit accepter `themePreference` nullable ; un
  schéma qui le rendrait obligatoire et non nul casserait la lecture de tout compte existant.
- La prochaine migration est **V17**.
- **Arbitrage à la connexion explicite seulement** (S111, vague 2). Raisons : lecture littérale
  de « à la connexion » (temps 2 de DEC-S82-009) ; et une vingtaine de specs E2E fixent le thème
  par `localStorage` sous la session partagée (`storageState`) — un arbitrage au montage les
  rendrait dépendantes de l'ordre d'exécution des specs qui basculent le thème sur ce compte.
  **Conséquence assumée** : un appareil déjà connecté ne suit une préférence changée ailleurs
  qu'à sa **reconnexion** (pas au rechargement).
- **Aucun choix local → aucune écriture** : le compte reste `null` tant qu'aucun choix n'a été
  fait, ni avant ni après connexion. Envoyer `system` par défaut aurait fabriqué un choix
  explicite que l'utilisateur n'a jamais exprimé — la distinction `null`/`system` du § 1 le
  perdrait dès la première connexion.
- Front : `hooks/useThemeChoice.ts` reste le seul module qui écrit le thème ; la persistance
  lui est injectée par `ThemePersistenceContext` (fourni par `AuthProvider`), l'application
  sans réécriture passe par `useApplyAccountTheme` (réservé à `AuthProvider`). La clé
  `localStorage` est imposée à next-themes (`THEME_STORAGE_KEY`).

## Risques assumés

- **Deux onglets / deux appareils ouverts** : la préférence de compte n'est relue qu'à
  l'établissement de la session ; une bascule sur l'appareil A n'est pas poussée en direct vers
  l'appareil B déjà ouvert. Acceptable : le critère est « appliquée sur un second appareil »,
  à sa connexion.
- **Course à la première connexion simultanée sur deux appareils sans préférence** : les deux
  peuvent envoyer leur choix local ; le dernier `PUT` gagne. Sans gravité (préférence
  d'affichage), pas de verrou.

## Alternatives écartées

- **`NOT NULL DEFAULT 'system'`** : rend « jamais choisi » indistinguable de « suivre l'OS » ; le
  temps 2 écraserait tout choix local fait avant la première connexion. Contraire au critère.
- **Assouplir `PATCH /api/me`** : voir § 2.
- **Stockage en table `user_preferences` clé/valeur** : sur-dimensionné pour une seule
  préférence ; à reconsidérer si plusieurs préférences apparaissent.
- **`@Enumerated(EnumType.STRING)`** : voir § 1 (casse).
