# Revue batch Sprint 89 — domaine frontend (reviewer, cycle 1)

> Diff : `*.ts` / `*.tsx` / `*.json` de `origin/dev..7ed997c` (1825 lignes) — commits `ad57148` (#546), `062c903` (#685), `7ed997c` (#652).

**VERDICT : 0 CRITIQUE / 0 MAJEUR / 3 MINEUR**

## Constats OK
- **#652, lectures `LocalDate`** — toutes les lectures de date seule (`new Date(event.start / startDate / e.start)`) sont migrées vers `parseLocalDate` dans dashboard, frise et produits. Les `LocalDateTime` (`parseServerDateTime`, `SessionList`) et la date légale (UTC épinglé, `legal-pages.ts`) ne sont pas touchés : frontière respectée.
- **#652, tests non vacants** — `TZ` posé en `beforeAll` et restauré sans laisser `TZ` à la chaîne `"undefined"` (PIT-S83-007) ; aucune `Date` construite au niveau module (fonctions `now()` / `civil()`) ; l'assertion `getTimezoneOffset() > 0` est présente.
- **#546, discrimination du 409** — `CategoryInUseException` est la seule source de 409 sur le DELETE catégorie (br-categories), donc la condition `status === 409 && isCategory && !needsReassign` n'a pas de faux positif ; états réinitialisés à la réouverture (`useEffect [open]`) ; clé `reassignRequired` cohérente en fr/en/es/de.
- **#685, clause de provenance** — les 5 cas synthétiques et les 5 contrôles sur copie mutée couvrent le glissement d'attente, le statut fabriqué, la fonction intermédiaire et la boucle multiple.
- **E2E** — `categories.spec.ts` et `sprint-89-local-date-west.spec.ts` sèment et nettoient via `seed-cleanup.ts` ; aucun register ni login ajouté (`ensureAuthenticated` = sonde du dashboard).

## Constats MINEUR
1. `frontend/src/components/shared/DeleteConfirmDialog.tsx:206-214` — la note « réassignation obligatoire » n'est pas liée au select par `aria-describedby` (seulement `role="alert"` au montage) : un lecteur d'écran n'a plus le contexte en revenant sur le select. Correctif : `aria-describedby` sur le `SelectTrigger` pointant l'id de la note.
2. `frontend/src/lib/date-iso.ts:93-95` — `parseLocalDate` construit minuit local par `new Date(y, m - 1, d)` ; le jour d'un passage à l'heure d'été où minuit n'existe pas (ex. historique de `America/Sao_Paulo`), l'heure glisse d'une heure sans que le jour change. Risque plausible, non testé.
3. `frontend/src/__tests__/e2e-rate-limit-budget.test.ts:326-330` (`calleeName`) — le classificateur est reconnu par son nom textuel ; un alias d'import (`import { classifyRegisterResponse as c }`) contournerait l'ancrage. **Pré-existant, pas introduit par #685** ; signalé pour mémoire.

## Décision du lead
Aucun correctif appliqué pendant la suite E2E complète en cours sur `7ed997c` (un commit invaliderait la preuve) ; les 5 MINEUR (2 backend + 3 frontend) ont été soumis à l'arbitrage du dev avec la PR #687.

## Arbitrage du dev (2026-09-14) : corriger les deux MINEUR utiles avant la fusion
- **MINEUR 1 — CORRIGÉ par le lead.** `DeleteConfirmDialog.tsx` : `id="reassign-required-note"` sur la note, `aria-describedby` sur le `SelectTrigger` posé seulement quand la note est affichée. Deux assertions dans `DeleteConfirmDialog.test.tsx` (lien présent après bascule avec id existant ; aucun `aria-describedby` sans bascule). Contre-épreuve : ligne retirée → le cas « 409 sans cible » rougit ; restaurée → 18/18.
- **MINEUR 2 (heure d'été sans minuit) — non corrigé**, reste en follow-up : risque plausible, jamais constaté.
- **MINEUR 3 (alias d'import du classificateur) — non corrigé**, pré-existant au S89, reste en follow-up.
