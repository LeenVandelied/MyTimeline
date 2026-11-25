---
pack: frontend-core
kind: technical
name: Socle frontend
generated_at: 2026-11-25T15:00:00
generator: synth/1
base_sha256: 28f319258ab29f86376493e7e720f97dfaca1186d90c289b1309d44b9b8034e3
facts_in_base: 330
facts_in_pool: 328
facts_cited: 41
sections: frontend-core.sections.json
details: [frontend-core.details.md]
lang: fr
curated_at: 2026-11-25T15:00:00
curation: frontend-core.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `^frontend:(?!(src/)?(components/ui|lib)/)`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Conventions {#rules}

### Invariants
- Selon le commentaire de `frontend:types/event.ts:12`, un champ nullable côté backend se déclare avec nullable et jamais avec nullish. [#87ba3444819c3487-1]
### Couche HTTP
- L'intercepteur de réponse de apiClient.ts remonte d'abord timeouts et erreurs 5xx au store réseau avant le traitement par statut, sauf un 500 que la requête déclare traiter elle-même [#9bc256ea7132e8fc-1] [#2da5f9f87ce62f1b-3]
- La redirection sur 401 est verrouillée par isRedirecting et différée de 1500 ms. [#2da5f9f87ce62f1b-1]
- Les routes d'auth gérées inline se comparent au pathname en égalité stricte ou en suffixe ancré, et la liste d'opt-out du toast 400 est distincte. [#4bd6c9a0ca5cfb53-1] [#f0014c0cd2d8fdc5-1]
- Un rafraîchissement du token est planifié toutes les 6 heures, côté navigateur seulement. [#91ed8c86e0840488-1]
- Un service journalise puis relance l'erreur, sauf refreshToken qui renvoie false. [#11c90a5f14af66cf-1] [#e9714435ca4b9b4f-2] [#30dcc47e790a4078-1]
- Les réponses sont validées par un schéma Zod avant retour. [#43402f730d804b80-1] [#1cebc3ebe7539af4-1] [#0135de84623de5bb-1]
- Le préfixe /api d'une URL de téléchargement est retiré, car baseURL le porte déjà. [#f61c95693fc0d41d-1]
### Frise
- Selon la javadoc, le noyau de zoom reste pur, sans React ni réseau. [#33808da4d7c94712-1]
- Selon le commentaire de `frontend:styles/__tests__/i18n-date-long-declarations.test.ts:1`, ce test déclare l'environnement vitest node en tête de fichier. [#9c9c50a8a68a9eb0-1]

## 4. Structure {#structure}

Aucun fait de la base ne relève de cette section.

## 5. Points d'entrée du socle {#surface}

Aucun fait de la base ne relève de cette section.

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 82), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `frontend:types/event.ts` | 16 | convention 15, suspicious 1 |
| `frontend:contexts/AuthContext.tsx` | 13 | convention 12, suspicious 1 |
| `frontend:components/timeline/zoom.ts` | 12 | convention 9, config 1, other 1 |
| `frontend:services/apiClient.ts` | 12 | convention 11, config 1 |
| `frontend:utils/time-utils.ts` | 8 | convention 7, suspicious 1 |
| `frontend:i18n/locales.ts` | 7 | convention 6, suspicious 1 |
| `frontend:styles/__tests__/eyebrow-consumers.test.tsx` | 8 | convention 5, test_case 2, suspicious 1 |
| `frontend:components/dashboard/GreetingHeader.tsx` | 7 | convention 7 |
| `frontend:services/authService.ts` | 6 | convention 5, suspicious 1 |
| `frontend:__tests__/ds-type-scale.test.ts` | 7 | convention 4, test_case 2, suspicious 1 |
| `frontend:components/timeline/virtualization.ts` | 6 | convention 6 |
| `frontend:services/eventService.ts` | 6 | convention 4, other 1, suspicious 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| user | 26 | 10 |  |
| event | 14 | 5 |  |
| product | 6 | 2 |  |
| session | 2 | 1 |  |

- Faits du pool par pack d'origine : frontend-core 280, user 26, event 14, product 6, session 2

## 8. Tests attendus {#tests}

- Les tests fixent que les locales en, de et es ont les mêmes namespaces que fr [#4b7f79446e4b86e1-1], et que le pont d'erreurs lit les vrais fichiers errors.json sous un vrai NextIntlClientProvider [#e9538199f8ee2b0a-1] [#bc8390329b6494b1-1].
- Les tests d'auth mockent authService par vi.mock, vident localStorage à chaque cas [#0d1c19772e7e890d-1] [#2f220e471b229ba0-1] et fixent que useAuth lève hors Provider [#0dda85ff5207150e-2].
- Les tests d'intercepteur remplacent apiClient.defaults.adapter par un adaptateur factice et le restaurent en afterEach [#2567fe15abe72281-1] [#8fe6e917cfd6a7e1-1].
- Les tests TanStack Query créent un QueryClient dédié avec retry désactivé [#8dd03e17489c8b12-1] [#3567e8ecf8cbb6a3-1], un MutationCache à onError vide pour les mutations [#9ca3ebac108c3813-1], et enveloppent les mises à jour du store externe dans act [#627a77b7049c5912-1].
- Les tests fixent que l'upload d'avatar n'impose pas le Content-Type [#0b961296c4139571-1] et que options est transmis en quatrième paramètre, undefined par défaut [#873e0ac8508f2a1c-1].

## 9. Questions ouvertes {#questions}

- Le calcul des jours de `calculateRemainingTime` est-il voulu avec un `+1` sur le reste modulo 30 ? Le code l'applique aux jours seulement, alors que les mois et années sont tronqués, voir `frontend:utils/time-utils.ts:24` [#075c383c8509607d-2].

## 10. Alertes {#alerts}

- `registerUser` retourne l'appel `apiClient.post` sans `await` dans son try, donc le catch ne voit jamais un rejet asynchrone, contrairement à login et getUserProfile. Tout traitement d'erreur ajouté dans ce catch reste inopérant, il faut ajouter `await` avant de s'y fier, voir `frontend:services/authService.ts:32-36` [#9444328f3c65b8bc-1].
- Des messages de validation sont écrits en dur, en français dans `eventCreationSchema` et `productUpdateSchema`, en anglais pour l'email de `UserSchema`, alors que les schémas d'édition et category.ts passent par une fabrique i18n. Ces messages ne sont pas traduits dans les quatre locales, donc il faut les passer par la fabrique i18n en modifiant ces schémas, voir `frontend:types/event.ts:90` [#b7b7c6d036cba012-1] [#e08a2298e3f018c0-1] [#6ed86820a433f2e0-1].
- Selon le commentaire de `stripComments`, le retrait des commentaires avant le balayage par regex est un découpage lexical et non un parseur, et un `//` dans une chaîne est traité comme commentaire. Le test de type scale peut donc rater une violation (faux négatif), il ne faut pas le tenir pour exhaustif, voir `frontend:__tests__/ds-type-scale.test.ts:62-69` [#ef46af165567e658-1] [#8a81048d26d0f4bc-1].
- La garde statique des eyebrows signale une ligne seulement si tous les marqueurs regex y correspondent, et selon son commentaire une chaîne de classes coupée sur plusieurs lignes lui échappe. Écrire les classes sur une seule ligne pour que la garde les voie, voir `frontend:styles/__tests__/eyebrow-consumers.test.tsx:129-140` [#5c59fd416c4ec02e-1] [#050064225102bae2-1].
- Selon le commentaire de ce test, le `default export` de la config de requête i18n n'est pas testable sous Vitest, et seuls les cas de `resolveLocale` sont vérifiés. Un changement dans l'export par défaut n'est donc couvert par aucun test, il faut le vérifier à la main, voir `frontend:__tests__/i18n-request-config.test.ts:16-38` [#8c19b67eb94f04f8-1] [#a8a8ff297908ea82-1].

## 11. Couverture {#coverage}

- Fichiers du pack : 301 ; avec au moins un fait en base : 82 ; sans fait après remise en file : 0.
- Faits en base : 330, repris d'autres packs : +0, hors périmètre : -0, doublons écartés à la déduplication : -2, soit 328 dans le pool.
- Faits du pool venus d'un autre pack : 48 (par pack : section Relations).
- Destination des 328 faits du pool : Conventions 220 ; Tests attendus 70 ; Alertes / Questions ouvertes 26 ; annexe seule 4 ; écartés (sorte `other` ou inconnue) 8.
- Passe technique : scope 301 fichiers, lus 82 (27 %), non lus 219 : ce pack décrit le socle sur un échantillon, pas sur tout son scope.
- Base : sha256 28f319258ab2…, générée le 2026-11-25.
