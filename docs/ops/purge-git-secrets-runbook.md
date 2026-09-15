# Runbook — Purge des anciens secrets de l'historique git

> Issue #112 (Sprint 29). Suite de #34 (Sprint 3, `docs/memory/sprints/sprint-3/issue-34-done.md`).
> Statut : **PROCÉDURE DOCUMENTÉE — NON EXÉCUTÉE.**

---

## ⛔ ENCART STOP — À LIRE AVANT TOUTE ACTION

**Ce document ne déclenche AUCUNE exécution.** Il décrit une procédure **destructive et
irréversible** (réécriture d'historique git + `git push --force`).

Aucune commande de ce runbook ne doit être lancée sans TOUTES les conditions suivantes :

1. **« Oui » explicite du dev responsable** du dépôt.
2. **Fenêtre de gel planifiée** (freeze) communiquée à toute l'équipe.
3. **Backup miroir réalisé** (section 3) et vérifié.

Sans ces trois conditions : **NE RIEN EXÉCUTER**.

> ⚠️ Point clé : **la réécriture d'historique ne remplace JAMAIS la rotation des secrets**
> (section 7). Un secret un jour committé est compromis définitivement — la purge réduit
> l'exposition future, la rotation neutralise la valeur fuitée. **Faire les deux.**
> Si un seul des deux est possible : **prioriser la ROTATION** (section 7), elle est
> suffisante à elle seule pour couper le risque et n'est pas destructive.

---

## 1. Évaluation préalable — la purge est-elle même nécessaire ?

Répondre à ces questions AVANT d'engager quoi que ce soit :

- **Le dépôt est-il public ou privé ?** Remote : `git@github-hotmail:LeenVandelied/MyTimeline.git`
  (dépôt GitHub privé a priori). Si privé et jamais exposé : le risque de fuite externe est
  faible → **la rotation seule (section 7) peut suffire**, sans purge d'historique.
- **L'historique a-t-il déjà été cloné/forké par des tiers ?** (autres devs, CI externe,
  miroirs, forks GitHub). Si **oui** : la purge côté origin **NE récupère PAS** les copies
  déjà distribuées → la valeur reste compromise chez les tiers → **rotation obligatoire de
  toute façon**.
- **Y a-t-il des artefacts dérivés** (images Docker, logs CI, dumps) contenant les secrets ?
  La purge git ne les couvre pas.

**Conclusion type :** si le dépôt est privé, à faible diffusion, et que les secrets sont
routés (section 7) → la purge d'historique est *optionnelle* (hygiène). La décision d'engager
la procédure destructive revient au dev.

---

## 2. Pré-conditions bloquantes

À valider et cocher AVANT toute écriture d'historique :

- [ ] **Fenêtre de gel planifiée** (date/heure) pendant laquelle aucun push ne sera fait.
- [ ] **Communication équipe** : tous les contributeurs prévenus (la réécriture invalidera
      leurs clones locaux — ils devront re-cloner ou re-baser).
- [ ] **Freeze des PR ouvertes** : lister les PR en cours (`gh pr list`), les merger ou geler.
      Après force-push, toute PR non mergée sera basée sur un historique disparu → à recréer.
- [ ] **Inventaire des clones / worktrees à ré-synchroniser.** Worktrees liés connus
      (`git worktree list`) — à date :
      - `~/VSProjects/MyTimeline` (principal)
      - `~/VSProjects/MyTimeline/.claude/worktrees/heuristic-ishizaka-3366fc`
      - `~/.cursor/worktrees/MyTimeline/asb`, `.../etg`, `.../ktw` (détachés)
      Ré-exécuter `git worktree list` au moment de l'opération pour la liste à jour.
- [ ] **Inventaire des consommateurs CI/CD** et environnements qui clonent le dépôt.

---

## 3. Backup obligatoire AVANT toute réécriture

Un clone miroir complet (toutes branches, tags, refs) vers un emplacement sûr et hors ligne.
**À exécuter par le dev :**

```bash
# Emplacement de sauvegarde HORS du repo de travail
git clone --mirror git@github-hotmail:LeenVandelied/MyTimeline.git \
  ~/backups/mytimeline-mirror-$(date +%Y%m%d-%H%M%S).git
```

Vérifier que le backup est complet (`git --git-dir=<backup>.git log --oneline | head`) et le
conserver au moins jusqu'à validation post-purge. **Ne pas continuer sans ce backup.**

---

## 4. Identification des cibles

### Fichier porteur historique
- `backend/src/main/resources/application.properties` — a contenu des valeurs de secrets **en
  clair** entre le commit initial `e6676d6` et l'externalisation `ff5dca3` (#34). Depuis
  `ff5dca3`, les valeurs sont des placeholders `${VAR}` (secret-free).

### Secrets compromis (référencés par NOM uniquement)
| Variable | Nature | Présence historique |
|---|---|---|
| `DB_PASSWORD` | mot de passe PostgreSQL | en clair de `e6676d6` → parent de `ff5dca3` |
| `JWT_SECRET` (`jwt.secret`) | clé de signature JWT, 128 hex | en clair de `e6676d6` → parent de `ff5dca3` |
| `BREVO_API_KEY` | clé API Brevo (#49) | **à vérifier** — externalisée dès l'ajout (#49, après #34) ; probablement jamais en clair, mais contrôler `git log -- backend/src/main/resources/application.properties` |

> ⚠️ **Ne JAMAIS exhiber les valeurs.** Pour localiser les commits, utiliser des chemins de
> fichiers (`git log --oneline -- <path>`), **jamais** `git log -p` qui afficherait le contenu.

### Fichier `--replace-text` (patterns — SANS vraies valeurs)
`git filter-repo --replace-text` prend un fichier de correspondances `motif==>remplacement`.
Créer un fichier local **NON committé** (ex. `/tmp/secrets-replace.txt`, à supprimer après),
où l'on colle les **vraies** valeurs compromises côté gauche. Ici on ne montre que des
placeholders :

```
# /tmp/secrets-replace.txt  (NE JAMAIS committer — contient les vraies valeurs à gauche)
<VALEUR_COMPROMISE_DB_PASSWORD>==>***PURGED***
<VALEUR_COMPROMISE_JWT_SECRET>==>***PURGED***
# regex possible (préfixe 'regex:') pour un JWT 128 hex, à adapter :
# regex:[0-9a-f]{128}==>***PURGED***
```

Le dev remplace `<VALEUR_COMPROMISE_*>` par les valeurs réelles (récupérées depuis le backup
miroir ou l'historique local), lance filter-repo, puis **supprime ce fichier**.

---

## 5. Commandes `git filter-repo` (à exécuter par le dev en fenêtre planifiée)

> Prérequis : `git-filter-repo` installé (`/opt/homebrew/bin/git-filter-repo` présent). BFG non
> installé — non requis. Travailler sur une **copie fraîche** issue du backup, pas sur un
> worktree actif.

**Option A — purge par contenu (recommandée si le fichier doit rester dans l'historique
récent secret-free) :**
```bash
# Depuis un clone frais dédié à l'opération
git filter-repo --replace-text /tmp/secrets-replace.txt
```
Remplace chaque occurrence des valeurs dans tout l'historique par `***PURGED***`, en gardant
les fichiers et l'arborescence.

**Option B — purge du fichier entier de tout l'historique (plus radical) :**
```bash
git filter-repo --path backend/src/main/resources/application.properties --invert-paths
```
⚠️ Supprime le fichier de **tous** les commits (y compris les versions secret-free actuelles).
À n'utiliser que si le fichier peut être recréé proprement ensuite. **Option A préférée.**

**Avertissements :**
- `filter-repo` **réécrit tous les SHA** → l'historique diverge totalement de `origin`.
- Il retire par défaut le remote `origin` (garde-fou anti-push accidentel) — à re-ajouter
  manuellement avant le push (section 6).
- Vérifier le résultat AVANT tout push : `git log --oneline | head`, et confirmer l'absence
  des valeurs (section 8).

---

## 6. Force-push + impact

Après vérification locale uniquement :

```bash
# Re-ajouter le remote (filter-repo l'a retiré)
git remote add origin git@github-hotmail:LeenVandelied/MyTimeline.git
# Force-push de TOUTES les branches et tags (réécriture globale)
git push origin --force --all
git push origin --force --tags
```

> ⚠️ `git push --force` fait partie des opérations exigeant confirmation explicite (règles
> globales). **Ne lancer qu'après « oui » du dev et en fenêtre de gel.**

**Impact — tout ce qui est basé sur l'ancien historique devient invalide :**
- **Clones / worktrees** de chaque contributeur → obsolètes. Chacun doit :
  ```bash
  # Simplest : re-cloner à neuf
  git clone git@github-hotmail:LeenVandelied/MyTimeline.git
  # OU réaligner un clone existant (perd les commits locaux non poussés) :
  git fetch origin && git reset --hard origin/main
  ```
- **Worktrees liés** (section 2) : les supprimer/recréer (`git worktree remove` puis re-add).
- **PR ouvertes** : basées sur des SHA disparus → à recréer sur le nouvel historique.
- **CI/CD & caches** : purger les caches de build référençant d'anciens SHA.

---

## 7. Rotation des secrets (INDÉPENDANTE — à faire de toute façon)

> **La rotation est requise même si la purge n'est PAS faite.** Un secret committé est
> compromis. Cette section est prioritaire et non destructive.

Checklist par secret :
- [ ] **`DB_PASSWORD`** — changer le mot de passe du rôle PostgreSQL `eventuser`, mettre à jour
      la variable d'env dans tous les environnements (dev/staging/prod, secret manager, CI).
- [ ] **`JWT_SECRET`** — régénérer (`openssl rand -hex 64`), déployer. ⚠️ **Invalide TOUS les
      tokens existants → déconnexion globale des utilisateurs** (comportement attendu, cf. #34).
- [ ] **`BREVO_API_KEY`** — si une valeur a un jour été committée : révoquer la clé dans le
      dashboard Brevo, en générer une nouvelle, mettre à jour l'env. (À confirmer via section 4.)

**Procédure de rotation par service :** le référentiel global mentionne
`docs/memory/devops/external-services-inventory.md` (§3quater) — **ce fichier est ABSENT du
dépôt à date.** À créer (inventaire des services externes + procédure de rotation) ou à pointer
s'il est ajouté ultérieurement. En attendant, rotation manuelle par service ci-dessus.

Post-rotation : vérifier que chaque environnement redémarre correctement avec les nouvelles
valeurs (boot prod fail-fast si `JWT_SECRET`/`DB_PASSWORD` absent, cf. #34/#111).

---

## 8. Vérification post-purge (par le dev)

Après réécriture, AVANT et APRÈS push :

```bash
# Aucune occurrence des valeurs compromises dans l'historique réécrit
git log -p -- backend/src/main/resources/application.properties | grep -c '<motif>'   # attendu : 0
# (utiliser le motif réel localement ; ne pas coller la sortie ailleurs)
```

Contrôle par ré-clonage neuf :
```bash
git clone git@github-hotmail:LeenVandelied/MyTimeline.git /tmp/mytimeline-verify
# Rechercher l'absence des valeurs dans le clone de contrôle, puis supprimer /tmp/mytimeline-verify
```

Critères de succès :
- [ ] 0 occurrence des valeurs compromises dans l'historique réécrit.
- [ ] Le clone de contrôle boote (profil dev) sans les secrets en dur.
- [ ] Backup miroir (section 3) conservé jusqu'à validation finale.
- [ ] **Rotation (section 7) réalisée** — indépendamment du succès de la purge.

---

## Références
- `docs/memory/sprints/sprint-3/issue-34-done.md` — externalisation initiale (#34).
- Règles globales : force-push / réécriture d'historique = confirmation explicite requise.
- `git filter-repo` : https://github.com/newren/git-filter-repo
