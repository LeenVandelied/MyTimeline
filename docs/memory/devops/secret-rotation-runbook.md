# Runbook — Rotation des secrets (prod)

> Créé Sprint 35 (2026-07-12) pour l'issue **#249** (rotation différée hors PR — pas encore au stade prod).
> **Mis à jour Sprint 50 (2026-07-28, #249)** : statut re-vérifié, exposition auditée, `BREVO_API_KEY`
> tranchée, section `JWT_SECRET` réalignée sur #323.
> **Mis à jour Sprint 50 (2026-07-28, #323)** : §2 RÉÉCRITE — `JWT_SECRET` n'existe plus,
> remplacé par `JWT_PRIVATE_KEY` (RS256) + `AUTH_JWT_PUBLIC_KEY` (frontend, non secrète) +
> `EXPORT_TOKEN_SECRET` (tokens d'export, dédié).
> **Mis à jour Sprint 68 (#358)** : §2 révisée — `AUTH_JWT_PUBLIC_KEY` **supprimée**, remplacée
> par la découverte JWKS (`AUTH_JWKS_URL`, une URL et non une clé). L'« ordre imposé » de
> rotation et le mode de panne « paire dépareillée » n'existent plus.
> À exécuter **manuellement** le moment venu. Procédure par service détaillée :
> `docs/memory/devops/external-services-inventory.md §3quater` — ✅ **le fichier existe désormais**
> (créé au Sprint 50 par #249 ; il était référencé depuis le S35 alors qu'il n'avait jamais été écrit,
> #250 n'étant pas faite).
>
> ⚠️ **RÈGLE ABSOLUE** : ne jamais coller une valeur de secret en clair dans le chat, un commit, une
> issue ou une PR. Référencer uniquement par nom de variable. Toute valeur exposée = compromise → rotation.

## Statut

- **Toujours non exécuté** au **2026-07-28** — re-vérifié dans le cadre de #249 (Sprint 50) :

  | Vérification | Commande | Résultat |
  |---|---|---|
  | Secrets GitHub Actions | `gh secret list --repo LeenVandelied/MyTimeline` | **vide** |
  | Environnements GitHub | `gh api repos/LeenVandelied/MyTimeline/environments` | `total_count: 0` |
  | Workflows | `ls .github/workflows/` | `ci.yml` seul — **aucun déploiement** |
  | Secrets-manager provider | — | inexistant |
  | Visibilité du dépôt | `gh repo view … --json visibility` | ⚠️ **PUBLIC** |

  **Il n'existe aucune cible de rotation** : rien n'est déployé. Sortir ce runbook au déploiement prod.
  Les valeurs historiquement exposées l'ont été sur un dépôt **public** → compromission à traiter
  comme certaine, indépendamment de la purge d'historique.

- Secrets concernés : `DB_PASSWORD` (**exposé**), `JWT_SECRET` (**exposé** — ✅ **SUPPRIMÉ** par
  #323, plus aucune cible de rotation ; cf. §2),
  `BREVO_API_KEY` (**non exposée — vérification close**, cf. §3).
- Audit d'exposition complet, méthode reproductible et emplacements précis :
  **`docs/memory/audits/secret-exposure-audit.md`** (Sprint 50).
- Dépendances : inventaire des services externes (#250 — socle livré au S50 par #249, à compléter)
  et runbook de purge d'historique git (#112, Sprint 29). La rotation est **distincte** de la purge :
  purger l'historique ne « décompromet » aucune valeur déjà publiée.

### Journal des rotations

| Date | Secret | Environnement | Opérateur | Motif |
|---|---|---|---|---|
| — | — | — | — | *aucune rotation exécutée à ce jour* |

> Ajouter une ligne après chaque rotation. **Jamais la valeur** — nom de variable uniquement.

## 1. `DB_PASSWORD`

**Exposition confirmée** : `backend/src/main/resources/application.properties:3`, longueur 10,
169 commits, de `e6676d6` (2025-03-03, commit initial) à `993e551` (2026-06-25) — corrigé par
`ff5dca3` (#34). ~16 mois sur un dépôt public. Cf. audit §3.1.

⚠ Séquence stricte (DB d'abord, app ensuite) pour éviter l'interruption de service.
Procédure détaillée : `external-services-inventory.md` **§3quater.1**.

- [ ] Générer un nouveau mot de passe fort (secrets-manager, jamais à la main dans le chat).
- [ ] Le poser sur le rôle Postgres : `ALTER ROLE <user> WITH PASSWORD '<nouveau>';` (côté DB).
- [ ] Mettre à jour `DB_PASSWORD` dans le secrets-manager du provider **et** `gh secret set DB_PASSWORD`
      (tous les environnements concernés).
- [ ] Redéployer le backend → vérifier la connexion DB au boot (log Flyway `validate` OK).
- [ ] **Ne jamais réutiliser la valeur historique** au provisionnement de la première base prod :
      tant que rien n'est déployé, « rotationner » revient exactement à cela.

## 2. Matériel de signature des jetons — ✅ `JWT_SECRET` SUPPRIMÉ (#323, Sprint 50)

**Exposition historique de `JWT_SECRET`** : `application.properties:12`, longueur 128
(hexadécimal, 512 bits), 164 commits, de `5c73971` (2025-03-14) à `993e551` (2026-06-25) —
corrigé par `ff5dca3` (#34). Exposition secondaire dans `application-test.properties:25`
(longueur 90, retirée le 2026-07-11). Cf. audit §3.2.

**L'action « régénérer `JWT_SECRET` » est définitivement caduque : la variable n'existe plus.**
#323 a livré la migration ; cette section décrit la configuration RÉELLE à l'arrivée.

### 2.1 Ce qui a remplacé `JWT_SECRET`

| Variable | Rôle | Secret ? | Où |
|---|---|---|---|
| `JWT_PRIVATE_KEY` | Signe les jetons d'authentification (RS256) | **OUI** | backend |
| `AUTH_JWKS_URL` | **URL** (pas une clé) du JWKS où le middleware Next DÉCOUVRE la clé publique de vérification (#358) | **NON** | frontend |
| `EXPORT_TOKEN_SECRET` | Signe les tokens de téléchargement d'export RGPD (HS256, dédié) | **OUI** | backend |

- `JWT_PRIVATE_KEY` : clé privée RSA **PKCS#8 en Base64** (armure PEM tolérée), modulus
  **≥ 2048 bits**. La clé **publique en est DÉRIVÉE au boot** (`RsaKeyMaterial.fromPkcs8`) :
  il n'y a délibérément **pas** de seconde variable côté backend — une paire dépareillée
  serait indétectable.
- `AUTH_JWKS_URL` : **#358 — il n'y a plus de clé publique à distribuer.** Le backend publie
  la sienne sur `GET /.well-known/jwks.json` (public, non authentifié) et le frontend l'y
  découvre. Seule cette URL est configurée côté frontend, une fois pour toutes ; elle ne
  change pas lors d'une rotation. ⚠ Elle doit être joignable **depuis le serveur Next**, pas
  depuis le navigateur.
- `EXPORT_TOKEN_SECRET` : HMAC Base64, ≥ 32 octets décodés. Reste symétrique **à dessein** —
  ces tokens ne sont vérifiés que par le backend (endpoint interne
  `/api/export/download/{jobId}?token=…`), aucune clé de vérification n'a à être distribuée.
  Le partage historique avec `jwt.secret` est rompu : compromettre l'un ne compromet plus l'autre.

Fail-fast au boot prod : `ProfileSafetyGuard` (#323) **refuse le démarrage** si `JWT_PRIVATE_KEY`
ou `EXPORT_TOKEN_SECRET` sont vides en prod effective. ⚠ Motif propre à `JWT_PRIVATE_KEY` : une
valeur vide ne casse **rien** au boot (le backend bascule sur une paire **éphémère**) — sans ce
garde-fou, la production déconnecterait tout le monde à chaque redéploiement, sans symptôme.

### 2.2 Génération

```bash
# Clé privée (SECRET — ne jamais committer, ne jamais coller dans un chat/issue/PR)
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out jwt.pem
openssl pkcs8 -topk8 -nocrypt -in jwt.pem -outform DER | base64   # -> JWT_PRIVATE_KEY
# (#358 — plus de seconde commande : la clé publique n'est plus distribuée à la main,
#  le backend la publie sur /.well-known/jwks.json)
# Secret des tokens de download d'export
openssl rand -base64 48                                            # -> EXPORT_TOKEN_SECRET
```

### 2.3 Distribution et rotation

⚠ **#358 — l'ordre imposé n'existe plus.** Il venait de l'existence de DEUX configurations de
clé qu'il fallait faire converger sans fenêtre de divergence. Le frontend découvrant désormais
la clé auprès du backend, une rotation se réduit à :

- [ ] Déployer la **nouvelle `JWT_PRIVATE_KEY`** côté backend, puis redémarrer. Le JWKS publie
      immédiatement la nouvelle clé publique ; le frontend la récupère de lui-même.
- [ ] Aucune action côté frontend. `AUTH_JWKS_URL` ne change pas.
- [ ] ⚠ **La rotation reste une DÉCONNEXION GLOBALE.** Le backend ne charge qu'UNE paire :
      les jetons déjà émis, signés par l'ancienne clé, deviennent invalides (côté `JwtFilter`
      comme côté middleware). Communiquer avant. Le correctif de fond — publier l'ancienne ET
      la nouvelle clé le temps que les jetons expirent — est un follow-up (le middleware essaie
      déjà toutes les clés du JWKS ; c'est le backend qui ne sait en charger qu'une).
- [ ] ⚠ **Délai de propagation, borné :** un isolat Edge peut servir l'ancienne clé jusqu'à
      **10 min** (TTL du cache), mais une signature inexplicable déclenche une re-découverte
      forcée (plafonnée à une par minute) — la bascule effective se compte donc en secondes.
- [ ] La clé privée ne quitte **jamais** le secrets-manager.
- [ ] `EXPORT_TOKEN_SECRET` se rotationne indépendamment (aucun lien avec l'auth depuis #323).
      Effet de bord : les URLs de téléchargement d'export déjà émises (TTL 24 h, ADR-003)
      deviennent invalides — l'utilisateur relance un export.

### 2.4 Bascule = déconnexion globale (stratégie de transition)

- [ ] Tout changement de matériel de signature **invalide 100 % des jetons émis** → déconnexion
      globale. **Aucune double émission HS256/RS256 transitoire n'existe** : c'est un choix
      (un vérificateur qui accepterait deux algorithmes rouvrirait la confusion d'algorithme
      que #323 vient de fermer). Planifier une **fenêtre de faible usage** et **communiquer en
      amont**. Le symptôme côté utilisateur est propre : redirection vers `/login`, aucune
      erreur 500.
- [ ] Au 2026-07-28, **rien n'est déployé** : cette bascule n'a encore eu lieu nulle part, et
      la fenêtre de déconnexion est théorique. Elle devient réelle au premier déploiement.
- [ ] Après bascule, tester un login complet (nouveau cookie `jwt` HttpOnly émis puis accepté
      par `JwtFilter` / `JwtService`), un `POST /api/auth/refresh`, **et** un téléchargement
      d'export de bout en bout.
- [ ] Vérifier dans les logs de boot backend l'**absence** du WARN « paire RS256 ÉPHÉMÈRE » —
      sa présence signifie que `JWT_PRIVATE_KEY` n'a pas été prise en compte.
- [ ] Ne jamais réintroduire la valeur historique exposée (`JWT_SECRET`) sous un autre nom.

### 2.5 Mode de panne à connaître : JWKS injoignable depuis le serveur Next

~~Clé publique dépareillée~~ → **fermé par #358** : il n'existe plus de seconde copie de la clé,
donc plus de paire dépareillable.

Le mode de panne de remplacement : `AUTH_JWKS_URL` pointe une adresse que le **serveur** Next
n'atteint pas (piège classique : y avoir mis l'URL vue du NAVIGATEUR). Effet — la garde retombe
en dégradé « présence seule », un `console.warn` one-shot est émis en production, et rien
d'autre ne le signale. Diagnostic : sonder DEPUIS le conteneur frontend
(`docker compose exec frontend wget -qO- "$AUTH_JWKS_URL"`), jamais depuis le poste de
l'opérateur. Second contrôle : `GET /.well-known/jwks.json` doit répondre **200 sans
authentification** — un 401 signifie que la whitelist de `SecurityConfig` a sauté.

## 3. `BREVO_API_KEY` — ✅ vérification close : NON exposée

L'étape « vérifier la présence dans l'historique » est **résolue** (Sprint 50, #249).
Résultat : **aucune valeur littérale de clé Brevo n'existe dans l'historique git**, sur les
727 commits de toutes les branches. Trois angles de vérification indépendants (audit §3.3) :

1. `brevo.api.key` n'apparaît que sous la forme `${BREVO_API_KEY}` (490 commits) ;
   `application.properties.example:41` porte `BREVO_API_KEY=` **vide**.
2. Le préfixe réel des clés Brevo v3 (`xkeysib-`) ne touche qu'un seul fichier de tout l'historique,
   `BrevoHealthIndicatorTest.java:36,43` — deux jetons de 20 et 26 caractères à suffixe purement
   alphabétique, donc **factices** (une vraie clé fait ~89 caractères).
3. Les autres occurrences du motif `brevo` sont de la prose dans `docs/memory/sprints/**`.

**→ Aucune rotation nécessaire pour `BREVO_API_KEY`.** Ce point ne bloque plus #249.

Si une rotation devient nécessaire un jour (fuite ultérieure) : `external-services-inventory.md`
**§3quater.2** (créer la nouvelle clé avant de révoquer l'ancienne ; vérifier la **réception** d'un
e-mail réel — `POST /api/auth/forgot-password` répond 200 même en cas d'échec, anti-énumération
BR-AUT-012, donc le code retour ne prouve rien).

⚠ Défaut connu, non corrigé : `brevo.api.key=${BREVO_API_KEY:}` a un **défaut vide** → pas de
fail-fast au boot prod si la variable manque (follow-up DEC-S8-001/002).

## 4. Clôture #249

⚠ **L'issue #249 reste OUVERTE à l'issue du Sprint 50.** Le sprint n'a livré que le volet
documentaire (audit d'exposition, inventaire des services, mise à jour de ce runbook) : les critères
d'acceptation opérationnels **ne peuvent pas** être satisfaits tant que rien n'est déployé — il n'y a
aucune base, aucun secret GitHub, aucun environnement sur lequel appliquer une rotation.

Restent à faire **par le dev, au premier déploiement prod** :

- [ ] `DB_PASSWORD` régénéré et déployé (§1) — en pratique : provisionner la base avec une valeur
      neuve, jamais celle de l'historique.
- [ ] `JWT_PRIVATE_KEY` + `EXPORT_TOKEN_SECRET` générés et déployés, `AUTH_JWKS_URL` posée (§2.2/§2.3),
      avec communication préalable sur la déconnexion globale si des sessions existent alors.
      ✅ Le MÉCANISME est livré (#323, Sprint 50) ; il reste à poser les VALEURS au déploiement.
- [x] Vérification `BREVO_API_KEY` (§3) — **faite au Sprint 50 : non exposée**.
- [ ] Rotation confirmée fonctionnelle : login, envoi d'e-mail, connexion DB testés post-rotation.
- [ ] Cocher les critères d'acceptation de #249 et fermer l'issue **seulement à ce moment-là**.

## 5. Lien avec le durcissement boot (Sprint 35)

Après rotation, le boot prod exige désormais (garde-fous `ProfileSafetyGuard`, PR #280) :
`app.cookie.secure=true` (#254), `COOKIE_DOMAIN` et `CORS_ALLOWED_ORIGINS` non vides (#253),
`app.rate-limit.enabled=true` (#216), profil `prod` explicite (#111), `JWT_PRIVATE_KEY` et
`EXPORT_TOKEN_SECRET` non vides (#323, Sprint 50). Vérifier ces variables au
redéploiement post-rotation, sinon l'app refusera de démarrer (fail-fast — comportement attendu).

## 6. Références

- `docs/memory/audits/secret-exposure-audit.md` — audit d'exposition, méthode reproductible (S50)
- `docs/memory/devops/external-services-inventory.md` — inventaire + **§3quater** rotation par service
- `docs/memory/sprints/sprint-29/issue-112-done.md` — runbook de purge d'historique (#112)
- Issues : #249 (rotation), #323 (RS256), #250 (inventaire services), #112 (purge), #34 (externalisation)
