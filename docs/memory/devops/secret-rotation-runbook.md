# Runbook — Rotation des secrets (prod)

> Créé Sprint 35 (2026-07-12) pour l'issue **#249** (rotation différée hors PR — pas encore au stade prod).
> À exécuter **manuellement** le moment venu. Procédure par service détaillée :
> `docs/memory/devops/external-services-inventory.md §3quater` (créé par #250 quand dispo).
>
> ⚠️ **RÈGLE ABSOLUE** : ne jamais coller une valeur de secret en clair dans le chat, un commit, une
> issue ou une PR. Référencer uniquement par nom de variable. Toute valeur exposée = compromise → rotation.

## Statut

- **Non exécuté** — projet pas encore en production (noté 2026-07-12). Sortir ce runbook au déploiement prod.
- Secrets concernés : `DB_PASSWORD`, `JWT_SECRET`, `BREVO_API_KEY` (vérif exposition).
- Dépendance : coordonner avec l'inventaire des services externes (#250) et le runbook de purge d'historique
  git (#112, Sprint 29) — la rotation est **distincte** de la purge d'historique.

## 1. `DB_PASSWORD`

⚠ Séquence stricte (DB d'abord, app ensuite) pour éviter l'interruption de service.

- [ ] Générer un nouveau mot de passe fort (secrets-manager, jamais à la main dans le chat).
- [ ] Le poser sur le rôle Postgres : `ALTER ROLE <user> WITH PASSWORD '<nouveau>';` (côté DB).
- [ ] Mettre à jour `DB_PASSWORD` dans le secrets-manager du provider **et** `gh secret set DB_PASSWORD`
      (tous les environnements concernés).
- [ ] Redéployer le backend → vérifier la connexion DB au boot (log Flyway `validate` OK).

## 2. `JWT_SECRET`

⚠ Déconnexion globale immédiate de tous les utilisateurs actifs (tokens JWT invalidés).

- [ ] Planifier une fenêtre de faible usage + communiquer en amont.
- [ ] Générer une nouvelle clé (≥ 256 bits).
- [ ] `gh secret set JWT_SECRET` + secrets-manager provider (tous envs).
- [ ] Redéployer → tester un login complet (nouveau cookie `jwt` émis et accepté par `JwtFilter` / `JwtService`).

## 3. `BREVO_API_KEY`

Vérification d'exposition d'abord.

- [ ] Vérifier la présence dans l'historique git : `git log -p -S 'BREVO' -- '*.properties' '*.env*'`
      (ou s'appuyer sur le scan du runbook de purge #112).
- [ ] Si exposée → rotation via le dashboard Brevo, puis `gh secret set BREVO_API_KEY` + provider.
- [ ] Tester un envoi (le flux forgot-password déclenche `BrevoEmailService`).

## 4. Clôture #249

- [ ] Cocher les critères d'acceptation de l'issue #249.
- [ ] Fermer l'issue une fois login + envoi email + connexion DB validés post-rotation.

## Lien avec le durcissement boot (Sprint 35)

Après rotation, le boot prod exige désormais (garde-fous `ProfileSafetyGuard`, PR #280) :
`app.cookie.secure=true` (#254), `COOKIE_DOMAIN` et `CORS_ALLOWED_ORIGINS` non vides (#253),
`app.rate-limit.enabled=true` (#216), profil `prod` explicite (#111). Vérifier ces variables au
redéploiement post-rotation, sinon l'app refusera de démarrer (fail-fast — comportement attendu).
