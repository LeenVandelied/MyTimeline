# Issue #499 — rate-limit sur POST /api/me/avatar

- commits: [12ae288]
- resume: quota **10/min/IP** (`Map.entry("POST /api/me/avatar", 10)` dans `DEFAULT_LIMITS`, 11e entrée).
  Argument : l'upload est coûteux (multipart 5 Mio en heap + magic-bytes + write disque + delete de
  l'ancien) MAIS légitimement répétable (recadrage raté, mauvaise image, NAT partagé) — le palier
  « coûteux » 5/min (forgot/reset/change-password) modélise un abus dont aucune répétition n'est
  honnête, ce qui n'est pas le cas ici ; 10 borne l'écriture à 50 Mio/min/IP sur un stockage
  auto-remplaçant. Fichiers : `RateLimitingFilter.java` (main, +DEFAULT_LIMITS +javadoc classe),
  `RateLimitingAndHeadersIntegrationTest.java` (tests ajoutés dans la classe EXISTANTE — cohérent
  avec les slots #58/#265/#134 déjà couverts là ; aucune nouvelle classe). 4 tests :
  `uploadAvatar_underThreshold_neverReturns429` (nominal, 10 passent),
  `uploadAvatar_eleventhWithinWindow_returns429` (429 + `{"error":"too_many_requests"}`),
  `uploadAvatar_afterWindowAdvance_isAllowedAgain` (`clock.advance(61s)`, zéro `Thread.sleep`),
  `uploadAvatarAndPatchMe_haveIndependentBuckets`. Aucun en-tête de rate-limit asserté (mesure
  vague 1 : il n'y en a aucun). Runs : classe seule 22/22 OK ; suite backend complète
  **581 tests, 0 failure, BUILD SUCCESS** (577 avant + 4).
- controle negatif joue: slot renommé `avatar-DISABLED` -> les 2 tests de dépassement passent au
  ROUGE (`expected: <429> but was: <401>`), fichier restauré. Les tests mordent réellement.
- javadoc: CONFIRME. Le paragraphe « `POST /api/me/avatar` … is NOT covered here — … left as a
  tracked follow-up » (ex-L79-82) est SUPPRIMÉ et remplacé par un paragraphe « Avatar upload (#499) »
  qui dit qu'il EST throttlé, pourquoi 10 et non 5, et que le 429 tombe avant le parsing du part.
  La liste des routes `/me` délibérément hors périmètre (GET /api/me, GET /api/me/avatar,
  DELETE /api/me, DELETE /api/me/avatar) est INCHANGÉE — elle reste vraie. Commentaire `ofEntries`
  (plafond 10 paires de `Map.of`) mis à jour : 11e slot ajouté sans refactor.
- [MEMORY:*] signaux:
  - `[MEMORY:pattern]` Problème : un ajout de slot dans `RateLimitingFilter` peut faux-verdir (le
    filtre court-circuite avant l'authz, tout est déjà non-429). Solution : contrôle négatif — renommer
    la clé du slot, rejouer, exiger le rouge `429 -> 401`, restaurer. Anti-pattern : conclure sur le
    seul vert.
  - `[MEMORY:decision]` Contexte : quota d'un endpoint coûteux MAIS honnêtement répétable.
    Décision : 10/min/IP (palier édition-profil), pas 5 (palier abus). Pourquoi : le palier 5 suppose
    qu'aucune répétition n'est légitime — faux pour un upload d'avatar (retentes de recadrage, NAT).
  - `[MEMORY:pitfall]` Contexte : l'énoncé #499 et le plan architect parlent d'une constante `LIMITS`,
    disparue au S79 (#475) au profit de `DEFAULT_LIMITS` + champ `limits`. Prévention : le briefing du
    lead l'avait corrigé — sans cette correction, grep infructueux garanti.
- recommandations suite: **RECOMMAND_FOLLOWUP** — `writeTooManyRequests` n'émet ni `Retry-After` ni
  `X-RateLimit-*` sur AUCUN slot (mesure vague 1, hors périmètre #499) : un client ne peut pas savoir
  quand retenter. Sujet transverse au filtre, à porter en issue dédiée.
  Pas de RECOMMAND_SECURITY (aucune faille nouvelle) ni RECOMMAND_TEST_RUNNER (suite jouée en local,
  ~45 s). **Info pour #215 (vague 3, E2E avatar)** : le job CI `e2e` tourne avec
  `app.rate-limit.enabled=false` — le slot n'y est PAS armé, aucune campagne Playwright ne peut le
  heurter en l'état ; si le filtre est un jour ré-armé en e2e, 10 POST/min/IP est le budget.
- ABSORBED: aucune. (`.ai-env/context-packs/br-auth.md` ne liste que le slot forgot dans BR-AUT-012 ;
  pack généré, régénération = affaire du `/sprint end`, pas éditée à la main ici.)
- fichiers de contexte lus: briefing inline (br-auth.md, cp-backend.md), `RateLimitingFilter.java`,
  `RateLimitConfig.java`, `RateLimitingAndHeadersIntegrationTest.java`, `UserController.java`,
  `AvatarServiceImpl.java`.
- NON verifie / limites: aucun test ne prouve le parcours NOMINAL 200 (upload réel authentifié) sous
  quota — les requêtes sous la limite repartent en 401, comme tous les slots existants de cette classe ;
  la non-régression du 200 repose sur les tests d'avatar existants + le fait que la seule ligne de prod
  ajoutée est une entrée de map. La valeur 10 n'est pas mesurée sur un usage réel (aucun télémétrie).

STATUS: COMPLETED
