# Runbook — Sauvegarde et restauration de la production

> Issue #371, ADR-009 §8. Script : [`scripts/backup-prod.sh`](../../scripts/backup-prod.sh).
>
> **Le critère d'acceptation de #371 n'est PAS « une sauvegarde tourne ».** Il est
> qu'une **restauration ait réellement été exécutée** sur une base vierge et que le
> parcours cœur passe après. Tant que la section « Restauration » n'a pas été jouée
> pour de vrai, la sauvegarde est une hypothèse, pas une protection.

## Pourquoi hors de l'hôte

L'instance est sur l'offre Oracle **Always Free** : aucun SLA, et Oracle se réserve de
récupérer les ressources inactives. Une sauvegarde qui ne vit que sur la machine
sauvegardée ne protège d'aucun des scénarios réalistes (perte d'instance, suppression
accidentelle, corruption du volume). La cible retenue est **OCI Object Storage**
(20 Go inclus dans l'offre), donc hors de l'hôte applicatif.

> ✅ **Opérationnel depuis le 2026-09-07.** Bucket `matimeline-backups` (région
> `eu-paris-1`, **privé**), accès par **Instance Principal** — aucun secret sur la machine :
> groupe dynamique `matimeline-backup-dg` (matche l'instance par son OCID) + policy
> `matimeline-backup-policy` (`manage objects` + `read buckets`, restreints au bucket). Le
> cron pose `OCI_BUCKET=matimeline-backups` ; le script s'authentifie en `instance_principal`
> et **relit la liste distante** pour prouver la présence des objets après envoi. Vérifié :
> 5 objets par jeu réellement présents dans le bucket.

## Périmètre

Les quatre éléments sont nécessaires à une restauration complète.

| Élément | Source | Pourquoi |
|---|---|---|
| Base PostgreSQL | `pg_dump -Fc` | Comptes, produits, catégories, événements |
| `avatars-data` | volume Docker | Fichiers hors base tant que #212 n'est pas livrée |
| `exports-data` | volume Docker | Exports RGPD en attente de téléchargement |
| `caddy-data` | volume Docker | Certificats TLS **et** clé de compte ACME. Le perdre force une réémission et peut heurter le quota Let's Encrypt (5 certificats par domaine et par semaine) |

## Installation

```bash
sudo mkdir -p /var/backups/matimeline /opt/matimeline/scripts
sudo cp scripts/backup-prod.sh /opt/matimeline/scripts/
sudo chmod +x /opt/matimeline/scripts/backup-prod.sh
```

Planification quotidienne (l'instance est en **UTC** — `03:30 UTC` ≈ `05:30` en heure
d'été française) :

```cron
30 3 * * * OCI_BUCKET=matimeline-backups /opt/matimeline/scripts/backup-prod.sh >> /var/log/matimeline-backup.log 2>&1
```

> Sans `OCI_BUCKET`, le script s'exécute quand même mais **n'envoie rien hors de
> l'hôte** — il l'écrit en clair dans son journal. Ne pas confondre « la sauvegarde
> a réussi » et « la sauvegarde est en sécurité ».

**Rétention locale** : 14 jours (`RETENTION_DAYS`), appliquée par le script.

**Rétention distante** : par *lifecycle policy* sur le bucket, **pas** par le script (il
ne supprime jamais d'objet distant), et **pas par l'instance** — la policy IAM lui donne
`manage objects` mais **pas** `manage buckets`, à dessein : une instance compromise ne
doit pas pouvoir désactiver la rétention ni détruire le bucket. La lifecycle se pose donc
en **admin**, une fois. Deux voies :

- Console : bucket `matimeline-backups` → onglet *Gestion* / *Règles de politique de cycle
  de vie* → règle DELETE 30 jours, préfixe `matimeline/`.
- CLI depuis un principal admin (⚠ format validé — `--items` prend le **tableau nu**, et le
  préfixe va dans `objectNameFilter.inclusionPrefixes`, pas `objectNamePrefix`) :

  ```bash
  echo '[{"name":"expire-30j","action":"DELETE","timeAmount":30,"timeUnit":"DAYS","isEnabled":true,"objectNameFilter":{"inclusionPrefixes":["matimeline/"]}}]' > lc.json
  oci os object-lifecycle-policy put --namespace <ns> --bucket-name matimeline-backups --items file://lc.json --force
  ```

  Sans elle, les sauvegardes s'accumulent — sans danger de capacité (≈48 Ko/jour pour 20 Go
  de quota gratuit, soit >1000 ans), mais à régler pour l'hygiène RGPD.

## Vérifier qu'une sauvegarde est exploitable

Deux contrôles, dont un que le script fait déjà :

```bash
pg_restore --list db.dump > /dev/null && echo "dump lisible"
```

```bash
sha256sum -c SHA256SUMS
```

Un `pg_dump` interrompu en cours d'écriture laisse un fichier **non vide mais tronqué** :
sa taille ne prouve rien, seul `pg_restore --list` le détecte.

## Restauration

> ⚠ Procédure **destructive** : elle écrase la base et les volumes en place. Chaque
> commande de cette section est à taper par un opérateur humain, après avoir vérifié
> qu'il travaille bien sur l'instance voulue.

```bash
cd /opt/matimeline && docker compose -f docker-compose.prod.yml stop backend frontend
```

### 1. Base

Recréer une base vierge (suppression puis création, via `psql` sur la base
`postgres`), puis y rejouer le dump :

```bash
docker compose -f docker-compose.prod.yml exec -T postgres pg_restore -U eventuser -d eventmanager --no-owner --clean --if-exists < /chemin/vers/db.dump
```

L'option `--clean --if-exists` évite d'avoir à supprimer la base entière : les objets
sont remplacés un à un. C'est la voie à préférer, moins brutale et rejouable.

### 2. Volumes

```bash
for vol in avatars-data exports-data caddy-data; do docker run --rm -v "matimeline_${vol}:/dst" -v "$PWD:/src:ro" alpine:3 sh -c "find /dst -mindepth 1 -delete; tar xzf /src/${vol}.tar.gz -C /dst"; done
```

*(Le préfixe `matimeline_` est le nom du projet Compose : le vérifier avec
`docker volume ls` plutôt que de le supposer.)*

### 3. Redémarrage et contrôle

```bash
docker compose -f docker-compose.prod.yml up -d && docker compose -f docker-compose.prod.yml ps
```

**Flyway ne doit RIEN faire** au redémarrage : le dump contient déjà la table
`flyway_schema_history` à jour. Une migration qui s'exécute après une restauration
signale un dump plus ancien que le code déployé — dans ce cas, redéployer l'image
correspondant à la version du dump avant d'aller plus loin.

> ✅ **Restauration réellement exécutée le 2026-09-07** (critère central de #371).
> Le dump de production a été restauré dans un conteneur `postgres:16` **vierge et
> isolé** (jamais la prod) : `pg_restore` sans erreur, données identiques
> (`users=1 products=1 events=0 flyway=15 categories=1`), mot de passe bien haché
> (bcrypt, 60 car.). Conteneur de test supprimé après coup. La méthode « conteneur
> jetable » est préférée à une base `_restore_test` dans l'instance de prod : zéro
> `DROP DATABASE`, zéro risque pour les données réelles, et elle prouve la
> restauration sur une base **totalement vierge**.

### 4. Le contrôle qui fait foi

Aucun contrôle technique ne remplace le parcours réel :

- [ ] connexion avec un compte existant
- [ ] la frise affiche les événements d'avant la sauvegarde
- [ ] l'avatar du compte s'affiche (valide la restauration de `avatars-data`)
- [ ] création d'un événement, puis rechargement de la page
- [ ] le certificat TLS est valide et **n'a pas été réémis** (valide `caddy-data`)

## RPO / RTO

| | Valeur |
|---|---|
| RPO visé | 24 h (sauvegarde quotidienne) |
| RTO visé | < 1 h |
| RPO / RTO **mesurés** | RTO **3 s** (restauration base seule, ~20 Ko, 2026-09-07) ; RPO borné par le cron quotidien (24 h) |

RTO mesuré sur une restauration réelle dans un conteneur `postgres:16` vierge, hors
temps de provisioning de l'hôte (à compter séparément en cas de perte machine :
recréer l'instance, réinstaller la stack, ~15-30 min). Le RTO croîtra avec la
taille de la base ; 3 s vaut pour l'état actuel (1 compte, 1 produit).

## Ce que ce runbook ne couvre pas

- **Sauvegarde continue / PITR** (archivage WAL) : hors périmètre MVP, RPO 24 h assumé.
- **Chiffrement des sauvegardes au repos** : les dumps contiennent des données
  personnelles. Le chiffrement côté client avant envoi n'est pas implémenté — à traiter
  avant toute ouverture large.
- **Test de restauration automatisé** : la procédure est manuelle.
