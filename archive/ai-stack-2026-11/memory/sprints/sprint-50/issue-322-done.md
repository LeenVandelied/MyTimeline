# Issue #322 — Durcissement `Host` de la garde middleware

- pack_lu: OUI — br-auth §BR-AUT-007 — Émission du token et cookie HttpOnly au login
  (cookie `jwt` HttpOnly / Path=/ / SameSite=Lax / MaxAge 2j = la source de vérité du nom de
  cookie lu par la garde ; aucune BR modifiée par cette issue)

## Option retenue

- Variable **`APP_CANONICAL_HOST`** (liste CSV, 1re entrée = canonique ; formes `host`,
  `host:port`, `https://host` — la forme à schéma impose aussi le protocole).
- **Pas `NEXT_PUBLIC_*`** : vérifié que le sandbox Edge alimente `process.env` depuis le
  process Node (`buildEnvironmentVariablesFrom`) et que `define-env` n'inline QUE les
  `NEXT_PUBLIC_*` → lecture au RUNTIME, modifiable sans rebuild d'image, rien au navigateur.
- **Pas `CORS_ALLOWED_ORIGINS`** : lue par Spring, **non transmise au conteneur frontend**
  (vérifié `docker-compose.yml`) → aurait donné une garde inactive en silence.
- **Fail-closed** : hôte non déclaré → réécriture vers la 1re entrée. Hôte déclaré → conservé.
- **Dégradé sans config** (absente / vide / invalide) → AUCUNE réécriture, comportement
  d'avant #322 à l'identique. Jamais de 500 (leçon BUG-S45-001).
- Portée : **toutes** les redirections du middleware (garde #302 **et** next-intl).

## Mesure runtime (faite AVANT de coder — infirme partiellement l'énoncé de l'issue)

`next build` + `next start` + curl :
- `initURL` de Next = `${proto}://${fetchHostname}:${port}` (hôte de **bind**), PAS l'en-tête
  `Host` (`attachRequestMeta`). Puis `resolve-routes.js` relativise le `Location`.
- ⇒ **`Host: evil.example` et `X-Forwarded-Host: evil.example` ne déplaçaient DÉJÀ pas la
  redirection** en self-hosting (`location: /fr/login` dans les 3 cas).
- ⇒ Le vecteur #322 n'était pas reproductible ici. Il redevient réel avec
  `experimental.trustHostHeader` ou sur une plateforme edge. Le correctif est donc de la
  **défense en profondeur**, pas la fermeture d'un trou exploitable en l'état. Écrit tel quel
  dans l'ADR.

## Résumé

Touchés : `frontend/src/lib/canonical-host.ts` (nouveau, PUR — séparé de la logique cookie
pour la greffe #323), `frontend/middleware.ts` (`withCanonicalOrigin`),
`frontend/middleware.test.ts`, `frontend/src/lib/canonical-host.test.ts` (nouveau),
`frontend/e2e/auth-guard.spec.ts`, `docker-compose.yml`, `.env.example`,
`frontend/.env.example`, `docs/adr/ADR-004-garde-serveur-middleware.md`.

Testé (exécuté par moi) :
- Vitest **747/747 vert** (87 fichiers), dont 41 cas sur `canonical-host` et le bloc
  `#322` de `middleware.test.ts` (Host falsifié, hôte légitime, preview multi-hôtes,
  fail-closed, protocole imposé, next-intl durci, 4 configs invalides → 307 nominale,
  `Location` absolu parsable sans base, port).
- `npm run typecheck` OK, `next lint` OK, `prettier --check` OK, `npm run build` OK.
- **Serveur réel** (`next start`, 3 configs, ~12 sondes curl) : `Host`/`X-Forwarded-Host`/
  `X-Forwarded-Proto` falsifiés → `https://app.mytimeline.test/fr/login` ; racine intl
  durcie ; `/fr/login` 200 ; cookie `jwt` → 200 ; config cassée → 307 nominale.
- **E2E Playwright exécuté** (`--no-deps`, serveur `next start`) : `Garde serveur — visiteur
  anonyme` **17/17 vert**, en mode dégradé ET avec `APP_CANONICAL_HOST` configuré.

Non testé : la suite E2E complète (projet `setup` → backend Spring + Postgres non démarrés) ;
aucun rendu visuel concerné (l'objet est un en-tête HTTP).

## Défaut trouvé par la vérification serveur (invisible en unitaire)

`url.host = 'app.example.com'` **ne supprime pas** le port existant (WHATWG) → la 307 sortait
en `http://app.mytimeline.test:3133/fr/login` (port interne du conteneur). Corrigé :
écriture `hostname` **puis** `port`, jamais `host`. Deux tests ancrent le cas.

## Critères d'acceptation

1. Décision tranchée (a) vs (b) → **SATISFAIT** : ni (a) ni (b), option (c) actée par le lead,
   justifiée et tracée en ADR (aucun reverse proxy dans le dépôt ; allow-list en dur écartée).
2. Implémenté + testé avec `Host` falsifié → **SATISFAIT** (unitaire + serveur réel + E2E).
3. ADR-004 §Limites mis à jour, follow-up retiré → **SATISFAIT** (nouvelle sous-section
   autonome « Origine canonique du `Location` (#322) », follow-up barré + reliquat explicité).
4. Aucune régression sur le nominal → **SATISFAIT** (747 unitaires + 17 E2E anonymes verts,
   sondes curl nominales OK).

## Risque résiduel

- **Rien n'impose `APP_CANONICAL_HOST` en prod** : pas d'équivalent frontend au
  `ProfileSafetyGuard` backend → oubli = dégradé silencieux. Follow-up inscrit dans l'ADR.
- Valeur syntaxiquement invalide → durcissement désactivé sans alerte (choix : ne jamais
  casser le boot).
- Liste mal synchronisée → un domaine légitime oublié est renvoyé vers le canonique.
- IPv6 accepté seulement en origine complète (`http://[::1]:3000`).
- Le durcissement rend le `Location` **absolu** dès que l'origine diffère de celle du bind
  (Next ne le relativise plus) : une valeur erronée envoie les anonymes sur le mauvais
  domaine. Contrepartie assumée de l'opt-in.

## [MEMORY:*]

- `[MEMORY:pitfall]` Contexte : réécrire l'origine d'une URL de redirection. Solution :
  écrire `hostname` puis `port`. Prévention : `url.host = 'h'` conserve le port existant
  (WHATWG) — un test unitaire dont l'URL de départ n'a pas de port ne voit jamais le bug ;
  interroger un `next start` réel.
- `[MEMORY:decision]` Contexte : #322, durcir le `Host` du middleware. Décision :
  `APP_CANONICAL_HOST` runtime, fail-closed, dégradé sans config. Pourquoi : aucun reverse
  proxy dans le dépôt ; `CORS_ALLOWED_ORIGINS` n'atteint pas le conteneur frontend ;
  `NEXT_PUBLIC_*` figerait la valeur au build.
- `[MEMORY:pattern]` Problème : `Location` d'un middleware Next et en-têtes d'hôte.
  Solution : `initURL` = hôte de **bind** en self-hosting, et `resolve-routes.js` relativise
  le `Location` quand l'origine coïncide. Anti-pattern : affirmer un open-redirect via `Host`
  sans l'avoir reproduit sur le runtime cible.

## Recommandations suite

- **#323 (vague 2)** : `withCanonicalOrigin` est en AVAL, `canonical-host.ts` est disjoint de
  `auth-guard-paths.ts` → greffer la vérif RS256 dans le `if` de la garde sans y toucher.
  ⚠ Piège : la clé publique se lira comme `APP_CANONICAL_HOST` (runtime, non `NEXT_PUBLIC_*`)
  — mais un rejet de token doit produire une **redirection**, jamais un throw : toute
  exception non catchée dans `middleware.ts` = 500 sur toutes les routes protégées
  (BUG-S45-001). §Limites d'ADR-004 est sectionnée : ajouter une sous-section, ne pas
  réécrire celle de #322.
- Follow-up à ouvrir : rendre `APP_CANONICAL_HOST` obligatoire en prod (équivalent frontend du
  `ProfileSafetyGuard`).
- Suite unitaire frontend à **747 tests / ~16-30 s** : sous le seuil de 3 min, mais au-dessus
  des ~500 → `RECOMMAND_TEST_RUNNER` pour les prochains lancements complets.

STATUS: COMPLETED
