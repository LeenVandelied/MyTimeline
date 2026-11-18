---
pack: frontend-socle
kind: technical
name: Socle frontend
generated_at: 2026-11-18T12:00:00Z
generator: synth/1
base_sha256: 91e9615691b8ead0a29e7eab9fb9497a7874cdfcc57d4fd2fc8cb3fced34509a
facts_in_base: 85
facts_in_pool: 84
facts_cited: 24
sections: frontend-socle.sections.json
details: [frontend-socle.details.md]
lang: fr
curated_at: 2026-11-18T14:30:00Z
curation: frontend-socle.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `^mytimeline:frontend/`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Conventions {#rules}

### Invariants
- Les locales supportées sont déclarées une seule fois, la locale par défaut est fr (`mytimeline:frontend/src/i18n/locales.ts:16-20`). [#81956d761fae945d-1] [#2681e154ca18518c-1]
- Selon la javadoc, le module de locales reste pur, sans dépendance Node, pour être importé par le middleware. [#8ccfe3ce2ea826e6-1]
- Selon la javadoc, l'ordre des providers du layout racine est Theme, puis Auth, puis Query. [#aeab71ba3df29aba-1]
- Selon la javadoc, une erreur n'est jamais journalisée brute, on passe par safeErrorMessage, qui préfixe le statut HTTP s'il existe. [#8bf24c9c5c97faf3-1] [#8bf24c9c5c97faf3-2]
- Le pont d'erreurs se monte sous le fournisseur next-intl selon la javadoc, et son cleanup remet le registre à null. [#3d7ba2b79879606f-1] [#3d7ba2b79879606f-3]
### Données et hooks
- Un hook de requête lit sa clé dans queryKeys et se désactive sans userId, et la mutation invalide le préfixe de clés de sa ressource. [#b485fe301f167807-2] [#434468f4e9a0a882-2]
- Selon la javadoc, TanStack Query v5 s'écrit en forme objet avec gcTime, et l'erreur d'une mutation remonte au composant. [#e688fe2a35b9cc5c-1] [#434468f4e9a0a882-1]
### Composants UI
- La plupart des composants UI (bouton, avatar, table et autres) sont des forwardRef avec displayName et cn pour className, mais le composant Tooltip est une fonction simple sans forwardRef [#9ada093f42c5012f-1] [#60c29c7e21afaf68-1] [#602974f8c6e4d014-2]
### Barrels et stories
- Un barrel réexporte chaque composant puis son type de props par une ligne distincte. [#1ea1cef586e27163-1] [#4c4a6ad8222ac4ce-1]

## 4. Structure {#structure}

Aucun fait de la base ne relève de cette section.

## 5. Points d'entrée du socle {#surface}

- Les services appellent `apiClient` avec un chemin relatif sans préfixe `/api`, comme pour la liste des sessions actives, donc n'ajoutez pas ce préfixe dans un nouveau service. [#c8e7542069dbe36c-1]
- Un service de suppression renvoie une promesse vide et n'exploite pas la réponse HTTP, comme la révocation d'une session dans `mytimeline:frontend/src/services/sessionService.ts:19-25`. Le code appelant ne doit donc pas attendre de données en retour. [#094f62dfc66d6733-1]

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
| timeline | 15 | 7 |  |

- Faits du pool par pack d'origine : frontend-socle 69, timeline 15

## 8. Tests attendus {#tests}

- Les tests de composant mockent `next-intl` avec `vi.mock`, et le mock renvoie la clé préfixée par son namespace, sous la forme `namespace.key`, comme dans `mytimeline:frontend/app/[locale]/(app)/products/[productId]/loading.test.tsx:7-9` [#3215d3bea2e69c04-1].
- Les tests de rendu utilisent `render` et `screen` de Testing Library, localisent les éléments par `data-testid` et vérifient le rôle `status`, voir `mytimeline:frontend/app/[locale]/(app)/products/[productId]/loading.test.tsx:13-19` [#3215d3bea2e69c04-2].
- Les tests fixent l'acceptation ou le rejet d'une liste de locales avec `it.each`, avec un `describe` par export, dans `mytimeline:frontend/src/i18n/locales.test.ts:11-29` [#742de7bd9572fb14-1].
- Le test de `isForbiddenError` suit la convention d'un `describe` par fonction, de titres de `it` en français et d'assertions booléennes strictes, dans `mytimeline:frontend/src/lib/state-errors.test.ts:6-8` [#6ade1bc0ef00f313-1].
- Le test de smoke Vitest vérifie que le rendu d'un élément se retrouve par rôle et nom accessible, ce qui valide l'infrastructure de test frontend, dans `mytimeline:frontend/src/__tests__/smoke.test.tsx:8-12` [#a7d742cf53c50dd9-1].

## 9. Questions ouvertes {#questions}

Aucun fait de la base ne relève de cette section.

## 10. Alertes {#alerts}

Aucun fait de la base ne relève de cette section.

## 11. Couverture {#coverage}

- Fichiers du pack : 419 ; avec au moins un fait en base : 50 ; sans fait après remise en file : 0.
- Faits en base : 85, repris d'autres packs : +0, hors périmètre : -0, doublons écartés à la déduplication : -1, soit 84 dans le pool.
- Faits du pool venus d'un autre pack : 15 (par pack : section Relations).
- Destination des 84 faits du pool : Conventions 72 ; Points d'entrée du socle 2 ; Tests attendus 5 ; Alertes / Questions ouvertes 5 ; annexe seule 0 ; écartés (sorte `other` ou inconnue) 0.
- Passe technique : scope 419 fichiers, lus 50 (11 %), non lus 369 : ce pack décrit le socle sur un échantillon, pas sur tout son scope.
- Base : sha256 91e9615691b8…, générée le 2026-11-17.
