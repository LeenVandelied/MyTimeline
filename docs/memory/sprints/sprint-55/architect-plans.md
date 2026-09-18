# Mini-plans architect — Sprint 55

> Généré par `/sprint plan 5` (architect, 2026-07-30). Lu par `/sprint start 55` Phase 4.1
> pour injection dans le HEAD du briefing fullstack-dev (section « ## Plan d'implémentation »).
>
> **Thème :** Un clone vierge démarre sans contradiction — 5 pts, cohésion 0.08 (⚠ < 0.3, split
> proposé et rejeté : les items sont la clause « un clone démarre » du critère MVP et rien d'autre).
> **Vagues :** V1 = #366 ∥ #376 ∥ #356 ∥ #377 ∥ #361 — les 5 fichiers cibles sont strictement disjoints.
> **Milestone GitHub :** #56 (⚠ décalage +1 : le numéro 55 est pris par « Mise en ligne (GELÉ) »).

## ⚠ Garde-fous d'environnement à recopier dans chaque briefing

- `git fetch` puis vérifier le point de départ via `git show-ref origin/dev` ou
  `rtk proxy git ls-remote origin refs/heads/dev`. **`git log origin/dev` MENT** — le hook RTK
  masque les commits de merge (mesuré : il a renvoyé `a278be2` au lieu de `91c2f4a`).
- Le checkout principal `/Users/herrh/VSProjects/MyTimeline` était **58 commits en retard** au
  moment de la planification. Pour lire un fichier de référence : `git show origin/dev:<path>`.
- Chemin corrigé : le middleware est `frontend/middleware.ts`, **pas** `frontend/src/middleware.ts`.

## Mini-plans

```yaml
issue_366:
  fichiers_cles: [".env.example", "README.md"]
  strategie_test: "aucun (fichier d'exemple)"
  possibly_done: false
  etat_reel_du_code: "verifie origin/dev : aucune occurrence de BREVO dans .env.example ; backend/src/main/resources/application.properties.example la documente bien"

issue_376:
  fichiers_cles: ["docker-compose.yml", "README.md"]
  strategie_test: "navigateur non requis ; docker compose up + docker compose ps"
  risque_regression: "le README racine documente ce faux negatif comme Piege connu n4 (README.md:167) — le corriger sans retirer le piege rend le README menteur"
  possibly_done: false
  etat_reel_du_code: "verifie origin/dev : docker-compose.yml:90 = wget -q --spider http://localhost:3000, non corrige"

issue_356:
  fichiers_cles: [".github/workflows/ci.yml"]
  strategie_test: "run CI observe"
  possibly_done: false
  etat_reel_du_code: "verifie origin/dev : ci.yml porte 3 jobs (backend, frontend, e2e), aucun job flyway/smoke"

issue_377:
  fichiers_cles: ["frontend/README.md"]
  strategie_test: "aucun"
  possibly_done: false
  etat_reel_du_code: "verifie origin/dev : frontend/README.md est bien le stub create-next-app (mentionne Vercel + app/page.tsx). Le README racine, lui, EXISTE (225 lignes, livre par #372)"

issue_361:
  # Ajoutee au plan par le lead, PAS par l'architect (voir note ci-dessous).
  fichiers_cles: ["parametres de protection de branche GitHub (pas un fichier du depot)"]
  strategie_test: "verifier qu'une PR avec e2e rouge devient non-mergeable"
  risque_regression: "si la suite e2e est instable, tout merge se bloque — a poser APRES avoir constate une suite stable sur 2 runs consecutifs"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — a verifier via gh api repos/:owner/:repo/branches/dev/protection)"
```

## Note sur #361 — écart assumé par rapport au plan validé

L'architecte avait classé #361 **hors plan** tout en la désignant « le regret le plus sérieux » :
sans elle, une régression E2E ne bloque aucun merge des 5 sprints, et il proposait de l'échanger
contre #377. Le lead l'a **ajoutée** plutôt qu'échangée : le sprint était à 4 pts pour un plafond
de 10, l'ajout ne déplace rien et ferme le trou que le plan s'identifiait lui-même.
Ce n'est pas ce qui a été soumis à validation — un retrait est une commande.

## Vérification exigée

Le test unitaire est insuffisant sur tout ce sprint.
- **#376** → `docker compose up` réel + `docker compose ps` montrant `healthy`.
- **#356** → run CI observé sur base vierge.
- **#361** → constat qu'une PR à E2E rouge est bien refusée.
- **#366 / #377** → relecture, aucun test.
