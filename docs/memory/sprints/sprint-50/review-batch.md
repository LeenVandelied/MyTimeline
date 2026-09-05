# Sprint 50 — Review batch des 3 commits de code, et suites données

> Périmètre revu : `3f0f1b2` (#249, audit documentaire), `bf9dec0` (#322, origine canonique des
> redirections), `1758c0c` (#323, JWT RS256 + vérification Edge WebCrypto).
> Verdict de la review : **0 CRITIQUE / 3 MAJEUR / 6 MINEUR**.
> Correctifs appliqués par l'agent `fullstack-dev` dans un commit unique (voir §4).

---

## 1. MAJEURS

### M1 — Dégradé silencieux sur clé publique illisible — **APPLIQUÉ**

**Constat.** `frontend/src/lib/auth-token-verify.ts:170` — si `AUTH_JWT_PUBLIC_KEY` est tronquée ou
comporte une typo, `crypto.subtle.importKey` échoue, la fonction renvoie `accepted`, et **100 % des
cookies sont acceptés sans qu'aucun signal n'existe**. Aggravant : le spec E2E qui documente le
dégradé (« un cookie jwt bidon suffit ») reste **vert** dans cet état — rien dans le pipeline ne
peut distinguer « dégradé volontaire » de « panne de configuration ».

**Correctif.** `console.warn` **one-shot** quand `importKey` échoue **alors que la variable est non
vide**. Les deux dégradés sont désormais explicitement distingués :

| État de la variable | Comportement | Signal |
|---|---|---|
| absente / vide / blanche | dégradé **volontaire** (décision dev, aucune clé committée sur ce dépôt public) | **silencieux** — inchangé |
| présente mais inexploitable | dégradé **subi** (anomalie de configuration) | `console.warn`, **une seule fois** |

One-shot parce que le middleware s'exécute sur chaque navigation vers une route protégée : un warn
par requête noierait les logs. Le verrou est posé **avant** l'appel à `console.warn`, et l'appel est
enveloppé dans un `try/catch` — un `console` absent ou monkey-patché ne doit pas transformer un
dégradé en 500 sur toutes les routes protégées (**BUG-S45-001**). Rien n'est levé, jamais.

Même raisonnement appliqué à `frontend/src/lib/canonical-host.ts` : `parseCanonicalOrigins` qui ne
retient aucune entrée alors que la configuration en portait au moins une ⇒ `console.warn` one-shot.

⚠ **Le premier jet du correctif était faux et le test l'a attrapé** : la condition initiale
`rawValue.trim() !== ''` faisait crier sur `',,,'` — non vide après `trim()`, mais ne portant
**aucune** entrée réelle. C'est une valeur vide écrite maladroitement, donc le dégradé volontaire.
Condition corrigée : compter les entrées **réellement tentées** (`attempted > 0 && parsed.length === 0`).

**Filet anti-régression ajouté** (c'est le cœur de M1 — sans lui, la panne reste indétectable) :
14 tests neufs, dont, pour chacun des deux modules, « avertit une seule fois », « reste silencieux
quand la variable est absente/vide », « reste silencieux quand la configuration est valide », et
« ne lève pas si `console.warn` lui-même lève ».

### M2 — Audit auto-contradictoire sur sa section la plus sensible — **APPLIQUÉ**

**Constat.** `docs/memory/audits/secret-exposure-audit.md` §4.1/§4.2/§4.3 a été rédigé en **vague 1**
et décrit comme « en dur au HEAD » trois valeurs de `JWT_SECRET` que **#323 a supprimées en vague 2,
sur la même branche** : `.env.example:26`, `application-test.properties:28`, `ci.yml:169`.
**Vérifié : les trois ont bien disparu.** Un audit de sécurité faux sur un dépôt public est pire
qu'une absence d'audit — il oriente vers une remédiation sans objet.

**Correctif.** §4 ré-ancrée sur l'état réel après `1758c0c`, avec un encadré expliquant la
péremption (la version d'origine reste dans l'historique git du fichier) :

- **§4.1** — `JWT_SECRET` : **plus aucune occurrence**, tableau des trois emplacements et de leur
  remplacement (`JWT_PRIVATE_KEY=` vide, `jwt.private-key=` vide, rien en CI).
- **§4.2** — `EXPORT_TOKEN_SECRET` : seul matériel HMAC encore committé (dev `.env.example:43`,
  test `application-test.properties:35`, CI `ci.yml:175`). Trois `vid` distincts, et — contrairement
  aux `JWT_SECRET` de vague 1 — les valeurs **décodées portent leurs propres marqueurs jetables**
  (`dev`/`test`/`ci` + `only` + `insecure` + `change`). L'ambiguïté « placeholder ou vrai secret ? »
  ne se pose pas. En prod, la variable est obligatoire et le boot échoue si elle manque (#323) :
  aucune de ces valeurs ne peut devenir un secret de production par oubli.
- **§4.3** — recentrée sur les identifiants du conteneur Postgres éphémère de la CI (seuls
  survivants). Le risque de réutilisation `JWT_SECRET` identifié en vague 1 n'existe plus.
- **§1** — la phrase d'annonce « trois constats » corrigée dans le même sens.
- **§7** — **R3** et **R5** barrées « SANS OBJET », **R2** marquée FAITE par #323.

**§1 à §3 délibérément NON réécrites** : le constat d'exposition **historique** (`53175da`,
`c6ea19e`, corrigés par `ff5dca3`) reste vrai et ne bouge pas. R1/R4/R6/R7 restent ouvertes.

### M3 — `APP_CANONICAL_HOST` absente du seul document d'exploitation — **APPLIQUÉ**

**Constat.** `docs/runbook/deploiement-profils.md:16-24` liste `AUTH_JWT_PUBLIC_KEY` (#323) mais
**pas** `APP_CANONICAL_HOST` (#322). C'est le hub qui recense les variables de prod ⇒ oubli garanti
au premier déploiement, donc dégradé open-redirect silencieux — d'autant qu'aucun garde-fou
frontend n'existe (pas d'équivalent au `ProfileSafetyGuard` backend).

**Correctif.** Ligne ajoutée au tableau, colonne « si absente » explicite : l'origine du `Location`
reste héritée de `Host` / `x-forwarded-host`, donc contrôlable par l'appelant (+ empoisonnement de
cache si un cache mutualisé mémorise la 307). `export APP_CANONICAL_HOST=…` ajouté au bloc de
procédure de déploiement.

---

## 2. MINEURS

| # | Verdict | Détail |
|---|---|---|
| **m1** | **APPLIQUÉ** | `openssl … \| base64` sans `tr -d '\n'`. **Vérifié empiriquement** : le `base64` BSD/macOS **ne replie pas** (1 ligne) — le reviewer avait donc tort *sur ce poste*. Mais en conteneur Linux (`docker run alpine`) : **6 lignes pour 300 octets**. Or la cible de déploiement est Linux. Le bug est réel et **invisible depuis un poste macOS** : `| tr -d '\n'` ajouté aux 3 commandes (`.env.example` ×2, runbook ×2), avec la nuance de portabilité écrite en commentaire. |
| **m2** | **APPLIQUÉ** | `ExportTokenService.java:74` concaténait `e.getMessage()` dans le message de fail-fast, alors que `JwtService.java:72` l'exclut délibérément. Un décodeur Base64 bavard peut recracher le fragment fautif — donc du matériel de secret HMAC — dans les logs de boot. Aligné sur `JwtService` ; le type d'exception suffit au diagnostic, la cause complète reste attachée en `cause`. |
| **m3** | **APPLIQUÉ** | `middleware.ts:74` — `canonicalOrigins(process.env.…)` était **au-dessus** du `try` dont le commentaire promet « ne lève jamais ». Déplacé **dans** le `try`. `canonicalOrigins` est réputée non levante, mais la garantie ne doit pas dépendre de l'implémentation d'un appelé — et le coût de l'erreur est un 500 sur toutes les routes protégées. |
| **m4** | **APPLIQUÉ** | `JwtServiceRs256Test.java` couvrait HS256-forgé-avec-la-clé-publique mais **pas `alg: none`** (RFC 7519 §6). L'Edge l'ancre côté frontend ; le backend — seul juge — n'y opposait que le défaut jjwt, non testé, qui régresserait en silence si quelqu'un ajoutait `.unsecured()`. Cas ajouté, token forgé **à la main** (on ancre le rejet de la valeur sur le fil, pas la façon dont jjwt la produit). |
| **m5** | **APPLIQUÉ** | `JwtService.java:83` ne journalisait la SPKI publique que sur le chemin **éphémère**. Avec `JWT_PRIVATE_KEY` posée (prod), aucun moyen d'obtenir `AUTH_JWT_PUBLIC_KEY` depuis l'app ⇒ re-dérivation openssl manuelle, donc risque de paire dépareillée — dont le symptôme est muet et coûteux (l'utilisateur boucle vers `/login` sans message). Log déplacé dans `initKeyMaterial`, **commun aux deux chemins**. Une clé publique n'est pas un secret. |
| **m6** | **APPLIQUÉ** | `frontend/.env.example` ne documentait pas `AUTH_JWT_PUBLIC_KEY` alors que le `.env.example` racine documente les deux variables. Ajoutée, avec la commande d'obtention (`tr -d` compris), le rappel qu'elle doit correspondre à `JWT_PRIVATE_KEY`, et la mention du nouveau `console.warn` sur valeur non vide illisible. |

**Aucun mineur écarté.** m1 était le seul candidat au rejet (faux sur macOS) ; la vérification en
conteneur Linux l'a confirmé sur la cible de déploiement réelle.

---

## 3. Vérifications

| Suite | Avant | Après | Commande |
|---|---|---|---|
| Backend | 449 | **450** (+1 : `alg: none`) | `./scripts/test-quiet.sh backend` → `Tests run: 450, Failures: 0, Errors: 0, Skipped: 0` — BUILD SUCCESS |
| Frontend | 774 | **788** (+14 : signalement du dégradé) | `./scripts/test-quiet.sh frontend` → `Test Files 88 passed (88)`, `Tests 788 passed (788)` |

Aucune régression. Les deux suites étaient vertes avant, elles le restent.

**Non vérifié / hors périmètre**, à ne pas confondre avec « validé » :
- **E2E Playwright non relancés** — le spec `auth-guard` documente le dégradé et reste vert par
  construction ; le correctif M1 ne change aucun verdict HTTP, seulement la journalisation.
- **Aucun boot réel** du backend ni du frontend : le log de clé publique de m5 et les `console.warn`
  de M1 sont couverts par des tests, pas observés sur une stack démarrée.
- Le repli du `base64` GNU est vérifié en **conteneur alpine**, pas sur l'image de déploiement finale.

---

## 4. Reste ouvert

- **R1 / R4 / R6 / R7** de l'audit (§7) restent des follow-ups : rotation `DB_PASSWORD` au premier
  provisionnement, `BREVO_API_KEY` absente de `.env.example`, scan de secrets en CI
  (`gitleaks`/`trufflehog`), purge d'historique #112.
- **Aucun garde-fou frontend** n'impose `APP_CANONICAL_HOST` ni `AUTH_JWT_PUBLIC_KEY` en prod : le
  `console.warn` ne couvre que la variable **présente et invalide**, pas la variable **absente**.
  Une variable oubliée en prod reste silencieuse — c'est la décision assumée d'ADR-004, mais elle
  n'est adossée à aucune détection. Un équivalent frontend au `ProfileSafetyGuard` reste à écrire.

---

# Second cycle de review (3 agents indépendants, post-`d7b8049`)

> Findings NOUVEAUX, sur le code déjà corrigé par le 1er cycle.
> Verdict : **0 CRITIQUE / 3 MAJEUR / 13 MINEUR**. Tous traités dans un commit unique.
> Deux reviewers se contredisaient frontalement sur M1 — arbitré par le lead (voir ci-dessous).

## 5. MAJEURS du 2e cycle

### M1 — `application-prod.properties` écrasait la convention « aucun default » — **APPLIQUÉ**

**Constat.** `application.properties:40,48` déclare `${JWT_PRIVATE_KEY}` / `${EXPORT_TOKEN_SECRET}`
**sans default**, avec un commentaire posant la convention #34. Le fichier **prod** les réécrivait
avec un default vide (`${JWT_PRIVATE_KEY:}`) : variable absente ⇒ résolution en `""` au lieu d'un
échec, et **seul `ProfileSafetyGuard` s'y opposait**. Deux barrières disjointes ramenées à une.

**Correctif.** Defaults retirés du fichier prod. Les deux barrières redeviennent disjointes :
(1) placeholder irrésoluble ⇒ le boot échoue même si le listener venait à ne plus s'exécuter
(`spring.factories` cassé, listener exclu) ; (2) `ProfileSafetyGuard` couvre la valeur **blanche**.

**Ce que le correctif seul aurait coûté, et comment c'est traité.** Sans default, `getProperty`
**lève** (« Could not resolve placeholder ») **depuis l'intérieur du garde-fou** : le boot échoue
bien, mais sur un message opaque, et le message d'exploitation #323 est perdu. C'était l'argument
du reviewer opposé, et il était exact. `isBlankProperty` traite donc désormais « placeholder
irrésoluble » comme « valeur non fournie » ⇒ les deux barrières **et** le message lisible. Ancré
par `shouldFail_withReadableMessage_whenJwtPrivateKeyPlaceholderIsUnresolvable`.

### M2 — 2 `console.warn` non mockés dans `middleware.test.ts` (MEMO-007) — **APPLIQUÉ**

`d7b8049` avait mocké `canonical-host.test.ts` et `auth-token-verify.test.ts`, pas
`middleware.test.ts` — seul fichier traversant ces chemins sans mock. **Mesuré avant** (`rtk proxy
npx vitest run middleware.test.ts`) : **2 blocs `stderr |`** (`APP_CANONICAL_HOST='pas valide'` et
clé publique illisible). `vi.spyOn(console, 'warn')` posé sur les 2 cas, en `try/finally`.
**Mesuré après : 0 bloc.** Le contenu des messages reste couvert par les tests unitaires dédiés.

### M3 — Signalisation INVERSÉE des deux dégradés — **APPLIQUÉ**

**Constat.** Le cas RARE (variable présente mais inexploitable) criait ; le mode de panne le plus
PROBABLE — variable oubliée au premier déploiement, qu'aucun garde-fou frontend ni aucune étape de
déploiement ne vérifie — était **volontairement muet**. Un premier déploiement oubliant les deux
variables rend #322 et #323 **intégralement inertes**, et le seul symptôme observable est
l'**absence** d'un warn.

**Correctif.** `console.warn` **one-shot** sur variable absente **et** `NODE_ENV === 'production'`,
dans `auth-token-verify.ts` et `canonical-host.ts`. Hors production : silence inchangé (sinon M2 est
réintroduit partout). **Aucun fail-closed, aucun throw** (BUG-S45-001). Côté `canonical-host`, le
signal couvre aussi la valeur vide-équivalente (`''`, `'   '`, `',,,'`) : c'est le même dégradé.

## 6. MINEURS du 2e cycle — tous APPLIQUÉS

| # | Fichier | Traitement |
|---|---|---|
| **m1** | `ExportTokenService.java:127` | `catch (RuntimeException)` : un jeton authentiquement signé, `typ` correct, sans `sub`/`uid`, atteignait `UUID.fromString(null)` ⇒ **NPE non catchée**, 500 au lieu du 404 contractuel. Contrat « `verify()` ne lève JAMAIS » rétabli, ancré par `verify_missingSubjectOrUidClaim_returnsEmpty`. |
| **m2** | `JwtService.java` | Algorithme FIGÉ à RS256 à la lecture. `verifyWith(PublicKey)` seul laissait passer RS384/RS512/PS256, alors que l'Edge exige strictement RS256 : deux vérificateurs, deux contrats. Implémenté par **assertion d'en-tête** après `parseSignedClaims` (`Header.getAlgorithm()`, API vérifiée sur le jar jjwt 0.13.0) — et non en devinant une API de restriction. Les 3 chemins de parsing passent par le même `parseClaims`. |
| **m3** | `JwtService.java:102` | `getPublicKeySpkiBase64()` n'avait aucun appelant dans `main/`. Le log de boot le consomme désormais (au lieu de rappeler `RsaKeyMaterial.toSpkiBase64`) : la valeur journalisée est celle que la doc d'exploitation cite. |
| **m4** | `ProfileSafetyGuard.java` | `checkMissingSigningMaterialInProduction` (~22 l., 2 vérifications) scindé en `checkMissingJwtPrivateKeyInProduction` + `checkMissingExportTokenSecretInProduction`. |
| **m5** | `auth-token-verify.ts` | `isTokenAuthentic` (42 l., complexité ~11) scindé : `parseJwtParts()` (décodage pur) + `isWithinTimeWindow()` (fenêtre temporelle). La fonction ne porte plus que les décisions. |
| **m6** | `auth-token-verify.ts` | `sub` exigé (string non vide). Sans lui, tout jeton RS256 signé par cette clé ouvrait la garde. Sans impact aujourd'hui (émetteur unique) — la garde cesse d'en dépendre. 3 cas ajoutés (absent / vide / non-string). |
| **m7** | `canonical-host.ts` | Forme URL complète : `url.username`, `url.password`, `url.pathname !== '/'` ⇒ entrée REJETÉE (donc signalée). `new URL` acceptait `https://u:p@app.example.com/x` en jetant silencieusement credential et chemin, contre l'annonce du message d'aide. `https://app.example.com/` (slash racine, copier-coller navigateur) reste accepté — cas dédié. |
| **m8** | `docs/runbook/deploiement-profils.md` | Note ajoutée : **exiger la forme `https://…`**. Un hôte nu laisse `protocol: null`, donc un `x-forwarded-proto: http` menteur produit un `Location` en http même si le canonique est https. C'était documenté dans le code seulement. |
| **m9** | ADR-004 §Limites + runbook | Clé publique **bien formée mais dépareillée** : 100 % des sessions renvoyées vers `/login`, **aucun signal** (ni « illisible » ni « absente » ne se déclenchent). Consignée des deux côtés **avec le remède : VIDER `AUTH_JWT_PUBLIC_KEY`**, puis recoller la valeur journalisée au boot du backend en service (jamais une valeur re-dérivée à la main). |
| **m10** | `.github/workflows/ci.yml` | `::add-mask::` sur la clé privée jetable **avant** l'écriture dans `GITHUB_ENV`. Dépôt PUBLIC ⇒ logs publics : un step futur qui dumperait l'environnement publierait du matériel de signature. Aucun impact actuel (paire morte avec le runner) — c'est le **motif** qui est corrigé. La clé publique n'est pas masquée (pas un secret, et masquer caviarderait les diagnostics). |
| **m11** | `.github/workflows/ci.yml` | `auth.setup.ts` ajouté au filtre de la 2e passe E2E. Le filtre sur la seule spec excluait le projet `setup` (`testMatch /.*\.setup\.ts/`), et la passe consommait le `storageState` laissé par la passe 1 (`globalSetup` ne purge que `accounts.json`) — couplage implicite entre deux steps. |
| **m12** | `secret-exposure-audit.md:250` | §4.4 ré-ancré : `docker-compose.yml:45` portait `JWT_SECRET` (supprimé par #323) ; la zone porte aujourd'hui `JWT_PRIVATE_KEY:47` et `EXPORT_TOKEN_SECRET:51`. |
| **m13** | `secret-exposure-audit.md:295` | R4 ré-ancré : énumération réelle de `.env.example` (ajout de `JWT_PRIVATE_KEY`, `EXPORT_TOKEN_SECRET`, `APP_CANONICAL_HOST`, `AUTH_JWT_PUBLIC_KEY`, retrait de `JWT_SECRET`). Le fond (`BREVO_API_KEY` absent) reste exact. |

**Aucun mineur écarté.**

**Hors périmètre, sur consigne du lead** : le marqueur `ENVIRONMENT`/`APP_ENV` non obligatoire
(trou pré-existant #111, sévérité inchangée par cette PR) — follow-up séparé.

## 7. Vérifications du 2e cycle (mesurées via `rtk proxy`)

| Suite | Avant | Après | Mesure |
|---|---|---|---|
| Backend | 450 | **452** (+2 : NPE claims manquants, placeholder irrésoluble) | `./mvnw clean test` → BUILD SUCCESS, `Failures: 0, Errors: 0, Skipped: 0` |
| Frontend | 788 | **806** (+18 : warns production, `sub`, formes URL rejetées) | `npx vitest run` → `Test Files 88 passed (88)`, `Tests 806 passed (806)` |
| `stderr` de `middleware.test.ts` | 2 blocs | **0 bloc** | `rtk proxy npx vitest run middleware.test.ts \| grep -c '^stderr \|'` |
| Lint / types | — | vert | `npm run lint` (0 warning), `npx tsc --noEmit` (0 sortie) |

**Non vérifié — à ne pas confondre avec « validé » :**
- **E2E Playwright non relancés localement.** m11 (ajout de `auth.setup.ts` au filtre) et m10
  (`::add-mask::`) ne sont exercés que par la CI ; aucun des deux ne change une assertion de spec.
- **Aucun boot réel** : les warns de production (M3) et le message #323 sur placeholder irrésoluble
  (M1) sont couverts par des tests unitaires, pas observés sur une stack démarrée avec
  `SPRING_PROFILES_ACTIVE=prod`.
- **Bruit `stderr` résiduel ailleurs** : `src/services/exportService.test.ts` écrit encore des
  erreurs Zod sur `stderr`. Hors périmètre de cette review (MEMO-007 non traité globalement).

## 8. Reste ouvert après le 2e cycle

- **Aucun garde-fou frontend bloquant.** M3 pose un *signal*, pas un fail-fast : rien n'empêche un
  déploiement sans `APP_CANONICAL_HOST` / `AUTH_JWT_PUBLIC_KEY`. L'équivalent frontend du
  `ProfileSafetyGuard` reste à écrire.
- **Paire dépareillée toujours sans détection automatique** (m9) : seule la documentation couvre le
  cas. Un endpoint JWKS le supprimerait — hors scope, noté en follow-up ADR-004.
- **#111** (marqueur d'environnement non obligatoire) : follow-up séparé, écarté du périmètre.
- **R1 / R4 / R6 / R7** de l'audit restent des follow-ups (inchangés).

STATUS: COMPLETED
