## Objectif

Durcir la chaîne d'authentification : la garde serveur du S45 devient une **vraie barrière**
(vérification de signature en Edge, pas seulement présence du cookie), l'origine des redirections
cesse de dépendre d'un en-tête fourni par l'appelant, et la dette « secrets exposés » est enfin
instruite avec des preuves.

Milestone : **Sprint 50** (#50). Cohésion 0.52. Aucune migration Flyway.

## Issues traitées

| # | Titre | État |
|---|---|---|
| #322 | Durcir le risque résiduel d'en-tête `Host` dans la garde middleware | Livrée |
| #323 | Passer le JWT en signature asymétrique RS256 pour vérification en Edge | Livrée |
| #249 | Rotation des secrets exposés dans l'historique git | **Partielle — reste ouverte** |

> ⚠ **#249 ne doit pas être fermée par cette PR.** Les trois critères opérationnels (régénérer et
> redéployer `DB_PASSWORD`, `JWT_SECRET`, tester post-rotation) sont **inatteignables** : le projet
> n'est pas déployé (`gh secret list` vide, aucun environnement, aucun workflow de déploiement).
> Cette PR livre l'audit, l'inventaire manquant et le runbook corrigé. La rotation effective revient
> au dev au premier déploiement.

## Quatre prémisses du plan infirmées au démarrage (mesurées, pas supposées)

1. **`#249` n'avait aucune cible de rotation.** Projet non déployé, aucun secret configuré nulle
   part. L'exposition historique est en revanche **réelle** : `53175da` portait un
   `spring.datasource.password` (10 car.) et un `jwt.secret` (128 car.) littéraux ; `c6ea19e` un
   secret de test (68 car.). **Le dépôt est PUBLIC** — ces valeurs sont définitivement compromises,
   la purge d'historique (#112) n'y changera rien. `BREVO_API_KEY` n'a **jamais** été exposée
   (scan sur 727 commits, 3 angles d'attaque).
2. **`docs/memory/devops/external-services-inventory.md` n'existait pas**, alors que le rapport
   architecte l'annonçait présent (« la dépendance F3 est levée ») et que le runbook S35 comme la
   règle de sécurité globale le référencent par ce chemin exact. **Chemin fantôme, 4ᵉ sprint
   consécutif.** Le fichier est créé ici, avec sa §3quater.
3. **L'option (a) de `#322` — « Host canonique au proxy » — était inapplicable** : aucun
   reverse-proxy dans le dépôt (`docker-compose.yml` = postgres + backend + frontend,
   `.github/workflows/` = `ci.yml` seul). Remplacée, sur décision du dev, par un **Host canonique
   par variable d'environnement** (`APP_CANONICAL_HOST`), fail-closed et testable sans infra.
4. **Le périmètre RS256 était sous-estimé** : `ExportTokenService` est un **second** consommateur de
   `${jwt.secret}` que le plan ne voyait pas. Sans le traiter, l'étape « retirer `JWT_SECRET` de la
   config » était inexécutable. Décision : clé dédiée `EXPORT_TOKEN_SECRET`, HS256 conservé (ces
   jetons ne sont vérifiés que côté serveur).

## Changements clés

**#322 — origine canonique des redirections** (`bf9dec0`)
- Nouveau module pur `frontend/src/lib/canonical-host.ts`, appliqué en aval via
  `withCanonicalOrigin` — couvre la 307 de la garde **et** les redirections de next-intl, qui
  dérivent toutes de `request.nextUrl`.
- Variable non configurée ⇒ dégradé explicite (comportement d'avant #322), jamais un 500.
- ⚠ **L'agent a infirmé une partie de l'énoncé de l'issue** : sur ce runtime self-hosté, `initURL`
  dérive de l'hôte de *bind*, pas de l'en-tête `Host` — un `Host` falsifié ne déplaçait déjà pas la
  redirection (mesuré au `curl`, 3 cas). Le correctif est de la **défense en profondeur**, et
  redevient nécessaire avec `trustHostHeader` ou sur plateforme edge. Écrit tel quel dans l'ADR.

**#323 — signature RS256 vérifiable en Edge** (`1758c0c`)
- `JwtService` migré en RS256 ; clé publique **dérivée** de la privée côté backend (pas de seconde
  variable serveur). Signature publique de la classe inchangée ⇒ **aucun des 15 consommateurs
  modifié**.
- Vérification Edge en **WebCrypto natif** — aucune dépendance ajoutée. `alg === 'RS256'` exigé
  avant tout appel cryptographique (`alg: none` et HS256-signé-avec-la-publique rejetés des deux
  côtés).
- `ExportTokenService` bascule sur `EXPORT_TOKEN_SECRET` : l'isolation auth ↔ download est
  désormais **double** (claim `typ` + matériel de clé disjoint).
- `ProfileSafetyGuard` gagne un 6ᵉ garde-fou : refus de boot en prod si les clés manquent.
  Dev/test/CI : paire RS256 **éphémère générée au boot** — zéro clé committée (dépôt public).
- Bascule **sèche**, sans double émission transitoire : rien n'est déployé, aucun parc
  d'utilisateurs à ménager, et un double chemin de signature serait une surface d'attaque.

**#249 — audit d'exposition** (`3f0f1b2`)
- `docs/memory/audits/secret-exposure-audit.md`, `docs/memory/devops/external-services-inventory.md`
  (nouveau, §3quater), runbook corrigé. Aucune valeur de secret n'apparaît nulle part.

**Correctifs de review** (`d7b8049`) · **Couverture E2E** (`44bc3cc`).

## BR impactées

- **BR-AUT-007** amendée : le cookie d'authentification est désormais signé en **RS256** (émission
  et validation), et sa signature est vérifiable côté Edge sans exposer de secret d'émission.
- Jetons de téléchargement d'export (#58, ADR-003) : mécanisme inchangé, **matériel de clé séparé**.
  Le contrat « `verify()` ne lève jamais » est préservé.

## Review batch

**0 CRITIQUE / 3 MAJEUR / 6 MINEUR** — tous résolus (`d7b8049`).

Majeurs :
1. **Dégradé silencieux sur clé illisible** — une `AUTH_JWT_PUBLIC_KEY` tronquée faisait accepter
   100 % des cookies sans aucun signal, et le test E2E qui documente le dégradé restait vert.
   `console.warn` one-shot ajouté quand la variable est **présente mais inexploitable** (absente =
   dégradé volontaire, reste muet).
2. **Audit auto-contradictoire** — l'audit de vague 1 décrivait comme « en dur au HEAD » trois
   valeurs que #323 avait supprimées en vague 2, sur la même branche. §4 ré-ancrée sur `1758c0c`.
3. **`APP_CANONICAL_HOST` absente du runbook de déploiement** — oubli garanti au premier
   déploiement, donc dégradé open-redirect silencieux.

Le correcteur a par ailleurs **infirmé une partie du mineur m1** : le repli Base64 à 76 colonnes
n'existe pas sur BSD/macOS (donc invisible depuis le poste de dev) mais bien en conteneur Linux —
mesuré, 6 lignes pour 300 octets. Correctif appliqué avec la nuance en commentaire.

## Audit tests

`docs/memory/audits/sprint-50-test-coverage.md`

| Suite | Résultat |
|---|---|
| Backend | **450 / 450** |
| Frontend (Vitest) | **788 / 788**, 88 fichiers |
| E2E signature (stack appairée) | **12 / 0** |
| E2E suite complète (mode dégradé, config CI) | **96 passed / 8 skipped / 0 failed** |

**Preuve anti-faux-positif** (leçon S49 — « CI verte ≠ page correcte ») : un E2E de garde peut être
vert en mode dégradé et ne rien prouver. Trois preuves ont été exigées : clé publique du backend
identique octet à octet à celle du frontend, sonde `curl` avec cookie bidon ⇒ 307, et **fail-closed
exécuté** — la même spec relancée contre un Next sans clé passe à 5 rouges sur 7.

## Risques résiduels assumés

- **Aucun garde-fou frontend n'impose `AUTH_JWT_PUBLIC_KEY` ni `APP_CANONICAL_HOST` en production**
  (pas d'équivalent frontend au `ProfileSafetyGuard`) ⇒ un oubli dégrade silencieusement. Follow-up.
- **La 2ᵉ passe E2E ajoutée à `ci.yml` n'a jamais tourné sur un runner GitHub** — step de keygen
  exécuté verbatim en local. À observer au premier push ; `e2e` n'est pas un check requis.
- **Révocation `jti` non vérifiable en Edge** — `JwtFilter` reste seul juge. Inchangé.
- **Clé publique dépareillée ⇒ boucle vers `/login`** (remède : vider la variable). La clé publique
  est désormais journalisée au boot dans les deux cas pour éviter la re-dérivation manuelle.
- **Repli Base64 GNU** vérifié en alpine, pas sur l'image de déploiement finale.
- **Aucun boot réel observé** pour le log de clé publique et les `console.warn` des correctifs.

## Follow-ups proposés (triage en `/sprint end`)

Endpoint JWKS · garde-fou frontend prod pour les deux variables · couverture E2E du mode « clé
présente mais illisible » · consolidation des pitfalls périmés (PIT-S13-003, PIT-S15-003, pattern
`${JWT_SECRET}`) · `.env.example` sans `BREVO_API_KEY` · scan de secrets en CI
(gitleaks/trufflehog) · `brevo.api.key` sans fail-fast prod · #250 (socle livré, à compléter) ·
#112 purge d'historique, à séquencer après le premier provisionnement.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
