# Audit tests — Sprint 39 « Lisibilité Landing »

> Généré en fin de Phase 6. Aucun marqueur manquant → Phase 9 (PR) débloquée.

## Couverture par BR-XX

Sprint sans règle métier : #56 = page marketing (hors domaine), #146 = vérification visuelle d'écrans déjà migrés. Aucun cross-system flow, aucune BR impactée → aucun E2E métier requis.

| Portée | Cross-system flow | Unit / RTL frontend | E2E parcours | E2E métier |
|--------|:---:|:---:|:---:|:---:|
| #56 HeroSection (extraction + contraste) | NON | ✅ RTL 4/4 (rendu clair/sombre, absence hex, bordure token) | ⚠ N/A (pas de nouveau data-testid ni parcours) | ⚠ N/A (pas de BR) |
| #146 Écrans auth (garde-fous tokens) | NON | ✅ RTL +4 garde-fous (tokens theme-aware, absence text-ink-faint) | ✅ parcours auth déjà couverts (golden-path) | ⚠ N/A (pas de BR) |

Cross-system flow = NON sur les deux → E2E métier non obligatoire.

## Tests créés
- `frontend/src/components/landing/HeroSection.test.tsx` (4 tests — rendu, i18n, absence hex, bordure token)
- `frontend/app/[locale]/login/page.test.tsx` (+1 garde-fou tokens clair/sombre)
- `frontend/app/[locale]/register/page.test.tsx` (+1 garde-fou)
- `frontend/app/[locale]/forgot-password/page.test.tsx` (+1 garde-fou)
- `frontend/app/[locale]/reset-password/page.test.tsx` (+1 garde-fou)

## Résultats runs
- Frontend unit (Vitest) : **429/429 passed, 0 failed, 0 erreur TS** (test-runner, 17.2s). +8 vs S38 (421).
- Backend : non touché ce sprint (0 fichier `.java`/`.sql`).
- E2E Playwright : non lancés en local (`E2E_DB_PASSWORD` absent — cf. historique projet) ; verts en CI attendus. Aucun nouveau `data-testid` → coverage-e2e OK.

## Contrôle contraste (WCAG AA)
- Ratios recalculés indépendamment par ui-design ET reviewer, corroborent le dev : bordure bouton secondaire hero 1.21→~6.0 clair / 1.24→~6.26 sombre (seuil UI 3:1) ; CTA accent-ink/accent 4.71 clair (AA texte) ; écrans auth tous ≥4.5:1.

## Résiduel non couvert par tests automatisés (honnête)
- **Contrôle visuel manuel navigateur clair/sombre** (hero + 4 écrans auth) : critère d'acceptation #146 « vérifié visuellement en navigateur » non cochable par un subagent/RTL (jsdom ne calcule pas les couleurs). À faire par le dev/lead. Piste de couverture durable : E2E Playwright screenshot clair/sombre (follow-up optionnel).

## Conclusion
Prêt pour PR. Suite frontend verte, TS strict clean, contraste AA vérifié statiquement (3 sources concordantes), aucune couverture manquante. Seul résiduel : contrôle visuel navigateur manuel (documenté, non bloquant pour un sprint démo-first).
