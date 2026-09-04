[BRIEFING ISSUE #496]

## Issue
[CHORE] BR-EVE-009 attribuée à deux règles différentes — trancher et recibler

## Contexte

Follow-up détecté pendant le Sprint 70 (issue #326, PR #494).
Source : `docs/memory/sprints/sprint-70/issue-326-done.md` et `PIT-S70-001`.

## Description

L'identifiant **`BR-EVE-009` est attribué à deux règles différentes** selon la source :

- `.ai-env/context-packs/br-events.md:92` — « **BR-EVE-009 — Modèle couleur event**
  (migration design v3 #44) ». C'est la définition de référence ;
- `frontend/src/components/EventEditForm.tsx:174` et `:289` — les commentaires y attribuent à
  BR-EVE-009 la **perf de l'aperçu live** (« valeur debouncée … 150 ms »).

`grep -ci debounc` sur `br-events.md` rend **0** : il n'existe aucune règle métier documentée
pour le débounce de l'aperçu. La contrainte des 150 ms n'est décrite que dans le code.

## Pourquoi ce n'est pas corrigé au Sprint 70

Écart **signalé, pas corrigé**, volontairement : réattribuer ou créer une BR est une décision
de documentation métier, pas un nettoyage de passage. Les 2 commentaires ont été laissés
intacts (vérifié sur `HEAD`).

Conséquence concrète mesurée : le briefing du lead au S70 a **recopié cette mauvaise
attribution**, et le fullstack-dev a dû le corriger. Tant que l'ambiguïté vit dans le code,
elle se propage aux briefings.

## À faire — deux options, à trancher

1. **Créer une BR dédiée** (ex. `BR-EVE-0XX — perf de l'aperçu live, débounce 150 ms`) dans
   `docs/memory/business-rules.md` + le pack `br-events`, puis recibler les 2 commentaires ;
2. **Ou** retirer le renvoi `BR-EVE-009` des 2 commentaires si la contrainte n'est pas une
   règle métier mais un choix d'implémentation.

Vérifier au passage les autres renvois `BR-EVE-009` du frontend (`src/types/event.ts`,
`src/types/event.test.ts`) — ceux-là portent bien sur la **couleur**, ils sont corrects.

## Triage estimé

XS | Domaine : events


## Plan d'implementation (arbitrage dev, /sprint start 71)
DECISION DEV — TRANCHEE, NE PAS LA REOUVRIR :
Option 1 de l'issue — CREER une BR dediee pour le debounce 150 ms de l'apercu live.

- `BR-EVE-009` reste « Modele couleur event » : ne la touche pas, ne la renumerote pas.
- Creer une nouvelle BR (prends le prochain identifiant BR-EVE-* LIBRE — verifie-le, ne
  suppose pas que c'est 012) decrivant la perf de l'apercu live : valeur debouncee a 150 ms
  depuis `EventEditForm`, ne pas rebrancher sur les `watch()` bruts.
- L'ecrire dans `.ai-env/context-packs/br-events.md`. ⚠ CORRECTIF DU LEAD : le fichier
  `docs/memory/business-rules.md` **N'EXISTE PAS** dans ce repo (verifie le 2026-09-04 —
  `docs/memory/` ne contient que bugs-resolved / decisions / patterns / pitfalls /
  sprint-history + les repertoires audits, devops, sprints). Le pack `br-events.md` est
  donc la SEULE source a mettre a jour. Ne cree pas `business-rules.md`.
- Recibler les 2 commentaires de `frontend/src/components/EventEditForm.tsx` (lignes ~174 et
  ~289) vers la nouvelle BR. Les numeros de ligne ont pu bouger : l'issue #495 a livre du code
  sur ce fichier juste avant toi. GREPPE, ne te fie pas aux numeros.
- Verifier les autres renvois `BR-EVE-009` du frontend (`src/types/event.ts`,
  `src/types/event.test.ts`) : ceux-la portent bien sur la COULEUR, ils sont CORRECTS —
  ne les touche pas.

## Triage
Taille: XS
Modele: sonnet
Effort: medium
