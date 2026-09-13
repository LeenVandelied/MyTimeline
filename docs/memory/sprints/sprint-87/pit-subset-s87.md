## PIT-S12-003 — `git add -A` / `git add .` dans un worktree sprint partagé
Un subagent a fait `git add -A` avant de committer son fix → bundlé du travail lead non committé (commentaire V9, `docs/memory/sprints/**`, `sprint-history.md`) dans son commit. Corrigé via `git reset --soft HEAD~1` + staging explicite. Prévention : JAMAIS `git add -A`/`git add .` dans un worktree sprint où le lead a des modifs en cours — toujours `git add <fichiers explicites>` de son scope. À rappeler dans les briefings fullstack-dev. (Sprint 12 #54-fix)


## PIT-S62-009 — Working tree partagé : `frontend/.next` est unique, et le `next dev` d'un agent meurt sans notification
Un `next build` réécrit `.next` sous les pieds du serveur d'un autre agent, **sans autre signal que la mort de sa tâche de fond** — `git status` ne dit rien (variante « environnement » de [[PIT-S60-005]]). Un agent qui déclare « environnement laissé debout » doit **re-sonder le port**, pas se fier au fait qu'il l'a démarré. Pour builder sans casser le voisin : copie hors dépôt — `next build` webpack accepte un `node_modules` **symlinké**, **Turbopack le refuse** (`TurbopackInternalError: Symlink node_modules is invalid`), il faut hardlinker (`rsync --link-dest`). Et `next start` avec `output:'standalone'` sert de façon non fiable : utiliser `node .next/standalone/server.js` (+ copier `.next/static` et `public`). (Sprint 62)


## PIT-S72-004 — Le premier hit d'une route sous `next dev` dépasse un timeout Playwright de 5 s
La suite E2E est morte au projet `setup` (`provision shared`), 248 tests non exécutés : `expect(getByTestId('dashboard')).toBeVisible()` a 5 s de timeout, or le **premier** `GET /fr/dashboard` a pris **4172 ms** (compilation webpack 3,4 s) contre 72/59/35 ms ensuite — les 3 provisions suivantes sont passées. Diagnostic par lecture des durées dans le log `next dev`, pas par hypothèse. Prévention : préchauffer les routes ou relancer une fois avant de conclure à un défaut ; un échec du **seul premier** cas d'une série identique désigne l'environnement, pas le code. (Sprint 72)


## PIT-S73-001 — `break-words` seul ne corrige PAS un débordement quand l'élément est enfant direct d'un flex
`min-width:auto` sur un item de flex conserve la taille min-content du mot le plus long, et `overflow-wrap:break-word` (contrairement à `anywhere`) ne réduit pas min-content : le texte déborde quand même. Solution : `min-w-0` **+** `break-words` sur l'élément, ou `overflow-wrap:anywhere`. Prévention : tout correctif de débordement textuel doit remonter la chaîne flex avant de conclure — PIT-S63-013 annonçait « il manque break-words » et c'était insuffisant. (Sprint 73 #458)


## PIT-S74-008 — RTK transforme un `prettier --check` ROUGE en « All files formatted correctly »
Famille [[PIT-S62-010]], élargie au S74. `npx prettier --check <fichier>` a rendu « Prettier: All files formatted correctly » (résumé RTK) là où la sortie brute disait `[warn] … Code style issues found`. Deux appels successifs sur le MÊME fichier intact ont donné les deux verdicts opposés — le filtre ne s'applique pas de façon déterministe. Conséquence évitée de justesse : croire que son propre edit avait cassé le formatage et lancer un `prettier --write` qui reformate 60 lignes sans rapport dans un fichier shadcn jamais conforme. Prévention : `rtk proxy npx prettier --check …` pour tout verdict de formatage, et **vérifier l'état de la BASE** (`git show origin/dev:<path>`) avant d'imputer une non-conformité à son propre diff. Note connexe : la CI de ce dépôt ne lance PAS prettier (aucune occurrence dans `.github/workflows/`) — le formatage n'est pas un gate. (Sprint 74)


## PIT-S76-005 — zsh ne fait pas de word-splitting : `git add -- $F` avec une liste de chemins en variable ne stage RIEN
Sous zsh (shell de ce poste), `$F` contenant plusieurs chemins arrive comme **UN SEUL** pathspec : `git add` sort en 128, rien n'est indexé. L'échec est bruyant donc bénin, mais il coûte un aller-retour à chaque agent d'une vague de fan-out — et le même piège produit des FAUX POSITIFS silencieux dans les boucles d'audit (`for tid in $NEW_TESTIDS` du check coverage-E2E a rendu un MAJEUR fantôme au S76). Écrire les chemins littéralement, ou `${=F}`, ou un tableau. À corriger dans les gabarits de briefing qui recommandent « `git add <fichiers exacts>` ». (Sprint 76 #310)


## PIT-S77-002 — `Range.getClientRects()` ment DANS LES DEUX SENS sur un débordement — la sonde est `scrollWidth - clientWidth`
Deux défauts opposés rencontrés sur la même issue. (1) L'API **ignore le rognage `overflow:hidden`** et rapporte le texte masqué : elle comptait un `sr-only` comme +6,9 px de débordement. (2) Inversement, elle renvoie des **boîtes de ligne bornées à la boîte de contenu**, donc un mot **insécable** plus large que sa boîte n'y apparaît **jamais** — elle rendait structurellement **0** sur un rognage réel de 15 px, et a produit deux lignes fausses dans un rapport d'agent (« 0/30 » là où le lead mesurait 30/30). Prévention : pour « ce contenu déborde-t-il de sa boîte ? », la sonde est `scrollWidth - clientWidth` sur l'élément qui rogne ; réserver `Range` à la mesure d'un texte NON contraint. (Sprint 77 #191)


## PIT-S77-010 — `toHaveScreenshot` se stabilise sur le MAUVAIS rendu : deux frames de repli consécutives sont identiques
L'API rejoue la capture jusqu'à obtenir deux captures consécutives identiques avant de comparer — on en déduit à tort qu'elle attend un rendu **correct**. Deux frames en police de repli sont identiques : elle se stabilise dessus et compare celle-là. « Attendre la stabilité » ne remplace jamais « attendre la bonne condition » (police chargée, spinner retombé, section révélée). (Sprint 77 #294)


## PIT-S77-011 — Une référence de diff visuel capture l'habillage dépendant de l'ENVIRONNEMENT — et `mask` est le mauvais remède
Peints DANS la boîte de l'élément : indicateur de dev Next (`nextjs-portal`, absent sous `next start`), devtools TanStack (`.tsqd-parent-container`, dev only) et surtout `OfflineBanner` (`[data-testid="network-banner"]`), qui n'existe QUE quand l'API est injoignable — il **aurait rougi la CI en permanence**. Remède : injecter un `display:none` via `addStyleTag`, **pas** `toHaveScreenshot({ mask })` : un masque ne s'applique qu'aux éléments EXISTANTS, il graverait un rectangle dans la référence sans équivalent en CI. Prévention : avant de générer une référence, énumérer les éléments `position: fixed|sticky` et se demander lesquels dépendent du mode de build ou de la santé de l'API. (Sprint 77 #294)


## PIT-S77-019 — Références `toHaveScreenshot` : jammy ≠ noble rougit la CI, et `--update-snapshots` grave la mutation du contrôle négatif
Deux pièges enchaînés, mesurés sur la PR #536. (1) **Plateforme** : Playwright suffixe `-chromium-linux` pour *toute* distribution. Des références générées en `playwright:v1.61.1-jammy` (22.04) sont donc **comparées** sur un runner `ubuntu-latest` = **noble 24.04**, pas signalées manquantes — écart **ratio 0,01** (717 à 1259 px sur les cartes auth), soit l'ordre de grandeur de la plus petite régression détectable (0,0117) : **élargir la tolérance désarme la spec**. Seul remède : régénérer sur l'image du runner, contre un build de **production** (la CI joue `next start`). (2) **Régénération** : `--update-snapshots` **écrase** les références existantes, donc grave la mutation d'interlettrage du contrôle négatif dans `landing-hero-light.png` (13 058 px d'écart au run suivant). La garde `existsSync` protège d'une *création*, pas d'un *écrasement*. Toujours `--grep-invert "armement"`, puis **rejouer SANS `--update-snapshots`** avant de conclure. Fragilité durable : un futur bump d'`ubuntu-latest` rougira pareil. (Sprint 77 #294, PR #536)


## PIT-S81-022 — Deux `next dev` sur le même worktree se détruisent mutuellement
Les deux écrivent `frontend/.next` ; le premier meurt en cascade (`Cannot find module './343.js'` depuis `webpack-runtime.js`, puis `ENOENT .next/server/vendor-chunks/lucide-react.js`). Interdire le remontage dans un briefing **ne suffit pas** : vérifier `lsof -nP -iTCP:3000 -sTCP:LISTEN` avant de conclure sur un rouge, et ne PAS relancer son propre serveur par-dessus celui d'un agent — on rejoue la corruption dans l'autre sens. Corollaire : ne pas lancer le scope `frontend` de `test-quiet.sh` (qui contient `next build`) tant qu'un `next dev` sert l'E2E. (Sprint 81, lead)


## PIT-S83-005 — `test-quiet.sh frontend` n'exécute PAS `format:check`, que la CI exige
Au S83, une double ligne vide introduite par `75f37c4` a traversé l'agent (build + vitest + typecheck + lint) puis le lead (`test-quiet.sh` : 1392/1392, exit 0) — et a rougi le job CI `frontend` sur `prettier --check`. Le verdict local ne couvrait pas toutes les étapes du job. Aggravant : sous RTK, `npx prettier --check <fichier>` renvoie « All files formatted correctly » **alors que le fichier est fautif** ; seul `rtk proxy npm run format:check` a dit vrai. Tant que `test-quiet.sh` n'intègre pas `format:check`, le lancer à part avant tout push. (Sprint 83, clôture)


## PIT-S84-004 — Un débordement révélé par une nouvelle spec n'est pas forcément causé par le diff : corréler à la locale et au diff avant d'accuser
La spec `sprint-84-section-titles` (dashboard mobile 375 px, allemand) a rougi : page à 377 px. L'hypothèse naturelle — les nouveaux titres de #575 en allemand — était fausse. Une sonde Playwright (éléments dont `right > clientWidth`) a désigné le CTA `nowrap` de la rangée du salut ; le débordement était **plus fort en français** (390 px) qu'en allemand, dans des fichiers que le sprint n'avait pas touchés. Cause : `GreetingHeader` flex item sans `min-w-0`, avec un nom E2E sans espace (cf. [[PIT-S63-013]] — ici le défaut adjacent est réel : un vrai nom long déborde pareil). Réflexe : sonder QUI déborde, comparer 2 locales, et `git diff --stat` des fichiers en cause avant de corriger. (Sprint 84, lead)


## PIT-S85-002 — Un enfant `flex:1; min-width:0` absorbe tout le manque de place SANS jamais déborder
Ajouter deux boutons dans `.mt-tlv__toolbar` (`flex-wrap:wrap`) a écrasé la minimap à **9 px de large** à 1024 px en français, avec `scrollWidth === clientWidth` : aucun contrôle de débordement ne pouvait le voir, y compris `sprint-63-de-overflow-audit`. La barre ne passe à la ligne que lorsque l'élément élastique ne peut plus rétrécir, et une base `0` le laisse rétrécir jusqu'à rien. Parade : base minimale (`flex:1 1 160px`) + requête de conteneur pour renvoyer l'élément sur une 2e ligne. Prévention : après tout ajout dans une barre flexible, **mesurer la largeur de l'élément élastique aux paliers**, pas seulement l'absence de débordement. (Sprint 85 #602)


