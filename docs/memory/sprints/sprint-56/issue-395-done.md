# Issue #395 — [TEST] Exposer un état observable pour le bouton plein écran

**Sprint :** 56 | **Vague :** 2 (seul) | **Triage :** S
**Commit :** `c87034d` | **Base spawn :** `143edc0`
**Fichiers (3, +116/-0) :** `TimelineView.tsx`, `TimelineView.test.tsx`, `e2e/timeline.spec.ts`
**Vérifié par le lead :** portée conforme, aucun fichier hors périmètre.

---

## Livré

- `TimelineView.tsx:845-861` — état **dérivé** de `document.addEventListener('fullscreenchange')`
  dans un `useEffect` (+ cleanup + sync initial au montage), lisant
  `Boolean(document.fullscreenElement)`. **Aucun `setState` dans `toggleFullscreen`.**
- `TimelineView.tsx:1075` — `aria-pressed={isFullscreen}`. `aria-label` conservé, aucun `role`
  ajouté.
- Stub E2E **corrigé** : `document.dispatchEvent(new Event('fullscreenchange'))` dans
  `requestFullscreen` ET `exitFullscreen` — fidélité au navigateur, pas permissivité.
- +1 test RTL (clic → true, puis `fullscreenchange` hors bouton → false).

## Preuve

- **E2E test 1** (existant, étendu) : `aria-pressed` false → true → false. Assertions
  `__fullscreenCalls` / `__fullscreenExits` conservées et vertes.
- **E2E test 2** (nouveau, cas discriminant) : clic → true, puis
  `page.evaluate(() => document.exitFullscreen())` **sans toucher le bouton** →
  `aria-pressed=false`, puis re-clic → true + `__fullscreenCalls===2` (bouton non désynchronisé).
- **Sensibilité A** (écoute `fullscreenchange` neutralisée) : **2 échecs E2E + 1 unitaire**.
- **Sensibilité B** (variante naïve `useState` dans le handler) : **1 seul échec** — le test 1
  PASSE, seul le cas « sortie hors bouton » rougit.

> **Le piège du briefing est confirmé empiriquement.** Sans le cas discriminant, l'issue aurait
> été « satisfaite » par une implémentation qui ment (`aria-pressed="true"` sur une page sortie
> du plein écran par Échap natif / F11). C'est la sensibilité B qui le démontre.

- Suites après restauration : backend 452/452, vitest 840/840, `tsc --noEmit` 0 erreur,
  `timeline.spec.ts` + `timeline-mobile.spec.ts` **46/46 en 50 s**.

## ⚠ Écart environnement — la prémisse du briefing était fausse

Le briefing (lead) annonçait « un `next dev` du worktree tourne sur `:3000` », information
héritée du retour de #392. **C'est faux** : `:3000` était tenu par un `next-server` standalone
d'un **autre projet** (EdelWheels), d'où un 404 sur `/fr/register`. L'agent ne l'a pas tué ; il
a disparu en cours de run, cause non établie.

**Découverte réutilisable :** basculer le dev sur un autre port ne suffit PAS. Next relaie
l'`Origin: localhost:3100` au backend, que `application-dev.properties:35` fige à
`localhost:3000` → **403 déguisé en « rate-limit »** (variante du piège CORS déjà en mémoire
projet, mais par le port du dev server et non par le proxy).

Contournement retenu : conteneur **backend frère jetable** (même réseau/DB,
`APP_CORS_ALLOWED_ORIGINS=...:3000,...:3100`, port 8090).

**Nettoyage effectué et vérifié par le lead :** conteneur `mytimeline-e2e-395` supprimé, dev
`:3100` arrêté, `:3000` désormais libre, working tree propre.

## Signaux mémoire

- **[MEMORY:pattern]** Exposer un état UI pour une API navigateur à **sorties multiples** →
  dériver d'un événement du navigateur (`fullscreenchange`) + sync initial au montage.
  Anti-pattern : `useState` basculé dans le handler → l'attribut ARIA ment sur Échap natif/F11.
- **[MEMORY:pitfall]** Stub E2E d'API navigateur : un stub qui **mute l'état sans émettre
  l'événement associé** fait rougir une implémentation CORRECTE et passer une fausse.
  Prévention : tout stub d'API à événement doit dispatcher l'événement ; et l'oracle d'une
  issue « exposer un état observable » doit inclure un cas qui **contourne le déclencheur UI**.
- **[MEMORY:pitfall]** E2E local MyTimeline : `:3000` peut appartenir à un autre projet (poste
  multi-projets). Le CORS dev étant figé à `:3000`, changer de port ne sauve rien —
  l'`Origin` est relayé. Recette : backend frère jetable avec `APP_CORS_ALLOWED_ORIGINS`.

## Non vérifié (déclaré)

Vrai plein écran non stubé (Chromium headless), F11 réel, menu navigateur, thème sombre,
lecteur d'écran réel. Les 4 chemins sont couverts **par construction** (`fullscreenchange` est
la source de vérité), pas par observation directe. E2E hors timeline non relancé.

## Recommandations suite

- `RECOMMAND_FOLLOWUP` — `application-dev.properties:35` : rendre `app.cors.allowed-origins`
  surchargeable/multi-port en dev. Aujourd'hui l'E2E local devient impossible dès que `:3000`
  est pris par un autre projet.
- Pas de `RECOMMAND_TEST_RUNNER` (46 tests / 50 s, sous les seuils), pas de
  `RECOMMAND_DB_EXPERT`, aucun fichier hors périmètre touché.

STATUS: COMPLETED
