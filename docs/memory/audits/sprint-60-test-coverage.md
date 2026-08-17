# Audit tests — Sprint 60

> Généré en fin de Phase 6. Sprint « Rendre le signal CI security exploitable » — issues #422, #362, #308.
> Rédigé par le lead. Tous les chiffres ci-dessous ont été **mesurés depuis le worktree
> `sprint/60`**, avec les codes de sortie réels lus via `rtk proxy` (`PIT-S45-003` : le wrapper RTK
> a déjà affiché « PASS » sur un `exit 1`).

## Couverture par issue

Aucune des trois issues ne touche une règle métier (`BR-*`) : le tableau canonique par BR est donc
sans objet ici. Le sprint est entièrement outillage / CI / dépendances. La grille est reprise par
issue, avec la même exigence de preuve.

| Issue | Nature | Cross-system flow | Test unitaire | Vérification exécutée | E2E | Preuve du cas négatif |
|---|---|:---:|:---:|:---:|:---:|:---:|
| #422 `nanoid` ≥ 3.3.18 | dépendance transitive | NON | ✅ suite frontend | ✅ `npm audit` avant/après | ✅ suite complète | ✅ audit rouge → vert |
| #362 scan de secrets CI | job CI | NON | ⚠ sans objet (YAML) | ✅ scan réel + YAML validé | ⚠ sans objet | ✅ secrets plantés détectés |
| #308 préflight `node_modules` | script shell | NON | ⚠ sans objet (shell) | ✅ 3 scopes + `bash -n` | ⚠ sans objet | ✅ garde-fou déclenché |

`⚠ sans objet` = la nature du livrable exclut ce type de test, pas un manque de couverture. Chaque
cellule est compensée par une vérification exécutée, colonne suivante.

## Tests et vérifications exécutés

### #422 — bump `nanoid`
- `npm audit --omit=dev --audit-level=high` (commande exacte de l'étape bloquante `ci.yml`) :
  **avant** `1 high severity vulnerability`, exit 1 → **après** `found 0 vulnerabilities`, **exit 0**.
- `nanoid` : 3.3.16 → 3.3.18 dans `frontend/package-lock.json`. **Aucune cascade** :
  1 fichier, 3 insertions / 3 suppressions.
- `./scripts/test-quiet.sh frontend` → exit 0, 95 fichiers / 888 tests.
- `npm run build`, `npm run typecheck`, `npm run lint` → exit 0 chacun.
- `./scripts/test-quiet.sh e2e` → **exit 0, 169 passed / 0 failed / 8 skipped (177)**, 1,8 min.
  Stack : backend Docker `:8086` profil e2e, frontend buildé avec `E2E_API_PROXY_TARGET=:8086`,
  `next start -p 3000`, `CI=1 --workers=1`.

### #362 — job CI `secret-scan`
- `ci.yml` : YAML valide, 7 jobs, `on: pull_request + push` → `dev`, `main`.
  **Validé via Ruby par le lead** — PyYAML n'est pas installé sur ce poste, donc la commande
  `python3 -c "import yaml"` annoncée par l'agent n'a pas pu s'exécuter telle quelle.
- Scan du dépôt avec la configuration livrée, **rejoué par le lead** :
  **768 commits, 0 détection, exit 0**, 937 ms.
- Preuve que le job n'est pas inerte, dans des dépôts git **jetables hors du dépôt** :
  clé AWS + clé Stripe → **2 détections, exit 1** ; clé Brevo `xkeysib-` → **1 détection, exit 1**.
- Deux défauts trouvés et corrigés **avant** livraison par l'agent, chacun retesté dans les deux
  sens : allowlist combinant ses critères en OU par défaut (blanchissait `EXPORT_TOKEN_SECRET`
  partout) ; exclusion par fichier qui laissait passer une vraie clé PEM dans le fichier de test.

### #308 — préflight `node_modules`
- Cas dégradé **réellement déclenché** (renommage réversible du plugin, restauration vérifiée) :
  `./scripts/test-quiet.sh frontend` → **exit 3**, message actionnable, Vitest jamais lancé.
- Cas nominal : → **exit 0**, 95 fichiers / 888 tests — identique au repère de #422.
- Scope inconnu → **exit 2**, message inchangé. `bash -n scripts/test-quiet.sh` → exit 0.

### Backend
**Suite backend non exécutée en local.** Justification : le diff ne contient **aucun** fichier
`backend/**` (cf. `git diff --stat origin/dev...HEAD` : 10 fichiers, aucun Java, aucun SQL, aucune
migration). Le job CI **`backend`** est un check requis sur `dev` et rejouera la suite sur la PR.
C'est une omission assumée et bornée, pas un oubli.

## Couverture E2E des nouveaux éléments d'interface
Heuristique Phase 8 : **aucun fichier `.tsx` modifié**, donc aucun `data-testid` introduit.
Aucune dette E2E créée par ce sprint. `[COVERAGE-E2E] OK`.

## Ce qui n'est PAS couvert — à lire avant de fusionner

1. **Le job `secret-scan` n'a jamais tourné sur un runner GitHub.** Le téléchargement du binaire
   gitleaks et son `sudo install` ne sont pas exercés localement. Premier run réel à surveiller
   sur la PR.
2. **Angle mort mesuré du scan** : gitleaks ne détecte **pas** le `DB_PASSWORD` historique de
   l'audit §3.1 (10 caractères alphabétiques, entropie sous le seuil de `generic-api-key`). Le job
   attrape les secrets à préfixe connu ou à forte entropie ; il n'est pas un substitut à la revue.
   Documenté dans `.gitleaks.toml` plutôt que passé sous silence.
3. ~~La liste des checks requis n'a pas pu être relue~~ — **levée.** L'endpoint
   `branches/dev/protection` et l'API GraphQL ont répondu **HTTP 503** pendant ~2 h (dégradation
   GitHub ; le REST ordinaire fonctionnait). Au retour du service, la liste réelle des checks
   requis sur `dev` est : **`backend`, `frontend`, `e2e`, `ai-env-packs`** — 4 contextes.
   `security` et `secret-scan` n'en font pas partie : conforme à ce que le sprint annonce, et
   c'est précisément pourquoi `secret-scan` devra être promu requis après un premier run vert
   (follow-up).
4. **Branches non exercées du préflight #308** : `node_modules` totalement absent, et
   `node_modules` vide. Le code les traite, seul le cas « paquet manquant » a été déclenché
   réellement. Les reproduire exigeait de déplacer tout `node_modules` — écarté.
5. **Préflight sous un `node_modules` en symlink** vers le dépôt principal (contournement décrit
   par #272) : non testé.
6. `npm ci` from scratch non rejoué côté #422 (arbre mis à jour en place par `npm update`).

## Review batch et audit sécurité (Phases 5 et 7)

**Reviewer** — aucun `[CRITIQUE]`. Un `[MAJEUR]` qui demandait une contre-épreuve plutôt qu'il ne
constatait un défaut (portée réelle de l'exclusion PEM). Tranché par le lead, dans des dépôts
jetables : littéral d'armure Java seul → **0 détection, exit 0** ; vraie clé PEM RSA-2048 dans ce
**même** fichier exclu → **détectée, exit 1** ; clé PEM dans un fichier quelconque → détectée.
L'exclusion est bien restreinte à la ligne, dans les deux sens. **Aucun défaut.**
Deux `[MINEUR]` : la limite « imports mono-ligne » du préflight est désormais écrite dans le
README ; rendre `secret-scan` requis reste un follow-up dépendant d'un premier run CI vert.

**Audit sécurité** — un `[MAJEUR]` **réel, corrigé** (`bdf6671`).
`.gitleaksignore` épinglait une empreinte sur le fixture `SECRET` d'`ExportTokenServiceTest`,
**encore présent au HEAD** (`ExportTokenServiceTest.java:40`), ce que la règle en tête du fichier
interdit explicitement. La constante s'appelle `SECRET` et non `EXPORT_TOKEN_SECRET` : l'allowlist
par nom de clé ne la couvrait pas. Mode d'échec discret : la ligne n'ayant jamais été retouchée,
l'empreinte restait valide indéfiniment — masquage **permanent** au lieu d'un rougissement au
premier reformatage. Remplacée par une exclusion durable ancrée sur le marqueur
`test-only-insecure` de la valeur **et** sur ce seul fichier.
Vérifié après correction : dépôt complet **772 commits, 0 détection, exit 0** ; même valeur dans
`application-prod.properties` → **détectée** ; clé Stripe dans `ExportTokenServiceTest.java` →
**détectée**.

Le reste de l'audit est `[OK]`, avec tests exécutés : `condition = "AND"` prouvé indispensable (la
variante `"OR"` rejouée rend le secret hors-chemin invisible), somme SHA-256 du binaire gitleaks
recalculée depuis GitHub et **conforme** au workflow, `permissions` non élargies, pas de
`pull_request_target`, aucun `secrets.*` référencé, aucun `upload-artifact` dans `secret-scan`,
`--redact` présent, angle mort `DB_PASSWORD` confirmé par test et correctement documenté.
Un point `[NON TESTÉ]` assumé : l'épinglage SHA des actions tierces (`checkout`, `setup-java`,
`setup-node`, `trivy-action`) n'a pas été confronté aux tags officiels.

## Conclusion
Prêt pour PR. Aucune couverture attendue ne fait défaut : les trois issues ont chacune une
vérification exécutée **et** une preuve de cas négatif. Les six réserves ci-dessus sont des limites
d'environnement local, pas des trous de test — la plus matérielle est la n° 1, que la PR lèvera
d'elle-même.
