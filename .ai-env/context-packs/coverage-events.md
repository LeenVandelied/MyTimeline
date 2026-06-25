# Coverage : `events`

> État de couverture du domaine `events` au 2026-06-25.

---

## 1. Matrice de couverture par action

| Action | `user` | `admin` | Notes |
|---|---|---|---|
| Créer un événement | ⚠️ | n/a | Backend implémenté, pas de test |
| Lister ses événements | ⚠️ | n/a | Backend implémenté, pas de test |
| Modifier un événement | ⚠️ | n/a | Backend implémenté, pas de test |
| Supprimer un événement | ⚠️ | n/a | Backend implémenté, pas de test |
| Afficher sur calendrier | ⚠️ | n/a | Frontend FullCalendar intégré, pas d'E2E |

---

## 2. Gaps prioritisés

### P0 — Zéro test backend events
- **Symptôme** : EventServiceImpl non testée
- **BR concernée** : BR-EVT-001, BR-EVT-002, BR-EVT-003
- **Action** : `EventServiceImplTest` + `EventControllerIntegrationTest`

### P1 — Pas d'E2E calendrier
- **Symptôme** : Intégration FullCalendar non couverte
- **Action** : `e2e/events/calendar.spec.ts`

---

## 3. Coverage E2E

| Scénario | Fichier test | Statut |
|---|---|---|
| Créer un événement, voir sur calendrier | `e2e/events/create.spec.ts` | ❌ non créé |
| Modifier un événement depuis le calendrier | `e2e/events/edit.spec.ts` | ❌ non créé |

---

## Référence

- Pack métier stable : `br-events.md`
