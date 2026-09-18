# Mini-plans architect — Sprint 50

> Généré par /sprint plan (architect, 2026-07-28, ancrage HEAD fc2a3a0). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").

## Thème : Chaîne d'authentification : rotation secrets + garde serveur — cohésion 0.52
## Milestone GitHub : #50 | Effort : 10 pts | Migrations : aucune | Dépend de : (aucune)

## Vagues
- Vague 1 (parallèle, fichiers disjoints) : #249 (volets `DB_PASSWORD` + `BREVO_API_KEY` UNIQUEMENT), #322
- Vague 2 (après vague 1) : #323 + volet `JWT_SECRET` de #249 — FUSIONNÉS (la paire RS256 EST la rotation)

## Décisions dev actées au plan (2026-07-28)
- **#322 : option (a) Host canonique au proxy** — le reverse-proxy force le Host canonique en amont,
  le middleware fait confiance. Choix validé explicitement par le dev en Phase 3. Le volet applicatif
  de #322 devient : documenter/vérifier la conf proxy + garde minimale côté middleware + ADR-004 §Limites.
- **Point de contrôle fin de vague 1 (mitigation RISQUE 2)** : si #323 n'est pas engagé en fin de
  vague 1, rotationner `JWT_SECRET` en HS256 immédiatement sans attendre. Le secret prime sur
  l'élégance du séquencement.
- Une seule fenêtre de déconnexion globale (bascule RS256), à planifier/communiquer.

```yaml
issue_0322:
  fichiers_cles:
    - "frontend/middleware.ts"
    - "docs/adr/ADR-004-garde-serveur-middleware.md"
  couches_touchees: ["frontend", "infrastructure"]
  strategie_test: "unit+E2E"
  risque_regression: "Une allow-list non synchronisée avec les domaines de preview/staging renvoie 500 ou boucle de redirection sur tout l'environnement non-prod."
  ordre_ecriture: "1) DÉCISION DEV ACTÉE : option (a) Host canonique au proxy. 2) implémenter la validation avant construction de loginUrl. 3) test avec en-tête Host falsifié. 4) mettre à jour ADR-004 §Limites."
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé non livré. frontend/middleware.ts:69 fait `request.nextUrl.clone()` puis
    NextResponse.redirect(loginUrl, 307) ligne 73. Commentaire lignes 62-68 documente
    explicitement le risque assumé (« le `Host` hostile reste un risque »). Aucune
    allow-list, aucune validation d'origine dans le fichier.

issue_0323:
  fichiers_cles:
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java"
    - "frontend/middleware.ts"
    - "docs/adr/ADR-004-garde-serveur-middleware.md"
  couches_touchees: ["infrastructure", "frontend"]
  strategie_test: "unit+integration+E2E"
  risque_regression: "Bascule RS256 invalide 100% des jetons en circulation — toute session active est déconnectée sans préavis si la fenêtre n'est pas planifiée."
  ordre_ecriture: "1) génération + distribution de la paire de clés (config secrets, JAMAIS en dur). 2) JwtService : émission RS256. 3) validation backend RS256. 4) vérification de signature via clé publique dans middleware.ts (APRÈS #322). 5) plan de transition + communication déconnexion globale. 6) retirer JWT_SECRET de la config (= volet JWT de #249)."
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé non livré. JwtService.java lignes 60 et 78 : `.signWith(getSigningKey(), Jwts.SIG.HS256)`
    figé explicitement, clé via `Keys.hmacShaKeyFor(keyBytes)` ligne 49. Commentaire lignes 57-59
    justifie le figeage HS256 pour ne pas invalider les jetons legacy. middleware.ts ne vérifie
    aucune signature (seule la présence du cookie est testée).

issue_0249:
  fichiers_cles:
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java"
    - "docs/memory/devops/external-services-inventory.md"
  couches_touchees: ["infrastructure"]
  strategie_test: "integration"
  risque_regression: "Séquencement inverse sur DB_PASSWORD (app avant DB) = interruption de service."
  ordre_ecriture: "Vague 1 : rotation DB_PASSWORD + BREVO_API_KEY selon procédure external-services-inventory.md §3quater (JAMAIS de valeur de secret dans le chat/briefing — noms de variables uniquement). Vague 2 : JWT_SECRET traité par #323 (suppression au profit de la paire RS256)."
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Action opérationnelle, non détectable par grep sur le code applicatif. Le label `sprint-35`
    était PÉRIMÉ (retiré au plan S50). `docs/memory/devops/external-services-inventory.md` existe
    (procédure §3quater) → la dépendance F3 est levée.
```

## Contraintes transverses S50
- SÉCURITÉ SECRETS (règle absolue CLAUDE.md global) : aucune valeur de secret dans les briefings,
  chats ou commits — noms de variables uniquement. Si exposition accidentelle : rotation < 30 min.
- #322 et #323 touchent tous deux `frontend/middleware.ts` → jamais en parallèle.
- ADR requis : scission #249 en deux volets + fusion volet JWT dans #323.
