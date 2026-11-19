---
pack: frontend-core
kind: technical
name: Socle frontend
generated_at: 2026-11-19T16:00:00Z
generator: synth/1
base_sha256: 5cbb13cd84656622ae9366ccb8be4209f0191a2e39c443fe30e786babb425698
facts_in_base: 334
facts_in_pool: 332
facts_cited: 49
sections: frontend-core.sections.json
details: [frontend-core.details.md]
lang: fr
curated_at: 2026-11-19T16:38:00Z
curation: frontend-core.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `^frontend:`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Conventions {#rules}

### Client HTTP et erreurs
- L'intercepteur de réponse classe les erreurs réseau avant tout court-circuit (ECONNABORTED, statut 500 ou plus) et alimente networkStatusStore, sauf pour un 500 traité inline. Chaque branche finit par Promise.reject(error) `frontend:services/apiClient.ts:180-285`. [#9bc256ea7132e8fc-1] [#2da5f9f87ce62f1b-1]
- Un 401 pose le verrou isRedirecting, affiche le toast sessionExpired, puis redirige vers le login préfixé par la locale après 1500 ms. [#2da5f9f87ce62f1b-3]
- Les toasts 403 et 500 sont supprimés par requête qui déclare le statut traité inline, via inlineErrorHandling et handlesStatusInline. [#6c8be478df66b45f-1] [#6c8be478df66b45f-2] [#c975e2c29b3fd7b4-1] [#06b87f0f578820c1-1]
- Les listes d'endpoints se comparent au pathname par égalité stricte ou suffixe ancré, jamais par sous-chaîne. [#e3fbeeb501198437-1]
### Vérification JWKS (runtime Edge)
- Un JWKS réussi reste frais 10 minutes, un échec est mis en cache 30 s, deux rafraîchissements forcés sont espacés de 60 s et l'appel expire à 2000 ms. [#b104639882753ef3-1] [#bfe3627981d34eda-1] [#286086fc8f3fe903-1] [#d4df35fe66efe7e4-1]
- Les appels concurrents sur une même URL partagent la promesse en cours, et le résultat est mémorisé en succès comme en échec. [#cf643eba35ecaa02-1] [#cf643eba35ecaa02-2]
- Seules les clés RSA de signature sont importées et l'URL doit être http ou https, sinon le résultat est null. [#6be8d774367f94d6-1] [#be27638d45576224-1]
### Helpers de temps
- Un helper de formatage reçoit la fonction de traduction en paramètre et utilise des clés common.time.*, une date absente ou un écart nul renvoie common.time.expired, et l'année vaut 365 jours et le mois 30 `frontend:utils/time-utils.ts:5-24`. [#1ceb81ea5c54f0a5-2] [#1ceb81ea5c54f0a5-4] [#1ceb81ea5c54f0a5-5] [#1ceb81ea5c54f0a5-6]
### Vérifié dans le code
- INITIAL_STATE de useTimelineViewport doit rester fondé sur INITIAL_HORIZONTAL_BAND et INITIAL_VERTICAL_BAND, jamais sur window, pour éviter un écart d'hydratation [#event/35b4d3bd0bcb3266-1] `frontend:components/timeline/useTimelineViewport.ts:73-78`.

## 4. Structure {#structure}

Aucun fait de la base ne relève de cette section.

## 5. Points d'entrée du socle {#surface}

Aucun fait de la base ne relève de cette section.

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 79), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `frontend:lib/auth-jwks.ts` | 22 | convention 17, config 4, test_case 1 |
| `frontend:types/event.ts` | 17 | convention 16, suspicious 1 |
| `frontend:services/apiClient.ts` | 15 | convention 13, config 2 |
| `frontend:contexts/AuthContext.tsx` | 10 | convention 10 |
| `frontend:styles/__tests__/landing-palette.test.ts` | 10 | convention 5, test_case 3, suspicious 2 |
| `frontend:components/timeline/zoom.ts` | 9 | convention 9 |
| `frontend:utils/time-utils.ts` | 9 | convention 7, other 1, suspicious 1 |
| `frontend:styles/__tests__/eyebrow-consumers.test.tsx` | 13 | convention 7, test_case 5, other 1 |
| `frontend:styles/__tests__/storybook-font-shell.test.ts` | 11 | convention 5, test_case 5, suspicious 1 |
| `frontend:i18n/locales.ts` | 6 | convention 5, suspicious 1 |
| `frontend:lib/recurrence.ts` | 6 | convention 5, suspicious 1 |
| `frontend:services/authService.ts` | 6 | convention 5, suspicious 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| user | 65 | 36 |  |
| event | 48 | 23 |  |
| product | 21 | 6 |  |
| session | 4 | 3 |  |
| category | 1 | 1 |  |

- Faits du pool par pack d'origine : frontend-core 193, user 65, event 48, product 21, session 4, category 1

## 8. Tests attendus {#tests}

- Les tests fixent que chaque garde statique commence par une assertion anti-vacuité sur le nombre de fichiers lus [#3cf5112d8e9819dd-1] [#a4c0295be152f9c9-1] [#28464135080164e4-1].
- Un détecteur est armé par un contrôle négatif ou un témoin, y compris par mutation en mémoire sans écriture disque [#954c587dc696c535-1] [#b624ef68e7fdbbc6-1] [#8a53cb094ab455c4-1] [#82d4c005d5ae0fe0-1].
- Les tests fixent que les 4 locales exposent les mêmes namespaces de premier niveau [#af84a31ff75e0699-1] et que resolveLocale replie sur fr [#a8a8ff297908ea82-1].
- Le test du pont d'erreurs lit les vrais errors.json sous un vrai NextIntlClientProvider et remet le traducteur à null dans afterEach [#e9538199f8ee2b0a-1] [#bc8390329b6494b1-1].
- Les services et contextes se testent avec vi.mock déléguant à des vi.fn, et vi.hoisted si la factory les référence [#0d1c19772e7e890d-1] [#2bced97a8b32cc87-1] [#b4bd62b08c16226a-1].
- Les tests HTTP remplacent defaults.adapter d'apiClient et le restaurent dans afterEach [#2567fe15abe72281-1].
- Chaque test TanStack Query crée son QueryClient avec retry false [#8dd03e17489c8b12-1] [#3567e8ecf8cbb6a3-1], et un hook sans identifiant reste idle sans appel [#1c9687f05e1ffa3b-2].
- Toute mutation d'un store externe est enveloppée dans act() [#627a77b7049c5912-1].
- Le script de densité se teste via sa chaîne brute exécutée par new Function, avec un état résiduel posé en beforeEach [#e2fe5e7fb84ac49e-1] [#446dfbe8ba68011e-1].

## 9. Questions ouvertes {#questions}

- Le +1 du calcul des jours est-il voulu ? La base montre qu'il s'applique à un reste modulo 30 et pas aux mois ni aux années, voir `frontend:utils/time-utils.ts:24` [#075c383c8509607d-1].
- Le message de validation de l'email en anglais est-il voulu ? La base montre que les autres messages de la couche sont en français, voir `frontend:types/user.ts:8` [#6ed86820a433f2e0-1].
- Quel mock next-intl est la référence pour les tests ? SettingsIndex.test renvoie namespace.clé, CtaSection.test et FooterSection.test renvoient la clé seule, voir `frontend:components/settings/mobile/SettingsIndex.test.tsx:9-12` [#31e4140d2a82fdf7-1].
- Le mock d'apiClient doit-il passer par l'alias ou le chemin relatif ? exportService.test utilise './apiClient', authService.test et userService.test l'alias, voir `frontend:services/exportService.test.ts:12` [#5f19d1e9416bc5ba-1].

## 10. Alertes {#alerts}

- registerUser retourne l'appel apiClient.post sans await dans son try, donc le catch ne voit pas un rejet asynchrone, contrairement à login et getUserProfile. Qui ajoute un traitement d'erreur dans le catch doit d'abord ajouter await, sinon il ne sera jamais exécuté, voir `frontend:services/authService.ts:32-36` [#9444328f3c65b8bc-1].
- Deux définitions de User coexistent, une interface écrite à la main et un type dérivé de UserSchema. Un champ ajouté à l'une n'apparaît pas dans l'autre, donc modifier les deux ou dériver l'interface du schéma, voir `frontend:types/auth.ts:10-23` [#fcb2319587514c3b-1].
- Selon le commentaire de l'intercepteur de réponse, le journal des erreurs 403 se limite à url, method et data, car error.config.headers contient l'en-tête Authorization. Ne jamais ajouter ces headers au journal, voir `frontend:services/apiClient.ts:262-269` [#2da5f9f87ce62f1b-4].

## 11. Couverture {#coverage}

- Fichiers du pack : 389 ; avec au moins un fait en base : 79 ; sans fait après remise en file : 0.
- Faits en base : 334, repris d'autres packs : +0, hors périmètre : -0, doublons écartés à la déduplication : -2, soit 332 dans le pool.
- Faits du pool venus d'un autre pack : 139 (par pack : section Relations).
- Destination des 332 faits du pool : Conventions 231 ; Tests attendus 73 ; Alertes / Questions ouvertes 20 ; annexe seule 5 ; écartés (sorte `other` ou inconnue) 3.
- Passe technique : scope 389 fichiers, lus 79 (20 %), non lus 310 : ce pack décrit le socle sur un échantillon, pas sur tout son scope.
- Base : sha256 5cbb13cd8465…, générée le 2026-11-19.
