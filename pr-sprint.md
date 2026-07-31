## Objectif

**Unifier le shell applicatif et fermer le dernier `500` prouvé.** Les Réglages vivaient hors du
route group `(app)/`, avec leur propre chrome et leur propre navigation verticale : passer du
tableau de bord aux réglages faisait disparaître la sidebar principale et changeait brutalement la
structure de la page.

Milestone : **Sprint 57** (#58). Cohésion 0.22 — sous le seuil, split **délibérément rejeté** :
sortir #312 aurait remonté la métrique à 0.31, mais le critère de sortie dit littéralement « sans
erreur 500 », ce 500 est prouvé dans le code, et il coûte 1 point. Le déporter pour un gain de
métrique aurait été exactement le re-scope silencieux à éviter.

**4/4 issues livrées** + 1 correctif post-review.

## Issues traitées

| # | Titre | P | Size | Commit |
|---|---|---|---|---|
| #299 | Intégrer `settings/` sous le shell applicatif | P2 | S | `6c830eb` |
| #312 | Aligner `/me` sur `/refresh` : `catch JwtException` → 401 | P3 | XS | `1651f9a` |
| #318 | Synchroniser les segments protégés avec l'arborescence `(app)` | P2 | S | `542e1c2` |
| #398 | Options de `settings-preferences.spec.ts` ciblées par libellé traduit | P3 | XS | `af33171` |
| — | Correctif post-review : casse du garde-fou `(app)/` | — | — | `9f4635d` |

## Changements clés

### #299 — structure du shell (arbitrage `ui-design` préalable, bloquant)

`settings` passe sous `(app)/` et **l'URL `/[locale]/settings` ne change pas** — un route group est
transparent. La sidebar `AppShell` devient la **seule** nav verticale ; `SettingsShell` est conservé
mais sa nav 220 px devient une **barre d'onglets horizontale**.

Le pattern WAI-ARIA tablist et **tous** les `data-testid` sont préservés — c'est précisément ce qui
a permis aux 6 specs E2E settings de rester intactes. `aria-orientation` passe en horizontal, ←/→
deviennent les touches primaires, et **↑/↓ sont conservées en alias** parce qu'une spec les
assertait. La garde d'auth locale de la page est supprimée (doublon de `useAuthGuard` porté par le
shell).

L'option « fusionner les 4 chapitres dans la sidebar » a été écartée : elle aurait mélangé deux
niveaux de hiérarchie et cassé `settings-tablist` + `aria-selected` sur 5 specs.

### #312 — le dernier 500

`catch (JwtException)` ajouté **après** `ExpiredJwtException` / `MalformedJwtException` — l'ordre est
contraint par le langage, ce sont des sous-types et la superclasse placée avant ne compilerait pas —
et **avant** le catch générique. Le corps de réponse est **strictement identique** à celui de
`/refresh` (`ErrorCode.UNAUTHORIZED`, constante déjà partagée) : un libellé différent aurait recréé
le side-channel que l'issue ferme.

### #318 — garde-fou filesystem

`readdirSync` en profondeur 1 sur `(app)/`, chemin résolu via `import.meta.url` (indépendant du
`cwd`), comparaison **bidirectionnelle** avec `PROTECTED_APP_SEGMENTS`.

Les route groups imbriqués `(x)/` et les segments dynamiques `[x]/` **font échouer le test** au lieu
d'être ignorés : dans ces cas le scan ne peut plus conclure, et les ignorer rouvrirait exactement le
trou que l'issue ferme. Le message d'échec nomme le segment fautif et le fichier à éditer. Le rouge
est prouvé sur des entrées fabriquées via des fonctions pures, **sans ajouter aucune route réelle**
dans `app/` (elle serait partie en production).

### #398 — testids dérivés de la valeur

5 `data-testid` ajoutés sur les `SelectItem` de `PreferencesSection.tsx`
(`pref-<champ>-option-<valeur>`, convention #331), spec basculée dessus. Plus aucun sélecteur par
libellé traduit.

## Règles métier impactées

- **BR-AUT-008** — le follow-up S43 explicitement listé « reste ouvert » dans le pack `br-auth.md`
  (`SignatureException` sur `/me` → 500) est **fermé**.
- **BR-AUT-009** — sert de référence de parité, non modifiée.
- **Garde serveur (#302 / S45, ADR-004)** — `PROTECTED_APP_SEGMENTS` inclut désormais `settings`,
  `PROTECTED_EXTRA_SEGMENTS` est vide, et c'est verrouillé par test.

## Tests

| Suite | Résultat |
|---|---|
| Backend | **455 / 455** |
| Unitaires frontend | **859 / 859** (842 au départ, +17) |
| E2E — 6 specs settings + `auth-guard.spec.ts` | **37 passed / 1 skipped** |
| E2E — suite complète | 127 passed / **3 failed** / 8 skipped |
| `tsc --noEmit` | 0 erreur |

**Les 3 échecs E2E sont d'environnement, pas de code** — cause établie et non supposée : l'endpoint
de test `/api/test-support/password-reset-token` renvoie 401 parce que le backend local ne tourne
pas avec le profil `e2e`. Le fixture pose lui-même le diagnostic. Aucun commit de ce sprint ne
touche au parcours de réinitialisation de mot de passe.

**Vérification navigateur** (#299 — non automatisable en unitaire), 4 paliers × clair/sombre,
réellement observés :

| Palier | Observé |
|---|---|
| 390 px | 0 sidebar, drill-down mobile, `settings-tablist` absent du DOM |
| **768 px** | 0 nav verticale, onglets horizontaux pleine largeur — **le palier où la double sidebar se serait manifestée** |
| 1024 px | sidebar 248 px, contenu 776 = 1024 − 248, exactement 1 nav verticale |
| 1280 px | contenu 1032, pas de scroll horizontal |

Débordement des onglets testé en locale **DE** (libellés les plus longs) : 484/720 px à 768 px.

## Review batch

**0 CRITIQUE · 0 MAJEUR · 4 MINEURS** — verdict `MERGEABLE`.

Le point le plus risqué du sprint a été vérifié explicitement : la suppression de la garde d'auth de
la page settings **ne rouvre rien**. `AppShell` fait un `return` précoce tant que `loading || !user`,
**avant** tout rendu de `{children}` — le contenu des Réglages n'est jamais monté pour un visiteur
anonyme, et le middleware coupe déjà en amont (307).

Un mineur a été **corrigé dans le sprint** (`9f4635d`) : le garde-fou de #318 ne normalisait pas la
casse. Un dossier `(app)/Billing/` déclaré verbatim `'Billing'` aurait rendu le test **vert** alors
qu'`isProtectedPathname` compare `segment.toLowerCase()` — `/fr/Billing` n'aurait donc **pas** été
protégé. Fausse assurance dans le scénario exact que le garde-fou existe pour empêcher. La casse
mixte est désormais rejetée explicitement, avec un message actionnable.

## Points signalés honnêtement

**Contraste sous AA — 3ᵉ incident du projet (après S48 et S53), mesuré cette fois.** L'onglet actif
en clair (`#1170E4` sur `#DBE9FC`) donne **3.83:1**, sous le seuil de 4.5.
**Ce n'est pas une régression de ce sprint** : le lien actif de la sidebar `AppShell` mesure
exactement le même ratio, sur le couple de tokens `bg-accent-soft` / `text-accent` que l'arbitrage
imposait de reprendre à l'identique. C'est une dette du design system qui touche **tout état actif
du produit** ; le correctif est au niveau du **token**, pas du composant.

**Écart de couverture E2E.** `settings-header` (testid marqué « optionnel » par l'arbitrage) n'a
**aucun consommateur** : le palier 768 px, où ce header est la seule sortie de navigation, reste
vérifié **uniquement à la main**. Traité par le processus documenté (`/create-e2e` après merge)
plutôt qu'en élargissant le périmètre en phase de clôture.

**Deux issues étaient périmées à l'exécution, et leurs briefings ont été corrigés.** #318 demandait
de traiter `settings` comme « un cas hors du groupe `(app)` » — faux après #299, livrée le matin
même dans ce sprint ; le critère a été redirigé vers « verrouiller que `PROTECTED_EXTRA_SEGMENTS`
reste vide ». #398 était estimée « XS, un seul fichier de test » alors que les `SelectItem`
n'avaient aucun `data-testid` : il a fallu instrumenter le composant d'abord.

**Bruit d'attribution de commit.** `1651f9a` (#312, backend) contient aussi le renommage
`settings/page.tsx → (app)/settings/page.tsx` (rename pur, 0 ligne de diff), absorbé par le working
tree partagé du fan-out : `git commit` **sans pathspec commite tout l'index**, même après un
`git add` ciblé. L'arbre est correct, seule l'attribution est fausse. La consigne durcie a été
appliquée en vague 2, où les deux commits sont restés parfaitement isolés.

## Follow-ups proposés (à arbitrer en `/sprint end`)

1. Contraste DS `text-accent` / `bg-accent-soft` = 3.83:1 en clair, sur tout état actif — correctif token
2. Couverture E2E de `settings-header` (automatiser le palier 768 px)
3. Cookie `jwt=` **vide** → `IllegalArgumentException`, hors hiérarchie `JwtException` → 500 sur `/me`
   **et** `/refresh` — défaut distinct de #312, dont l'alignement est bien atteint
4. Garde-fou #318 limité à la profondeur 1 de `(app)/`
5. Landmarks `<main>` imbriqués — pré-existant (dashboard et products aussi)
6. Backend E2E local sans profil `e2e` → 3 specs de reset password rouges en permanence en local
7. Bug i18n `DensityRibbon` : `{days}` non fourni, `IntlError` à chaque rendu du dashboard
8. `npm run lint` rouge en local sur `next-env.d.ts`, vert en CI — divergence à trancher

## Artefacts

`docs/memory/sprints/sprint-57/issue-{299,312,318,398}-done.md` · `review-sprint-57.md` ·
`docs/memory/audits/sprint-57-test-coverage.md` · `docs/memory/sprint-history.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
