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

**Trois constats supplémentaires non prévus au périmètre initial** — voir §4 (valeurs de forme
« secret réel » encore présentes au HEAD dans `.env.example`, `application-test.properties` et
`.github/workflows/ci.yml`).

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

### 4.1 `.env.example:26` — `JWT_SECRET`, **indéterminé**

- Forme : `MIXTE-OPAQUE`, **longueur 64**, alphabet base64url, composition
  26 minuscules / 29 majuscules / 9 chiffres / 0 spécial.
- **Aucun marqueur lexical de placeholder** (ni `change`, ni `your`, ni `example`, ni `xxx`…).
- Présent depuis `da929b6` (2026-07-11) **jusqu'au HEAD `d78454e`** (234 commits).
- Une valeur antérieure existait ligne 25 (longueur 99, `591e30b` → `ecd56e2`, 21 commits, retirée).

**Statut : indéterminé.** Sa forme est **indiscernable d'un secret réellement généré**. Impossible
de conclure « placeholder » sans inspecter la valeur, ce que la règle interdit. Risque concret et
indépendant de cette ambiguïté : un développeur copie `.env.example` en `.env` **sans changer la
valeur**, et le secret d'un déploiement réel devient une chaîne publiée sur un dépôt public.
Par contraste, `.env.example:18` (`DB_PASSWORD`, longueur 20) porte bien les marqueurs `dev` et
`local` → placeholder documenté, sans ambiguïté.

### 4.2 `backend/src/test/resources/application-test.properties:28` — `jwt.secret` en dur au HEAD

- Forme : `MIXTE-OPAQUE`, **longueur 68**, base64url, marqueur lexical faible `ci` présent.
- Présent de `da929b6` (2026-07-11) **au HEAD** (234 commits).
- Portée : profil `test` uniquement (Testcontainers, CI). Impact opérationnel **nul** tant que la
  valeur n'est pas réutilisée hors tests — mais c'est un littéral en clair sur un dépôt public.

### 4.3 `.github/workflows/ci.yml` — identifiants de service en dur au HEAD

- `POSTGRES_PASSWORD:114` / `DB_PASSWORD:164` : forme `mot-alpha`, longueur **12**, marqueur `ci`.
  Même `vid` sur les trois clés (`POSTGRES_PASSWORD`, `DB_PASSWORD`, `E2E_DB_PASSWORD`) → une seule
  et même valeur, conteneur de service éphémère.
- `JWT_SECRET:169` : `MIXTE-OPAQUE`, longueur **64**, base64url, **aucun marqueur lexical**.

Ces valeurs ne protègent qu'un conteneur Postgres jetable créé et détruit dans le job CI : le
risque direct est faible. Le risque réel est la **réutilisation** de `JWT_SECRET` (§4.1/§4.3, même
longueur 64, `vid` différents → **valeurs distinctes**, ce qui est le bon comportement).

### 4.4 Faux positifs écartés

- `crowdin.yml:2` `api_token` : longueur 14, `mot-alpha`, marqueur `your` → placeholder
  (`YOUR_API_TOKEN`-like). Présent depuis `38d3467` (2025-03-27), 649 commits. Non exposé.
- `scripts/flyway-validate.sh` (`FLYWAY_PASSWORD`, `PGPASSWORD`) : `ref-env-pure` / expressions
  shell composées → aucune valeur en dur.
- `docker-compose.yml` (`POSTGRES_PASSWORD:15`, `DB_PASSWORD:40`, `JWT_SECRET:45`) :
  `ref-env-pure` → aucune valeur en dur.
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
| R2 | Laisser #323 (RS256) remplacer `JWT_SECRET` ; ne pas régénérer de secret HS256 | §3.2 | agent #323, vague 2 |
| R3 | Remplacer `.env.example:26` par un placeholder explicitement marqué (ex. `JWT_SECRET=<generer: openssl rand -base64 48>`) | §4.1 — ambiguïté + risque de copie telle quelle | follow-up |
| R4 | Ajouter `BREVO_API_KEY` à `.env.example` (absent : le fichier ne liste que `SPRING_PROFILES_ACTIVE`, `DB_USERNAME`, `DB_PASSWORD`, `POSTGRES_DB`, `JWT_SECRET`, `NEXT_PUBLIC_API_URL`) | divergence avec `application.properties.example` | follow-up |
| R5 | Sortir le `jwt.secret` de `application-test.properties:28` vers une valeur générée au run ou une variable CI | §4.2 | follow-up |
| R6 | Poser un scan de secrets en CI (`gitleaks`/`trufflehog`) pour empêcher toute réintroduction | aucun garde-fou automatique aujourd'hui | follow-up |
| R7 | Exécuter la purge d'historique #112 **après** avoir acté que R1/R2 rendent les valeurs inutiles | la purge seule ne « décompromet » rien | dev |

---

## 8. Références

- `docs/memory/devops/secret-rotation-runbook.md` — procédure de rotation (non exécutée)
- `docs/memory/devops/external-services-inventory.md` — inventaire + **§3quater** procédure par service
- `docs/memory/sprints/sprint-29/issue-112-done.md` — runbook de purge d'historique
- Issue #249 (rotation), #323 (RS256, vague 2 S50), #250 (inventaire services), #112 (purge)
