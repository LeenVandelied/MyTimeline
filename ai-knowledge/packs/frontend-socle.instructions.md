---
pack: frontend-socle
kind: technical
name: Socle frontend
generated_at: 2026-11-18T16:25:37Z
generator: synth/1
base_sha256: d41c53d3446d688bd20abc7c90a05b5d0ea92d6ff11606ac002565ebab4a3b7d
facts_in_base: 136
facts_in_pool: 136
facts_cited: 32
sections: frontend-socle.sections.json
details: [frontend-socle.details.md]
lang: fr
curated_at: 2026-11-18T16:25:37Z
curation: frontend-socle.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `^mytimeline:frontend/`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Conventions {#rules}

### Invariants
- Les constantes de densité et de locales sont définies dans @/lib et @/i18n/locales et réexportées par types/settings.ts, mais THEME_OPTIONS y est défini [#f7edf638060ead2e-1] [#c5e0cc829ec13d64-1]
- Selon la javadoc, les champs nullables du contrat backend s'écrivent `.nullable()` et jamais `.nullish()`. [#be17905ecee25a30-1]
### Données et requêtes
- Les mutations qui modifient des données en cache (par exemple les catégories) s'écrivent avec useMutation en forme objet et invalident les clés queryKeys dans onSuccess. Les mutations d'export et de changement de mot de passe n'invalident rien [#216aef023951fc3c-2] [#48cc57b65f950043-1] [#9c1a4893d224818b-1]
- Seuls les statuts 403 et 500 se traitent en ligne, via des options `InlineErrorOptions` passées par l'appelant au service. [#81c4bd53a93413ba-1] [#90dcea2b3d20a21f-1]
- Certaines réponses de service (sessions, aperçu de récurrence) sont validées par .parse d'un schéma Zod, mais d'autres services retournent response.data sans validation [#03037b579b39b673-1]
### Navigateur et locale
- Un hook qui lit le navigateur est SSR-safe : valeur par défaut au rendu serveur, valeur persistée lue seulement après `useHydrated()`. [#23d1084a3d27aa15-1] [#c5d8ae93173501ee-1] [#22280d8552c204d5-1]
- Les redirections portent le préfixe de locale, avec `fr` comme locale par défaut codée en dur. [#57451dc7f855c0e1-1] [#43b4bb8adb5cf7f6-1] [#af18ef06baf5402d-2]
### Composants
- Dans les composants de la landing (et certains schémas), useTranslations() est appelé sans namespace avec des clés complètes depuis la racine, les autres composants utilisent un namespace [#6304b75e00c66e75-1] [#80fa1ea1da348b99-1]
- Les éléments testables portent un `data-testid` nommé pour les tests E2E. [#6304b75e00c66e75-5] [#aa086b7fd21197d3-2]
- Les stories de composants (ui et frise) utilisent satisfies Meta avec tags: ['autodocs'], sauf le banc de mesure de performance de la frise qui n'a pas de tags [#9e9de04ddcb3f998-1] [#9e9de04ddcb3f998-2]

## 4. Structure {#structure}

Aucun fait de la base ne relève de cette section.

## 5. Points d'entrée du socle {#surface}

- Les services frontend appellent l'instance `apiClient` importée de `@/services/apiClient` avec des chemins relatifs comme `/sessions`, par exemple dans `mytimeline:frontend/src/services/sessionService.ts:14-17` [#c8e7542069dbe36c-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 65), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:frontend/src/components/ui/form.tsx` | 7 | convention 6, suspicious 1 |
| `mytimeline:frontend/src/components/landing/CtaSection.tsx` | 6 | convention 6 |
| `mytimeline:frontend/src/components/products/ProductSparkline.tsx` | 4 | convention 4 |
| `mytimeline:frontend/src/components/ui/input.tsx` | 3 | convention 2, suspicious 1 |
| `mytimeline:frontend/src/components/ui/switch.stories.tsx` | 4 | convention 4 |
| `mytimeline:frontend/src/components/ui/tabs.tsx` | 5 | convention 4, other 1 |
| `mytimeline:frontend/src/lib/schemas/export.ts` | 4 | convention 4 |
| `mytimeline:frontend/src/services/inlineErrorHandling.ts` | 4 | convention 4 |
| `mytimeline:frontend/src/types/settings.ts` | 4 | convention 4 |
| `mytimeline:frontend/app/[locale]/page.tsx` | 3 | convention 3 |
| `mytimeline:frontend/src/components/pages/HomePage.tsx` | 3 | convention 3 |
| `mytimeline:frontend/src/components/ui/avatar.tsx` | 3 | convention 3 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| timeline | 36 | 18 |  |

- Faits du pool par pack d'origine : frontend-socle 100, timeline 36

## 8. Tests attendus {#tests}

- Les tests de hooks TanStack créent un QueryClient par test, avec retry désactivé et un MutationCache aux erreurs silencieuses, puis rendent via renderHook dans un QueryClientProvider (`mytimeline:frontend/src/hooks/useDeleteCategory.test.tsx:20-31`) [#4c814ff13ceadfce-1]
- Les tests fixent que l'invalidation du cache s'observe par vi.spyOn sur client.invalidateQueries, avec un appel attendu sous la forme { queryKey } [#2ddd82a4eeddddda-2]
- Les cas d'erreur de useSetEventArchived sont déclenchés avec mutate et non mutateAsync, puis attendus par waitFor sur isError ou sur l'invalidation [#ca3795aa1c7a0a68-2]
- Un test de hook mocke le service avec vi.mock sur le chemin alias @/services/..., en déléguant à un vi.fn nommé xxxMock [#2ddd82a4eeddddda-1], recréé dans beforeEach plutôt que réinitialisé [#ca3795aa1c7a0a68-1]
- Le test d'un composant importe le fichier co-localisé et cible les nœuds par getByTestId [#3215d3bea2e69c04-2]
- Les cas répétitifs s'écrivent avec it.each [#742de7bd9572fb14-1] et les tests se groupent par fonction dans un describe, avec des intitulés de cas en français [#6ade1bc0ef00f313-1]

## 9. Questions ouvertes {#questions}

- Le composant Input doit-il migrer vers les classes `mt-*` du design system ? La base montre qu'il écrit ses styles en classes utilitaires shadcn (`mytimeline:frontend/src/components/ui/input.tsx:14`) alors que IconButton, Radio, Switch, Tag, Table et Textarea utilisent `mt-*` [#50a18af8ee3d9a53-1].

## 10. Alertes {#alerts}

- La garde de `useFormField` ne peut jamais être vraie, car le contexte a une valeur par défaut `{}` typée par cast, donc l'erreur « utilisé hors de FormField » n'est jamais levée (`mytimeline:frontend/src/components/ui/form.tsx:46-52`) [#be9ed670f209392b-1]. Un champ utilisé hors de `<FormField>` ne échoue pas explicitement et se comporte avec un contexte vide. Ne pas compter sur cette erreur pour détecter un mauvais usage, et tester la présence réelle du contexte (par exemple son nom de champ) si une garde est nécessaire.

## 11. Couverture {#coverage}

- Fichiers du pack : 430 ; avec au moins un fait en base : 65 ; sans fait après remise en file : 0.
- Faits en base : 136, repris d'autres packs : +0, hors périmètre : -0, doublons écartés à la déduplication : -0, soit 136 dans le pool.
- Faits du pool venus d'un autre pack : 36 (par pack : section Relations).
- Destination des 136 faits du pool : Conventions 108 ; Points d'entrée du socle 1 ; Tests attendus 11 ; Alertes / Questions ouvertes 12 ; annexe seule 1 ; écartés (sorte `other` ou inconnue) 3.
- Passe technique : scope 430 fichiers, lus 65 (15 %), non lus 365 : ce pack décrit le socle sur un échantillon, pas sur tout son scope.
- Base : sha256 d41c53d3446d…, générée le 2026-11-18.
