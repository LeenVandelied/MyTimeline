# Mini-plans architect — Sprint 23

> Genere par /sprint plan (architect). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").
>
> COHESION 0.55 (WARNING borderline) — sprint de consolidation dette. Alternative si l'equipe
> prefere cohesion : substituer #123 par #181 (valider Flyway V11 prod) -> sprint 100% devops.
> Placement en dernier assume : non bloquant produit.

issue_0180:
  fichiers_cles:
    - backend/pom.xml (versions spring-security, tomcat, spring-boot)
  couches_touchees: [backend/build]
  strategie_test: build complet + suite backend + verif CVE (dependency-check) ; smoke boot prod profile
  risque_regression: MOYEN — bump peut casser API auth/session ; lancer suite complete via test-runner + verifier sessions jti #73
  ordre_ecriture: [identifier CVE + versions cibles, bump pom, build, suite complete, smoke boot]
  zod_dto_sync: aucun
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — pom.xml Boot 3.4.4 confirme par contexte ; versions patch a determiner"

issue_0123:
  fichiers_cles:
    - backend/.../infrastructure/rest/*Controller.java (injecter interfaces port, non impl)
    - backend/.../domain/ports/services/ (interfaces cibles)
  couches_touchees: [backend/infrastructure, backend/domain/port]
  strategie_test: ArchUnit (regle DIP #166 existante) + suite controleurs ; verifier aucune impl importee
  risque_regression: MOYEN — touche tous les controleurs ; ArchUnit hexagonal #166 doit passer ; lie #94/#93 (extraction identite)
  ordre_ecriture: [recenser controleurs important impl, basculer sur ports, ajuster tests, ArchUnit vert]
  zod_dto_sync: aucun
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — ProductService port existe (import domain/ports/services/ProductService confirme dans ProductServiceImpl) ; verifier quels controleurs importent encore les Impl"

issue_0167:
  fichiers_cles:
    - .github/workflows/*.yml (pin actions @SHA, persist-credentials:false)
  couches_touchees: [devops/ci]
  strategie_test: run CI reel post-merge dev (verif workflows verts)
  risque_regression: FAIBLE — durcissement CI, isole
  ordre_ecriture: [pin toutes actions par SHA, persist-credentials:false, ajout scan securite, verif run]
  zod_dto_sync: aucun
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — CI ajoutee S6 (PR #131) ; pinning SHA a verifier dans workflows"
