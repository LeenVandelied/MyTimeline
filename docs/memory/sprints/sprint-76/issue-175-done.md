Fichiers de contexte lus : `docs/memory/sprints/sprint-76/pitfalls-175.md` (intégral) ; `backend/.../application/services/EventServiceImpl.java` ; `backend/.../domain/ports/repositories/EventRepository.java` ; `backend/.../infrastructure/adapters/repositories/jpa/EventRepositoryJpaImpl.java` ; `backend/.../infrastructure/adapters/repositories/jpa/UserRepositoryJpaImpl.java` ; `backend/.../infrastructure/adapters/controllers/EventController.java` ; `backend/.../infrastructure/entities/EventEntity.java` ; `backend/src/test/.../EventControllerOwnershipTest.java` ; `backend/src/test/.../PasswordResetTokenCreateStatisticsIntegrationTest.java` ; `backend/src/test/.../EventPatchAndRecurrenceIntegrationTest.java` ; `backend/src/test/.../support/AbstractPostgresIntegrationTest.java` ; `backend/src/main/resources/application.properties` ; `backend/src/test/resources/application-test.properties` ; `backend/src/main/resources/db/migration/` (grep contraintes/FK sur `events`) ; les packs `cp-hexagonal` / `cp-backend` inlinés dans le briefing.

# Issue #175 — EventServiceImpl.deleteById : supprimer le double-hit DB

## 1. Vérification préalable de l'énoncé

- **Ligne périmée confirmée.** L'énoncé annonce « ≈ l.133-138 » ; le code réel était bien en
  **l.235-242** de `EventServiceImpl.java`, comme l'avait relevé le lead.
- **« Double-hit » sous-compte le problème.** `eventRepository.deleteById(UUID)` n'était pas
  surchargé dans `EventRepositoryJpaImpl` : il venait tel quel de `SimpleJpaRepository`, dont
  l'implémentation est `findById(id).ifPresent(this::delete)`. Avec le `existsById` qui le
  précédait, le chemin coûtait donc **trois** instructions, pas deux.
- **Aucune FK enfant ne référence `events`** (grep des migrations V1..V15) et **`EventEntity` ne
  porte AUCUN `@SQLRestriction`** (contrairement à `ProductEntity`). Ces deux points conditionnent
  la voie retenue : ni cascade à orchestrer, ni filtre Hibernate à contourner.
- **`spring.jpa.open-in-view` est actif** (défaut Spring Boot ; WARN explicite au boot, relevé dans
  le log de test). Le contrôleur charge déjà l'événement via `checkEventOwnership` AVANT d'appeler
  `deleteById` — les deux appels partagent donc le même contexte de persistance sur une requête
  HTTP, ce qui change le compte réel. Mesuré séparément (§2, 3ᵉ ligne).

## 2. Mesure — compteurs AVANT / APRÈS

Méthode : `Statistics.getPrepareStatementCount()` d'Hibernate (instructions JDBC préparées),
statistiques remises à zéro juste avant l'appel mesuré, seed `flush()`+`clear()` au préalable pour
qu'il n'entre pas dans le compte et que le cache de 1er niveau ne masque pas un SELECT.
Test : `EventDeleteStatisticsIntegrationTest` (Postgres jetable, Testcontainers).

| Scénario | AVANT | APRÈS |
|---|---|---|
| `deleteById(id existant)`, contexte de persistance vide | **3** (`SELECT count(*)` + `SELECT` entité + `DELETE`) | **1** (`DELETE`) |
| `deleteById(id inconnu)` → 404 | **1** (`SELECT count(*)`, puis throw) | **1** (`DELETE` à 0 ligne) |
| Séquence contrôleur réelle : ownership (`findEventById`) + suppression, contexte partagé (open-in-view) | **3** | **2** |

Chiffres relevés par exécution, pas déduits : sortie brute des trois tests —
`[#175] deleteById(existant) — instructions JDBC = 3` puis `= 1` après correctif ;
`[#175] deleteById(inconnu) — instructions JDBC = 1` (inchangé) ;
`[#175] sequence controleur — AVANT = 3 / APRES = 2`.

Le 3ᵉ scénario est un **A/B joué dans le même test** : la séquence héritée
(`findEventById` + `existsById` + `deleteById` de `SimpleJpaRepository`, obtenue en autowirant
l'impl concrète) et la nouvelle sont mesurées dans des conditions identiques, plutôt que
d'extrapoler l'une depuis l'autre. Il explique aussi pourquoi le gain HTTP est de 1 instruction et
non de 2 : sous open-in-view, le `findById` interne de l'ancien `deleteById` tapait déjà le cache
de 1er niveau (0 SQL) — l'instruction réellement supprimée est le `SELECT count(*)`.

## 3. Voie retenue : (a)

Port `EventRepository` : `void deleteById(UUID)` **retiré**, remplacé par
`int deleteByIdIfExists(UUID)` qui rend le nombre de lignes touchées.
Implémentation dans `EventRepositoryJpaImpl` : `DELETE` bulk **JPQL** bindé
(`DELETE FROM EventEntity e WHERE e.id = :id`), une seule instruction.
Service : `if (eventRepository.deleteByIdIfExists(id) == 0) throw new EventNotFoundException(id);`.

Choix JPQL et non SQL natif (alors que `deleteAllByUserId` du même fichier est natif) : le natif
n'était nécessaire là-bas que pour contourner le `@SQLRestriction` de `ProductEntity` ; ici il n'y
en a aucun à contourner, et le bulk JPQL déclare son *entity space*, donc Hibernate auto-flushe les
mutations en attente sur `events` avant de l'exécuter. Le retrait de `deleteById` du port est
délibéré : laisser sur le port la méthode qui EST l'anti-pattern permettrait de le réintroduire par
inadvertance au prochain besoin de suppression.

Précédent maison invoqué : `UserRepositoryJpaImpl.deleteById` (#78) fait déjà exactement ce
raisonnement — « natif bindé pour éviter le select+delete de `SimpleJpaRepository.deleteById` ».

### Voies écartées et pourquoi

- **Option 1 de l'énoncé** (`findEventById(id).orElseThrow(...)` puis `deleteById(id)`) — écartée
  **par la mesure** : elle remplace le `SELECT count(*)` par un `SELECT` d'entité et laisse
  `deleteById` refaire le sien, soit toujours 3 instructions sur le chemin service et 3 sur le
  chemin contrôleur. Elle n'aurait rien économisé tout en donnant l'apparence d'un correctif.
- **(b) charger l'entité puis `delete(entity)`** — 2 instructions, et elle exige **le même**
  élargissement du port que (a). Strictement dominée : même coût d'interface, deux fois le coût
  d'exécution.
- **(c) no-op documenté** — recevable a priori sur une perf P3, écartée parce que les chiffres ne
  la portent pas : le gain est réel (−2 instructions en isolé, −1 sur le chemin HTTP), le coût est
  d'UNE méthode de port, et le dépôt porte déjà le précédent identique de #78. Le no-op aurait
  laissé en place une méthode de port qui est un piège pour le prochain appelant.

## 4. Contrat 404 préservé

Le contrat n'est pas modifié, seulement dérivé autrement : c'est désormais le nombre de lignes
touchées (0) qui atteste l'absence, au lieu d'une sonde d'existence préalable.
`EventNotFoundException` est levée dans le même cas, avec le même argument, depuis la même méthode
`@Transactional`. Le `@Transactional` et la signature `void deleteById(UUID)` de `EventService`
(port métier) sont inchangés — le contrôleur n'a pas bougé d'une ligne.

Preuves :
- `EventControllerOwnershipTest` — **4/4 vert**, inchangé : 403 `{"error":"forbidden"}` cross-user
  avec `verify(eventService, never()).deleteById(...)`, et 200 sur le chemin propriétaire.
- `EventDeleteStatisticsIntegrationTest.deleteUnknownEvent_throwsEventNotFound_withSingleStatement`
  — branche id inconnu : `EventNotFoundException` toujours levée.
- `EventDeleteStatisticsIntegrationTest.deleteExistingEvent_issuesSingleStatement_andRemovesRow`
  — branche nominale : la ligne est effectivement absente après l'appel (relecture après `clear()`).

## 5. Tests

- Nouveau : `backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventDeleteStatisticsIntegrationTest.java`
  (3 tests : compte nominal, compte + 404 sur id inconnu, A/B séquence contrôleur).
- Suite backend complète : `./scripts/test-quiet.sh backend` →
  **`Tests run: 564, Failures: 0, Errors: 0, Skipped: 0` / `BUILD SUCCESS` / `EXIT=0`**
  (code de sortie lu explicitement, pas le texte du résumé — PIT-S45-003 / PIT-S75-002).
  `ArchitectureTest` (ArchUnit) inclus dans le run et vert : le port reste une interface pure,
  aucun import Spring/JPA introduit dans `domain/`.
- Aucune migration Flyway créée ni modifiée (aucune n'était attendue).

## 6. Ce qui n'a PAS été vérifié / limites assumées

- **Pas de mesure sur un vrai aller-retour HTTP.** Le 3ᵉ scénario reproduit la condition
  open-in-view (contexte de persistance partagé entre le contrôle d'ownership et la suppression)
  dans un test transactionnel ; il ne passe pas par MockMvc + services réels. Le compte de la
  requête HTTP complète inclurait en plus les requêtes d'authentification (user, produit) que ce
  correctif ne touche pas.
- **`EventService.existsById` / `EventRepository.existsById` semblent sans appelant** (grep :
  seule l'impl de passe-plat). Dette laissée intacte, hors périmètre de cette issue.
- **Effet de bord connu du bulk delete** : il n'évince pas l'entité du cache de 1er niveau. Sous
  open-in-view, une `EventEntity` chargée plus tôt dans la même requête y reste, non modifiée — le
  flush de fin de transaction n'émet donc rien pour elle, et la requête se termine juste après.
  Documenté en commentaire dans l'adaptateur. Aucun scénario du dépôt ne relit l'événement après sa
  suppression dans la même requête ; ce point mériterait d'être re-vérifié si un jour la suppression
  était enchaînée à d'autres lectures.
- **Pas de bench de latence** : la mesure porte sur le nombre d'instructions JDBC, pas sur un temps.
  Sur une suppression unitaire l'effet en millisecondes n'a pas été quantifié.

## Recommandations suite

RECOMMAND_DB_EXPERT — le port `EventRepository` a été modifié (retrait de `deleteById`, ajout de `deleteByIdIfExists` avec bulk JPQL) : un relecteur schéma/requêtes doit valider la bascule vers un DELETE bulk et l'absence de cascade attendue sur `events`.
Pas de RECOMMAND_TEST_RUNNER car la suite backend complète a été exécutée localement (564/564, EXIT=0) et tient en une commande.
Pas de RECOMMAND_SECURITY_EXPERT car le contrat d'ownership 403/404 est inchangé et couvert par `EventControllerOwnershipTest` resté vert.

STATUS: COMPLETED
