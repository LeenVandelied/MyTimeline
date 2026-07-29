# Mini-plans architect — Sprint 52

> **RE-PLANIFICATION du 2026-07-29** (architect, ancrage HEAD `473ed65`). Lu par /sprint start Phase 4.1.
>
> ⚠ Le plan précédent de ce fichier (2026-07-28, ancrage `fc2a3a0`, ciblant #102/#134/#148) est **PÉRIMÉ** :
> le milestone GitHub « Sprint 52 » a été entièrement re-scopé le 2026-07-29 à 10:47 en
> « MVP local 1/3 — Cohérence visuelle, shell unifié, README de démarrage ». #102 et #134 sont parties
> au milestone « Mise en ligne (GELÉ) » (en attente de la décision d'hébergement #369), #148 au Sprint 53.
> Arbitrage du dev au lancement : **le milestone fait foi** (MEMO-011). Labels `sprint-52` périmés nettoyés.

## Thème : Focus lisible, header tablette, README de démarrage — cohésion 0.44
## Milestone GitHub : #52 | Effort : 6 pts (3 × S) | Migrations : aucune | Dépend de : rien (S49/S50/S51 mergés)

## Vagues
- **Vague 1 (les 3 en parallèle — disjonction prouvée par énumération, intersection vide)** : #346, #347, #372
- **Pas de vague 2.**

### Couplage logique à surveiller au merge (pas un conflit de fichier)
`landing.hover-pairing.test.ts` scanne **tout** `components/landing/`, donc `HeaderSection.tsx` que #347
réécrit — pendant que #346 durcit ce même détecteur (ajout du préfixe `focus:` + périmètre `components/ui/`).
`HeaderSection.tsx:110` porte `hover:bg-accent hover:text-accent-ink`, paire sanctionnée du DS.
**Consigne : rejouer la suite unitaire complète APRÈS intégration des deux branches**, pas seulement sur
chacune isolément. Toute réécriture de ce `className` conserve la paire **entière** ou la supprime
entièrement — jamais une moitié.

## PRÉREQUIS NON NÉGOCIABLES
- **PIT « CI verte ≠ page correcte » (S48)** — jsdom ne résout ni `@layer` ni le layout.
  **#346 et #347 ne sont clôturables par aucune CI verte.** Vérification navigateur obligatoire,
  thème clair **ET** sombre.
- **PIT « les tests de scroll sous jsdom ne prouvent rien » (S51)** — jsdom ne clampe pas les métriques
  de défilement. Tout AC `scrollWidth <= clientWidth` de #347 exige un **E2E Playwright réel**.

## Issues écartées du sprint (restent au backlog du milestone)
- **#348** — conflit direct avec #347 sur `HeaderSection.tsx`. À replanifier **en aval de #347**.
  ⚠ Son AC « aucune classe `text-4xl`/`text-5xl` » **entre en tension** avec le `h1` du hero qui en porte
  déjà deux (`HeroSection.tsx:59`) : `@theme` *étend* le thème Tailwind au lieu de le remplacer, donc ces
  classes résolvent aux défauts Tailwind (36/48 px). **À arbitrer avant d'ouvrir #348.**
- **#353** — double dépendance : `dropdown-menu.tsx` (#346) **et** header (#347). P3/XS, aval des deux.
- **#341** — **prémisse non reproductible au HEAD** : `grep` sur `<g `/`<g>`/`</g>` → **0 occurrence** dans
  `frontend/src/` et `frontend/app/` ; **0 `<svg>` inline** dans `components/landing/`. Les 3 SVG de la
  landing sont chargés en `<Image src="/images/*.svg">` (`HeroSection.tsx:86`, `TimelinePreviewSection.tsx:21`,
  `MobileAppSection.tsx:47`) — DOM non traversable — et aucun des 3 assets ne contient de `<g>`
  (seul `public/globe.svg`, non référencé, en a un). Budget d'investigation inconnu.
- **#339** — recevable (base.css:21 confirmé hors `@layer`), mais exige un balayage visuel de **toute**
  l'app × 2 thèmes. Incompatible avec un slot partagé. Note : le cas témoin `FooterSection` est à la
  **ligne 43**, pas 41.
- **#338** — **bloquée hors périmètre technique**, conformément à son body : `frontend/public/locales/*/legal.json`
  ne contient que `terms` et `privacy`, **aucune clé de contenu « mentions légales »**. Seuls les libellés de
  lien existent (`common.json` → `landing.footer.legalNotice`, 4 locales OK). Rédaction juridique humaine requise.
- **#299** — gate `ui-design` en amont non garantissable, 6 specs réglages exposées
  (`settings-account`, `-mobile`, `-navigation`, `-preferences`, `-profile`, `-security`).
  **Nuance mesurée en sa faveur :** `frontend/app/[locale]/settings/` ne contient **qu'un seul fichier**
  (`page.tsx`) — le risque « sous-routes profondes » de son body est **caduc**. À replanifier au S53 avec
  `ui-design` en vague 0.

## Ce que l'architecte n'a PAS vérifié (à ne pas prendre pour acquis)
- **Aucune mesure navigateur** : pas de `docker compose up`, pas de serveur Next. Les chiffres de #347
  (871/858/876 px) sont **repris du body**, pas re-mesurés.
- **Suite de tests non exécutée** : le vert actuel des 2 garde-fous AST est supposé, pas constaté.
- **#372 AC1 « clone vierge »** non prouvée — c'est au fullstack-dev de l'exécuter, pas de la déclarer.
- `docs/memory/business-rules.md` **n'existe pas** dans ce dépôt (les BR vivent dans
  `.ai-env/context-packs/br-*.md`). Les 3 issues déclarent « BR impactées : aucune » ; non recoupé.

```yaml
issue_0346:
  fichiers_cles:
    - "frontend/src/components/ui/dropdown-menu.tsx"
    - "frontend/src/components/ui/select.tsx"
    - "frontend/src/components/ui/button.hover-pairing.test.ts"
    - "frontend/src/components/landing/landing.hover-pairing.test.ts"
  couches_touchees: ["frontend"]
  strategie_test: "unit+E2E"
  risque_regression: "Repasser SelectContent en « fonctionnel » par effet de bord contredirait l'arbitrage « décoratif » acté au S49 ; et le garde-fou élargi à components/ui/ peut rougir sur des paires legacy hors périmètre de l'issue."
  ordre_ecriture: |
    1. Remplacer `focus:bg-accent focus:text-accent-foreground` par `focus:bg-accent-soft`
       seul (encre de repos conservée) aux 5 emplacements : dropdown-menu.tsx:77, :95, :131,
       :214 et select.tsx:121. Ne PAS toucher les branches `data-[variant=destructive]:focus:*`
       de la ligne 77 (paire destructive, arbitrage distinct).
    2. Étendre le détecteur : `findHoverPairingOffences` ne matche aujourd'hui que
       /hover:bg-[\w-]+/ et /hover:text-[\w-]+/ — généraliser au préfixe `focus:`.
    3. Étendre le PÉRIMÈTRE de scan à `frontend/src/components/ui/` (le test landing ne lit
       que LANDING_DIR ; le test button ne lit que le corps du `cva()` de button.tsx).
    4. Ajouter le témoin de régression `focus:` (miroir du témoin `hover:` existant), sinon
       un détecteur aveugle rendrait le test vert pour de mauvaises raisons.
    5. Mesurer au navigateur le ratio d'un item de menu AU FOCUS, clair + sombre.
  zod_dto_sync: "NON"
  verification_navigateur: "OBLIGATOIRE — item de DropdownMenu et de Select au focus clavier, thème clair ET sombre, ratio >= 4.5:1 mesuré (pas déduit des classes). jsdom ne résout pas @layer : la CI ne clôt pas cette issue."
  possibly_done: false
  etat_reel_du_code: |
    Re-vérifié au HEAD 473ed65 — mini-plan S53 (ancrage fc2a3a0) valide SANS correction de ligne.
    `focus:bg-accent focus:text-accent-foreground` présent à dropdown-menu.tsx:77, :95, :131, :214
    et select.tsx:121. Un grep `focus:bg-` croisé `focus:text-` sur tout components/ui/ ne remonte
    QUE ces 5 lignes : périmètre exact, ni plus ni moins.
    Les 2 garde-fous AST existent. landing.hover-pairing.test.ts:132-133 code en dur
    /hover:bg-[\w-]+/g et /hover:text-[\w-]+/g et scanne `landingComponents()` sur LANDING_DIR
    (= components/landing/) — donc NI `focus:` NI components/ui/.
    button.hover-pairing.test.ts est borné au corps du `cva()` de button.tsx (fonction `cvaCall`).
    CONSOMMATEUR VIVANT à surveiller : language-selector.tsx:65 pose `bg-accent
    text-accent-foreground` sur l'item de locale ACTIVE, et son en-tête (lignes 17-41) documente
    que le `focus:bg-accent` de dropdown-menu.tsx masquait un défaut de survol mesuré à 1.10:1 /
    1.17:1. Retirer ce `focus:` peut donc DÉMASQUER l'état mixte souris+clavier décrit là.
    Garde-fou E2E de ce cas : e2e/landing-mobile-menu.spec.ts:268 (« sélecteur de langue »).

issue_0347:
  fichiers_cles:
    - "frontend/src/components/landing/HeaderSection.tsx"
    - "frontend/src/components/landing/LandingMobileMenu.tsx"
    - "frontend/e2e/landing-mobile-menu.spec.ts"
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: "Remonter le seuil du burger désynchronise MD_BREAKPOINT_QUERY (HeaderSection.tsx:43) de la classe `md:hidden` du bouton (ligne 135) : le focus-trap resterait actif sur un panneau masqué, avalant l'Escape de toute la page."
  ordre_ecriture: |
    1. Mesurer d'abord au navigateur à 768/820/1024 px en fr/en/de/es la largeur réelle
       de chacun des 3 blocs du header (logo ligne 86, <nav> ligne 91, groupe droit ligne 103)
       AVANT de choisir l'arbitrage. Le body propose 3 options (burger anticipé / échelle typo
       réduite / retour à la ligne) sans trancher.
    2. Appliquer l'arbitrage. Si le seuil du burger bouge : changer MD_BREAKPOINT_QUERY
       (ligne 43), la classe `md:hidden` du bouton (ligne 135) ET le `md:hidden` de
       LandingMobileMenu EN MÊME TEMPS — le commentaire lignes 38-42 dit explicitement que
       les deux doivent bouger ensemble.
    3. Étendre e2e/landing-mobile-menu.spec.ts : le test `scrollWidth` de la ligne 159 ne
       tourne qu'à la constante MOBILE. Ajouter les paliers 768/820/1024 × 4 locales, et
       conserver 320/375/390 en non-régression.
    4. Vérifier au navigateur que le logo `md:text-3xl` (57 px, HeaderSection.tsx:86) est bien
       comptabilisé dans le budget de largeur — l'échelle DS n'est PAS celle de Tailwind.
  zod_dto_sync: "NON"
  verification_navigateur: "OBLIGATOIRE — 768 / 820 / 1024 px × 4 locales (fr, en, de, es), thèmes clair ET sombre ; non-régression à 320/375/390. Les AC scrollWidth exigent Playwright, PAS jsdom (jsdom ne clampe pas les métriques de défilement — pitfall S51)."
  possibly_done: false
  etat_reel_du_code: |
    Confirmé non livré au HEAD 473ed65.
    HeaderSection.tsx:86 — logo `text-md sm:text-lg md:text-3xl ... whitespace-nowrap
    md:whitespace-normal` : le `whitespace-nowrap` est bien borné à `< md`, exactement comme
    le décrit l'issue. Commentaire lignes 83-85 : l'empêcher au-dessus de md élargirait le
    header de 234 → 328 px.
    Ligne 91 — <nav> en `hidden ... md:flex` : les 3 ancres REAPPARAISSENT à md, ce sont elles
    qui rechargent le palier tablette.
    Lignes 103-114 — groupe droit `flex items-center gap-2 md:gap-4`, dont un sous-bloc
    `hidden items-center gap-4 md:flex` contenant LanguageSelector + bouton Connexion :
    lui aussi réapparaît à md. Aucune classe de palier `lg:` nulle part dans le fichier —
    donc aucun traitement entre md (768) et lg (1024). Cause confirmée.
    Ligne 43 `MD_BREAKPOINT_QUERY = '(min-width: 48rem)'` ; ligne 135 le burger est `md:hidden`.
    E2E : landing-mobile-menu.spec.ts:159-179 assère bien
    documentElement.scrollWidth <= clientWidth, mais UNIQUEMENT à la constante MOBILE (375).
    Ligne 188 fait un setViewportSize({width:1280}) pour un autre test (fermeture du panneau),
    sans assertion de débordement. Les paliers 768/820/1024 sont donc à créer.
    ATTENTION LIGNE 110 : le bouton Connexion porte `hover:bg-accent hover:text-accent-ink`,
    paire sanctionnée lue par landing.hover-pairing.test.ts (que #346 durcit en parallèle).
    Toute réécriture de ce className doit conserver la paire intacte OU la supprimer
    entièrement — jamais n'en garder une moitié.

issue_0372:
  fichiers_cles:
    - "README.md"
    - "docker-compose.yml"
    - ".env.example"
    - "frontend/e2e/README.md"
    - "CLAUDE.md"
  couches_touchees: ["docs"]
  strategie_test: "aucun test automatisé — la preuve est un clone vierge démarré en suivant le seul README"
  risque_regression: "Aucune régression de code possible (aucun fichier source touché) ; le risque réel est un README qui documente une commande jamais exécutée — exactement le défaut que l'AC1 vise."
  ordre_ecriture: |
    1. CORRIGER LE PÉRIMÈTRE avant d'écrire — deux prémisses du body sont fausses au HEAD :
       - `HELP.md` n'existe NULLE PART dans le dépôt : l'AC « HELP.md supprimé ou vidé »
         est déjà satisfaite, la barrer plutôt que de la traiter.
       - `docs/ops/deploiement-profils.md` n'existe PAS : le renvoi demandé pointe dans le
         vide. Soit renvoyer vers un fichier existant de docs/ops/, soit retirer la section.
    2. Rédiger le README racine : produit, stack, écrans, licence.
    3. Section Démarrage : prérequis, `.env` depuis `.env.example` (4.5K, présent), la commande
       unique, l'URL, création du premier compte. EXÉCUTER la commande depuis un clone vierge
       avant de l'écrire — ne pas la déduire de docker-compose.yml.
    4. Section « Pièges connus » : les 3 points du body (conflit de port 5432, JWT_PRIVATE_KEY
       absente => paire éphémère, CORS :3000 déguisé en rate-limit + workers>1).
    5. Section Tests : renvoyer vers `scripts/test-quiet.sh`, `backend/mvnw` et
       `frontend/e2e/README.md` (6.6K, déjà écrit) — lier, ne pas dupliquer.
  zod_dto_sync: "NON"
  verification_navigateur: "NON APPLICABLE — livrable documentaire. La preuve exigée est un clone vierge démarré en suivant le seul README (AC1), pas un rendu de page."
  possibly_done: false
  etat_reel_du_code: |
    Vérifié au HEAD 473ed65. `ls` racine : .ai-env/ .claude/ .github/ backend/ docs/ frontend/
    scripts/ .env.example (4.5K) CLAUDE.md (2.6K) crowdin.yml docker-compose.yml (4.3K)
    pr-sprint.md. AUCUN README.md à la racine — confirmé, c'est bien le manque.
    `find -iname "HELP.md"` sur tout le dépôt (hors node_modules) => AUCUN RÉSULTAT.
    La prémisse « HELP.md est le stub Spring Initializr » est FAUSSE au HEAD ; backend/ ne
    contient que .mvn/ src/ .dockerignore Dockerfile mvnw mvnw.cmd package.json pom.xml.
    docs/ops/ ne contient QUE flyway-v11-validation.md et purge-git-secrets-runbook.md —
    `deploiement-profils.md` est un CHEMIN FANTÔME.
    Existent et sont réutilisables : frontend/README.md, frontend/e2e/README.md (6.6K),
    scripts/test-quiet.sh, scripts/flyway-validate.sh, docker-compose.yml, .env.example.
    NON VÉRIFIÉ PAR MOI : je n'ai pas lancé docker compose, ni constaté qu'une commande unique
    démarre effectivement la pile. Le fullstack-dev doit le prouver, pas le déclarer.
```
