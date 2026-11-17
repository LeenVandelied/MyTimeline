# Audit tests — Sprint 83

> Généré en fin de Phase 6. Sprint de conformité à la charte + sémantique HTML :
> **aucune des 4 issues n'impacte de règle métier** (chacune porte « BR impactées : Aucune »).
> Le tableau BR est donc sans objet ; la couverture est évaluée par issue.

## Couverture par issue

| Issue | Nature | Cross-system flow | Unit / RTL | E2E | Vérification navigateur |
|---|---|:---:|:---:|:---:|:---:|
| #578 nav active graphite | charte visuelle | NON | ✅ 38 tests ciblés | ⚠ N/A (aucun testid ajouté, aucune spec n'assertait ces couleurs) | ❌ non faite |
| #518 dates en `<time datetime>` | sémantique HTML / a11y | NON | ✅ +9 tests, dont `date-time-semantics.test.tsx` (209 l.) et `ExportDataFlow.intl.test.tsx` | ⚠ N/A (aucun testid ajouté ; `sprint-70-preview-visual` couvre déjà `legend time`) | ❌ non faite |
| #574 filet 1px au repos | charte visuelle | NON | ⚠ N/A (purement CSS utilitaire) | ✅ `sprint-77-theme-visual` (10 écrans) — **rouge en local macOS, voir plus bas** | ❌ non faite |
| #642 bascule de thème hors connexion | fonctionnel public | NON | ✅ `theme-toggle.test.tsx` + `theme-toggle.i18n.test.ts` (+26 tests) | ✅ `landing-auth-theme-toggle.spec.ts` — **11 tests, 6 runs consécutifs verts** | ✅ partielle (mécanisme anti-flash, métriques macOS) |

Aucun flux cross-system (2+ systèmes/rôles) dans ce sprint : **aucun E2E métier n'est exigible**.

## Tests créés
- `frontend/src/components/__tests__/date-time-semantics.test.tsx` (#518)
- `frontend/src/components/settings/ExportDataFlow.intl.test.tsx` (#518)
- `frontend/src/components/products/{ProductDetailView,ProductsListView}.test.tsx` — étendus (#518)
- `frontend/src/components/ui/theme-toggle.test.tsx` + `theme-toggle.i18n.test.ts` (#642)
- `frontend/e2e/landing-auth-theme-toggle.spec.ts` (#642, **11 tests**) — puis armé par `9ccd798`
- `frontend/src/components/layout/AppShell.test.tsx` + `settings/SettingsShell.test.tsx` — étendus (#578)

## Résultats des runs

**Unitaires / build / typecheck / lint** — `./scripts/test-quiet.sh frontend` complet,
**rejoué par le lead** après le correctif de review `75f37c4` :
**1392 / 1392 (121 fichiers), exit 0** — build + vitest + typecheck + lint.
Base d'entrée du sprint : 1350 ; +42.
Backend : **non exécuté — le sprint ne touche aucun fichier backend**
(`git diff --name-only origin/dev..HEAD | grep -c '^backend/'` → **0**).

**E2E Playwright** — suite complète jouée **par le lead** (recette worktree : `npx next dev`
webpack sur `:3000`, backend e2e sur `:8085` ; oracles vérifiés `/api/auth/me`=401 **et**
`/fr/login`=200) :

> **314 passed / 11 failed / 8 skipped** (5,8 min, `workers: 2`)

### Analyse des 11 rouges — aucun n'est une régression du sprint

**10 × `sprint-77-theme-visual.spec.ts` — artefact de plateforme, pas une régression.**
Message : `A snapshot doesn't exist … -chromium-darwin.png, writing actual` — et **non**
`did not match`. Les références versionnées de ces 10 écrans sont `-chromium-linux.png` ;
il n'existe aucune référence darwin pour eux, donc la suite échoue sur macOS **quel que soit le
code**. Motif documenté au S82. Les 10 PNG darwin écrits par les runs ont été **supprimés**, pas
committés, et **aucun snapshot n'a été régénéré** (`--update-snapshots` graverait la mutation
d'armement dans la référence).
⚠ **Conséquence à assumer :** l'invalidation des 10 références annoncée par #574 (retrait de
`shadow-lg` sur les cartes auth et le cadre du hero) **n'est ni confirmée ni infirmée en local**.
**C'est la CI Linux qui tranche.** Un rouge de ce spec sur la PR est attendu et devra être traité
par une régénération des références **sur Linux**, après merge.

**1 × `sprint-82-recurrence-capped-hint.spec.ts` — backend e2e périmé.**
Le hint dépend du flag `capped` livré par `ba8f585` le **2026-09-03**. L'image du conteneur
backend utilisée (`sprint-plan-5-9ef090-backend-e2e`) a été construite le **2026-08-30**, soit
4 jours avant : elle **ne peut pas** contenir la fonctionnalité. Preuve par datation
(`docker inspect --format '{{.Created}}'`). Une sonde HTTP ne tranche pas ici — le filtre de
sécurité rend 401 pour toute route, existante ou non (calibré sur une route inventée).
Le sprint 83 ne modifiant **aucun** fichier backend, cet échec ne peut lui être imputé.
La CI, qui construit le backend depuis la branche, le vérifiera.

### Un rouge transitoire, résolu et non ré-étiqueté à la légère
`timeline.spec.ts › chargement des produits` était rouge au **premier** run complet
(`getByTestId('dashboard')` introuvable) et vert au **second**. Le log du second run montre un
`[setup] rendu /fr/register e2e-500-transitoire — tentative 1/3 échouée (statut HTTP 500)`, ce
qui documente ce type de transitoire dans le harnais. Un passage vert en isolation ne prouve pas
qu'un test est flaky (l'isolation retire aussi la charge et les specs polluantes) : c'est le
**second run complet, à charge identique**, qui a fait basculer le verdict.

### Le seul vrai défaut du sprint, trouvé et corrigé
La spec `landing-auth-theme-toggle.spec.ts` livrée par #642 **n'avait jamais été exécutée** et
tombait **6 fois sur 11** au premier run. Cause racine : **un clic Playwright sur un bouton
visible et activé mais non hydraté est un NO-OP silencieux**. Corrigé par `9ccd798` (barrière
d'hydratation nommée sur `aria-pressed`) ; **6 exécutions consécutives, 0 échec**. Le composant
applicatif n'a pas été touché — le diagnostic navigateur du lead avait établi qu'il fonctionnait.

## Ce qui N'A PAS été vérifié (à lire avant de conclure que le sprint est « vert »)
- **Aucun contrôle visuel humain ni mesure de contraste au pixel**, alors que 3 des 4 issues sont
  des issues de charte. Trois agents sur quatre ont remonté `RECOMMAND_UI_DESIGN`.
- **#574 — lisibilité des cartes Auth privées d'ombre franche** : `--color-bg` #FCFCFD vs
  `--color-surface` #FFFFFF ≈ 1,01:1. `shadow-xs` a été conservé *parce que le filet seul
  paraissait insuffisant*, **sans preuve**. C'est le risque nommé par l'issue elle-même.
- **#518 — delta 15→13px** sur 3 surfaces, `SessionList` en tête (date 13px mono à côté d'une IP
  restée à 15px, sur la même ligne). Assumé, non mesuré.
- **#578 — contrastes 17,76:1 / 16,70:1 calculés sur les tokens déclarés**, pas sur des pixels
  peints. La maquette de référence n'a pas été ouverte.
- **Aucun test avec un lecteur d'écran réel** (#518 est pourtant une issue d'accessibilité).
- **Métriques de largeur du header mesurées sur macOS**, pas sur l'image jammy de la CI, qui est
  ce qui fait basculer les budgets (`landing-header-logo.spec.ts` tranchera).
- **Aucune garde automatique** n'attrapera un futur composant rendant une date en `<span>`.

## Correctifs issus de la review (cycle 1) — et leur vérification

Le cycle 1 a rendu **0 CRITIQUE / 1 MAJEUR / 2 MINEUR**.

**Le MAJEUR — convention des horodatages naïfs (`75f37c4`).** Le backend expose `LocalDateTime`
sur `SessionResponse` et `ExportJobResponse`, donc des chaînes ISO **sans offset**.
`ExportDataFlow` les lisait en UTC (convention documentée #58) ; `SessionList` faisait
`new Date(iso)`, soit **l'heure locale du navigateur**.
*Attribution corrigée par le lead* : `formatDate` de `SessionList` est **inchangé depuis avant
#518** (vérifié contre `origin/dev`) — le défaut est **pré-existant**, et le libellé s'accordait
avec l'attribut. Ce qui a changé, c'est que #518 promeut ce décalage en **affirmation lisible par
la machine**, ce qui contredit l'objet même de l'issue.
Correctif : `parseServerDateTime` / `serverDateTime` dans `lib/date-iso.ts`, convention documentée
**dans le helper** et non au point d'appel (c'est l'absence de point unique qui avait permis la
divergence). 7 tests ajoutés sous `TZ='Asia/Tokyo'`, avec contre-épreuve : en remettant l'ancien
`new Date(iso)`, **4 tests rougissent en fuseau local et 3 sous `TZ=UTC`** — la garde discrimine
donc même dans les conditions de la CI, où le défaut serait autrement un NO-OP.
**Impact utilisateur assumé** : l'heure de « dernière activité » change sur Réglages > Sécurité,
du décalage local du navigateur. C'est une correction de bug — l'ancienne valeur était fausse.

**Les 2 MINEUR** : le double parsing d'`ExportDataFlow:207` est traité dans le même commit ; la
duplication des 2 bascules de thème en ligne (`AppShell`, `MobileDrawer`) reste en follow-up.

**Vérification E2E ciblée après correctif** : `settings-security.spec.ts` +
`landing-auth-theme-toggle.spec.ts` → **19 passed, exit 0**.
⚠ Un premier passage avait rendu 4 rouges : le serveur `next dev` s'était dégradé
(`/fr/login` = **500** pendant que `/api/auth/me` restait à **401** — piège S81, d'où l'intérêt de
sonder les **deux** oracles). Après redémarrage, vert. Ces 4 rouges n'avaient rien à voir avec le
correctif.

## Conclusion
**Prêt pour PR**, sous deux réserves explicites et tracées :
1. `sprint-77-theme-visual` sera **rouge en CI** tant que ses 10 références n'auront pas été
   régénérées **sur Linux** (conséquence directe et attendue de #574) ;
2. la conformité **visuelle** des 3 issues de charte n'a été validée par personne — un passage
   `ui-design` est recommandé avant de considérer l'écart maquette↔production comme réduit.
