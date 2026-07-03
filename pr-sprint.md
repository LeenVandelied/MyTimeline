## Sprint 16 — Fondations design + extraction Timeline

Cohésion 0.55. Fondations design (ArchUnit hexagonal backend + Storybook core DS) + extraction des sous-composants Timeline (débloque S17 Timeline events desktop).

### Issues livrées (3)
- **#166** [CHORE] Test ArchUnit verrouillant les 4 règles hexagonales + baseline gelée (`FreezingArchRule`).
- **#46** [CHORE] Composants core du DS portés dans Storybook (11 composants + 17 stories).
- **#47** [FEATURE] Extraction des sous-composants Timeline du monolithe + stories Storybook.

### Travail infra absorbé (décision dev)
- **Migration Storybook 8.6 → 10.4.6** — `build-storybook` était cassé (pré-existant, hérité de `dev`) par le bump Next 15.2→15.5 du fix CVE #161 (`define-env-plugin.js` supprimé). Migré vers le framework `@storybook/nextjs-vite` **sans downgrader Next** (CVE #161 intact). Débloque l'AC build-storybook de #46 et #47.

### Vagues d'exécution
- **V1** (parallèle) : #166 (backend) ‖ #46 (Storybook DS)
- **V1.5** : migration infra Storybook 8→10 (débloque V2)
- **V2** : #47 (extraction Timeline, après convention stories #46)
- **V3** : audit test-runner + review batch

### Changements clés
**Backend (#166)**
- `archunit-junit5:1.3.0` (scope test) + `ArchitectureTest.java` : 4 règles (domain sans spring/jakarta hors validation ; domain+application sans infrastructure ; controllers→ports ; adapters JPA sans couplage inter-impl).
- `FreezingArchRule` : baseline versionnée (`archunit_store/`), `allowStoreCreation=false` en CI — seule une NOUVELLE violation casse le build. Dégel progressif au fil de l'hygiène hexagonale (follow-up).

**Frontend (#46 + migration SB)**
- 11 composants DS (icon-button, textarea, radio, switch, badge, tag, avatar, tabs, table, toast, tooltip) consommant les classes `.mt-*` / tokens Graphite (zéro hex/px hardcodé) + 17 stories colocalisées CSF3.
- Storybook 10 : framework `@storybook/nextjs-vite`, imports `@storybook/react-vite`, `core.css` chargé côté Storybook uniquement (décision #45).

**Frontend (#47)**
- `frontend/src/components/timeline/` : `lib.ts` (fonctions pures) + `DateStamp`/`Ruler`/`Cursor`/`EventBar`/`Lane` + `fixtures.tsx` + 5 stories.
- `TimelineCalendar.tsx` réécrit en orchestrateur délégant. **Contrat de props inchangé** (`events,resources,currentDate,locale,showNowIndicator`), **data-testid préservés** (`timeline-calendar/resource-row/resource-title/event`). Point d'injection `renderContent` sur EventBar (défaut = EventContent réel → runtime dashboard identique).
- `calendar.css` / sélecteurs `.fc-*` : déjà absents du projet → AC N/A (aucun fichier à supprimer).

### BR impactées
- **BR-EVE-001** (events appartiennent au user connecté) : touchée indirectement — extraction purement présentationnelle, aucun changement de flux/filtrage.

### Review batch
- **[CRITIQUE]** Règle 1 ArchUnit : chaînage `andShould` neutralisait l'exception `jakarta.validation` (2 conditions ET, la 2e triviale) + baseline polluée → **RÉSOLU** (d38aef0) : prédicat unique `resideInAnyPackage(spring,jakarta).and(not(resideInAPackage(jakarta.validation)))`, validé par 2 probes (validation tolérée / spring rejeté), baseline nettoyée.
- **[MAJEUR]** baseline opaque : satisfait par CI verte + `allowStoreCreation=false`.
- **[MINEUR]** (non bloquants → follow-up) : tabs sans Home/End (WAI-ARIA APG) ; commentaire `main.ts` mentionnant `@storybook/test`.
- **[OK]** : #47 (props/testids/logique préservés), #46 (a11y/tokens), migration SB.

### Audit tests
- Backend : **242/242** vert (inclut ArchitectureTest 4/4 en mode gelé).
- Frontend vitest : **85/85** vert.
- Storybook build : **vert** (22 stories).
- E2E golden-path : ⚠ **non concluant (échec infra** — backend Java down dans le harness ; **pas une régression de code**). Testids Timeline pré-existants et préservés (vérif statique + reviewer + vitest). À re-vérifier post-merge stack levée.

Détail : `docs/memory/audits/sprint-16-test-coverage.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
