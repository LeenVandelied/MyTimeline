- commits: [SHA à relire par le lead]
- resume: gitleaks 8.30.1, **binaire épinglé + SHA-256 vérifié** (PAS `gitleaks-action@v2` : exige
  `GITLEAKS_LICENSE` en organisation ; dépôt a 0 secret Actions — contrainte respectée).
  **Job dédié `secret-scan`** et non étape de `security` : `security` mêle bloquant et
  `continue-on-error` (chaîne eslint rouge connue) → signal illisible ; et ce scan exige
  `fetch-depth: 0` là où `security` prend le checkout superficiel. Portée : `gitleaks git`
  (historique atteignable depuis HEAD) sur **pull_request ET push** — contient les commits de la PR
  (checkout = commit de fusion) donc couvre le diff *a fortiori*, sans plomberie `base..head` ;
  le scan sur `push` tient le rôle du scan périodique sans déclencheur `schedule` (qui rejouerait
  backend/frontend/e2e). `--redact=100` obligatoire : logs CI publics, sinon le job publierait
  lui-même le secret détecté. `gitleaks dir` écarté (ignore `.gitignore` → +20 faux positifs
  `.next/`, `target/`, `e2e/.auth/`).
  Exclusions 2 étages, chacune adossée à un § de l'audit #249 : `.gitleaks.toml` (durable —
  EXPORT_TOKEN_SECRET §4.2 avec `condition="AND"` chemin+nom de clé ; faux positif `private-key`
  de `JwtServiceRs256Test` restreint à la ligne portant le littéral `"-----BEGIN PRIVATE KEY-----\n"`)
  + `.gitleaksignore` (12 empreintes épinglées au commit pour l'historique immuable §3.2/§4.1).
  Aucun fichier n'est blanchi pour l'avenir.
  **Verdict scan local chiffré** : sans exclusions 21 détections / exit 1 ; avec exclusions
  **766 commits, 0 détection, exit 0** (~1 s, 11,73 Mo). 4/4 des détections HEAD couvertes par
  allowlist durable, 16 purement historiques par empreinte.
  **Preuve de détection (exigée)** : secrets plantés dans dépôts git jetables HORS dépôt
  (scratchpad, rien créé dans le repo — `git status` vérifié) → clé AWS **détectée**, clé Stripe
  **détectée**, secret au bon nom hors chemin allowlisté **détecté**, autre nom de clé dans un
  chemin allowlisté **détecté**, vraie armure PEM multi-ligne dans le fichier de test **détectée**
  (le littéral Java reste exempté). Exit codes réels lus via `rtk proxy` (PIT-S45-003).
  YAML `ci.yml` validé (parseur YAML : 7 jobs ; `permissions`/`concurrency` inchangés ; aucune
  permission élargie). Les 3 fichiers livrés ne s'auto-détectent pas (exit 0) — piège écarté :
  `.gitleaksignore` contient des SHA 40-hex sur des lignes portant le texte « api-key ».
  Doc : audit §9 (choix, exclusions, limite mesurée, vérifications) + R6 passée à FAIT.

- [MEMORY:*] signaux:
  - `[MEMORY:pitfall]` Contexte : `[[allowlists]]` gitleaks combine ses critères en **OU par
    défaut**. Un bloc `paths` + `regexes` sans `condition = "AND"` blanchit la valeur PARTOUT dans
    le dépôt, pas seulement dans le chemin visé — une exclusion qui paraît étroite à la lecture est
    en fait globale. Solution : `condition = "AND"` systématique, et le vérifier en plantant la même
    valeur hors du chemin allowlisté. Prévention : toute allowlist de scanner doit être testée dans
    les DEUX sens (le cas attendu est tu, un cas voisin est toujours détecté).
  - `[MEMORY:pitfall]` Contexte : `gitleaks dir` **ne respecte pas `.gitignore`** (mesuré : 214 Mo
    scannés, 25 détections dont 20 dans `frontend/.next/`, `backend/target/`, `frontend/e2e/.auth/`)
    alors que `gitleaks git` ne voit que le contenu suivi (21 détections). Un job bâti sur `dir`
    rougit pour des artefacts de build non versionnés. Prévention : mode `git` pour un gate CI.
  - `[MEMORY:pitfall]` Contexte : un scanner de secrets peut **se détecter lui-même** — un fichier
    de baseline listant des empreintes `commit:fichier:generic-api-key:ligne` aligne un SHA 40-hex
    à forte entropie et le mot « api-key » sur la même ligne. Vérifié négatif ici, mais à tester
    avant commit : le scan pré-commit ne voit pas les fichiers non encore committés, donc un scan
    vert AVANT le commit ne prouve rien sur l'état APRÈS. Solution : rejouer le scan dans un dépôt
    jetable contenant les fichiers committés.
  - `[MEMORY:decision]` Contexte : R6 laissait gitleaks/trufflehog ouverts. Décision : gitleaks.
    Pourquoi : mécanisme d'exclusion à deux étages (durable vs épinglé au commit) — requis parce que
    l'historique exposé est immuable et doit être baseliné SANS blanchir les fichiers pour l'avenir.
  - `[MEMORY:pattern]` Problème : baseliner un historique compromis sans créer d'angle mort futur.
    Solution : `.gitleaksignore` (empreinte incluant le SHA → ne couvre qu'un commit immuable) pour
    l'historique + `.gitleaks.toml` scopé chemin+nom de clé pour les valeurs jetables encore au HEAD.
    Anti-pattern : `--baseline-path` avec un rapport JSON committé — le rapport **contient les
    valeurs en clair**, donc committer la baseline reviendrait à recommitter les secrets sur un
    dépôt public.

- recommandations suite:
  - `RECOMMAND_FOLLOWUP: rendre le check `secret-scan` requis sur `dev` après un premier run vert
    (PATCH ciblé documenté en en-tête de ci.yml ; réénumérer backend/frontend/e2e/ai-env-packs car
    la liste est REMPLACÉE, pas fusionnée)` [triage XS | domaine devops]
  - `RECOMMAND_FOLLOWUP: le scan ne couvre pas le `DB_PASSWORD` de l'audit §3.1 (10 car.
    alphabétiques, entropie trop basse pour `generic-api-key`) — évaluer une règle gitleaks maison
    sur les clés `*password*` à valeur littérale non-`${...}` dans `**/application*.properties`,
    avec mesure du bruit avant adoption` [triage S | domaine devops]
  - Pas de `RECOMMAND_DB_EXPERT` : aucune migration, aucun schéma touché.
  - Pas de `RECOMMAND_SECURITY` : le périmètre EST la sécurité et les exclusions sont adossées à
    l'audit #249 existant ; un second avis n'apporterait rien sans nouveau constat.
  - Pas de `RECOMMAND_TEST_RUNNER` : aucune suite de tests touchée (job CI uniquement) ; la
    vérification exigée était l'exécution réelle du scanner, faite ici.
  - Pas de `RECOMMAND_UI_DESIGN` : aucun changement visuel.

- ABSORBED:
  - Faux positif `private-key` sur `JwtServiceRs256Test.java:100` identifié et qualifié (armure PEM
    littérale autour d'une clé générée au run) — exclusion écrite au plus étroit plutôt que par
    fichier, après constat qu'une exclusion par fichier laissait passer une vraie clé PEM.
  - `.github/workflows/ci.yml` en-tête : `secret-scan` ajouté à l'inventaire des checks NON requis,
    pour que l'état documenté reste vrai.
  - NON VÉRIFIÉ (à assumer) : la liste réelle des checks requis sur `dev` n'a pas pu être relue —
    `gh api .../branches/dev/protection` a répondu **HTTP 503**. Les affirmations préexistantes de
    l'en-tête de `ci.yml` n'ont donc pas été corrigées, seulement complétées.
  - NON VÉRIFIÉ (à assumer) : le job n'a pas été exécuté sur un runner GitHub. Sont prouvés en
    local le verdict du scanner, ses exclusions, sa détection et la validité YAML ; ne sont PAS
    prouvés le téléchargement du binaire depuis le runner ni `sudo install` (étapes standard, mais
    non exercées). Premier run réel à surveiller par le lead.

STATUS: COMPLETED
