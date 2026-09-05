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
`int deleteByIdReturningRowCount(UUID)` qui rend le nombre de lignes touchées.
Implémentation dans `EventRepositoryJpaImpl` : `DELETE` bulk **JPQL** bindé
(`DELETE FROM EventEntity e WHERE e.id = :id`), une seule instruction.
Service : `if (eventRepository.deleteByIdReturningRowCount(id) == 0) throw new EventNotFoundException(id);`.

Choix JPQL et non SQL natif (alors que `deleteAllByUserId` du même fichier est natif) : le natif
n'était nécessaire là-bas que pour contourner le `@SQLRestriction` de `ProductEntity` ; ici il n'y
en a aucun à contourner, et le bulk JPQL déclare son *entity space*, donc Hibernate auto-flushe les
mutations en attente sur `events` avant de l'exécuter. Le retrait de `deleteById` du port est délibéré, mais sa
portée était SURVENDUE dans la première version de ce document (« empêche la réintroduction ») —
correction : il retire le chemin à trois requêtes de l'**abstraction dont dépend la couche
application**, rien de plus. `EventRepositoryJpaImpl extends SimpleJpaRepository`, donc `deleteById`
et `delete` restent des méthodes **publiques du bean concret** ; le contrôle négatif de
`EventDeleteStatisticsIntegrationTest` les appelle justement via `legacyRepository`. C'est une
barrière de conception, pas une garantie de compilation.

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

## 3bis. Verrou optimiste perdu sur la suppression — décision assumée (cycle 2 de review)

**Constat du db-expert, vérifié moi-même et CONFIRMÉ par la mesure.** `EventEntity` porte bien
`@Version` (l.33-35). L'ancien chemin finissait par `em.remove(entity)`, qui émet
`DELETE ... WHERE id = ? AND version = ?` ; le DELETE bulk JPQL émet `WHERE id = ?` seul. Un
événement édité concurremment est donc désormais supprimé là où l'ancien chemin levait un
`StaleStateException`. Ni documenté ni testé dans mon premier commit : c'était un angle mort réel.

**Preuve, pas déduction.** J'ai ajouté un contrôle négatif à
`EventOptimisticLockConflictIntegrationTest` :
`legacyDeletePath_underSharedPersistenceContext_didRaiseOptimisticLock` **passe** — l'ancien chemin
levait effectivement un conflit de la famille optimistic-lock quand une édition était committée
entre le chargement d'ownership et le flush. Le constat du reviewer est donc exact, pas théorique.
Reproduction déterministe, sans thread ni timing (l'édition concurrente est committée par une
transaction imbriquée `REQUIRES_NEW`) — PIT-S25-002 ne s'applique pas.

**Ce que ce contrôle négatif apprend en plus.** La fenêtre que l'ancien verrou protégeait n'était
**pas** « quelqu'un a édité pendant que j'avais la page ouverte », mais les quelques millisecondes
**internes à la requête DELETE**, entre le `SELECT` d'ownership et le flush : sous `open-in-view`,
le `findById` de `SimpleJpaRepository.deleteById` tapait le cache de 1er niveau et réutilisait la
version lue par le contrôle d'ownership. Sans `open-in-view`, ce `findById` aurait rechargé une
version fraîche et le verrou n'aurait jamais rien attrapé.

**Décision retenue : « la suppression gagne toujours ».** Assumée, pas subie :
1. `DELETE /api/events/{id}` ne transporte **aucune version** — contrairement au PATCH dont
   `EventUpdateRequest.version` porte le contrat 409 de BR-EVE-015. Le client ne peut donc pas
   exprimer « supprime la version que j'ai vue » : il n'y a aucune intention utilisateur à
   protéger, et un 409 sur DELETE serait inexploitable côté frontend (rien à comparer dans la
   modale de conflit).
2. La fenêtre réellement couverte était intra-requête (ci-dessus), pas métier.
3. Une suppression demandée par le propriétaire est un acte terminal ; perdre une édition
   concurrente sur une ligne qui disparaît de toute façon est sans conséquence observable.

**Si le choix devait être REVU** (p. ex. si le frontend se mettait à envoyer une version au DELETE),
le coût — chiffré, non implémenté — serait : un paramètre `version` sur le port et sur le DTO ;
`DELETE ... WHERE e.id = :id AND e.version = :version` ; et la distinction des deux causes possibles
de rowcount 0 (inexistant → 404 / version périmée → 409) par une relecture, soit une 2ᵉ instruction
**sur le seul chemin de conflit**. Le chemin nominal resterait à 1 instruction.

**Épinglage.** `concurrentEditThenDelete_deletionWins` transforme l'effet de bord en spécification :
édition concurrente committée (version 0 → 1), puis suppression → la ligne part, aucun conflit. Il
est volontairement voisin de `staleVersionUpdate_isRejectedByOptimisticLock_withoutOverwriting`, qui
échoue sur le même scénario : le contraste UPDATE/DELETE est lisible dans le même fichier. Le jour
où l'arbitrage devra changer, c'est ce test qui rougira en premier.

## 3ter. Nommage et code mort (cycle 2 de review)

**Nommage — tranché : renommé.** `deleteByIdIfExists` → **`deleteByIdReturningRowCount`** : le
reviewer a raison, `IfExists` annonçait une idempotence anodine alors que le rowcount est
load-bearing (le service en dérive le 404) ; le nouveau nom oblige l'appelant à le regarder.

**`existsById` — tranché : retiré.** C'est bien mon commit qui l'a rendu mort. Supprimé de
`EventRepository` (port), de `EventService` (port) et de `EventServiceImpl` — la chaîne entière
n'avait plus aucun appelant de production. Effet de bord assumé : les deux
`verify(eventRepository, never()).existsById(...)` de `EventServiceImplTest` (hérités de #95)
deviennent structurellement impossibles et sont remplacés par un commentaire — l'assertion est
désormais garantie par le compilateur plutôt que par un test. `ProductService`/`CategoryService`
gardent leur propre `existsById` (celui de Category a de vrais appelants) : hors périmètre.

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
- Nouveaux (cycle 2), dans `EventOptimisticLockConflictIntegrationTest` :
  `concurrentEditThenDelete_deletionWins` (spécification du comportement retenu) et
  `legacyDeletePath_underSharedPersistenceContext_didRaiseOptimisticLock` (contrôle négatif).
- Suite backend complète : `./scripts/test-quiet.sh backend` →
  **`Tests run: 566, Failures: 0, Errors: 0, Skipped: 0` / `BUILD SUCCESS` / `EXIT=0`**
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
- **Cache L1 après bulk delete** : point tranché SAIN au cycle 2 par le db-expert — le contrôleur
  répond `ok().build()` sans relecture, donc dirty-check vide et aucun `UPDATE` post-`DELETE`.
  À re-vérifier uniquement si la suppression était un jour enchaînée à d'autres lectures.
- **Auto-flush du bulk JPQL : NON VÉRIFIÉ**, et laissé tel quel sur consigne du lead — sans impact
  ici (le service est le seul appelant, rien en attente sur `events` au moment de l'appel).
- **Pas de bench de latence** : la mesure porte sur le nombre d'instructions JDBC, pas sur un temps.
  Sur une suppression unitaire l'effet en millisecondes n'a pas été quantifié.

## Recommandations suite

Pas de RECOMMAND_DB_EXPERT car le cycle 2 de review db-expert a eu lieu et ses cinq points sont traités dans ce document (verrou optimiste acté et testé, nommage tranché, `existsById` retiré, affirmation surdimensionnée corrigée, cache L1 confirmé sain).
Pas de RECOMMAND_TEST_RUNNER car la suite backend complète a été exécutée localement (566/566, EXIT=0) et tient en une commande.
Pas de RECOMMAND_SECURITY_EXPERT car le contrat d'ownership 403/404 est inchangé et couvert par `EventControllerOwnershipTest` resté vert.

STATUS: COMPLETED
