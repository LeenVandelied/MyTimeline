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

STATUS: COMPLETED
