# Fix review #166 — Règle 1 ArchUnit

commits: [d38aef0]

## resume

[FAUX] Règle 1 chaînait 2 `dependOnClassesThat` via `andShould`. `noClasses().should(A).andShould(B)` = classe satisfait A ET B. B = "dépend d'≥1 classe hors `jakarta.validation..`" → trivialement vrai (toute classe dépend de `java.lang`/`java.util`). Donc B neutralisé → règle ≈ "domaine dépend spring OU jakarta (validation INCLUSE)". Exception jakarta.validation NON effective (faux positif au 1er usage légitime, gelé silencieusement par Freeze).

[FIX] Prédicat UNIQUE combiné : `resideInAnyPackage("org.springframework..","jakarta..").and(DescribedPredicate.not(resideInAPackage("jakarta.validation..")))` passé à `dependOnClassesThat(DescribedPredicate)`. API ArchUnit 1.3.0 vérifiée (context7) : overload `dependOnClassesThat(DescribedPredicate<? super JavaClass>)`, `JavaClass.Predicates.resideInAnyPackage/resideInAPackage`, `.and()`, `DescribedPredicate.not()`.

[VALIDATION 1 — jakarta.validation TOLÉRÉ] classe domaine factice important SEULEMENT `jakarta.validation.constraints.NotBlank` → test VERT (non signalée). PASS. Probe retiré.

[VALIDATION 2 — spring REJETÉ] même classe avec `@Component` (org.springframework.stereotype) → test ÉCHOUE, violation `TmpValidationProbe is annotated with Component` hors baseline. PASS. Probe retiré.

[BASELINE] Règle 1 régénérée. Nouveau store `3906b3e2` (318B, propre) = 2 deps Spring légitimes : `Role -> GrantedAuthority` + `ProductRepository @Repository`. NB : baseline gelée contenait DÉJÀ ces 2 (pas seulement Role, contrairement au briefing) — ancien blob `aa51e832` (4.3K) polluait avec bruit java.lang.Enum/UUID car règle buggée flaguait classes entières. Orphelin `aa51e832` + sa ligne `stored.rules` purgés (Freeze ne prune pas les orphelins). Rules 2/3/4 stores intacts.

[TESTS] backend `./scripts/test-quiet.sh backend` = 242 run, 0 fail, 0 error. PASS. ArchitectureTest 4/4 vert en mode gelé (`allowStoreCreation=false`).

[PÉRIMÈTRE] Touché : ArchitectureTest.java (Règle 1) + archunit_store (3906b3e2 ajouté, aa51e832 supprimé, stored.rules). Rien d'autre.

## [MEMORY:pitfall]
Context: ArchUnit — exprimer une exception ("interdire X SAUF sous-package Y") avec `noClasses().should().dependOnClassesThat().resideInAnyPackage(X).andShould().dependOnClassesThat().resideOutsideOfPackage(Y)`. Solution: 2 `dependOnClassesThat` chaînés ≠ exclusion croisée — `noClasses.should(A).andShould(B)` signale A ET B, et B="dépend d'≥1 classe hors Y" est trivialement vrai (java.lang/util), neutralisant l'exception silencieusement (Freeze gèle le faux positif). Utiliser UN `DescribedPredicate` combiné : `resideInAnyPackage(X).and(DescribedPredicate.not(resideInAPackage(Y)))` via l'overload `dependOnClassesThat(DescribedPredicate)`. Prevention: pour toute exception dans une règle ArchUnit, un seul prédicat combiné, jamais deux conditions chaînées.

## Recommandations suite
Néant — correction ciblée (fix review), aucun RECOMMAND_* actionnable, pas de dette introduite.

STATUS: COMPLETED
