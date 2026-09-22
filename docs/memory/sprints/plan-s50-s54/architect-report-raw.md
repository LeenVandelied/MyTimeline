# Rapport architecte brut — Plan S50–S54 (généré 2026-07-28, /sprint plan 5)

> Rapport intégral de l'agent architect (a92d6addef32059f7), HEAD ancrage = fc2a3a0.
> Les mini-plans YAML par sprint seront extraits vers `sprint-NN/architect-plans.md`
> en Phase 4 après validation dev. NE PAS éditer ce fichier — archive.

`[GARDE-FOU]` HEAD = `fc2a3a0ad31ad5d23e52fa351072d55ebb4e8630` — OK, aligné origin/dev.
`[MÉTHODE]` Tous chemins vérifiés par `ls`/`grep` dans le worktree. Cohésion = moyenne des scores par paire, `|∩|/|∪|` + 0.2 si epic:* commun.

**Fil directeur proposé : « Durcir avant d'élargir ».** Phase 1 (S50–S52) solde la dette de sécurité accumulée depuis la garde serveur du S45 ; Phase 2 (S53–S54) solde la dette design/frise du S48/S49 et réarme le filet E2E. Justification du choix : les 7 P1 ouverts non bloqués pèsent 24 pts ; à ≤3 issues/sprint, ils structurent seuls les 5 sprints. L'ordre intra-P1 est arbitré par **preuve d'exploitabilité** : #249 (secret réellement exposé) et #322/#323 (garde non vérifiante) > #328 (bug mesuré, mobile) > #102 (contournable) > #346 (couplage **latent**, aucun ratio mesuré, auto-déclaré sans consommateur).

---

### Sprint 50 — Chaîne d'authentification : rotation + garde serveur — cohésion 0.52 (domaines : secrets, jwt, middleware, auth-guard, deploy-config)
**Effort :** 10 points | **Migrations Flyway :** aucune | **Dépend de :** (aucune)

| # | Titre | P | Size | Epic | Domaine |
|---|-------|---|------|------|---------|
| #249 | Rotation des secrets exposés dans l'historique git | P1 | S | devops | secrets, deploy-config, jwt |
| #322 | Durcir le risque résiduel d'en-tête Host (allow-list ou Host canonique) | P1 | M | auth | middleware, auth-guard, deploy-config |
| #323 | JWT en signature asymétrique RS256 pour vérification en Edge | P1 | M | auth | jwt, middleware, auth-guard, deploy-config |

**Vagues d'exécution intra-sprint :**
- Vague 1 (parallélisable — fichiers disjoints) : #249 *(volet `DB_PASSWORD` + `BREVO_API_KEY` uniquement)*, #322
- Vague 2 (après vague 1) : #323 + volet `JWT_SECRET` de #249 — **fusionnés**

`[DÉCISION ARCHI — ADR requis]` **#249 est scindé en deux volets, pas reporté.** `DB_PASSWORD` et `BREVO_API_KEY` tournent en vague 1 (zéro impact utilisateur). `JWT_SECRET` n'est **pas** rotationné isolément : #323 le remplace par une paire de clés RS256, ce qui **est** la rotation. Rotationner HS256 en S50 puis le supprimer en vague 2 = travail jeté + **deux** déconnexions globales au lieu d'une. Réponse directe à l'arbitrage n°1 : le secret ne fait **pas** l'objet d'un report — il est traité au sprint immédiat, avec une fenêtre de déconnexion unique.

`[CONFLIT]` #322 et #323 modifient tous deux `frontend/middleware.ts` → séquencement obligatoire, jamais parallèle. #323 dépend en outre de la décision d'infra de #322 (proxy canonique vs allow-list) : la stratégie de garde doit être tranchée avant d'y brancher une vérification de signature.

```yaml
issue_0322:
  fichiers_cles:
    - "frontend/middleware.ts"
    - "docs/adr/ADR-004-garde-serveur-middleware.md"
  couches_touchees: ["frontend", "infrastructure"]
  strategie_test: "unit+E2E"
  risque_regression: "Une allow-list non synchronisée avec les domaines de preview/staging renvoie 500 ou boucle de redirection sur tout l'environnement non-prod."
  ordre_ecriture: "1) trancher option (a) Host canonique au proxy vs (b) allow-list applicative — dépend de la cible de déploiement, à déterminer par le lead. 2) implémenter la validation avant construction de loginUrl. 3) test avec en-tête Host falsifié. 4) mettre à jour ADR-004 §Limites."
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
  ordre_ecriture: "1) génération + distribution de la paire de clés (config secrets, JAMAIS en dur). 2) JwtService : émission RS256. 3) validation backend RS256. 4) vérification de signature via clé publique dans middleware.ts (APRÈS #322). 5) plan de transition + communication déconnexion globale. 6) retirer JWT_SECRET de la config."
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
  possibly_done: false
  etat_reel_du_code: |
    Action opérationnelle, non détectable par grep sur le code applicatif. Le label `sprint-35`
    et le milestone « Sprint 35 » sont PÉRIMÉS (pitfall documenté : label sprint-* != livrée).
    `docs/memory/devops/external-services-inventory.md` existe (procédure §3quater référencée
    dans le CLAUDE.md global) → la dépendance F3 est levée.
```

---

### Sprint 51 — Frise : bug de rotation + dette d'implémentation — cohésion 0.40 (domaines : timeline-mobile, timeline-render, viewport-scroll, perf, a11y)
**Effort :** 7 points | **Migrations Flyway :** aucune | **Dépend de :** (aucune — indépendant de S50)

| # | Titre | P | Size | Epic | Domaine |
|---|-------|---|------|------|---------|
| #328 | Scroll horizontal de la frise perdu à la rotation portrait ↔ paysage | P1 | M | events | timeline-mobile, viewport-scroll, react-state |
| #349 | Lisser les saccades de défilement, alléger les recalculs de zoom | P2 | S | events | timeline-render, perf, react-memo |
| #351 | Deux défauts d'implémentation relevés en review | P3 | XS | events | timeline-render, a11y, listeners |

**Vagues d'exécution intra-sprint :**
- Vague 1 (parallélisable — fichiers disjoints) : #328 *(`useTimelineMobileState.ts` + `TimelineResponsive.tsx`)*, #349 *(`TimelineView.tsx` + `lib.ts`)*
- Vague 2 (après vague 1) : #351 *(`TimelineView.tsx` + `useTimelineViewport.ts`)*

`[JUSTIFICATION FILL P2/P3]` #349 et #351 se recouvrent mutuellement sur `TimelineView.tsx` et le déclarent tous deux (« séquencer, ne pas paralléliser »). Les grouper avec #328 évite **deux passes distinctes** sur le même lot de code récent (post-#69). Ce n'est pas du remplissage de capacité : c'est l'évitement d'un conflit inter-sprints.

```yaml
issue_0328:
  fichiers_cles:
    - "frontend/src/components/timeline/useTimelineMobileState.ts"
    - "frontend/src/components/timeline/TimelineResponsive.tsx"
    - "frontend/e2e/timeline-mobile.spec.ts"
  couches_touchees: ["frontend"]
  strategie_test: "unit+E2E"
  risque_regression: "Rejouer scrollToToday au changement de variante écraserait la position utilisateur au lieu de la restaurer — inversion du bug, pas correction."
  ordre_ecriture: "1) hisser scrollLeft en state React (ou dériver de viewportStart déjà hissé). 2) réagir au CHANGEMENT DE VARIANTE, pas au montage. 3) resynchroniser la fenêtre minimap. 4) étendre la spec E2E de rotation pour asserter scrollLeft (et non plus seulement la sélection)."
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé non livré. useTimelineMobileState.ts:91 `const [viewportStart, setViewportStart] = useState(0)`
    et ligne 88 le reducer de zoom sont bien hissés ; le commentaire ligne 40 le dit explicitement
    (« NE SONT PAS réinitialisés »). scrollLeft reste DOM : lignes 140 et 173 le lisent/écrivent
    sur `el` directement, sans état React. TimelineResponsive.tsx:32 documente « La rotation
    portrait ↔ paysage démonte/remonte » — cause exacte confirmée.

issue_0349:
  fichiers_cles:
    - "frontend/src/components/timeline/TimelineView.tsx"
    - "frontend/src/components/timeline/lib.ts"
    - "frontend/src/components/timeline/TimelineView.perf.stories.tsx"
  couches_touchees: ["frontend"]
  strategie_test: "unit"
  risque_regression: "Une mémoïsation incrémentale trop agressive rétrécit la bande de virtualisation et réintroduit des trous de frontière (événements manqués)."
  possibly_done: false
  etat_reel_du_code: |
    Banc de mesure présent et rejouable : TimelineView.perf.stories.tsx + stress-fixtures.ts
    existent dans frontend/src/components/timeline/. ADR-007 présent dans docs/adr/.
    Optimisation à MESURER avant/après, pas à estimer.

issue_0351:
  fichiers_cles:
    - "frontend/src/components/timeline/TimelineView.tsx"
    - "frontend/src/components/timeline/useTimelineViewport.ts"
  couches_touchees: ["frontend"]
  strategie_test: "unit"
  risque_regression: "Cibler scrollEl au lieu de window en capture peut perdre l'événement si la frise est imbriquée dans un conteneur défilant (drawer, plein écran)."
  possibly_done: false
  etat_reel_du_code: |
    ⚠ CHEMIN FANTÔME CORRIGÉ. L'issue cite `frontend/src/hooks/useTimelineViewport.ts` —
    N'EXISTE PAS. Vrai chemin : `frontend/src/components/timeline/useTimelineViewport.ts`.
    Défaut 2 confirmé à la ligne 206 : `window.addEventListener('scroll', schedule, { passive: true, capture: true })`.
    Défaut 1 confirmé : les deux cales sont à TimelineView.tsx:756 et :849 (l'issue dit 754/847,
    décalage de 2 lignes) — `<div aria-hidden="true" data-testid="timeline-lane-spacer">` enfants
    directs de `<div role="list" data-testid="timeline-lane-list">` (ligne 753), sans role="presentation".
```

---

### Sprint 52 — Rate-limiting distribué et politique d'authentification — cohésion 0.47 (domaines : rate-limiting, auth-endpoints, security-policy, redis-infra)
**Effort :** 8 points | **Migrations Flyway :** aucune | **Dépend de :** S50 (#323 fige le contrat de jeton avant d'en durcir les protections)

| # | Titre | P | Size | Epic | Domaine |
|---|-------|---|------|------|---------|
| #102 | Rate-limiting auth par compte + backend distribué (Redis) | P1 | M | auth | rate-limiting, redis-infra, auth-endpoints |
| #134 | Anti-énumération username (409) + rate-limit sur /api/me | P2 | S | auth | rate-limiting, auth-endpoints, error-contract |
| #148 | Harmoniser la politique de complexité du mot de passe | P2 | S | auth | validation, security-policy, zod-sync |

**Vagues d'exécution intra-sprint :**
- Vague 1 (parallélisable — fichiers disjoints) : #102 *(`RateLimitingFilter.java`, `pom.xml`, `docker-compose.yml`)*, #148 *(DTOs + `schemas/auth.ts`)*
- Vague 2 (après vague 1) : #134 *(`RateLimitingFilter.java` — même fichier que #102 → séquentiel obligatoire)*

```yaml
issue_0102:
  fichiers_cles:
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java"
    - "backend/pom.xml"
    - "docker-compose.yml"
  couches_touchees: ["infrastructure"]
  strategie_test: "integration"
  risque_regression: "Un fallback in-memory silencieux en prod (Redis mal configuré) redonne exactement le contournement N-instances que l'issue corrige, sans aucun signal."
  ordre_ecriture: "1) service Redis dans docker-compose.yml. 2) dépendance bucket4j-redis dans pom.xml. 3) remplacer le store ConcurrentHashMap par RedisProxyManager en gardant la clé IP. 4) AJOUTER le compteur par username (2e clé). 5) fallback in-memory + log WARN explicite au boot. 6) tests d'intégration blocage par username multi-IP."
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé non livré. RateLimitingFilter.java:158 `ConcurrentHashMap<String, Bucket> buckets`
    (in-process), ligne 415 `return request.getRemoteAddr()` (clé IP seule). Le javadoc ligne 67
    dit « buckets live in a ConcurrentHashMap inside » — limitation assumée. backend/pom.xml:181
    ne contient qu'un COMMENTAIRE mentionnant bucket4j-redis « when scaling out », aucune
    dépendance déclarée. Aucun service redis dans docker-compose.yml.

issue_0134:
  fichiers_cles:
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java"
    - "backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java"
  couches_touchees: ["application", "infrastructure"]
  strategie_test: "integration"
  risque_regression: "Changer 409 → statut neutre casse l'affichage d'erreur du frontend qui consomme aujourd'hui ce contrat."
  possibly_done: false
  etat_reel_du_code: |
    Confirmé non livré. RateLimitingFilter.java:86-93 — la map LIMITS ne contient que
    « POST /api/auth/{login,register,refresh,forgot-password,reset-password} ». AUCUNE entrée
    /api/me ni /api/me/change-password. Le javadoc ligne 65 précise que la clé est « exact-URI
    based » → les chemins /api/me ne peuvent pas matcher par préfixe.

issue_0148:
  fichiers_cles:
    - "backend/src/main/java/com/matimeline/eventmanager/application/dtos/RegisterRequest.java"
    - "backend/src/main/java/com/matimeline/eventmanager/application/dtos/ResetPasswordRequest.java"
    - "frontend/src/lib/schemas/auth.ts"
  couches_touchees: ["application", "frontend"]
  strategie_test: "unit"
  risque_regression: "Durcir la validation serveur peut rejeter au LOGIN des mots de passe existants conformes à l'ancienne politique — la contrainte ne doit porter que sur création/modification."
  zod_dto_sync: "OUI"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé, et PLUS divergent que l'issue ne le décrit. 3 niveaux au lieu de 2 :
    (a) frontend/src/lib/schemas/auth.ts:72-76 `createRegisterFormSchema` = min 6 + /[A-Z]/ + /[0-9]/ ;
    (b) MÊME FICHIER ligne 51, `RegisterSchema` (schéma non-i18n, même contrat) = min(6) SEUL —
        divergence INTRA-fichier non mentionnée par l'issue ;
    (c) backend RegisterRequest.java:22 et ResetPasswordRequest.java:19 = @Size(min=6) seul.
    Le commentaire auth.ts:116 documente le choix « PAS d'exigence majuscule/chiffre ici » pour reset.
    → 3 politiques coexistent. Élargir le périmètre à RegisterSchema.
```

---

### Sprint 53 — Dette de cascade CSS et couplage fond/encre du DS — cohésion 0.48 (domaines : cascade-layer, ds-components, tailwind-cascade, contrast-a11y)
**Effort :** 6 points | **Migrations Flyway :** aucune | **Dépend de :** (aucune)

| # | Titre | P | Size | Epic | Domaine |
|---|-------|---|------|------|---------|
| #346 | Couplage fond/encre sous `focus:` dans 5 menus déroulants | P1 | S | design | ds-components, contrast-a11y, ast-guard |
| #339 | `h1..h6 { margin: 0 }` non-layerisé annule les `mb-*` | P2 | S | design | ds-tokens-css, cascade-layer |
| #340 | Auditer les fichiers CSS non-layerisés restants | P2 | S | design | app-styles-css, cascade-layer |

**Vagues d'exécution intra-sprint :**
- Vague 1 (parallélisable — fichiers disjoints) : #346 *(`components/ui/*.tsx` + tests AST)*, #339 *(`ds/tokens/base.css`)*
- Vague 2 (après vague 1) : #340 *(audit des autres fichiers CSS — doit connaître le verdict de #339 sur la méthode de layerisation)*

`[PRÉREQUIS NON NÉGOCIABLE]` Les trois issues sont invalidables par jsdom. Mémoire projet « CI verte ≠ page correcte » : le S48 a livré 2 CTA invisibles (1.00:1) **après** CI verte. **Vérification navigateur obligatoire, clair ET sombre, avant merge.** Une CI verte ne clôt aucune de ces trois issues.

```yaml
issue_0346:
  fichiers_cles:
    - "frontend/src/components/ui/dropdown-menu.tsx"
    - "frontend/src/components/ui/select.tsx"
    - "frontend/src/components/ui/button.hover-pairing.test.ts"
    - "frontend/src/components/landing/landing.hover-pairing.test.ts"
  couches_touchees: ["frontend"]
  strategie_test: "unit+E2E"
  risque_regression: "Repasser SelectContent en « fonctionnel » par effet de bord contredirait l'arbitrage « décoratif » acté au S49."
  possibly_done: false
  etat_reel_du_code: |
    Confirmé non livré, aux 5 emplacements EXACTS annoncés. `focus:bg-accent focus:text-accent-foreground`
    présent à dropdown-menu.tsx:77, :95, :131, :214 et select.tsx:121. Les 2 garde-fous AST existent
    bien (button.hover-pairing.test.ts, landing.hover-pairing.test.ts) mais ne couvrent ni
    components/ui/ dans son ensemble ni le préfixe focus:.

issue_0339:
  fichiers_cles:
    - "frontend/src/styles/ds/tokens/base.css"
    - "frontend/src/components/landing/FooterSection.tsx"
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: "Layeriser h1..h6 en bloc réactive d'un coup toutes les marges/graisses aujourd'hui silencieusement annulées dans TOUTE l'app — décalages potentiels hors landing (dashboard, formulaires)."
  possibly_done: false
  etat_reel_du_code: |
    Confirmé non livré. base.css:21 `h1, h2, h3, h4, h5, h6 {` est HORS de tout @layer.
    Le premier `@layer base {` du fichier n'apparaît qu'à la ligne 44, précédé du commentaire
    lignes 35-43 qui documente que SEULES les règles sur `<a>` ont été layerisées (DEC-S48-002).

issue_0340:
  fichiers_cles:
    - "frontend/src/styles/animations.css"
    - "frontend/src/styles/landing.css"
    - "frontend/src/styles/hero-timeline.css"
    - "frontend/src/styles/ds/components/"
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: "Encapsuler une règle qui fonctionnait « par accident » hors layer change l'ordre de cascade et peut casser un rendu correct aujourd'hui."
  possibly_done: false
  etat_reel_du_code: |
    Confirmé. Comptage @layer : animations.css = 0, hero-timeline.css = 0, landing.css = 1
    (donc partiellement layerisé). Les 3 fichiers cités par l'issue existent aux chemins annoncés.
```

---

### Sprint 54 — Réarmement du filet E2E de la frise — cohésion 0.46 (domaines : e2e-playwright, timeline-testid, e2e-setup)
**Effort :** 8 points | **Migrations Flyway :** aucune | **Dépend de :** S51 (#328/#349/#351 modifient le comportement de scroll/virtualisation que ces specs asserteront — écrire les tests avant serait les réécrire)

| # | Titre | P | Size | Epic | Domaine |
|---|-------|---|------|------|---------|
| #331 | Exposer des `data-testid` sur les `SelectItem` Radix | P2 | S | events | timeline-testid, radix, component-markup |
| #330 | Couvrir les 18 `data-testid` de la frise sans spec E2E | P2 | M | events | e2e-playwright, timeline-testid |
| #329 | `auth.setup.ts` : retry sur l'échec de rendu de `/fr/register` | P2 | S | events | e2e-setup, resilience |

**Vagues d'exécution intra-sprint :**
- Vague 1 (parallélisable — fichiers disjoints) : #331 *(`EventEditForm.tsx`, `NewEventDrawer.tsx`)*, #329 *(`e2e/auth.setup.ts`)*
- Vague 2 (après vague 1) : #330 *(specs E2E — consomme les testids posés par #331)*

`[ORDRE IMPOSÉ]` #331 avant #330 : écrire 18 specs contre des sélecteurs `.nth(n)` puis les réécrire une fois les testids posés = double travail. #329 d'abord dans l'absolu (un setup fragile bloque les 68 tests), mais il est sur un fichier disjoint → parallèle.

```yaml
issue_0330:
  fichiers_cles:
    - "frontend/e2e/timeline.spec.ts"
    - "frontend/e2e/timeline-mobile.spec.ts"
    - "frontend/src/components/timeline/TimelineView.tsx"
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: "18 testids traités comme une PR atomique = dérive garantie ; l'issue elle-même recommande le découpage par lot fonctionnel."
  ordre_ecriture: "Découper en 3 lots : (a) drawer/overlays — timeline-drawer, -close, -overlay, -landscape-drawer-overlay, -actionsheet-overlay, -sheet-overlay, -sheet-grabber ; (b) contrôles zoom/aide/plein écran — timeline-zoom-out, -help, -fullscreen, -today, -weekend ; (c) minimap/états — timeline-minimap-viewport, -loading, -live-region, -event-outside-label, desktop-edit-trigger, mobile-delete-trigger. Un lot = une PR."
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé non couvert. Échantillon de 8 des 18 testids grepé sur tout frontend/e2e/ :
    timeline-drawer, -help, -today, -weekend, -zoom-out, -minimap-viewport, -loading, -fullscreen
    → 0 fichier de spec pour CHACUN des 8. Les 20 specs de frontend/e2e/ n'en exercent aucun.

issue_0331:
  fichiers_cles:
    - "frontend/src/components/EventEditForm.tsx"
    - "frontend/src/components/events/NewEventDrawer.tsx"
    - "frontend/e2e/timeline.spec.ts"
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: "Aucun — ajout d'attributs non intrusif. Le risque réel est de NE PAS le faire : un réordonnancement des options fait cliquer les tests sur la mauvaise valeur, sans alerte."
  possibly_done: false
  etat_reel_du_code: |
    Confirmé, chemins de l'issue à corriger. L'issue cite « EventEditForm.tsx:436-438 » — EXACT,
    mais le fichier est à `frontend/src/components/EventEditForm.tsx` (racine components/, PAS
    components/events/). SelectItem WEEK/MONTH/YEAR bien aux lignes 436-438, sans data-testid.
    Sélecteur produit : NewEventDrawer.tsx:215-217, sans data-testid. Référence existante
    confirmée : ProductDrawer.tsx:315 `product-category-option-${category.id}`.
    Ciblage fragile confirmé : timeline.spec.ts:221 `.getByRole('option').nth(1).click()`.

issue_0329:
  fichiers_cles:
    - "frontend/e2e/auth.setup.ts"
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: "Un retry mal calibré masque un vrai bug de rendu récurrent — le message final doit lister le nombre de tentatives et la nature de la dernière erreur."
  possibly_done: false
  etat_reel_du_code: |
    Confirmé, avec périmètre PRÉCISÉ. Un retry EXISTE déjà (boucle REGISTER_RETRIES, lignes 50-71)
    mais couvre uniquement la BOUCLE DE SOUMISSION du formulaire. Le rendu initial n'est pas
    protégé : ligne 46 `await page.goto('/fr/register')` puis ligne 47
    `await expect(page.getByTestId('register-form')).toBeVisible()` — un 500 transitoire y jette
    immédiatement, hors boucle, sans page.reload(). Le message d'échec lignes 63-66 accuse en dur
    « rate-limit register 5/min/IP probable ». Le correctif porte sur les lignes 46-47, pas sur la
    boucle existante.
```

---

### Matrice de conflits (issues qui NE PEUVENT PAS être dans des sprints différents)

| Issue A | Issue B | Fichier(s) en commun | Statut au plan |
|---|---|---|---|
| #322 | #323 | `frontend/middleware.ts` | ✅ co-planifiées S50 (vagues 1→2) |
| #249 | #323 | `JwtService.java` + config `JWT_SECRET` | ✅ co-planifiées S50 (volet JWT fusionné en vague 2) |
| #102 | #134 | `RateLimitingFilter.java` | ✅ co-planifiées S52 (vagues 1→2) |
| #349 | #351 | `TimelineView.tsx` | ✅ co-planifiées S51 (vagues 1→2) |
| #331 | #330 | `frontend/e2e/timeline.spec.ts` | ✅ co-planifiées S54 (vagues 1→2) |
| #339 | #340 | famille `@layer` / cascade DS | ✅ co-planifiées S53 |
| #340 | **#343** | `frontend/src/styles/hero-timeline.css` | ⚠ #343 NON planifiée — **ne pas la planifier hors S53** |
| #340 | **#352** | `frontend/src/styles/landing.css` | ⚠ #352 NON planifiée — **ne pas la planifier hors S53** |
| #347 | **#348** | `frontend/src/components/landing/HeaderSection.tsx` (logo `md:text-3xl` L.86 ↔ débordement palier `md`) | ⚠ aucune des deux planifiée — **jamais séparées** |
| #342 | **#353** | `frontend/src/components/ui/language-selector.tsx` | ⚠ aucune des deux planifiée — **jamais séparées** |
| #346 | #342 / #353 | `dropdown-menu.tsx` importé par `language-selector.tsx` | ⚠ si #342/#353 sont insérées, les mettre en aval de S53 |
| #354 | #347 | markup CTA landing + specs E2E contraste | ⚠ aucune planifiée — à grouper |

---

### Issues non planifiées (backlog — ~85 issues)

**P1 écartées — justification individuelle :**

- **#212 (Migration stockage avatar MinIO/S3, M).** Écartée des 5 sprints. Vérifié : `StoragePort.java` + `LocalStorageAdapter.java` + `StorageConfig.java` présents et fonctionnels — l'upload d'avatar **marche aujourd'hui**. C'est une migration de scalabilité/ops sans gain utilisateur, et la cible de production (S3 ? MinIO auto-hébergé ?) **n'est pas déterminée** — à déterminer par le lead avant planification. Elle introduit aussi de nouveaux secrets, donc à programmer **après** la discipline de rotation posée en S50. Bloquant secondaire : #215 (401 multipart via proxy Next, `test.fixme`) non résolu — on ne devrait pas migrer un stockage dont le chemin E2E est encore désarmé.
- **#307 (Que faire d'un événement archivé ?, M).** **BLOQUÉE** — décision produit Option A (vue « archivés ») vs Option B (archivage définitif) non tranchée. Non planifiable. Effet de bord à connaître : bloque aussi le critère E2E de #232 et l'UX de #230. **Décision produit à solliciter auprès du lead** — c'est le seul déblocage possible.

**Familles écartées :**

- **Dette design landing restante (8 issues, ~12 pts)** — #338 (bloquée : contenu juridique non générable par un agent), #341, #342, #343, #347, #348, #352, #353, #354. Toutes vérifiées comme réelles. Écartées par capacité seule, pas par pertinence. **Candidate évidente pour un S55** : cohésion interne élevée, mais respecter les 4 paires du tableau de conflits.
- **Aperçu du drawer (#325, #326)** — écartées : #326 touche `EventEditForm.tsx` (644 lignes), surface **partagée** par la création (drawer), l'édition (`EventDrawer`, `TimelineEditHost`) et `ConflictDialog` — vérifié : `EventPreviewTimeline` est monté depuis `EventEditForm.tsx:512`, pas depuis `NewEventDrawer.tsx`. Risque de régression sur 4 surfaces pour un gain esthétique. À traiter avec #325 (vérification visuelle) en un seul aller-retour.
- **Hygiène hexagonale backend (#170, #185, #190, #221, #321, #240, #244, #175)** — refactorings sans effet utilisateur, à grouper en un sprint dédié « dégel ArchUnit » (#190 pose la baseline, les autres la dégèlent progressivement — ordre imposé).
- **i18n (#72, #74, #90, #142, #172, #271, #278, #279)** — famille cohérente, aucun P1, candidate à un sprint dédié.
- **Follow-ups de review P3 XS (#84, #96, #97, #136, #144, #239, #241, #256, #257, #262, #268, #310, #312, #350)** — trop granulaires pour structurer un sprint ; à absorber en marge des sprints thématiques correspondants. Note : **#350 (suppression `TimelineCalendar.tsx`) est vérifiée exécutable dès maintenant** — voir Risques.
- **DevOps / CI (#169, #182, #183, #248, #250, #251, #272, #308, #319, #320, #246)** — pas de P1, candidates à un sprint outillage.
- **Export RGPD (#264, #265, #266, #267)** — labels `sprint-36` **périmés** (pitfall confirmé), milestone « Sprint 36 » ouvert = reliquat à ignorer. Ce sont des candidates normales, écartées par priorité seule.
- **#88 (champ `tier` User + PlanPolicy, S)** — cas particulier, voir Risques : **seule candidate du backlog créant une vraie migration V16**.
- **#67 (limite 4000 occurrences)** — re-triagée, voir Risques.

---

### Risques identifiés

`[RISQUE 1 — MAJEUR] Le fil proposé reste SANS AUCUNE migration Flyway.`
Vérifié : `backend/src/main/resources/db/migration/` contient V1..V15, dernier = `V15__password_reset_tokens_version.sql`. Aucune migration depuis 11 sprints. **Aucune des 15 issues retenues ne touche le schéma** → à la clôture du S54, **16 sprints sans exercer le chemin Flyway**, avec `ddl-auto=validate` en dev et en prod. Un chemin non exercé pendant 16 sprints est un chemin dont on ignore l'état.
Deux options, à trancher par le lead :
- **(a) Bon marché, recommandée** — ajouter un job CI qui boote sur une base vierge avec `flyway migrate` + `ddl-auto=validate`. Coût ~XS, exerce le chemin à chaque run, sans forcer de contenu métier.
- **(b) Insérer #88** (P2, S, `tier` sur `User` + `PlanPolicy` no-op) en S52 — c'est le **seul** candidat du backlog produisant une V16 réelle. Mais cela porterait S52 à 4 issues / 10 pts (au-delà du plafond de 3 issues) et introduirait de l'échafaudage de monétisation non demandé. **Je déconseille** : laisser l'outillage dicter le périmètre métier est un mauvais échange.

`[RISQUE 2] Arbitrage #249 — traité, pas reporté.` #249 en **S50, vague 1**, pour ses volets non disruptifs (`DB_PASSWORD`, `BREVO_API_KEY`). Le volet `JWT_SECRET` est **fusionné dans la bascule RS256 de #323** (même sprint, vague 2) — la génération de la paire de clés *est* la rotation. Gain : **une seule déconnexion globale au lieu de deux**. Coût du choix : si #323 dérape, le volet `JWT_SECRET` dérape avec lui. **Mitigation obligatoire** : poser un point de contrôle en fin de vague 1 — si #323 n'est pas engagé, rotationner `JWT_SECRET` en HS256 sans attendre. Le secret prime sur l'élégance du séquencement.

`[RISQUE 3] Arbitrage #67 — re-triage confirmé par le code, issue NON retenue.` Vérifié : `capped` existe en domaine (`domain/models/RecurrenceExpansion.java:14` — un `record` portant `boolean capped` ; produit par `RecurrenceExpansionServiceImpl.java:40-55`). Mais `application/dtos/EventResponse.java` **ne l'expose pas** — et ce n'est pas un record, c'est une classe Lombok `@Getter @AllArgsConstructor`. `seriesInfo` : **0 hit** dans tout `backend/src/main/java`. `capped`/`seriesInfo` : **0 hit** dans `frontend/src`. → L'annonce « XS / frontend » est **fausse** : la chaîne réelle est domaine → `EventResponse` (+ mapper) → type TS → schéma Zod → hint du formulaire, soit **S fullstack avec `zod_dto_sync: OUI`**.

`[RISQUE 4] Chemins fantômes corrigés dans les bodies d'issues.`
- **#351** : cite `frontend/src/hooks/useTimelineViewport.ts` → **n'existe pas**. Vrai chemin : `frontend/src/components/timeline/useTimelineViewport.ts`. Lignes des cales décalées de 2 (756/849 réelles vs 754/847 annoncées).
- **#331** : situe implicitement `EventEditForm.tsx` sous `components/events/` alors qu'il est à la racine de `components/`.
- **#60** (non planifiée) : cite `app/[locale]/(public)/privacy/page.tsx` sans le préfixe `frontend/` — à valider avant toute planification.

`[RISQUE 5] #148 : périmètre à élargir.` 3 politiques de mot de passe coexistent (form i18n strict / RegisterSchema laxiste MÊME FICHIER / DTOs backend laxistes). Trancher sans aligner `RegisterSchema` laisserait la contradiction en place.

`[RISQUE 6] jsdom ne valide pas S53.` #346, #339, #340 = défauts de cascade CSS invisibles en jsdom. Vérification navigateur clair + sombre obligatoire avant merge.

`[RISQUE 7] Détection NO-OP inutilisable — ancrage manuel non exhaustif.` Les 15 issues retenues sont toutes ancrées par grep/read, `possibly_done: false` chacune. **Non vérifié : les ~85 issues backlog** (regroupement par labels, pas par état code).

`[RISQUE 8] #350 exécutable immédiatement, hors plan.` `TimelineCalendar.tsx` (114 lignes), 4 références résiduelles toutes en commentaire/doc, aucun import. XS, zéro risque. Recommandation : l'absorber en marge du S51 sans consommer de slot d'issue.

`[RISQUE 9] business-rules.md absent de docs/memory/` (BR dans .ai-env/context-packs/, conforme mémoire projet). BR-AUT-003 (#148) et BR-SEC-004 (#102) non recoupées — à confirmer par fullstack-dev au lancement de S52.

---

**Score de cohésion global = 0.47** (S50 0.52 · S51 0.40 · S52 0.47 · S53 0.48 · S54 0.46). Aucun sprint sous 0.30 → aucun split imposé. S51 le plus faible : split alternatif = #328 seul + report #349/#351, déconseillé (seconde passe sur `TimelineView.tsx`).

**Effort total : 39 points sur 5 sprints.** 15 issues planifiées, ~85 au backlog. 5 des 7 P1 non bloqués traités ; #212 et #307 écartés avec justification.

**Décisions dev en attente :** (1) option (a)/(b) risque Flyway ; (2) cible d'infra de déploiement pour #322 option (a)/(b) — bloquant S50 ; (3) décision produit #307 Option A/B.
