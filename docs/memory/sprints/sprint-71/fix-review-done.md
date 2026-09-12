# Sprint 71 — cycle de correction post-review

commits: `bf44643` (P1+P3), `cfccfff` (P4), `0ff67ae` (P2), `f025598` (P5). Pas de push.

## Points traites

**POINT 1 — CORRIGE** `TimelineEditHost.tsx:226,259`
- `shadow-md` -> `border-b border-rule` ; filet interne ajoute entre titre et apercu.
- Padding migre du bloc sticky vers ses 2 enfants : sinon les filets restaient DANS le
  padding (encadres de 20px de vide) au lieu d'etre pleine largeur comme en creation.
- Cotes lues dans `timeline.css:303` (`.mt-drawer__header` `--space-5 --space-5 --space-4`)
  et `:342` (`.mt-drawer__preview` `--space-4 --space-5`), pas inventees.
- `empty:hidden` conserve => hote vide (<640px) = 1 seul filet, pendant exact de
  `.mt-drawer__preview:empty`.
- NON VERIFIE : rendu navigateur clair/sombre, hauteur <700px, E2E non rejoues.

**POINT 2 — PARTIEL** `AuthControllerLegacyPasswordLoginTest.java:157`
- **ECHEC DE REPRODUCTION.** 3 conteneurs neufs (classe isolee 3/3 ; suite complete
  514/514 ; trio `UserControllerTest,RegisterLoginIntegrationTest,Legacy` 23/2/3) — tous
  VERTS. Je n'ai jamais vu l'echec initial. « Ca passe » n'est PAS une deflakisation.
- Cause supposee par le briefing (seed hors transaction) : DEJA corrigee — le seed est
  deja `TransactionTemplate` + `em.persist`. Rien a y faire.
- Hypothese collision rate-limit change-password (6 appels / bucket 5-min) : **REFUTEE**
  par mesure — `UserControllerTest` est standalone Mockito, ne traverse pas
  `RateLimitingFilter`, consomme 0 jeton. Demande reelle = 2/5.
- Applique quand meme : le seul couplage REEL mesure — l'appel change-password etait le
  seul des 3 a ne pas poser `setRemoteAddr`, donc sur le bucket 127.0.0.1 partage avec
  `RegisterLoginIntegrationTest`. Convention de la classe (10.83.x.y) appliquee.
- Aucune logique de production touchee. Login legacy 6 car. inchange.

**POINT 3 — CORRIGE** `EventEditForm.tsx:349-356` — « edition inchangee » remplace par
« repli en flux sous 640px seulement ».

**POINT 4 — CORRIGE** `settings.ts:5-24` — docblock reference `@StrongPassword` +
`PASSWORD_POLICY` comme source unique ; contrainte login (`@NotBlank` + `@Size(max=100)`)
verifiee a HEAD dans `AuthRequest.java`.

**POINT 5 — CORRIGE** `.ai-env/context-packs/coverage-auth.md`
- Cause racine trouvee : le pack se comptait au `grep -c '@Test'`, faux pour
  `@ParameterizedTest` (`PasswordPolicyTest` = 4 declares / 29 executes). Compteurs repris
  de surefire ; methode consignee en tete de pack.
- 7 ecarts corriges, pas 3 : AuthControllerSecurityTest 11->16, Dev/ProdProfileCookie
  2->1 chacun, ResetPasswordTokenRateLimit 5->4, RateLimitingAndHeaders 14->18,
  RateLimitingDisabled 2->1, UserControllerTest 22->23. Total 155 -> **172**.
- `JwtServiceSecretValidationTest` (3) = **classe fantome**, inexistante a HEAD (renommee
  `JwtServiceRs256Test`, 14 tests). Compteur invérifiable depuis N sprints.
- Section frontend (99) NON recomptee (hors perimetre) — marquee comme telle.

## Tests (chiffres reels, executes)

- backend **514/514** (2 runs complets, BUILD SUCCESS) — aucune baisse.
- frontend **1132/1132**, 104 fichiers — aucune baisse.
- `tsc --noEmit` 0 · eslint 0 · prettier exit 0 sur les 3 fichiers touches.
- `gen-pit-packs.sh --check` exit 0 · `check-rules-jit-drift.sh` exit 0.

## NON verifie (a ne pas lire comme couvert)

- Aucun rendu navigateur : POINT 1 non mesure en pixels, ni clair ni sombre.
- E2E Playwright NON rejoues (`sprint-71-edit-preview-pinned.spec.ts` inclus).
- Section frontend du pack coverage-auth non recomptee.
- `EventContent.tsx:146` porte le MEME `bg-surface sticky ... p-5 shadow-md` hors charte.
  Pre-existant, hors perimetre — NON touche.

## [MEMORY:*] signaux

- `[MEMORY:pitfall]` Contexte: compteurs d'un pack coverage. Solution: `grep -c '@Test'`
  MENT des qu'il existe un `@ParameterizedTest` (1 vs N). Prevention: compter depuis
  `target/surefire-reports/*.txt` (`Tests run:`), jamais depuis les annotations.
- `[MEMORY:pitfall]` Contexte: un test d'integration MockMvc qui frappe un endpoint
  rate-limite. Solution: sans `setRemoteAddr`, il retombe sur 127.0.0.1 et PARTAGE le
  bucket avec toutes les autres classes du meme contexte. Prevention: IP dediee sur
  CHAQUE appel rate-limite, pas seulement sur ceux qu'on teste.
- `[MEMORY:pitfall]` Contexte: un flaky rapporte par un audit. Solution: verifier si la
  classe qu'on soupconne traverse vraiment le filtre incrimine — `UserControllerTest`
  (standalone Mockito) semblait consommer 4 jetons, il en consomme 0. Prevention: mesurer
  le mecanisme avant de « corriger » une cause plausible mais fausse.
- `[MEMORY:pattern]` Probleme: reproduire la grammaire hairline d'une surface soeur dans
  un bloc a padding unique. Solution: descendre le padding du conteneur vers ses enfants,
  chaque enfant portant son `border-b`. Anti-pattern: `border-b` sur le conteneur padde
  (filet encadre de vide, non pleine largeur).

## Recommandations suite

- `RECOMMAND_UI_DESIGN` — re-mesurer le POINT 1 en navigateur (clair + sombre, >=640px et
  <640px, hauteur <700px) : la correction est structurelle et n'a ete verifiee que par
  lecture de code, exactement la limite que le specialiste avait deja posee.
- `RECOMMAND_FOLLOWUP` — flaky `AuthControllerLegacyPasswordLoginTest` NON elucide :
  garder la classe sous surveillance CI ; si elle rougit, capturer le STATUT recu (429 vs
  401) avant toute hypothese.
- `RECOMMAND_FOLLOWUP` — `EventContent.tsx:146` porte le meme `shadow-md` hors charte que
  celui corrige ici ; et la section frontend du pack coverage-auth reste non recomptee.
- Pas de `RECOMMAND_TEST_RUNNER` car les deux suites ont tourne inline et sont vertes (514 + 1132).
- Pas de `RECOMMAND_DB_EXPERT` car aucune migration ni changement de schema dans ces 5 points.
- Pas de `RECOMMAND_SECURITY` car aucune surface reseau nouvelle et la politique de mot de passe n'a pas bouge (seuls un docblock et une IP de test changent).

STATUS: COMPLETED
