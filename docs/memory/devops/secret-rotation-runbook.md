# Runbook — Rotation des secrets (prod)

> Créé Sprint 35 (2026-07-12) pour l'issue **#249** (rotation différée hors PR — pas encore au stade prod).
> **Mis à jour Sprint 50 (2026-07-28, #249)** : statut re-vérifié, exposition auditée, `BREVO_API_KEY`
> tranchée, section `JWT_SECRET` réalignée sur #323.
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

- Secrets concernés : `DB_PASSWORD` (**exposé**), `JWT_SECRET` (**exposé**, mais remplacé par #323),
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

## 2. `JWT_SECRET` — ⚠ ne pas rotationner : remplacé par #323

**Exposition confirmée** : `application.properties:12`, longueur 128 (hexadécimal, 512 bits),
164 commits, de `5c73971` (2025-03-14) à `993e551` (2026-06-25) — corrigé par `ff5dca3` (#34).
Exposition secondaire dans `application-test.properties:25` (longueur 90, retirée le 2026-07-11).
Cf. audit §3.2.

**L'action prévue par #249 (« régénérer `JWT_SECRET` ») est caduque.** L'issue **#323** (Sprint 50,
vague 2) doit livrer :

- `JwtService` migré de HS256 vers une **paire de clés RS256** ;
- un secret dédié **`EXPORT_TOKEN_SECRET`** pour `ExportTokenService` ;
- la **suppression** de `JWT_SECRET` de la configuration.

En conséquence, il ne faudra **pas** générer une nouvelle clé HS256 : le mécanisme lui-même disparaît.
Cette section sera à réécrire une fois #323 livrée, en s'appuyant sur
`external-services-inventory.md` **§3quater.3**.

Ce qui reste vrai quel que soit le mécanisme retenu :

- [ ] Tout changement de matériel de signature **invalide tous les jetons émis** → déconnexion
      globale : planifier une fenêtre de faible usage et **communiquer en amont**.
- [ ] Après bascule, tester un login complet (nouveau cookie `jwt` HttpOnly émis puis accepté par
      `JwtFilter` / `JwtService`) **et** un `POST /api/auth/refresh`.
- [ ] La clé privée RS256 ne quitte jamais le secrets-manager ; seule la clé publique peut circuler.
- [ ] Ne jamais réintroduire la valeur historique exposée.

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
- [ ] Matériel de signature des jetons mis en place via #323 (§2), avec communication préalable sur
      la déconnexion globale si des sessions existent à ce moment-là.
- [x] Vérification `BREVO_API_KEY` (§3) — **faite au Sprint 50 : non exposée**.
- [ ] Rotation confirmée fonctionnelle : login, envoi d'e-mail, connexion DB testés post-rotation.
- [ ] Cocher les critères d'acceptation de #249 et fermer l'issue **seulement à ce moment-là**.

## 5. Lien avec le durcissement boot (Sprint 35)

Après rotation, le boot prod exige désormais (garde-fous `ProfileSafetyGuard`, PR #280) :
`app.cookie.secure=true` (#254), `COOKIE_DOMAIN` et `CORS_ALLOWED_ORIGINS` non vides (#253),
`app.rate-limit.enabled=true` (#216), profil `prod` explicite (#111). Vérifier ces variables au
redéploiement post-rotation, sinon l'app refusera de démarrer (fail-fast — comportement attendu).

## 6. Références

- `docs/memory/audits/secret-exposure-audit.md` — audit d'exposition, méthode reproductible (S50)
- `docs/memory/devops/external-services-inventory.md` — inventaire + **§3quater** rotation par service
- `docs/memory/sprints/sprint-29/issue-112-done.md` — runbook de purge d'historique (#112)
- Issues : #249 (rotation), #323 (RS256), #250 (inventaire services), #112 (purge), #34 (externalisation)
