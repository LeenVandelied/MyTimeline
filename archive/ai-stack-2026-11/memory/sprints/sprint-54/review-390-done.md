# Review PR #390 — cycle 2 (`/review-pr 390`)

> Second cycle de review, indépendant du batch Phase 7 du sprint (même pratique qu'au S50).
> Mode TEAM (3317 lignes dont ~940 de code, mono-domaine frontend, 2 chemins « auth » de test).
> Briefing correctif : `briefing-review390-fix.md`. Ancrage : `spawn-ref-review390-fix.txt`.

## Reviewers (3 axes, spawns Agent() natifs, Opus)

**0 CRITIQUE sur les trois axes.**

- **frontend** (`reviewer`) — 3 MAJEURS + 4 MINEURS
- **E2E** (`playwright-reviewer`) — 3 MAJEURS + mineurs, avec verdict de diagnostic (bug test / bug code / dérive)
- **sécurité** (`security-expert`) — 0 CRITIQUE / 0 MAJEUR, surface de production vérifiée inchangée

Deux MAJEURS (C surtout) ont été signalés **indépendamment par deux reviewers** — bon signal de convergence. Chaque finding a été **re-vérifié dans le code par le lead** avant d'être briefé (deux reviewers ont produit des références de ligne inexistantes — `EventEditForm.tsx:3259`, `auth-setup-render-retry.spec.ts:2240` — le fond était juste, les emplacements réels re-dérivés).

## Findings — 8 traités

| # | Finding | Fichier | Issue | Résultat |
|---|---|---|---|---|
| A | oracle zoom-out mobile non ancré (`not.toHaveText`) | `timeline-mobile.spec.ts:196` | #330 | **CORRIGÉ** — asserte `Mois` puis `Trimestre`, aligné sur le desktop |
| B | branche « swipe court » vacuously verte | `timeline-mobile.spec.ts` | #330 | **CORRIGÉ** — box stabilisée (2 lectures égales) + oracle positif `translateY` pendant le drag |
| C | témoin négatif sans garde de présence | `timeline.spec.ts:973` | #330 | **CORRIGÉ** — `toHaveCount(1)` de la pastille porteuse avant le `toHaveCount(0)` du libellé |
| D | `product-option-<id>` livré sans spec | `timeline.spec.ts:221` | #331 | **CORRIGÉ** — consommé par la sélection produit du drawer de création |
| E | sélecteur par `#id` contraire à la politique du fichier | `TimelineView.tsx:1017` | #330 | **CORRIGÉ** — `data-testid` ajouté à côté de l'`id` (id conservé, cible d'`aria-describedby`) |
| F | 4ᵉ mode de défaillance mal catégorisé | `support/register-page.ts` | #329 | **CORRIGÉ** — piste branchée sur `lastStatus` (null → injoignable / 200 → rendu applicatif / 5xx → dev server) |
| G | marge de contraste 1,2 % (`#787878`) | `timeline.spec.ts:935` | #330 | **RÉFUTÉ avec preuve** (voir ci-dessous) |
| H | `ArrowRight` no-op selon la largeur du rail | `timeline.spec.ts` | #330 | **CORRIGÉ** — garde `ratio < 50 %` lue sur la largeur réelle du handle |

Commits : `750159f` (oracles A/B/C/D/E/H) · `66dcd2a` (message de diagnostic F).
**Aucune assertion affaiblie** — tous les oracles sont rendus **plus** discriminants (c'était l'objet de chaque finding).

## Deux findings étaient des défauts du LEAD, pas de l'agent d'implémentation

1. **D — mon check COVERAGE-E2E (protocole A.4) a répondu OK à tort.** `product-option-<id>` était livré par #331 sans aucune spec, mais mon `grep "product-option" frontend/e2e/` a apparié un **commentaire** (`timeline.spec.ts:41`) et conclu à une couverture. Le testid n'était consommé par rien. **Leçon : un grep de testid apparie la prose autant que le code — filtrer sur `getByTestId|locator(` pour prouver un usage réel.**
2. **B — trou dans mon correctif `059030d`.** Le commentaire affirmait « mesure fraîche avant chaque swipe » ; c'était vrai du 2ᵉ swipe seulement. `boxShort` était pris dans la fenêtre transitoire de ~24 px, donc la branche « swipe court » était satisfaisable par l'inaction (`toBeVisible()` reste vert si le geste ne part jamais). Le 1er run de l'agent correcteur a **reproduit** exactement ce scénario (transform vide), confirmant le finding.

## Finding G — réfuté, et la réfutation tient

Le briefing demandait une couleur de ratio ~4,0 pour élargir la marge sous le seuil AA. **Infaisable, prouvé par balayage des 256 gris :** le « meilleur contraste » testé (`max(contraste vs INK_DARK, vs INK_LIGHT)`) ne dépend que de la luminance, et son minimum global — au croisement noir/blanc — vaut **4,432**, atteint précisément par `#787878`. Aucune couleur ne descend sous ~4,43. `#787878` est donc **déjà** le choix de marge maximale sous 4,5. La fragilité résiduelle vient de `INK_DARK` (`#0B0C0E`) ou du seuil, pas du choix de couleur — hors périmètre de specs. Réfutation acceptée par le lead.

## Sécurité — rien à corriger sur cette PR

Surface de production **inchangée** (0 `.java`, 0 endpoint, 0 config Spring). Vérifié : le listener `page.on('response')` collecte des **statuts** uniquement (pas de corps/cookie) ; le message d'échec ne divulgue que `account.key` (pas l'email) et une origine CORS déjà publique dans `application-dev.properties` ; `product-option-${product.id}` expose un UUID **déjà** présent dans le `value` frère (pas de fuite) ; `RATE_LIMIT_ENABLED=false` reste cantonné au job CI e2e éphémère avec `ProfileSafetyGuard` fail-fast en prod. 1 MINEUR pré-existant hors diff (`E2ePass123` en clair dans `support/accounts.ts:112`), neutralisé par la randomisation des identités et l'absence de déploiement → follow-up.

## Vérification finale (lead, run unique avant-plan)

**134 tests → 125 passed / 0 failed / 9 skipped** (5,4 min, `--workers=1`). Passed **non en baisse** vs la référence pré-correctif. `product-option` désormais consommé (`grep … | grep getByTestId` → 1 ligne réelle).

## [MEMORY:pitfall] Un grep de testid apparie la prose autant que le code

Le check COVERAGE-E2E du protocole A.4 (`grep -rq "$val" frontend/e2e/`) rend un **faux OK** quand le seul « usage » du testid est un commentaire. Un testid peut ainsi être livré sans spec tout en passant la gate. Prévention : filtrer sur un usage sélecteur réel — `grep -E "getByTestId|locator\("` — et non la simple présence de la chaîne.

## [MEMORY:pitfall] `boundingBox()` d'un panneau animé, pris trop tôt, rend un oracle de geste vacuous

Un `boundingBox()` lu juste après `toBeVisible()` capture une position transitoire (~24 px de dérive ici). Un `mouse.down()` sur ces coordonnées rate la cible et **aucun geste ne part** ; un `toBeVisible()` post-geste reste alors vert « par inaction ». Prévention : stabiliser la box (deux lectures consécutives égales, sans temporisation arbitraire) **et** un oracle positif que l'élément a bougé (`translateY`) avant `mouse.up()`.

## Follow-ups (pour le triage /sprint end)

- `timeline-mobile.spec.ts:181-188` (test zoom-**in**, **préexistant** commit `41b8b15`, hors diff) : même oracle faible `not.toHaveText` que le finding A. Candidat au même ancrage. [XS | frontend]
- `aria-pressed` sur `timeline-fullscreen` : l'oracle plein écran ne repose que sur le compteur du stub ; exposer un état produit observable demande de modifier le composant. [S | frontend]
- `settings-preferences.spec.ts:30,37,48,52,62` : options ciblées par libellé traduit (hors diff). [XS | frontend]
- `E2ePass123` en clair dans `support/accounts.ts` (dépôt public, neutralisé) : à décider. [XS | frontend]
- `INK_DARK` / seuil AA : la marge de contraste du test G ne peut être élargie que là. [XS | design]

STATUS: COMPLETED
