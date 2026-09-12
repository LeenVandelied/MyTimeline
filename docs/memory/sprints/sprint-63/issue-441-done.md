# Issue #441 — dialogs de suppression et de conflit sur des namespaces i18n inexistants

**Vague :** 2 | **Taille :** S | **Commit :** `039751c` — 8 fichiers, +485/-26, **0 fichier de locale**

## Le critère 1 a été tenu : vérification navigateur avant tout correctif

Le défaut était établi par **lecture de code, jamais constaté visuellement**. Il l'est maintenant, et
il est **pire** que le « pourrait afficher la clé brute » de l'issue : c'est bien la clé brute, à
l'écran, **dans les 4 locales**.

| Dialog | fr / en / de / es |
|---|---|
| `DeleteConfirmDialog` | `deleteDialog.product.title`, `deleteDialog.product.description`, `deleteDialog.cancel`, `deleteDialog.confirm` |
| `ConflictDialog` | `conflictDialog.title`, `.description`, `.dismiss`, `.reload` |

Environnement : `:3000` confirmé comme étant *ce* worktree (`lsof -a -p <pid> -d cwd` — le piège
`PIT-S60-008` du worktree voisin est donc écarté par mesure, pas par supposition).
Le 409 de `ConflictDialog` a été provoqué pour de vrai, en bumpant `version` par API pendant que le
formulaire tenait une version périmée.

**Mécanisme tranché**, là où l'architect concluait « indécidable sans navigateur » :
console = `MISSING_MESSAGE: Could not resolve 'deleteDialog' in messages for locale 'fr'`, puis
`getMessageFallback` par défaut ⇒ **chemin de clé brut**. Ni chaîne vide, ni throw.

Post-correctif, revérifié : fr + es sur les deux dialogs (« Supprimer ce produit ? »,
« ¿Eliminar este producto? », « Modifié ailleurs », « Modificado en otro lugar »), et
**0 `MISSING_MESSAGE` en onglet neuf**.

## L'arbitrage : une troisième voie que l'issue ET l'architect avaient manquée

L'issue posait deux options, l'architect les a reprises telles quelles : `common` re-préfixé
(~27 appels `t()` à réécrire, dont des clés **dynamiques**) **ou** extraction en fichiers dédiés
(8 fichiers de locale créés, clés orphelines laissées derrière).

L'agent a retenu **ni l'une ni l'autre** : le **chemin pointé** `useTranslations('common.deleteDialog')`.

C'est la convention **dominante du dépôt** — ~25 des ~40 namespaces littéraux sont des sous-chemins
pointés (`products.detail`, `dashboard.kpi`, `shell.timeline`, `categories.drawer`), avec un
précédent de forme **identique** : `common.buttons` dans `MobileDrawer.tsx:34`.
*Vérifié par le lead : le précédent existe bien à cette ligne.*

Conséquence : **0 appel `t()` re-préfixé** (les clés dynamiques `` t(`${variant}.title`) `` et
`` t(`fields.${f.key}`) `` sont intactes) et **0 fichier de locale touché**. Le
`risque_regression` du mini-plan architect ne s'applique tout simplement pas.

Le correctif fait **1 ligne par composant**.

## Conséquence directe pour #423 (vague 3)

**Les 4 `common.json` sont strictement inchangés.** *Vérifié par le lead : 0 fichier sous
`public/locales/` dans le commit.* #423 hérite d'un terrain vierge — le séquencement V2→V3 imposé
par l'architect sur ce fichier partagé s'avère rétrospectivement inutile, mais sans coût.

## Stratégie de test — c'était la moitié de l'issue

Le mock existant (`useTranslations: (ns) => (k) => `${ns}.${k}``) rendait ce bug **indétectable par
construction** : un namespace faux produit exactement le même résultat qu'un bon. Le défaut a
survécu plusieurs sprints sous **3 fichiers de tests verts**.

3 fichiers ajoutés, +16 tests :

- `DeleteConfirmDialog.intl.test.tsx` (6) et `ConflictDialog.intl.test.tsx` (3) —
  `NextIntlClientProvider` + **vrais messages `fr`** + collecteur `onError`, assertions sur le
  **libellé traduit**, ciblant les clés dynamiques (3 variantes, 11 `fields.*`).
- `src/__tests__/i18n-namespaces.test.ts` (7) — **le bonus demandé** : résout **tout**
  `useTranslations('…')` de `src/` + `app/` contre les messages `fr`. Il échouerait pour
  **n'importe quel** namespace invalide du dépôt, pas seulement ces deux-là.

**Garde prouvée rouge** : namespace remis à `'deleteDialog'` → 1 échec citant le fichier et le
namespace fautifs, + 6/6 rouges sur le test intl. Restauré, re-vert. Le contrôle négatif est en plus
**figé en dur** (4 tests permanents sur `resolveNamespace`) pour ne pas retomber dans `PIT-S62-003`
(garde prouvée par des fixtures ensuite supprimées).

## Écarts au plan

1. **L'arbitrage binaire de l'architect était faux** — le chemin pointé domine les deux options et
   existait déjà dans le dépôt.
2. **`piste_issue_confrontee` « indécidable sans navigateur »** — tranché par mesure.
3. Le plan citait `DeleteConfirmDialog.test.tsx:23` pour le mock : c'est **l.22-24**, et le même
   mock existe aussi dans `ConflictDialog.test.tsx:15-17` et `TimelineEditHost.test.tsx:35` —
   **3 fichiers, pas 1**.
4. Piste du briefing confirmée utile : `ConflictDialog` a un consommateur **unique**,
   `EventEditForm.tsx:741`, et le 409 réel en sort en mode **legacy** (dismiss/reload), pas
   comparatif.

## Tests

`./scripts/test-quiet.sh frontend` → **1004/1004**, 101 fichiers, 15 s. `tsc --noEmit` exit 0.
`eslint` sur les 8 fichiers exit 0.

## Non vérifié — déclaré par l'agent

- `next build` / lint CI complet **non lancé** (interdit par le briefing, `.next` partagé).
- `ConflictDialog` en **mode comparatif** jamais atteint en navigateur (le 409 réel sort plat) —
  couvert uniquement en test unitaire à messages réels.
- Aucune spec E2E exécutée : aucune n'assertait de texte, et l'agent n'en a pas ajouté (la garde
  unitaire couvre mieux et sans flakiness).
- **Effet de bord assumé** : l'événement E2E `5723ae0c-…` a son titre muté et sa `version` à 9 dans
  la base docker e2e — données jetables d'un run antérieur, les specs regénèrent leurs identités.

## Signaux mémoire

- `[MEMORY:pitfall]` — un mock `next-intl` en `` `${ns}.${key}` `` rend un namespace **faux**
  indiscernable d'un juste. Le défaut a survécu plusieurs sprints sous 3 fichiers verts, et les E2E
  ne ciblaient que des `data-testid`. Prévention : tout composant à `useTranslations` doit avoir au
  moins une assertion sur un libellé **traduit**, jamais uniquement sur un chemin de clé.
- `[MEMORY:pattern]` — cibler un groupe imbriqué d'un fichier de messages : **chemin pointé**
  `useTranslations('common.deleteDialog')`. `i18n.ts` indexe par nom de fichier, next-intl résout
  les sous-chemins. Anti-patterns : prendre le nom du groupe seul pour un namespace (⇒ clé brute),
  ou extraire le groupe en fichier dédié (8 fichiers de locale pour rien).
- `[MEMORY:decision]` — 3 voies possibles, chemin pointé retenu : convention dominante (~25/40,
  précédent exact `common.buttons`), 0 `t()` touché, 0 fichier de locale touché.
- `[MEMORY:bug]` — cause : `useTranslations('deleteDialog')` / `('conflictDialog')` alors que
  `i18n.ts:17,22` indexe par nom de fichier. Garde-fou de dépôt `i18n-namespaces.test.ts` désormais
  en place.

## Recommandations suite

Négations explicites : pas de `RECOMMAND_TEST_RUNNER` (1004 tests en 15 s, exécutés et lus), pas de
`RECOMMAND_DB_EXPERT` ni `RECOMMAND_SECURITY` (aucun schéma, aucune surface d'auth).

Signalement hors scope, non corrigé conformément au briefing : `ui/dialog.tsx` reste en `z-50` —
follow-up déjà tracé par #446.

**Note transverse pour le lead** : le nouveau garde-fou `i18n-namespaces.test.ts` est **de dépôt**.
Toute issue future ajoutant un `useTranslations('…')` invalide le fera rougir, avec le fichier et le
namespace fautifs dans le message. C'est voulu — ce ne sera pas une régression du garde.

STATUS: COMPLETED
