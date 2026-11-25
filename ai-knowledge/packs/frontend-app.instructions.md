---
pack: frontend-app
kind: technical
name: Routes et pages Next.js
generated_at: 2026-11-20T11:40:00Z
generator: synth/1
base_sha256: ed36afc872fa146e55caf8a48426dbe6781243e697dd92139a239ab731176fba
facts_in_base: 73
facts_in_pool: 73
facts_cited: 33
sections: frontend-app.sections.json
details: [frontend-app.details.md]
lang: fr
curated_at: 2026-11-25T15:00:00
curation: frontend-app.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `^frontend-app:`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Conventions {#rules}

### Invariants
- Les écrans qui remplacent le layout racine (404, erreur globale) n'ont pas de providers, donc leurs messages sont inlinés par locale sans useTranslations. [#35eb2e637ab761d4-1] [#da27a7b668cd53e5-1]
- Les libellés de l'écran 404 copient à la main les clés notFound de errors.json et doivent être resynchronisés à chaque changement de traduction. [#da27a7b668cd53e5-1]
- L'erreur globale lit la locale dans le premier segment du chemin, puis retombe sur DEFAULT_LOCALE, et sur le jeu fr si la locale n'a pas d'entrée. [#eb3039b22898acac-1] [#a9a3bfc89eae1e73-4]
- Un écran de premier niveau importe lui-même globals.css et les variables de police, car aucun layout ne les monte. [#a9a3bfc89eae1e73-1]
- Selon la javadoc, global-not-found exige experimental.globalNotFound à true dans next.config.mjs. [#0b1e57bd9a31e944-1]
- Selon le commentaire du fichier, un document hors layout racine utilise une balise a et non Link. [#5ea3a89d38aab0d1-1]
### Pages et formulaires
- Les formulaires combinent react-hook-form et zodResolver sur un schéma createXSchema(t) de lib/schemas/auth. [#161671a13789cc97-2] [#f4a196fc94aea5ef-4]
- Une connexion en erreur 401 est distinguée des autres erreurs, qui reçoivent un message générique. [#4169eeab8b96e08e-1]
- Les liens internes sont préfixés par la locale, et la page de connexion redirige vers le tableau de bord dès que user existe. [#161671a13789cc97-11] [#02a2468c5b5164c5-1]
### Fallbacks et erreurs
- Selon la javadoc, chaque segment enfant à vue différente a son propre loading.tsx, le fallback du parent l'enveloppant sinon. [#de7e2f0ed7095ba3-1]
- Les fallbacks réutilisent LoadingSkeleton avec un label traduit et un testId propre au segment. [#de7e2f0ed7095ba3-3] [#9935ac2669628575-1]
- Le crash boundary choisit la branche forbidden ou crash, qui fixe le namespace de traduction et le testId. [#4ac83ca054b2de57-3] [#61b77c57cf76feed-1]

## 4. Structure {#structure}

Aucun fait de la base ne relève de cette section.

## 5. Points d'entrée du socle {#surface}

Aucun fait de la base ne relève de cette section.

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 22), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `frontend-app:[locale]/forgot-password/page.tsx` | 9 | convention 9 |
| `frontend-app:global-error.tsx` | 8 | convention 7, suspicious 1 |
| `frontend-app:[locale]/login/page.tsx` | 6 | convention 5, suspicious 1 |
| `frontend-app:[locale]/error.tsx` | 6 | convention 6 |
| `frontend-app:global-not-found-screen.tsx` | 4 | convention 3, suspicious 1 |
| `frontend-app:[locale]/(app)/dashboard/loading.tsx` | 4 | convention 4 |
| `frontend-app:[locale]/(app)/timeline/page.tsx` | 4 | convention 4 |
| `frontend-app:fonts.ts` | 4 | convention 3, config 1 |
| `frontend-app:[locale]/(app)/products/loading.tsx` | 3 | convention 3 |
| `frontend-app:[locale]/(app)/settings/loading.tsx` | 2 | convention 2 |
| `frontend-app:[locale]/(app)/timeline/loading.tsx` | 2 | convention 2 |
| `frontend-app:global-not-found.tsx` | 2 | config 1, convention 1 |

## 7. Relations avec d'autres packs {#relations}

- Faits du pool par pack d'origine : frontend-app 73

## 8. Tests attendus {#tests}

- Les tests de fallback de chargement mockent next-intl avec vi.mock, useTranslations renvoyant namespace.clé, et les assertions portent donc sur les clés (`frontend-app:[locale]/(app)/dashboard/loading.test.tsx:11-13`). [#d679d18eecb2b3a9-1]
- Les tests fixent qu'un fallback expose une seule région role status, et que le squelette produits porte role status via son testId avec des items loading-skeleton-item comptés. [#d0b6197e7ba40a12-2] [#98b1a65dc3f3bcba-1]
- Les tests fixent la structure par les classes Tailwind du conteneur dashboard (toHaveClass en boucle) et par la hauteur inline var(--lane-height) de chaque lane de la timeline. [#d0b6197e7ba40a12-3] [#711e6b2b55e3971f-1]
- Les tests fixent l'absence de testId d'un autre fallback, celui de la liste produits dans le détail produit, et celle de l'ancien testId timeline-loading (DEC-S56-003). [#65cd834a45a106b5-2] [#711e6b2b55e3971f-2]
- Pour html et body, les tests de global-error et global-not-found utilisent renderToStaticMarkup puis toMatch, car RTL fusionne ces balises singletons avec le document. [#51e2ed2e25cd54bd-1] [#970d54c5ca43caab-1]
- Les tests de composants important globals.css le mockent par un module vide avec vi.mock, pour éviter le parsing du CSS compilé par jsdom (`frontend-app:global-error.test.tsx:11`). [#e4e73302877cbf54-1]
- Les tests de global-error retirent l'attribut lang de document.documentElement avant chaque test et restaurent l'espion console.error en afterEach. [#426933f23e56d1e4-1]
- Les tests de parité comparent, par locale avec it.each, les messages inlinés aux fichiers public/locales/<locale>/errors.json, qu'un changement de libellé doit donc suivre. [#7635e3cab4ddf4b5-2]
- Les tests dépendant de la date fixent l'horloge avec vi.useFakeTimers limité à Date puis vi.setSystemTime, et restaurent les vrais timers en afterEach. [#ed6723b14e16397e-1]

## 9. Questions ouvertes {#questions}

- Faut-il aligner les pages d'authentification sur les fallbacks pour l'usage de useTranslations ? La page de connexion l'appelle sans namespace avec des clés complètes, alors que les fallbacks passent un namespace, voir `frontend-app:[locale]/login/page.tsx:28`. [#f4a196fc94aea5ef-1]

## 10. Alertes {#alerts}

- GlobalError et GlobalNotFoundScreen réécrivent en ligne le style de --font-ui au lieu d'importer fontUiStyle, alors que le commentaire de fonts.ts présente cette dérivation comme source unique, donc une modification dans fonts.ts n'atteint pas ces deux écrans : répercuter le changement dans `frontend-app:global-error.tsx:123` et `frontend-app:global-not-found-screen.tsx:144`, ou importer fontUiStyle. [#27d6940a021f46a6-1] [#4a72ffec01bdd565-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 41 ; avec au moins un fait en base : 22 ; sans fait après remise en file : 0.
- Faits en base : 73, repris d'autres packs : +0, hors périmètre : -0, doublons écartés à la déduplication : -0, soit 73 dans le pool.
- Faits du pool venus d'un autre pack : 0 (par pack : section Relations).
- Destination des 73 faits du pool : Conventions 53 ; Tests attendus 15 ; Alertes / Questions ouvertes 5 ; annexe seule 0 ; écartés (sorte `other` ou inconnue) 0.
- Passe technique : scope 41 fichiers, lus 22 (53 %), non lus 19 : ce pack décrit le socle sur un échantillon, pas sur tout son scope.
- Base : sha256 ed36afc872fa…, générée le 2026-11-20.
