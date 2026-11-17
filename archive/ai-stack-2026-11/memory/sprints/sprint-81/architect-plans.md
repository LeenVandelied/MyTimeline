# Mini-plans architect — Sprint 81

> Généré par `/sprint plan 5 -c "focus mvp"` (2026-09-06).

**Thème :** Durcir le parcours auth/avatar — cohésion 0.56 (la meilleure du lot)
**Effort :** 6 points | **Migrations Flyway :** aucune
**Dépend de :** S79 + S80 — #215 exige un harnais E2E dont le diagnostic est fiable.
**Vagues :** V1 = #500 · V2 = #499 · V3 = #215
> Ordre volontairement séquentiel : #500 instrumente un flaky dont une hypothèse est la
> collision de bucket rate-limit. Si #499 modifie `LIMITS` en parallèle, l'imputation devient
> impossible. #215 est le seul consommateur Playwright.

```yaml
issue_500:
  fichiers_cles:
    - "backend/.../infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java"
  couches_touchees: ["backend"]
  strategie_test: "integration — instrumentation du statut HTTP reçu (429 vs 401) au prochain rouge"
  risque_regression: "Aucune sur le code de prod. Risque de CONCLUSION : déclarer « stabilisé » sur une série verte est exactement le mode d'échec que l'issue interdit."
  ordre_ecriture: "instrumenter la capture du statut → laisser tourner → conclure OU documenter l'absence de preuve"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    La classe existe toujours
    (.../infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java).
    NON VÉRIFIÉ : la suite backend n'a pas été jouée au premier boot Testcontainers, donc
    le rouge intermittent n'est ni confirmé ni infirmé.
    LIVRABLE RÉALISTE = LE MÉCANISME DE CAPTURE, pas la correction. Le briefing doit le dire
    explicitement, sinon un agent livrera « suite verte, refermé » — ce qui ne prouve rien
    sur un flaky.

issue_499:
  fichiers_cles:
    - "backend/.../infrastructure/security/RateLimitingFilter.java:103-138  (Map.ofEntries LIMITS)"
    - "backend/.../infrastructure/config/RateLimitConfig.java  (TimeMeter surchargeable)"
  couches_touchees: ["infrastructure"]
  strategie_test: "integration (429 au dépassement, via TimeMeter — JAMAIS de sleep)"
  risque_regression: "Un quota trop bas casserait le parcours nominal de changement d'avatar (crop → confirm peut produire plusieurs POST si l'utilisateur retente)."
  ordre_ecriture: "LIMITS → test d'intégration → vérifier que le nominal passe"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    CONFIRMÉ, entrée par entrée. LIMITS contient 10 paires (L107-138) : login 10, register 5,
    refresh 20, forgot-password 5, reset-password 5, POST /api/export 5, GET /api/export 5,
    POST /api/me/change-password 5, PATCH /api/me 10, +1.
    `POST /api/me/avatar` N'Y EST PAS. Le défaut est réel et intact.
    La note de l'issue sur Map.of vs Map.ofEntries est exacte : le code porte déjà
    `Map.ofEntries` avec le commentaire expliquant pourquoi (L104-106).
    ⚠ Le matching est sur URI EXACTE normalisée (javadoc L65 et L211) : l'entrée doit être
    écrite « POST /api/me/avatar » à la lettre.

issue_215:
  fichiers_cles:
    - "frontend/e2e/settings-profile.spec.ts:36  (test.fixme toujours en place)"
    - "frontend/next.config.mjs:23,69  (apiProxyTarget, rewrites)"
    - "backend/.../infrastructure/adapters/controllers/UserController.java"
    - "backend/.../application/services/AvatarServiceImpl.java"
  couches_touchees: ["frontend", "infrastructure"]
  strategie_test: "E2E + instrumentation waitForResponse ; trancher explicitement prod-like vs E2E-only"
  risque_regression: "Si la cause est côté proxy Next uniquement, corriger côté backend ouvrirait une faille d'auth sur multipart. TRANCHER AVANT DE CODER."
  ordre_ecriture: "instrumenter (les headers Cookie sont-ils forwardés ?) → trancher prod-like vs E2E-only → corriger → retirer le test.fixme"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    CONFIRMÉ. `test.fixme('upload avatar (crop -> confirm), puis suppression')` est toujours
    à settings-profile.spec.ts:36 — l'un des 2 seuls test.fixme du dossier e2e (l'autre,
    sprint-42-events.spec.ts:16, est un commentaire historique, pas un skip actif).
    Le proxy existe : next.config.mjs:23 lit E2E_API_PROXY_TARGET, L69 déclare les rewrites.
    ⚠ NE PAS PARTIR DU DIAGNOSTIC « CORS ». La mémoire projet documente 3 sprints de
    diagnostics faux sur ce motif (S47, S56, S57), et #428 (S79) aura déjà déplacé le terrain.
    ORACLE IMPOSÉ (playwright.config.ts) : curl .../api/auth/me → 401 = proxy OK,
    404 = proxy absent. Lire cet oracle AVANT toute hypothèse.
```
