---
pack: frontend-socle
kind: technical
name: Socle frontend
generated_at: 2026-11-17T10:36:11Z
generator: synth/1
base_sha256: 3a91ad4fd323d79177eb0322a46696627319b8475fa2076568d4d2f938ac77d0
facts_in_base: 85
facts_in_pool: 84
facts_cited: 28
sections: frontend-socle.sections.json
details: [frontend-socle.details.md]
lang: fr
curated_at: 2026-11-17T10:45:42Z
curation: frontend-socle.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `^mytimeline:frontend/`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Conventions {#rules}

### Données et erreurs
- Un hook de requête lit sa clé dans `queryKeys` et reste désactivé tant que `userId` est absent. [#b485fe301f167807-2]
- Une mutation invalide le préfixe de clés de sa ressource dans `onSuccess`. [#434468f4e9a0a882-2]
- Voir `mytimeline:frontend/src/services/sessionService.ts:16` (pointeur, détail en annexe) [#03037b579b39b673-1] [#b0cbae33933771ad-1].
- Voir `mytimeline:frontend/src/services/ApiErrorTranslatorBridge.tsx:21-30` (pointeur, détail en annexe) [#3d7ba2b79879606f-2] [#3d7ba2b79879606f-3].
### Routes et i18n
- La racine redirige vers `/fr` écrit en dur, sans lire la constante de locale par défaut. [#43b4bb8adb5cf7f6-1] [#2681e154ca18518c-1]
- Voir `mytimeline:frontend/app/[locale]/page.tsx:15-19` (pointeur, détail en annexe) [#2325b843f28a7d18-2].
- Voir `mytimeline:frontend/app/[locale]/home/page.tsx:14-17` (pointeur, détail en annexe) [#cba7431c31861d84-1].
### Composants
- Voir `mytimeline:frontend/src/components/ui/avatar.tsx:17` (pointeur, détail en annexe) [#9ada093f42c5012f-1] [#60c29c7e21afaf68-1] [#602974f8c6e4d014-2].
- Voir `mytimeline:frontend/src/components/ui/textarea.tsx:17-18` (pointeur, détail en annexe) [#541483e5d9dff22c-1].
- Voir `mytimeline:frontend/src/components/ui/icon-button.tsx:16-17` (pointeur, détail en annexe) [#9eaf3991c4b071cb-2].
- Un barrel réexporte le composant puis son type de props sur une ligne `export type` distincte. [#1ea1cef586e27163-1] [#4c4a6ad8222ac4ce-1]
- Voir `mytimeline:frontend/src/components/dashboard/lib.ts:10` (pointeur, détail en annexe) [#f8c44bd458b850a9-1] [#e6752fdbca75023a-1].
### Storybook
- Voir `mytimeline:frontend/src/components/timeline/Cursor.stories.tsx:8-25` (pointeur, détail en annexe) [#65c51a62d2eb1c32-1] [#4b86dd770a00ef4c-1].

## 4. Structure {#structure}

Aucun fait de la base ne relève de cette section.

## 5. Points d'entrée du socle {#surface}

- Voir `mytimeline:frontend/src/services/sessionService.ts:14-17` (pointeur, détail en annexe) [#c8e7542069dbe36c-1].
- Les services de suppression, comme `mytimeline:frontend/src/services/sessionService.ts:19-25`, renvoient `Promise<void>` et n'exploitent pas la réponse HTTP [#094f62dfc66d6733-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 50), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:frontend/src/i18n/locales.ts` | 4 | config 2, convention 2 |
| `mytimeline:frontend/src/services/sessionService.ts` | 3 | external_call 2, convention 1 |
| `mytimeline:frontend/src/components/ui/avatar.tsx` | 3 | convention 3 |
| `mytimeline:frontend/src/components/ui/tooltip.tsx` | 3 | convention 3 |
| `mytimeline:frontend/src/services/ApiErrorTranslatorBridge.tsx` | 3 | convention 3 |
| `mytimeline:frontend/src/__tests__/smoke.test.tsx` | 2 | suspicious 1, test_case 1 |
| `mytimeline:frontend/app/[locale]/page.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/components/legal/legal-disclaimer.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/components/theme-provider.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/components/timeline/Cursor.stories.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/components/timeline/DateStamp.stories.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/components/timeline/Ruler.stories.tsx` | 2 | convention 2 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| timeline | 0 | 7 |  |

- Faits du pool par pack d'origine : frontend-socle 69, timeline 15

## 8. Tests attendus {#tests}

- Les tests de composant fixent que `next-intl` est mocké avec `vi.mock`, et que le mock renvoie la clé préfixée par son namespace (`namespace.key`), voir `mytimeline:frontend/app/[locale]/(app)/products/[productId]/loading.test.tsx:7-9` [#3215d3bea2e69c04-1].
- Les tests de rendu s'appuient sur `render` et `screen` de Testing Library, localisent par `data-testid` et vérifient le rôle `status`, voir `mytimeline:frontend/app/[locale]/(app)/products/[productId]/loading.test.tsx:13-19` [#3215d3bea2e69c04-2].
- Le test de smoke Vitest fixe que l'infra frontend rend un élément et le retrouve par rôle et nom accessible, voir `mytimeline:frontend/src/__tests__/smoke.test.tsx:8-12` [#a7d742cf53c50dd9-1].
- Les tests de locales ont un `describe` par export et vérifient l'acceptation ou le rejet de listes de valeurs avec `it.each`, voir `mytimeline:frontend/src/i18n/locales.test.ts:11-29` [#742de7bd9572fb14-1].
- Voir `mytimeline:frontend/src/lib/state-errors.test.ts:6-8` (pointeur, détail en annexe) [#6ade1bc0ef00f313-1].

## 9. Questions ouvertes {#questions}

Aucun fait de la base ne relève de cette section.

## 10. Alertes {#alerts}

Aucun fait de la base ne relève de cette section.

## 11. Couverture {#coverage}

- Fichiers du pack : 419 ; cités par au moins un fait : 50 ; non cités définitifs : 0.
- Faits en base : 85 ; dans le pool après déduplication : 84 (dont 0 repris d'autres packs) ; cités dans ce pack : 29 ; en annexe : 79 ; ni cités ni en annexe : 0 ; écartés (sorte `other`) : 0.
- Fichiers dont au moins un fait est cité ici : 24 sur 419.
- Passe technique : scope 419 fichiers, lus 50 (12 %), non lus 369 : ce pack décrit le socle sur un échantillon, pas sur tout son scope.
- Base : sha256 3a91ad4fd323…, générée le 2026-11-17.
