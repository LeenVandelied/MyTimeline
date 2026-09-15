# Issue #249 — bilan (Sprint 50, vague 1)

- pack_lu: OUI — br-auth §BR-AUT-012 — Mot de passe oublié : token à usage unique, expiration courte, anti-énumération (Sprint 8 #49)
- perimetre: documentaire (audit + docs). AUCUNE rotation exécutée. AUCUN fichier backend/frontend touché.

## audit (727 commits, toutes branches ; longueurs/emplacements seuls, AUCUNE valeur)

- DB_PASSWORD = **EXPOSÉ**. `application.properties:3`, len 10, 169 commits,
  `e6676d6`(2025-03-03, initial) → `993e551`(2026-06-25), corrigé `ff5dca3`(#34). Absent du HEAD.
- JWT_SECRET = **EXPOSÉ**. `application.properties:12`, len 128 hex, 164 commits,
  `5c73971`(2025-03-14) → `993e551`(2026-06-25), corrigé `ff5dca3`. Absent du HEAD.
  Secondaire : `application-test.properties:25`, len 90, retiré 2026-07-11.
- BREVO_API_KEY = **NON EXPOSÉE**. 3 angles : `${BREVO_API_KEY}` seul (490 commits) ; préfixe réel
  `xkeysib-` → 1 seul fichier (`BrevoHealthIndicatorTest.java:36,43`), jetons len 20/26 à suffixe
  alphabétique = factices (vraie clé ~89) ; reste = prose markdown.
- Aucun autre motif haute confiance (`SG.`, `sk_live_`, `whsec_`, `AKIA`, `ghp_`, `xoxb-`, `AIza`,
  bloc PRIVATE KEY) dans l'historique.

## aggravant non prévu au brief

- Dépôt **PUBLIC** (`gh repo view` → `isPrivate:false`). Exposition ~16 mois lisible par tous.
  Purge #112 ne décompromet rien.
- 3 valeurs de forme « secret réel » **encore au HEAD** : `.env.example:26` JWT_SECRET len 64 sans
  marqueur de placeholder (**indéterminé**), `application-test.properties:28` len 68,
  `ci.yml:169` len 64. Fichiers hors périmètre → non modifiés.

## fichiers livrés

- `docs/memory/audits/secret-exposure-audit.md` (nouveau)
- `docs/memory/devops/external-services-inventory.md` (nouveau, avec **§3quater**)
- `docs/memory/devops/secret-rotation-runbook.md` (mis à jour)
- `docs/memory/sprints/sprint-50/issue-249-done.md` (ce fichier)

## services externes inventoriés (constatés dans le code)

PostgreSQL 16 (`DB_PASSWORD`) · Brevo (`BREVO_API_KEY`, `BrevoEmailService`, `api.brevo.com/v3/smtp/email`)
· Crowdin (`crowdin.yml`, jeton = placeholder, absent de la CI) · GitHub Actions (aucun secret)
· Google Fonts (sans secret, dépendance runtime `ds/tokens/fonts.css:5`).
Un seul client HTTP sortant dans tout le backend. Aucun SDK cloud/Stripe/Sentry/broker.

## critères d'acceptation #249

1. `DB_PASSWORD` régénéré+redéployé → **NON**. Aucune cible : `gh secret list` vide,
   `environments` = 0, aucun workflow de déploiement, rien de déployé.
2. `JWT_SECRET` régénéré+redéployé → **NON**, et **caduc** : #323 (vague 2) supprime `JWT_SECRET`
   au profit de RS256 + `EXPORT_TOKEN_SECRET`. Pas de rotation HS256 à faire.
3. Vérification `BREVO_API_KEY` → **SATISFAIT** (non exposée, preuve reproductible).
4. Aucune valeur en clair dans issue/commits/PR → **SATISFAIT** (filtre salé, longueurs+formes seules).
5. Rotation confirmée fonctionnelle → **NON**. Rien à tester, rien de déployé.

**Issue #249 laissée OUVERTE. Non fermée, critères opérationnels non cochés.**

## reste à faire par le dev (actions opérateur)

- Au 1er provisionnement prod : `DB_PASSWORD` neuf, **jamais** la valeur historique.
- Laisser #323 poser RS256 ; ne pas régénérer de secret HS256.
- Post-déploiement : tester login + envoi e-mail + connexion DB, puis cocher/fermer #249.
- Purge d'historique #112 : à faire **après** avoir acté que les valeurs sont inutilisables.

## [MEMORY:*]

- `[MEMORY:pitfall]` Contexte: audit de secrets sous agent. Solution: canaliser `git grep` dans un
  filtre qui n'émet que longueur+forme+hash salé par run ; jamais `git show <rev>:<fichier>` brut.
  Prévention: le sel aléatoire par run rend le hash non réutilisable hors du run.
- `[MEMORY:pitfall]` Chemin fantôme, 4e sprint consécutif : `external-services-inventory.md` était
  référencé par le runbook S35 ET par la règle globale du poste sans avoir jamais été écrit.
  Prévention: vérifier l'existence de tout chemin cité par un plan architecte avant de le croire.
- `[MEMORY:decision]` Contexte: #249 demandait une rotation. Décision: livrer audit+docs, laisser
  l'issue ouverte. Pourquoi: aucune cible de rotation n'existe (rien de déployé) ; « rotationner »
  se réduit à ne pas réutiliser les valeurs exposées au 1er déploiement.
- `[MEMORY:business-rule]` Le dépôt est public : toute valeur ayant transité par un commit est
  compromise définitivement, purge d'historique comprise.

## recommandations suite (RECOMMAND_FOLLOWUP)

- R3 `.env.example:26` — JWT_SECRET len 64 sans marqueur de placeholder, indiscernable d'un vrai
  secret ; risque de copie telle quelle en `.env`. Remplacer par un placeholder explicite.
- R4 `.env.example` n'a pas `BREVO_API_KEY` (divergence avec `application.properties.example`).
- R5 `application-test.properties:28` — sortir le `jwt.secret` en dur (généré au run / var CI).
- R6 Aucun scan de secrets en CI → poser `gitleaks`/`trufflehog` (aucun garde-fou anti-réintroduction).
- R7 `brevo.api.key=${BREVO_API_KEY:}` défaut vide → pas de fail-fast prod (DEC-S8-001/002).
- #250 (inventaire services) : socle livré ici, à compléter/clôturer.
- #112 (purge historique) : à séquencer après R1/R2.

STATUS: COMPLETED
