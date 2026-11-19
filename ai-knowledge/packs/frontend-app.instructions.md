---
pack: frontend-app
kind: technical
name: Routes et pages Next.js
generated_at: 2026-11-19T16:00:00Z
generator: synth/1
base_sha256: 4ead529a8d043a46bb414d015bb3f6acd6784116ab4f2d64de21df0e57d98b88
facts_in_base: 88
facts_in_pool: 88
facts_cited: 31
sections: frontend-app.sections.json
details: [frontend-app.details.md]
lang: fr
curated_at: 2026-11-19T16:38:00Z
curation: frontend-app.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `^frontend-app:`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Conventions {#rules}

### Écrans de chargement
- Selon le commentaire de products/loading, un `loading.tsx` enveloppe aussi les segments enfants, donc chaque enfant à fallback différent a son propre fichier. [#de7e2f0ed7095ba3-1]
- Les fallbacks loading.tsx de la couche (app) sont des composants client qui lisent leurs libellés avec useTranslations, le plus souvent dans le namespace de leur segment, le dashboard utilisant le namespace commun [#de7e2f0ed7095ba3-2] [#f6fc1f69dbd3ffb6-2] [#6c6a5005a986a168-2]
- Selon le commentaire de timeline/loading, le testid du fallback reste distinct de celui de la page et l'ancien `timeline-loading` ne revient pas. [#6c6a5005a986a168-1]
### Erreurs et 404
- Les composants qui rendent leur propre document sont des composants client qui importent `globals.css`, et leurs libellés sont inlinés car ils vivent hors du fournisseur next-intl. [#a9a3bfc89eae1e73-1] [#35eb2e637ab761d4-1]
- Les libellés 404 copient `errors.json` et se resynchronisent à la main quand ils changent. [#da27a7b668cd53e5-1]
- L'error boundary écrit l'erreur réelle dans la console sans l'afficher, et les écrans d'état passent par `StateScreen`. [#4b4fee94969264b8-1] [#61b77c57cf76feed-1]
- La page 404 est un Server Component sans logique, qui délègue à un composant client `-screen.tsx`. [#286ccab6e67ed391-1] [#286ccab6e67ed391-2]
### Pages d'auth
- Une page d'auth client reçoit `params` en `Promise` et lit la locale avec `use(params)`. [#161671a13789cc97-1] [#f4a196fc94aea5ef-1]
### Polices
- La variable --font-ui se dérive dans fonts.ts, partagé par le layout [locale] et Storybook sans recopie. Les deux écrans global-error et global-not-found-screen en gardent une copie locale [#dada10d09df46167-1]

## 4. Structure {#structure}

Aucun fait de la base ne relève de cette section.

## 5. Points d'entrée du socle {#surface}

Aucun fait de la base ne relève de cette section.

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 22), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `frontend-app:[locale]/forgot-password/page.tsx` | 9 | convention 8, suspicious 1 |
| `frontend-app:global-not-found-screen.tsx` | 7 | convention 5, suspicious 2 |
| `frontend-app:[locale]/error.tsx` | 8 | convention 8 |
| `frontend-app:[locale]/(app)/timeline/page.tsx` | 6 | convention 5, suspicious 1 |
| `frontend-app:global-error.tsx` | 6 | convention 5, suspicious 1 |
| `frontend-app:[locale]/(app)/dashboard/loading.tsx` | 5 | convention 5 |
| `frontend-app:[locale]/login/page.tsx` | 5 | convention 5 |
| `frontend-app:[locale]/(app)/timeline/loading.tsx` | 4 | convention 4 |
| `frontend-app:fonts.ts` | 4 | convention 3, config 1 |
| `frontend-app:[locale]/(app)/products/loading.tsx` | 3 | convention 3 |
| `frontend-app:[locale]/(app)/settings/loading.tsx` | 3 | convention 3 |
| `frontend-app:global-not-found.tsx` | 3 | convention 3 |

## 7. Relations avec d'autres packs {#relations}

- Faits du pool par pack d'origine : frontend-app 88

## 8. Tests attendus {#tests}

- Les tests fixent que global-error rend les balises html et body, que l'attribut lang suit le chemin d'URL (table de cas) et que les libellés inlinés restent identiques aux clés errors.json en fr, en, es et de [#45631dfc69ab60a1-1] [#7635e3cab4ddf4b5-1] [#7635e3cab4ddf4b5-2].
- Les tests fixent que le fallback d'un segment enfant n'affiche pas les testids du fallback parent ni les anciens testids de chargement [#65cd834a45a106b5-2] [#711e6b2b55e3971f-2].
- Les tests fixent que la variante timeline pose la hauteur de lane du design system en style inline (`frontend-app:[locale]/(app)/products/[productId]/loading.test.tsx:11-20`), et selon le commentaire du test, elle seule le fait [#65cd834a45a106b5-1] [#711e6b2b55e3971f-1].
- Un test de loading mocke next-intl pour que useTranslations renvoie namespace.key, et les assertions portent donc sur les clés i18n (`frontend-app:[locale]/(app)/dashboard/loading.test.tsx:11-13`) [#d679d18eecb2b3a9-1].
- Un test de composant qui importe globals.css le stube par vi.mock vers un module vide, et les tests de global-error coupent console.error et réinitialisent lang et URL entre les cas [#e4e73302877cbf54-1] [#dcb1935fd6f371ee-1].
- Les tests de date utilisent des faux timers limités à Date, restaurés après chaque test, et les messages viennent directement de public/locales/<locale>/errors.json [#ed6723b14e16397e-1] [#b8f51fa1d0d0a684-1].

## 9. Questions ouvertes {#questions}

- La locale doit-elle se lire par use(params) ou par useLocale dans la couche des pages ? La page `frontend-app:[locale]/forgot-password/page.tsx:32` lit la locale par use(params), alors que error.tsx et timeline/page.tsx la lisent par useLocale [#799f6e4da3288542-1].
- Selon le commentaire de `frontend-app:[locale]/forgot-password/page.tsx:43-44`, la locale de la route est transmise au service pour choisir la langue de l'email de réinitialisation, sans qu'un fait de code côté service ne le confirme dans cette base [#161671a13789cc97-3].

## 10. Alertes {#alerts}

- Le style du html de `frontend-app:global-error.tsx:123` et celui de `frontend-app:global-not-found-screen.tsx:141-144` recopient à la main la dérivation de --font-ui, alors que fonts.ts la déclare source unique [#27d6940a021f46a6-1] [#4a72ffec01bdd565-1]. Si cette dérivation change, ces deux écrans d'erreur divergent du reste de l'application, donc importez fontUiStyle dans les deux au lieu de modifier les copies.

## 11. Couverture {#coverage}

- Fichiers du pack : 41 ; avec au moins un fait en base : 22 ; sans fait après remise en file : 0.
- Faits en base : 88, repris d'autres packs : +0, hors périmètre : -0, doublons écartés à la déduplication : -0, soit 88 dans le pool.
- Faits du pool venus d'un autre pack : 0 (par pack : section Relations).
- Destination des 88 faits du pool : Conventions 59 ; Tests attendus 18 ; Alertes / Questions ouvertes 9 ; annexe seule 1 ; écartés (sorte `other` ou inconnue) 1.
- Passe technique : scope 41 fichiers, lus 22 (53 %), non lus 19 : ce pack décrit le socle sur un échantillon, pas sur tout son scope.
- Base : sha256 4ead529a8d04…, générée le 2026-11-19.
