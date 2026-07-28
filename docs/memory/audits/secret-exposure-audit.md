# Audit d'exposition des secrets dans l'historique git

> Issue **#249** — Sprint 50, 2026-07-28. Auteur : agent `fullstack-dev` (audit documentaire).
> Périmètre : **constat mesuré**, pas de rotation. La rotation est une action opérateur (voir
> `secret-rotation-runbook.md`).
>
> ⚠️ **RÈGLE ABSOLUE respectée dans ce document** : aucune valeur de secret n'y figure.
> Chaque constat donne `commit:fichier:ligne`, la **longueur**, la **forme** (alphabet, composition)
> et un identifiant de groupe salé — jamais la valeur.

---

## 1. Résumé exécutif

| Secret | Exposé en clair dans l'historique ? | Encore présent au HEAD ? | Conclusion |
|---|---|---|---|
| `DB_PASSWORD` (prod/défaut) | **OUI** — 169 commits, 2025-03-03 → 2026-06-25 | non (corrigé `ff5dca3`) | **à rotationner au déploiement** |
| `JWT_SECRET` (prod/défaut) | **OUI** — 164 commits, 2025-03-14 → 2026-06-25 | non (corrigé `ff5dca3`) | **sans objet en tant que rotation** — supprimé par #323 (RS256) |
| `BREVO_API_KEY` | **NON** — aucune valeur littérale trouvée | non (référence `${BREVO_API_KEY}` seule) | **sans objet** |

**Facteur aggravant mesuré** : le dépôt est **PUBLIC**
(`gh repo view LeenVandelied/MyTimeline --json visibility` → `{"isPrivate":false,"visibility":"PUBLIC"}`).
Les valeurs exposées ont donc été lisibles par n'importe qui pendant ~16 mois. Elles doivent être
traitées comme **compromises sans réserve**, y compris après une purge d'historique (#112).

**Constats supplémentaires non prévus au périmètre initial** — voir §4. ⚠️ Cette section a été
**ré-ancrée après `1758c0c`** : les trois valeurs de `JWT_SECRET` qu'elle signalait « en dur au
HEAD » ont été **supprimées par #323 en vague 2 du même sprint**. Le seul matériel HMAC encore
committé est `EXPORT_TOKEN_SECRET` (valeurs dev / test / CI, explicitement marquées jetables) et
le mot de passe du conteneur Postgres éphémère de la CI.

---

## 2. Méthode (reproductible)

### 2.1 Principe

Les commandes ne doivent **jamais** faire sortir une valeur. Toute sortie de `git grep` est donc
canalisée dans un filtre Python qui n'émet que : chemin, ligne, nom de clé, **longueur**,
**classification de forme**, et un identifiant de groupe `vid` = 6 hex de
`sha256(sel_aléatoire_du_run || valeur)`. Le sel est régénéré à chaque exécution : le `vid` permet de
savoir si deux emplacements portent la **même** valeur, sans rien révéler et sans être réutilisable
hors du run.

⚠️ Ne **jamais** substituer à ce filtre un `git show <rev>:<fichier>` ou un `git log -p` en sortie
brute sur un fichier de configuration : cela recopierait la valeur dans le transcript.

### 2.2 Filtre utilisé

Enregistré hors dépôt pendant l'audit (`scan_filter.py` / `timeline.py`). Cœur du classement :

```python
def shape(v):
    if not v:                                                     return "VIDE"
    if re.fullmatch(r"\$\{[A-Za-z_][A-Za-z0-9_]*(:-?[^}]*)?\}", v): return "ref-env-pure"
    if v.startswith("$"):                                         return "ref-env-composee"
    if re.fullmatch(r"[0-9a-f]+", v):                             return "hex-pur"
    if re.fullmatch(r"[A-Za-z][A-Za-z_-]*", v):                   return "mot-alpha"
    return "MIXTE-OPAQUE"

vid = hashlib.sha256(SALT + v.encode()).hexdigest()[:6]   # SALT = os.urandom(16), par run
```

Un second classement repère les marqueurs lexicaux de placeholder (`change`, `your`, `example`,
`dev`, `local`, `test`, `fake`, `sample`…) : leur **présence** est reportée, jamais le contexte.

### 2.3 Commandes réellement exécutées

```bash
# base : toutes les branches, tous les commits (727)
git rev-list --all > /tmp/allrevs.txt

# passe 1 — fichiers de configuration, tout l'historique
git grep -n -I -E -i '(password|passwd|secret|api[._-]?key|api_key|token|credential)[^a-z0-9_]*[:=]' \
  $(cat /tmp/allrevs.txt) \
  -- '*.properties' '*.yml' '*.yaml' '*.env' '*.env.*' '.env*' \
     'docker-compose*' 'Dockerfile*' '*.sh' '*.tf' '*.conf' \
  2>/dev/null | python3 scan_filter.py        # 8 973 lignes -> 29 groupes

# passe 2 — motifs haute confiance, TOUS les chemins de l'historique (pas seulement la config)
git grep -l -I -E 'xkeysib-|SG\.[A-Za-z0-9_-]{20}|sk_live_|sk_test_|whsec_|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30}|github_pat_|-----BEGIN [A-Z ]*PRIVATE KEY-----|xoxb-|AIza[0-9A-Za-z_-]{30}' \
  $(cat /tmp/allrevs.txt) 2>/dev/null | ...   # -> 1 seul fichier touché (cf. §3.3)

# passe 3 — ciblage BREVO, tous les chemins
git grep -n -I -E -i '(brevo[._-]?api[._-]?key|BREVO_API_KEY|xi-api-key)' \
  $(cat /tmp/allrevs.txt) 2>/dev/null | python3 scan_filter.py

# passe 4 — datation : premier/dernier commit + présence au HEAD, par groupe de valeur
git grep -n -I -E -i '(password|secret|api[._-]?key|api_token)[^a-z0-9_]*[:=]' \
  $(cat /tmp/allrevs.txt) -- <fichiers ciblés> 2>/dev/null | python3 timeline.py

# contexte opérationnel
gh repo view LeenVandelied/MyTimeline --json visibility,isPrivate   # -> PUBLIC
gh secret list --repo LeenVandelied/MyTimeline                      # -> vide
gh api repos/LeenVandelied/MyTimeline/environments                  # -> total_count: 0
ls .github/workflows/                                               # -> ci.yml seul
```

### 2.4 Couverture

- **727 commits**, toutes branches (`--all`), y compris les branches de sprint non mergées.
- Passe 1 sur les extensions de configuration ; passes 2 et 3 sur **tous** les chemins, sans filtre
  d'extension (donc `.java`, `.ts`, `.md`, `.json` inclus).
- **Non couvert** : voir §6.

---

## 3. Constats par secret

### 3.1 `DB_PASSWORD` — EXPOSÉ

| | |
|---|---|
| Emplacement | `backend/src/main/resources/application.properties:3` (clé `spring.datasource.password`) |
| Forme | `mot-alpha` (alphabétique pur), **longueur 10** |
| Premier commit | `e6676d6` — 2025-03-03 (`:tada: initial commit`) |
| Dernier commit porteur | `993e551` — 2026-06-25 (merge sprint 2) |
| Nombre de commits porteurs | **169** |
| Corrigé par | `ff5dca3` — 2026-06-25 `:lock: #34 externaliser secrets + rotation jwt.secret compromis` (passage à `${DB_PASSWORD}`) |
| Présent au HEAD | **non** |

Fenêtre d'exposition : **~16 mois sur un dépôt public**.

**Conclusion : à rotationner au déploiement.** Aucune cible de rotation n'existe aujourd'hui
(pas de base déployée, pas de secret GitHub, pas d'environnement) — la rotation consiste donc à
**ne jamais réutiliser cette valeur** lors du provisionnement de la première base prod.

### 3.2 `JWT_SECRET` — EXPOSÉ

| | |
|---|---|
| Emplacement | `backend/src/main/resources/application.properties:12` (clé `jwt.secret`) |
| Forme | `hex-pur`, **longueur 128** (soit 512 bits encodés en hexadécimal) |
| Premier commit | `5c73971` — 2025-03-14 |
| Dernier commit porteur | `993e551` — 2026-06-25 |
| Nombre de commits porteurs | **164** |
| Corrigé par | `ff5dca3` — 2026-06-25 (#34) |
| Présent au HEAD | **non** |

Exposition secondaire, profil de test :

| | |
|---|---|
| Emplacement | `backend/src/test/resources/application-test.properties:25`, forme `MIXTE-OPAQUE` longueur 90 |
| Fenêtre | `891175a` (2026-06-25) → `ecd56e2` (2026-07-11), 317 commits, **absent du HEAD** |

**Conclusion : « rotation » sans objet en tant que telle.** L'issue **#323** (vague 2 du Sprint 50)
supprime `JWT_SECRET` au profit d'une paire de clés **RS256** et introduit un secret dédié
`EXPORT_TOKEN_SECRET` pour `ExportTokenService`. La bonne action n'est donc pas de régénérer une
clé HS256 mais de **ne jamais réintroduire cette valeur** et de laisser #323 remplacer le mécanisme.
Voir `secret-rotation-runbook.md` §2.

### 3.3 `BREVO_API_KEY` — NON EXPOSÉ

Vérifié par trois angles indépendants (le résultat du lead est **confirmé**) :

1. **Passe 1 (configuration, tout l'historique)** — la clé `brevo.api.key` n'apparaît que sous la
   forme `ref-env-pure` (`${BREVO_API_KEY}`, longueur 17), sur 490 commits,
   `backend/src/main/resources/application.properties`. Jamais de littéral.
   `backend/src/main/resources/application.properties.example:41` porte `BREVO_API_KEY=` **vide**.
2. **Passe 2 (motifs haute confiance, tous chemins)** — le préfixe réel des clés Brevo v3
   (`xkeysib-`) ne touche qu'**un seul fichier** de tout l'historique :
   `backend/src/test/java/.../email/BrevoHealthIndicatorTest.java`, lignes **36** et **43**,
   sur 249 commits. Classement des deux jetons : longueurs **20** et **26** caractères, suffixe
   **purement alphabétique** → forme **FACTICE**. Une vraie clé Brevo v3 fait ~89 caractères
   (`xkeysib-` + 64 hexadécimaux + `-` + 16 alphanumériques) ; aucun jeton de cette forme dans
   l'historique.
3. **Passe 3 (ciblage `brevo`/`xi-api-key`, tous chemins)** — les seuls autres résultats sont de la
   **prose** dans `docs/memory/sprints/sprint-8/`, `sprint-29/issue-112-done.md`,
   `sprint-30/issue-140-done.md`, `sprint-35/architect-plans.md` et `sprint-50/` (faux positifs du
   parseur clé/valeur sur des phrases en français).

Aucun autre motif haute confiance (`SG.`, `sk_live_`, `whsec_`, `AKIA…`, `ghp_…`, `github_pat_`,
`xoxb-`, `AIza…`, bloc `-----BEGIN … PRIVATE KEY-----`) n'existe nulle part dans les 727 commits.

**Conclusion : sans objet.** Aucune rotation nécessaire pour `BREVO_API_KEY`. L'étape « vérifier
l'exposition » du runbook est **close**.

---

## 4. Constats supplémentaires — valeurs de forme « secret » encore présentes au HEAD

Ces trois points sortent du périmètre littéral de #249 mais sont établis par le même audit. Aucun
fichier concerné n'a été modifié (hors périmètre de l'agent) → voir §7 recommandations.

> ⚠️ **SECTION RÉ-ANCRÉE APRÈS `1758c0c` (revue de fin de sprint).** Le corps de §4 avait été
> rédigé en **vague 1** du Sprint 50 et décrivait « en dur au HEAD » trois valeurs de `JWT_SECRET`
> que **#323 a supprimées en vague 2, sur cette même branche** : `.env.example:26`,
> `application-test.properties:28` et `ci.yml:169`. Les trois ont disparu. Les constats périmés
> sont remplacés ci-dessous par l'état réel — la version d'origine reste consultable dans
> l'historique git de ce fichier. **§1 à §3 (audit historique) sont INCHANGÉS** : le constat
> d'exposition passée (`53175da`, `c6ea19e`, `ff5dca3`) reste vrai et ne bouge pas.

### 4.1 `JWT_SECRET` au HEAD — **PLUS AUCUNE OCCURRENCE**

La variable elle-même n'existe plus. #323 (`1758c0c`) a migré la signature d'authentification de
HS256 vers **RS256**, ce qui supprime tout matériel de frappe de jetons du dépôt :

| Emplacement décrit en vague 1 | État après `1758c0c` |
|---|---|
| `.env.example:26` (`JWT_SECRET=`, longueur 64, aucun marqueur) | **supprimé** — remplacé par `JWT_PRIVATE_KEY=` **vide** (`.env.example:37`) |
| `backend/src/test/resources/application-test.properties:28` (`jwt.secret`, longueur 68) | **supprimé** — remplacé par `jwt.private-key=` **vide** (ligne 30) |
| `.github/workflows/ci.yml:169` (`JWT_SECRET`, longueur 64) | **supprimé** — la CI ne pose plus aucune clé d'auth |

Le mécanisme de remplacement ne peut structurellement pas réintroduire le problème : la clé
**privée** est absente du dépôt (vide par défaut → paire **éphémère** générée au boot, `JwtService`),
et la clé **publique** (`AUTH_JWT_PUBLIC_KEY`) n'est pas un secret. La recommandation R3 de la
version initiale (« remplacer `.env.example:26` par un placeholder marqué ») et R5 (« sortir le
`jwt.secret` de `application-test.properties` ») sont donc **sans objet** — voir §7.

### 4.2 `EXPORT_TOKEN_SECRET` — seul matériel HMAC encore committé, **jetable et marqué**

C'est le seul secret symétrique qui subsiste au HEAD. Il est introduit par #323 lui-même
(`ExportTokenService` ne partage plus la clé d'auth : compromettre l'un ne compromet plus l'autre).
Contrairement aux `JWT_SECRET` de vague 1, ces trois valeurs sont **explicitement marquées jetables
dans leur propre contenu** — l'ambiguïté « placeholder ou vrai secret ? » ne se pose pas :

| Emplacement | Forme | Marqueurs lexicaux (dans la valeur **décodée**) |
|---|---|---|
| `.env.example:43` | Base64 standard | `dev`, `only`, `insecure`, `change` |
| `backend/src/test/resources/application-test.properties:35` | Base64 standard | `test`, `only`, `insecure` |
| `.github/workflows/ci.yml:175` | Base64 standard | `ci`, `only`, `insecure`, `e2e`, `tests` |

Trois `vid` **distincts** → trois valeurs différentes, aucune réutilisation croisée : le bon
comportement. Portée : signature des tokens de download d'export RGPD en **dev / test / CI**
uniquement. En prod, `EXPORT_TOKEN_SECRET` est **obligatoire** et le boot échoue s'il manque
(garde-fou #323, cf. `docs/runbook/deploiement-profils.md`) — aucune de ces valeurs ne peut donc
devenir un secret de production par simple oubli.

**Statut : accepté, pas de suite.** Committer un secret dont la valeur dit « insecure, change me »
et qui ne peut pas fuiter en prod est un choix d'ergonomie, pas une exposition.

### 4.3 `.github/workflows/ci.yml` — identifiants du conteneur Postgres de service

- `POSTGRES_PASSWORD:114` / `DB_PASSWORD:165` : forme `mot-alpha`, longueur **12**, marqueur `ci`.
  Même `vid` sur les clés (`POSTGRES_PASSWORD`, `DB_PASSWORD`, `E2E_DB_PASSWORD`) → une seule et
  même valeur, conteneur de service éphémère.
- Aucune clé d'authentification n'est plus posée par le workflow (cf. §4.1).

Ces valeurs ne protègent qu'un conteneur Postgres jetable créé et détruit dans le job CI, joignable
sur le seul réseau du runner : le risque est **résiduel**. Le risque de réutilisation identifié en
vague 1 (`JWT_SECRET` partagé entre `.env.example` et la CI) **n'existe plus**.

### 4.4 Faux positifs écartés

- `crowdin.yml:2` `api_token` : longueur 14, `mot-alpha`, marqueur `your` → placeholder
  (`YOUR_API_TOKEN`-like). Présent depuis `38d3467` (2025-03-27), 649 commits. Non exposé.
- `scripts/flyway-validate.sh` (`FLYWAY_PASSWORD`, `PGPASSWORD`) : `ref-env-pure` / expressions
  shell composées → aucune valeur en dur.
- `docker-compose.yml` (`POSTGRES_PASSWORD:15`, `DB_PASSWORD:40`, `JWT_PRIVATE_KEY:47`,
  `EXPORT_TOKEN_SECRET:51`) : `ref-env-pure` → aucune valeur en dur. *(Ré-ancré à la revue S50 :
  la ligne 45 citait `JWT_SECRET`, variable SUPPRIMÉE par #323 ; c'est aujourd'hui
  `JWT_PRIVATE_KEY` qui occupe cette zone du fichier.)*
- `application-dev.properties` / `application-prod.properties` : `ref-env-pure` sur toutes les
  clés sensibles, sur les 558 commets concernés → aucune valeur en dur.

---

## 5. État opérationnel au 2026-07-28 (vérifié)

| Vérification | Commande | Résultat |
|---|---|---|
| Visibilité du dépôt | `gh repo view … --json visibility` | **PUBLIC** |
| Secrets GitHub Actions | `gh secret list --repo …` | **vide** |
| Environnements GitHub | `gh api …/environments` | `total_count: 0` |
| Workflows | `ls .github/workflows/` | `ci.yml` seul (aucun déploiement) |
| Secrets-manager provider | — | inexistant |

**Il n'existe aucune cible de rotation.** Rien n'est déployé : « rotationner » aujourd'hui n'aurait
littéralement aucun système sur lequel s'appliquer. Les conclusions « à rotationner » de §3 sont
des **obligations différées au premier déploiement**, pas des actions exécutables maintenant.

---

## 6. Ce que cet audit NE couvre PAS

- **Les objets git non atteignables** (`git rev-list --all` ne voit ni les commits orphelins du
  reflog, ni les objets déréférencés, ni les stashes). Un secret présent uniquement dans un commit
  amendé/rebasé hors branche n'aurait pas été vu.
- **Les forks et clones tiers.** Le dépôt étant public, toute purge d'historique (#112) reste sans
  effet sur les copies déjà réalisées. C'est précisément la raison d'être de #249.
- **Les valeurs non structurées en `clé=valeur`** : un secret concaténé dans une URL, une chaîne
  Java, ou un JSON imbriqué n'est détecté que si son préfixe figure dans la passe 2.
- **Les artefacts hors git** : historique de shell, logs CI archivés côté GitHub, captures.
- **La validité actuelle des valeurs exposées** : non testée (aucun système à interroger). Elles
  sont présumées compromises par principe.

---

## 7. Suites recommandées (aucune appliquée ici)

| # | Action | Pourquoi | Qui |
|---|---|---|---|
| R1 | Au premier provisionnement prod : générer `DB_PASSWORD` neuf, ne jamais réutiliser la valeur historique | §3.1, dépôt public | dev / opérateur |
| R2 | ~~Laisser #323 (RS256) remplacer `JWT_SECRET`~~ — **FAIT** (`1758c0c`). Reste valable : ne jamais réintroduire de secret HS256 d'authentification | §3.2 / §4.1 | ✅ #323, vague 2 |
| ~~R3~~ | ~~Remplacer `.env.example:26` par un placeholder explicitement marqué~~ | **SANS OBJET** — `JWT_SECRET` supprimé par #323 (`1758c0c`), cf. §4.1 | — |
| R4 | Ajouter `BREVO_API_KEY` à `.env.example` (absent : le fichier liste `SPRING_PROFILES_ACTIVE`, `DB_USERNAME`, `DB_PASSWORD`, `POSTGRES_DB`, `JWT_PRIVATE_KEY`, `EXPORT_TOKEN_SECRET`, `NEXT_PUBLIC_API_URL`, `APP_CANONICAL_HOST`, `AUTH_JWT_PUBLIC_KEY` — énumération ré-ancrée à la revue S50 : `JWT_SECRET` n'y figure plus depuis #323) | divergence avec `application.properties.example` | follow-up |
| ~~R5~~ | ~~Sortir le `jwt.secret` de `application-test.properties:28`~~ | **SANS OBJET** — la clé n'existe plus ; `jwt.private-key=` est vide et la paire de test est générée au run (#323), cf. §4.1 | — |
| R6 | Poser un scan de secrets en CI (`gitleaks`/`trufflehog`) pour empêcher toute réintroduction | aucun garde-fou automatique aujourd'hui | follow-up |
| R7 | Exécuter la purge d'historique #112 **après** avoir acté que R1/R2 rendent les valeurs inutiles | la purge seule ne « décompromet » rien | dev |

---

## 8. Références

- `docs/memory/devops/secret-rotation-runbook.md` — procédure de rotation (non exécutée)
- `docs/memory/devops/external-services-inventory.md` — inventaire + **§3quater** procédure par service
- `docs/memory/sprints/sprint-29/issue-112-done.md` — runbook de purge d'historique
- Issue #249 (rotation), #323 (RS256, vague 2 S50), #250 (inventaire services), #112 (purge)
