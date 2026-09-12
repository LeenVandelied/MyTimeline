# Issue #318 — [ENHANCEMENT] Synchroniser les segments protégés avec l'arborescence `(app)`

**Sprint :** 57 | **Vague :** 2 (parallèle avec #398) | **Taille :** S | **Domaine :** auth
**Commit :** `542e1c2` — `:white_check_mark: test(auth): ancrer PROTECTED_APP_SEGMENTS sur l'arborescence (app) (#318)`

## Objectif

`PROTECTED_APP_SEGMENTS` était une liste en dur sans source de vérité. Une page ajoutée sous `(app)/`
sans mise à jour de la liste serait **servie aux visiteurs anonymes, silencieusement** — le Sprint 45
a montré trois fois que ce type d'échec passe à travers les tests existants.

> ⚠ **L'issue était périmée au moment de son exécution.** Écrite avant #299, elle demandait de
> traiter `settings` comme « un cas explicite hors du groupe `(app)` » et avertissait qu'un
> `readdirSync((app)/)` naïf l'omettrait. #299 (livrée en vague 1) a déplacé `settings` **dans**
> `(app)/` et vidé `PROTECTED_EXTRA_SEGMENTS`. Le briefing a été corrigé par le lead : le critère
> réel devient « verrouiller le fait que `PROTECTED_EXTRA_SEGMENTS` reste vide ». Le cœur de
> l'issue — le garde-fou filesystem — était intact et reste l'apport de cette issue.

## Ce qui a été fait

Garde-fou dans `frontend/src/lib/auth-guard-paths.test.ts` : lecture de
`frontend/app/[locale]/(app)/` par `readdirSync` en profondeur 1 (chemin résolu via
`import.meta.url` + `path.join`, **indépendant du `cwd`**), comparaison à `PROTECTED_APP_SEGMENTS`
**dans les deux sens**. Documentation du lien ajoutée aux JSDoc de `PROTECTED_APP_SEGMENTS` et
`PROTECTED_EXTRA_SEGMENTS` dans `auth-guard-paths.ts`.

`frontend/middleware.ts` : **lu seulement, non modifié**.

## Règle de filtrage (écrite en commentaire, pas implicite)

| Entrée | Traitement | Raison |
|---|---|---|
| fichiers (`layout.tsx`, `error.tsx`…) | ignorés (`!isDirectory()`) | pas des segments d'URL |
| `_x/` (dossier privé Next) | ignoré | jamais routé |
| `@slot/` (route parallèle) | ignoré | pas de segment d'URL propre |
| `(groupe)/` (route group imbriqué) | **ÉCHEC explicite** | remonte ses enfants d'un niveau → le scan ne peut plus conclure |
| `[param]/` (segment dynamique) | **ÉCHEC explicite** | matche tout premier segment → le scan ne peut plus conclure |

Choix défensif à retenir : les deux derniers cas **font rougir le test avec une marche à suivre**
plutôt que d'être ignorés. Les ignorer rouvrirait exactement le trou que l'issue ferme.

Sous-routes de profondeur 2 : hors champ, **vérifié par assertion** (`products/[productId]` existe
réellement sur le disque **et** n'apparaît pas dans le scan) — pas supposé.

## Preuve du rouge (sans polluer l'arborescence de production)

Logique extraite en fonctions pures — `scanRouteDirectories` / `diffProtectedSegments` /
`formatGuardReport` — typées sur `DirEntryLike` (la forme structurelle de `fs.Dirent` :
`{name, isDirectory()}`). Les **mêmes fonctions** tournent sur le disque réel et sur des entrées
fabriquées.

Trois échecs couverts : route existante non déclarée (`billing`), constante orpheline (`invoices`),
les deux à la fois. **Zéro route ajoutée dans `app/`.** Un rouge réel a aussi été observé en local
par édition temporaire du seul fichier de test, revertée avant commit.

## Message d'échec (verbatim)

```
GARDE SERVEUR DÉSYNCHRONISÉE (#318) :
• Routes présentes sous frontend/app/[locale]/(app)/ mais ABSENTES de PROTECTED_APP_SEGMENTS : settings, timeline
  → ces pages sont servies aux visiteurs ANONYMES. Ajoute chaque segment dans frontend/src/lib/auth-guard-paths.ts (PROTECTED_APP_SEGMENTS).
• Segments déclarés dans PROTECTED_APP_SEGMENTS mais ABSENTS de frontend/app/[locale]/(app)/ : invoices
  → route supprimée, renommée, ou sortie du groupe (app) ? Retire-la de frontend/src/lib/auth-guard-paths.ts, ou déclare-la dans PROTECTED_EXTRA_SEGMENTS si elle vit désormais hors du groupe.
```
Variante pour les dossiers non interprétables : `• Dossiers non interprétables à la profondeur 1 :
(marketing), [slug] → … Étends scanRouteDirectories … AVANT de fusionner.`

## `PROTECTED_EXTRA_SEGMENTS`

Assertée vide (`toEqual([])`) + commentaire de marche à suivre si elle cesse de l'être. Second test :
aucun segment extra ne peut dupliquer un dossier réel de `(app)` (no-op aujourd'hui, filet
anti-déclaration contradictoire demain), et `PROTECTED_SEGMENTS === [...APP, ...EXTRA]`.
`settings` re-couvert **sans faux négatif** : dossier vérifié sur le disque, puis constante, puis
`isProtectedPathname('/fr…', '/en…')`.

## Tests

- Ciblé `auth-guard-paths.test.ts` : **41/41** (était 24)
- Suite unitaire frontend : **855/855** (était 842, +13)
- `tsc --noEmit` : 0 erreur · eslint : 0 sur les 2 fichiers · prettier OK
- E2E non lancés (consigne du lead — #398 tenait le port en parallèle)
- Commit à pathspec : **2 fichiers seulement**, modifications de #398 laissées non commitées ✅

## Pitfalls / patterns / décisions

`[MEMORY:pitfall]` — **Vitest tronque le message d'échec passé comme valeur comparée.** Vitest 3.2.7
tronque à ~40 caractères les valeurs d'un `toBe` dans le message d'`AssertionError`
(`expected 'GARDE SERVEUR DÉSYNC…' to be …`), et le reporter JSON ne transporte **que** ce message :
un rapport d'échec multi-ligne passé comme valeur comparée est **décapité en CI**. Solution : passer
le texte en **2ᵉ argument** d'`expect(value, message)` (imprimé entier). Prévention : tout test dont
l'échec doit être actionnable → vérifier le rouge **sous reporter non interactif**, pas seulement en
local. *(Cohérent avec la mémoire projet « CI verte ≠ page correcte » : ici c'est le symétrique — un
rouge lisible en local et illisible en CI.)*

`[MEMORY:pattern]` — **Tester une logique filesystem sans polluer l'arborescence de production.**
Typer l'entrée par la forme structurelle de `fs.Dirent` (`{name, isDirectory()}`) → une même fonction
pure tourne sur disque réel et sur entrées fabriquées. Anti-pattern : créer une route ou un fichier
bidon pour prouver le rouge (il partirait en production).

`[MEMORY:decision]` — **La logique de comparaison vit dans le fichier de test, pas dans
`auth-guard-paths.ts`.** Ce module est importé par le middleware **Edge** et doit rester minimal et
pur ; la comparaison est de l'outillage de test, pas du runtime.

## Recommandations suite

`RECOMMAND_FOLLOWUP` — le garde-fou ne couvre que la **profondeur 1 de `(app)/`**. Une route protégée
introduite ailleurs (`app/[locale]/<x>/`, hors groupe) resterait sans filet automatique. Signalé pour
information, **pas un blocage** : c'est précisément le cas que `PROTECTED_EXTRA_SEGMENTS` couvre
manuellement, et le test asserte désormais qu'elle est vide.

Aucun autre `RECOMMAND_*`.

STATUS: COMPLETED
