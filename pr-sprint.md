## Objectif

Réarmer le filet E2E de la frise : rendre les sélecteurs de test robustes au réordonnancement, couvrir les `data-testid` de la frise laissés sans spec par le Sprint 47, et empêcher qu'une instabilité passagère du serveur de dev bloque les 134 tests de la suite.

Milestone : **Sprint 54** (#54). Cohésion **0.46** · Périmètre **frontend uniquement** — 0 fichier `.java`, 0 `.sql`, 0 schéma Zod. **Aucune BR métier touchée. Aucune migration Flyway.**

## Issues traitées

| Issue | Titre | P | Size | Résultat |
|---|---|---|---|---|
| #331 | Exposer des `data-testid` sur les `SelectItem` Radix | P2 | S | Livrée |
| #329 | `auth.setup.ts` : retry sur l'échec de rendu de `/fr/register` | P2 | S | Livrée |
| #330 | Couvrir les `data-testid` de la frise sans spec E2E | P2 | M | Livrée — **15 atteignables sur 18 annoncés**, cf. ci-dessous |

Vagues exécutées : **V1 = #331 ∥ #329** (fichiers disjoints) · **V2 = #330** · puis un cycle correctif.

## Changements clés

**#331 — sélecteurs robustes.** `data-testid` dérivés de la `value` et jamais d'un libellé traduit (qui changerait avec la locale) : `product-option-<uuid>` et `recurrence-unit-option-<WEEK|MONTH|YEAR>`. Le ciblage par index `.nth(1)` de `timeline.spec.ts` disparaît — c'était la seule occurrence sur une option de `<Select>`. Vérifié au navigateur : cliquer `recurrence-unit-option-YEAR` fait bien afficher « an/year » au trigger, ce que `.nth(1)` ne garantissait pas.

**#329 — diagnostic du provisioning E2E.** Le rendu initial de `/fr/register` (hors boucle) n'était protégé par aucun retry : un 500 transitoire du serveur de dev Next tuait les 134 tests. Retry par `page.reload()`, logique extraite dans `e2e/support/register-page.ts` pour être testable, spec dédiée simulant un 500 via `page.route()` — plus un cas de 500 **persistant** vérifiant que l'échec reste bruyant. Le message n'accuse plus une cause au hasard : un listener `page.on('response')` collecte les statuts **réellement observés** et les restitue avec une grille de lecture 429 / 403 / 409.

**#330 — 18 nouveaux tests E2E**, en 4 commits par lot fonctionnel (drawer/overlays, contrôles de toolbar, minimap/états/contraste, options de récurrence). Les specs exercent des **comportements**, pas des présences : l'overlay du drawer provoque un **démontage** et non un masquage ; `timeline-zoom-out` change réellement `timeline-zoom-level` ; la live-region est vérifiée **vide au montage** (une annonce parasite est un bug a11y qu'une assertion de présence ne verrait pas) puis sur son contenu exact ; `timeline-event-outside-label` est testé avec un **contrôle négatif** (le cas au-dessus du seuil de contraste doit être absent).

## ⚠ La cible de #330 est corrigée : 15 atteignables, pas 18

Trois écarts au décompte du §4 de l'audit S47, chacun étayé par la mesure (détail : `docs/memory/audits/sprint-54-test-coverage.md` §2).

**Deux entrées ne sont pas des éléments d'interface.** `desktop-edit-trigger` et `mobile-delete-trigger` n'existent que dans `frontend/src/components/timeline/TimelineEditHost.test.tsx` — doublures RTL, exactement le motif pour lequel l'issue exclut déjà `timeline-edit-host-stub` et `timeline-responsive-stub`, **et dans le même fichier**. Aucune spec Playwright ne peut les exercer : le critère d'acceptation n°1 était **inatteignable par construction**. C'est une **régression d'audit traçable** : `audits/sprint-46-test-coverage.md:47` identifiait déjà `mobile-delete-trigger` comme faux positif, l'audit S47 l'a réintégré.

**Une entrée est du code mort** — `timeline-loading`, cf. bug produit n°1.

## ⚠ Deux bugs produit découverts (signalés, non corrigés — hors périmètre)

Trouvés uniquement parce que les specs testent des comportements.

**1. `timeline-loading` est inatteignable.** `app/[locale]/(app)/timeline/page.tsx:47` porte bien la branche `if (loading)`, mais `AppShell` (`components/layout/AppShell.tsx:80/114`, livré par #210 **après** ce testid) pose sa propre garde `useAuthGuard()` au niveau du shell et retourne `app-shell-loading` **sans monter `children`**. La branche de `TimelinePage` ne peut donc plus s'exécuter. Mesuré, route `/api/auth/me` gatée : `app-shell-loading`=1, `timeline-loading`=0 — 100 % reproductible, ce n'est pas un timing serré. La spec est `test.skip()` avec la cause nommée ; **substituer `app-shell-loading` a été refusé délibérément**, cela aurait couvert un testid *différent* de celui déclaré tout en donnant l'illusion de la couverture.

**2. En-tête de lane sticky rendant des événements inatteignables à la souris.** Au zoom Trimestre, un événement proche de `rangeStart` (`computeRange` = 30 j avant le 1er event) se place à `30 × 5 = 150 px` alors que `--lane-header-w` vaut **168 px** (`spacing.css:48`) : `.mt-tlv__lane-label` (`position:sticky;left:0`, `TimelineView.tsx:331`) intercepte le pointeur — Playwright le confirme explicitement. **Aucun scroll ne dégage la pastille** : à ce zoom, pour un seul produit, le rail tient dans le viewport, donc il n'y a pas d'overflow. Un utilisateur réel ne peut pas cliquer cet événement. L'assertion de la spec est conservée ; l'activation passe par le clavier (`Enter`, même `onSelect`).

Troisième point remonté pour arbitrage produit : `DEFAULT_COLOR` `#6366f1` (`types/event.ts:128`) a un ratio de contraste mesuré **4,467 < 4,5** (seuil AA). Tout événement sans couleur explicite déclenche donc déjà le libellé extérieur en production — c'est l'état **normal**, pas un cas limite.

## Prémisses infirmées par la mesure

**Le retry 429 de `auth.setup.ts` était mort depuis le S47.** Budget Playwright par défaut 30 s ; un cycle coûte 8 s d'attente + 20 s de backoff = **28 s**, donc la 2ᵉ soumission expirait **toujours** — mesuré 4/4 `provision` en `Test timeout of 30000ms exceeded`, sans une ligne de diagnostic. Le retry documenté depuis deux sprints n'avait jamais pu s'exécuter au-delà de la 1re tentative.

Trois prémisses des briefings du lead sont également tombées, consignées comme telles : `timeline-today` n'est **pas** un bouton (badge positionnel sans `onClick`, `TimelineView.tsx:211`) ; `timeline-event-outside-label` dépend du **contraste** et non de la longueur du titre ; `timeline-zoom-in`/`timeline-fullscreen` ne sont **pas montés** dans le contexte desktop visé — le grep prouvait qu'ils sont *écrits* dans un fichier, pas qu'ils sont *rendus*.

## Tests

**E2E : 134 tests → 125 passed / 0 failed / 9 skipped** (`--workers=1`, run unique sans concurrence).

`125` = les **108 de la baseline pré-#330** + 17 des 18 nouveaux tests. **Aucune régression** : les 108 préexistants passent tous. Les 9 skipped = 8 skips structurels préexistants + le skip justifié de `timeline-loading`.

Frontend unitaire **836/836** · `tsc --noEmit` **0 erreur** · `eslint` **0 issue**.
Backend **non exécuté — aucun fichier backend touché** ; la CI reste le juge de la non-régression backend sur cette branche.

Deux mesures antérieures (**8 rouges**, puis **12 rouges** sur un code identique) ont été **écartées** : deux suites Playwright avaient été lancées concurremment contre une base unique, et la contention produisait des échecs non reproductibles — `event-outside-label` échouait dans les deux runs contendus et **passe** au run propre. Erreur de méthode du lead, consignée dans l'audit plutôt qu'effacée.

## Review

Review batch : **1 CRITIQUE / 0 MAJEUR retenu / 2 MINEURS**.

Le CRITIQUE portait sur `PROVISION_TIMEOUT_MS`. Après vérification, **la sévérité est revue à la baisse** — dans le pire cas qui *continue*, `ensureRegisterForm(recover)` réussit à sa dernière tentative ; l'épuiser lève plus tôt avec le message de rendu. Mais **le fond est juste** : le commentaire annonçait ~110 s en omettant complètement les deux appels `recover`, qui sont des boucles de retry et non des vérifications instantanées. Pire cas recalculé : **~127 s**. Les 150 s ne laissaient que ~23 s de marge sur une infrastructure partagée par les 134 tests → **porté à 180 s**, calcul détaillé en commentaire.

Un MINEUR est écarté avec raison : les littéraux `WEEK`/`MONTH`/`YEAR` dupliqués entre `value` et `data-testid` — dériver 3 valeurs statiques d'un enum ajouterait de l'indirection sans gain de sûreté. Sa référence de ligne était par ailleurs inexistante (1035-1043 dans un fichier de 653 lignes).

## Couverture des nouveaux testids (protocole A.4)

`[COVERAGE-E2E] OK` — les 4 `data-testid` ajoutés sont tous référencés par une spec.

À noter : `recurrence-unit-option-WEEK` et `-YEAR` étaient posés par #331 **sans aucune spec** (seul `MONTH` était exercé) — écart relevé entre les deux vagues et intégré au périmètre de #330 plutôt que reporté en follow-up.

## Réserves assumées

- Les deux bugs produit ci-dessus sont **signalés, non corrigés**.
- `timeline-today`, `timeline-weekend`, `timeline-help`, `timeline-fullscreen` sont couverts **en desktop uniquement** ; la matrice complète par orientation mobile n'est pas faite.
- L'API `requestFullscreen` est **stubée** dans sa spec : la bascule plein écran réelle du navigateur n'est pas observée.
- #330 a été exécutée par un modèle **Sonnet**, pas Opus comme le prévoyait le triage (capacité Opus indisponible — six échecs `529` consécutifs). Le travail a été vérifié à la mesure par le lead ; la dérogation est consignée.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
