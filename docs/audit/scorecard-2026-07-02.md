# MyTimeline — Scorecard qualité — 2026-07-02

> Audit complet (10 axes) sur la version `7ca36da` (post Sprint 11).
> Échelle : 🟢 Solide · 🟡 Correct · 🟠 Fragile · 🔴 Critique

| Axe | Niveau | En une phrase |
|-----|:------:|---------------|
| Architecture | 🟠 Fragile | Découpage hexagonal en place ; dette concentrée sur le domaine events, aucun garde-fou automatique |
| Sécurité applicative | 🟡 Correct | Défense en profondeur réelle : ownership systématique, cookies durcis, CSP stricte, rate-limiting, anti-énumération |
| Tests | 🟠 Fragile | ~130 tests backend solides (intégration incluse), mais zéro test de bout en bout |
| Règles métier | 🟡 Correct | 43 règles documentées avec traçabilité exemplaire ; 3 écarts actifs sur les événements |
| Internationalisation | 🟢 Solide | 4 langues, parité quasi parfaite, chaîne Crowdin en place |
| Design / accessibilité | 🟡 Correct | Design system tokenisé + audit WCAG interne ; vue Timeline à remettre au niveau |
| Base de données | 🟢 Solide | Migrations disciplinées, contraintes nommées, index complets, verrouillage optimiste |
| Dépendances | 🔴 Critique | CVE critiques connues avec correctifs disponibles non appliqués (backend et frontend) |
| Environnement IA | 🟢 Solide | Mémoire projet vivante, décisions et pièges consolidés chaque sprint |
| CI/CD | 🟡 Correct | CI complète et saine (build, tests, lint, typecheck) ; pas encore de déploiement automatisé |

## Note globale : 🟠 FRAGILE

*(règle de plafond : minimum des axes Architecture et Sécurité — tirée par l'axe
Dépendances via son impact sécurité)*

### Les 3 chantiers qui changent la note

1. **Mise à jour des dépendances** (2 semaines) — le correctif le moins cher de
   l'audit : un `npm update` + un upgrade Spring Boot planifié éliminent la totalité
   des vulnérabilités critiques connues.
2. **Premier parcours de test bout-en-bout** (1 sprint) — l'infrastructure Playwright
   est déjà installée ; il manque le premier scénario.
3. **Assainissement du domaine événements** (1-2 sprints) — corriger les 3 écarts
   front/back documentés et poser le garde-fou d'architecture (ArchUnit).

### Points forts à valoriser

- Sécurité applicative au-dessus du standard pour un projet à ce stade (chaque leçon
  de review est consolidée et réappliquée).
- Base de données irréprochable : chaque incident passé a produit une règle, visiblement suivie.
- Traçabilité règles métier → code → tests rare à ce niveau de maturité.
