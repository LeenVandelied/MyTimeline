# Audit tests — Sprint 56

> Généré en fin de Phase 6, sur le HEAD final `f1a6827`.
> Aucun `[MISSING]` : la Phase 9 (PR) n'est pas bloquée.

## Couverture par issue

| Issue | Objet | Cross-system flow | Unit front | Rendu (RTL) | E2E parcours | Preuve anti-vacuous |
|---|---|:---:|:---:|:---:|:---:|:---:|
| #392 | Gouttière de piste (events sous en-tête sticky) | NON | ✅ (drift-lock token↔constante) | ⚠ N/A | ✅ | ✅ rouge avant / clic réel sans `force` |
| #393 | `DEFAULT_COLOR` conforme AA | NON | ✅ | ✅ (`EventPill`) | ⚠ N/A | ✅ 2 échecs en remettant l'ancienne valeur |
| #395 | `aria-pressed` plein écran | NON | ✅ | ✅ | ✅ | ✅ variante naïve → 1 échec ciblé |
| #391 | Suppression `timeline-loading` | NON | ✅ (test caduc retiré) | ⚠ N/A | ✅ | ✅ gate retirée → rouge sur l'assertion de stabilité |

**Aucun flux cross-system** dans ce sprint : 4 issues 100 % frontend, aucun changement backend,
aucune migration Flyway, aucun changement d'authentification. Aucun E2E métier supplémentaire
n'est donc exigé.

**BR impactée :** seule **BR-EVE-009** (modèle couleur unique, encre calculée par contraste
WCAG) est touchée, par #393. Le contrat reste inchangé — seule la valeur par défaut change,
et elle est désormais **conforme AA** (5,407:1) alors qu'elle ne l'était pas (4,467).
Couverture : `lib-a11y.test.ts`, `EventPill.test.tsx`, `types/event.test.ts`, `color.test.ts`.

## Qualité des tests ajoutés — 4 pièges « test vert qui ne prouve rien » désamorcés

Ce sprint a produit autant de contre-preuves que de tests. Consigné parce que c'est le motif
récurrent du projet :

1. **#392** — jsdom ne fait pas de hit-testing : la preuve devait être un clic Playwright réel
   **sans `force`**, l'oracle étant mesuré (« pastille à 150 px sous 168 px recouverts »), pas
   un timeout muet.
2. **#393** — un garde-fou écrit avec un littéral recopié reste vert si la constante dérive :
   assertion portée sur la **constante importée**, sensibilité vérifiée.
3. **#395** — le stub E2E mutait l'état **sans émettre `fullscreenchange`**, ce qui faisait
   rougir l'implémentation correcte et passer la fausse. Mesuré : la variante naïve
   (`useState` dans le handler) ne casse **qu'un seul** test, celui qui contourne le bouton.
4. **#391** — un E2E d'état **transitoire** reste vert sans sa gate (il constate un écran déjà
   chargé). Il a fallu asserter la **stabilité** (visible → pause bornée → toujours visible).
   Mesuré : sans cette assertion, le test restait vert gate retirée.

## Résultats des runs (HEAD `f1a6827`)

| Suite | Résultat |
|---|---|
| Backend | **452 / 0 échec** |
| Frontend unit | **839 / 0 échec** (92 fichiers) |
| E2E complet | 126 passed / 4 failed / 8 skipped |
| `tsc --noEmit` | 0 erreur |
| Coverage-E2E (heuristique testids) | **OK** — aucun testid ajouté sans spec |

### Les 4 échecs E2E — tous environnementaux, aucun causé par ce sprint

**3 échecs connus** — `forgot-password.spec.ts:41`, `reset-password-failures.spec.ts:123` et
`:143` : HTTP 401 sur l'endpoint test-only de reset, le backend local tournant **sans le profil
`e2e`**. Déjà rouges à la base du sprint. Aucun de ces fichiers ne référence `timeline`
(vérifié par grep).

**1 échec initialement étiqueté « régression inattendue » par le test-runner —
diagnostic infirmé :** `golden-path.spec.ts` (inscription → login).

- *Preuve documentaire* : `application.properties:93-97` — le rate limiting est **actif par
  défaut, clé par IP**, et le commentaire précise que **le seul contexte qui pose
  `RATE_LIMIT_ENABLED=false` est le job CI e2e**, justement parce que le setup Playwright
  provisionne plusieurs comptes depuis une IP unique et déclencherait sinon le throttle.
- *Preuve empirique* : relancé **en isolation** sur le même HEAD → **golden-path PASSE**
  (1 PASS). Dans ce même run isolé, les 4 étapes de provisioning d'`auth.setup.ts` partent en
  timeout à 180 s — le throttle par IP est donc bien actif et mordant en local.
- *Preuve par le diff* : les 4 commits ne touchent ni l'inscription, ni le login, ni le
  routage, ni l'auth. Périmètre 100 % timeline/events.

**Cause du faux positif :** le briefing du test-runner listait les 3 échecs connus mais **pas**
le throttle par IP. Manque du lead, pas erreur du test-runner.

**Arbitre final : la CI**, qui pose `RATE_LIMIT_ENABLED=false` sur son job e2e éphémère.

## Conclusion

**Prêt pour PR.** Suites unitaires vertes des deux côtés, E2E timeline 47/47, couverture-E2E OK,
aucun `[MISSING]`. Les 4 échecs E2E locaux sont tous imputables à la configuration du poste
(profil `e2e` absent + rate limiting par IP), pas au code du sprint. La CI tranchera.

## Review batch (Phase 7)

6 `[OK]`, 1 `[MINEUR]`, **aucun bloquant**. Le reviewer a vérifié dans le code la cohérence des
deux repères d'abscisse introduits par #392 (`windowEvents`, `ensureVisible`, synchro minimap,
`scrollToToday`), l'absence de fuite CSS vers minimap/mobile/preview, le cleanup et la synchro
initiale de l'écoute `fullscreenchange`, la source unique de `DEFAULT_COLOR`, et la conservation
de `!user` / `timeline-data-loading`.

`[MINEUR]` non corrigé volontairement : `timeline.css` porte un `var(--lane-header-w, 160px)`
désynchronisé du token réel (168 px). **Vérifié pré-existant sur `origin/dev`** — hors périmètre
du sprint, versé au triage des follow-ups de `/sprint end`.
