---
pack: lib-socle
kind: technical
name: Socle d'interface (frontend)
generated_at: 2026-11-20T11:40:00Z
generator: synth/1
base_sha256: 51fb2e6bfa16bb4e07619e258dac3fd72cbf3cdee823bf2040649385181edbe8
facts_in_base: 42
facts_in_pool: 42
facts_cited: 24
sections: lib-socle.sections.json
details: [lib-socle.details.md]
lang: fr
curated_at: 2026-11-20T12:45:00Z
curation: lib-socle.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : lib, socle
- Chemins : `^frontend:lib/`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Conventions {#rules}

### Invariants
- Selon la javadoc, on n'écrit pas new Date sur une date civile backend, on passe par les helpers de `frontend:lib/date-iso.ts:62-94`. [#895ff383e6631fc3-1] [#895ff383e6631fc3-2]
### Dates
- Une date sans heure se sérialise en YYYY-MM-DD local et se lit en format strict, les deux renvoient null si la valeur est invalide. [#2a34364f86c74c56-2] [#d0987d79ff55258e-1]
- Un horodatage backend naïf reçoit le suffixe Z sauf s'il porte déjà un offset. [#aaf0e11be7d28585-1]
- Un instant complet sort en ISO UTC, ou null si la Date est invalide. [#f70072c348f08622-1]
### Couleurs
- Le plancher de contraste renvoie la couleur d'origine non normalisée si un hex est invalide ou déjà conforme, sinon il balaie 256 pas. [#2db98241f4b8dec7-1] [#2db98241f4b8dec7-2] [#2db98241f4b8dec7-3]
- Une marge de 0.05 s'ajoute à la cible WCAG de 3:1 pour les traits en couleur utilisateur. [#1266f33ac81e3c53-1]
- L'encre de texte retombe sur var(--color-ink) si le hex est invalide, et l'égalité de ratio retient la couleur sombre. [#21cc456704d9af76-1] [#21cc456704d9af76-2]
### Query keys et classes
- Les clés TanStack Query sont centralisées par domaine dans `frontend:lib/query-keys.ts:19-22`, en tuples as const, avec l'objet de paramètres en dernier. [#ce8c3a1a7449d1bc-1] [#8188c0e1b7257ac6-1] [#aa57a64210636b95-1]

## 4. Structure {#structure}

Aucun fait de la base ne relève de cette section.

## 5. Points d'entrée du socle {#surface}

Aucun fait de la base ne relève de cette section.

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (5 sur 10), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `frontend:lib/color.ts` | 10 | convention 9, suspicious 1 |
| `frontend:lib/date-iso.ts` | 8 | convention 8 |
| `frontend:lib/event-palette.ts` | 5 | convention 5 |
| `frontend:lib/query-keys.ts` | 5 | convention 5 |
| `frontend:lib/touchTarget.ts` | 3 | convention 2, suspicious 1 |

## 7. Relations avec d'autres packs {#relations}

- Faits du pool par pack d'origine : lib-socle 42

## 8. Tests attendus {#tests}

- Le test d'accès au stockage simule un localStorage inaccessible en espionnant Storage.prototype.getItem pour lever une DOMException [#c429da0225301742-1] `frontend:lib/density.test.ts:60`.
- Selon le commentaire du test, le beforeEach pose une valeur résiduelle sur l'attribut de densité pour qu'un résultat attendu ne soit pas confondu avec elle [#da6866c072413b20-1] `frontend:lib/density.test.ts:29-30`.
- Les tests d'éphéméride construisent les dates par composantes locales pour rester indépendants du fuseau de la machine [#040888a3827fac97-1] `frontend:lib/ephemeris.test.ts:40`.
- Les tests fixent que les alias de réglages sont strictement égaux à la constante source de cible tactile [#4cdda9b88709fe89-1] `frontend:lib/touchTarget.test.ts:17-18`.
- Un test fixe qu'aucune classe de dimension du bouton tactile n'est non préfixée max-md, hormis relative, en découpant la chaîne sur les espaces [#45194a71080a88ef-1] `frontend:lib/touchTarget.test.ts:22-27`.
- Les cas répétitifs se déclinent avec it.each (options de densité, tuples locale et valeur attendue), avec des noms de tests en français [#f261d758b4932945-1] [#040888a3827fac97-2] `frontend:lib/density.test.ts:39-43`.

## 9. Questions ouvertes {#questions}

Aucun fait de la base ne relève de cette section.

## 10. Alertes {#alerts}

- Selon le commentaire de `frontend:lib/touchTarget.ts:36-38`, un ancêtre en overflow hidden ou auto passant à moins de 6 px de la boîte rognerait la zone tactile, qui est un pseudo-élément de 44 px centré sur la rangée dense [#af507d03675aeccb-1] [#d79dd29c383eb6eb-1]. Avant d'utiliser cette classe dans un conteneur à défilement ou à rognage, vérifier la distance à la boîte, sinon la cible tactile est tronquée sur mobile (le commentaire est partiel, sa limite exacte n'est pas établie).

## 11. Couverture {#coverage}

- Fichiers du pack : 35 ; avec au moins un fait en base : 10 ; sans fait après remise en file : 0.
- Faits en base : 42, repris d'autres packs : +0, hors périmètre : -0, doublons écartés à la déduplication : -0, soit 42 dans le pool.
- Faits du pool venus d'un autre pack : 0 (par pack : section Relations).
- Destination des 42 faits du pool : Conventions 28 ; Tests attendus 10 ; Alertes / Questions ouvertes 3 ; annexe seule 1 ; écartés (sorte `other` ou inconnue) 0.
- Passe technique : scope 35 fichiers, lus 10 (28 %), non lus 25 : ce pack décrit le socle sur un échantillon, pas sur tout son scope.
- Base : sha256 51fb2e6bfa16…, générée le 2026-11-20.
