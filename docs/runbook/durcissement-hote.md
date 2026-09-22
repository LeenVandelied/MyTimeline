# Runbook — Durcissement de l'hôte de production

> **Prérequis BLOQUANT à l'ouverture des ports 80/443** (ADR-009 §9).
> La machine passe d'un usage privé à un service public hébergeant des **données
> personnelles**. Tant que ce runbook n'est pas appliqué, ne pas exposer l'application.

## État constaté au 2026-09-07

Sonde en lecture seule sur l'instance. Ce n'est pas une hypothèse :

```
-A INPUT -m state --state RELATED,ESTABLISHED -j ACCEPT
-A INPUT -p icmp -j ACCEPT
-A INPUT -i lo -j ACCEPT
-A INPUT -p tcp -m state --state NEW -m tcp --dport 22 -j ACCEPT
-A INPUT -j REJECT --reject-with icmp-host-prohibited
```

| Constat | Risque une fois 80/443 ouverts |
|---|---|
| `rpcbind` écoute sur `0.0.0.0:111` | Aujourd'hui masqué par la règle `REJECT` finale. Service inutile ici, à supprimer plutôt qu'à filtrer |
| Aucun `ufw` / pare-feu applicatif | Toute la politique repose sur une unique règle `iptables` non persistée |
| Pas de mises à jour de sécurité automatiques | Dérive silencieuse de l'OS |
| SSH ouvert à toute origine, `PasswordAuthentication` non vérifié | Surface de force brute permanente |

## 1. Le piège Oracle — ouvrir 80/443

**Deux niveaux à ouvrir, pas un.** C'est l'erreur qui fait perdre le plus de temps :
la console OCI montre le port « ouvert » alors que l'hôte le rejette toujours.

### a. Security List / NSG dans la console OCI

`Networking → Virtual Cloud Networks → <VCN> → Security Lists → Ingress Rules`.
Ajouter deux règles TCP `0.0.0.0/0` vers les ports `80` et `443`.

### b. `iptables` sur la machine — **INSÉRER, ne pas AJOUTER**

La chaîne se termine par un `REJECT` qui attrape tout. Une règle **ajoutée**
(`-A`) atterrit **après** ce `REJECT` et ne sert donc à rien. Il faut **insérer**
(`-I`) avant lui.

```bash
sudo iptables -I INPUT 5 -p tcp --dport 80 -m state --state NEW -j ACCEPT
sudo iptables -I INPUT 6 -p tcp --dport 443 -m state --state NEW -j ACCEPT
sudo iptables -I INPUT 7 -p udp --dport 443 -m state --state NEW -j ACCEPT
```

Vérifier que les nouvelles règles précèdent bien le `REJECT` :

```bash
sudo iptables -S INPUT
```

### c. Persister — sinon tout disparaît au reboot

```bash
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

Contrôle réel, **depuis l'extérieur** (une vérification locale ne prouve rien : elle
passe par `lo`, qui est accepté sans condition) :

```bash
curl -sS -o /dev/null -w '%{http_code}\n' http://<IP>/
```

> ⚠ **Ne jamais conclure sur un code de retour de connexion — constaté le 2026-09-07.**
> `nc -z` a rapporté « succeeded » sur 80/443 alors que la Security List OCI les bloquait
> encore. `curl`, lui, disait vrai. J'en ai tiré une explication inventée (« le réseau
> d'observation intercepte 80/443 ») que la suite a réfutée : une fois les règles posées, les
> mêmes commandes depuis le même poste ont rendu le contenu attendu.
>
> **Le seul contrôle qui tranche est un test par CONTENU.** Sur l'hôte :
>
> ```bash
> mkdir -p /tmp/probe && echo "jeton-$(date +%s)" > /tmp/probe/index.html
> sudo setsid --fork timeout 120 python3 -m http.server 80 --bind 0.0.0.0 --directory /tmp/probe
> ```
>
> puis, depuis l'extérieur, exiger le **jeton exact** en retour. Un intercepteur peut fabriquer
> une poignée de main, jamais un jeton généré à l'instant.
>
> Trois précautions : `--directory` est **obligatoire** (sans lui, l'arborescence est servie en
> `root`) ; `setsid --fork` pour que l'écouteur survive à la fin de la session SSH ; et vérifier
> qu'il écoute vraiment (`ss -tln`) **avant** d'interpréter un échec distant — sinon on teste le
> vide. Tuer l'écouteur et supprimer `/tmp/probe` ensuite.

## 2. Neutraliser `rpcbind`

Aucun composant de MyTimeline ne s'en sert.

**Appliqué le 2026-09-07 : masquage, PAS purge.** `nfs-common` dépend de `rpcbind`,
donc `apt-get purge rpcbind` l'emporte avec lui. Aucun montage NFS n'existe sur la
machine (`mount`, `/etc/fstab` vérifiés), la purge était donc sûre — mais le masquage
ferme le port tout aussi bien et se défait en une commande, ce qui vaut mieux sur un
hôte dont on ne connaît pas tout l'historique.

```bash
sudo systemctl disable --now rpcbind.socket rpcbind.service
sudo systemctl mask rpcbind.socket rpcbind.service
ss -tlnp | grep ':111' || echo "port 111 : plus rien en écoute"
```

Pour revenir en arrière : `sudo systemctl unmask rpcbind.socket rpcbind.service`.

## 3. Mises à jour de sécurité automatiques

```bash
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

Vérifier que le canal `-security` est bien actif :

```bash
grep -r 'security' /etc/apt/apt.conf.d/50unattended-upgrades | grep -v '^\s*//'
```

## 4. SSH

```bash
# /etc/ssh/sshd_config.d/99-durcissement.conf
PasswordAuthentication no
PermitRootLogin no
KbdInteractiveAuthentication no
```

```bash
sudo sshd -t && sudo systemctl reload ssh
```

> ⚠ **Ne jamais fermer la session courante avant d'avoir validé la nouvelle
> configuration depuis une SECONDE session.** Une erreur dans `sshd_config`
> combinée à une déconnexion laisse la machine inaccessible, et l'instance Oracle
> n'a pas de console série configurée par défaut.

Restreindre SSH à une IP de confiance est souhaitable mais **incompatible avec le
déploiement par GitHub Actions**, dont les runners n'ont pas d'IP stable. Deux voies :
laisser le port 22 ouvert avec authentification par clé seule (retenu pour le MVP),
ou passer par un tunnel type Tailscale/Cloudflare Tunnel (à évaluer plus tard).

## 5. Clé de déploiement dédiée

Ne **pas** réutiliser la clé personnelle d'administration pour la CI.

```bash
ssh-keygen -t ed25519 -f ~/.ssh/matimeline_deploy -C "github-actions-deploy" -N ""
```

- clé **publique** → `~/.ssh/authorized_keys` du compte de déploiement sur l'hôte ;
- clé **privée** → secret GitHub `DEPLOY_SSH_KEY` de l'environnement `production` ;
- empreinte de l'hôte → secret `DEPLOY_KNOWN_HOSTS`, obtenue par
  `ssh-keyscan -t ed25519 <IP>` puis **comparée** à l'empreinte lue depuis une session
  déjà établie (un `ssh-keyscan` seul ne protège d'aucun MITM).

## 6. Contrôle final

```bash
sudo iptables -S INPUT                      # 80, 443 avant le REJECT
ss -tlnp                                    # 22, 80, 443 uniquement
systemctl is-enabled unattended-upgrades    # enabled
sudo sshd -T | grep -E 'passwordauth|permitrootlogin'
docker compose -f /opt/matimeline/docker-compose.prod.yml ps
```

## Ce que ce runbook ne couvre pas

- **Détection d'intrusion** (fail2ban, CrowdSec) : pas retenu pour le MVP.
- **Chiffrement au repos** du volume de boot : non configuré.
- **Supervision / alerting** : aucun. Une panne se constate en visitant le site.
