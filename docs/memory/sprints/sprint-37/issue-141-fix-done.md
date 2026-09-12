# #141 — corrections post-review (hardening rate-limit)

COMMIT: f7210e1b64749e2755b21bf875ec71f8beabee3c

## FIX 1 — RateLimitingFilter (MAJEUR sécurité)
Endpoint POST /api/auth/reset-password PUBLIC. 3 failles corrigées.

- [body borne] L236 `StreamUtils.copyToByteArray` non borné -> OOM.
  Fix: gate `getContentLengthLong() > 8 KiB` -> skip throttle-token, passthrough (0 buffer).
  Sinon `readBounded(in, 8192)` : alloue max+1 octets, retourne null si dépassement
  (Content-Length absent/menteur, ex chunked) -> 400 générique (stream déjà consommé).
- [clé plausible] token brut = clé map -> clé Mo neutralise cap volume.
  Fix: `isPlausibleTokenKey` = length <= 128 (UUID=36). Sinon skip throttle-token (repli IP).
- [éviction LRU] tokenBuckets plein (100k) -> tout token neuf (victime) contournait.
  Fix: `Collections.synchronizedMap(LinkedHashMap accessOrder=true)` +
  `removeEldestEntry(size>100k)`. Évince le moins récemment accédé au lieu de refuser.
  computeIfAbsent atomique + eviction sous même lock -> cap tenu en concurrence.
  tryConsume off-lock (bucket thread-safe).

429 générique anti-énumération conservé. writeBadRequest ajouté (400 générique).

## FIX 2 — PasswordResetServiceImpl (MAJEUR doc)
try/catch optimistic-lock n'entoure que le save. Correct SEULEMENT car impl JPA =
saveAndFlush (flush synchrone dans le try). Commentaire ⚠ ROBUSTESSE ajouté : saveAndFlush
= seul flush garanti avant fin méthode ; sinon conflit surgit au commit HORS catch -> 500.
Chemin déjà couvert par PasswordResetTokenConcurrencyIntegrationTest (#143). Pas de test neuf.

## FIX 3 — frontend/e2e/support/db.ts (MINEUR)
Fallback littéral `eventpass_ci` retiré. `E2E_DB_PASSWORD` requis, throw explicite si absent.
CI OK : ci.yml L225 définit `E2E_DB_PASSWORD: eventpass_ci`.

## VERIF
- backend compile: OK (mvnw -o compile)
- frontend tsc: OK (0 erreurs)
- backend unit: 390/390 PASSED (0 fail, 0 err)
  - ResetPasswordTokenRateLimitIntegrationTest #141: 4/4
  - PasswordResetTokenConcurrencyIntegrationTest #143: 1/1

## MEMORY
[MEMORY:pitfall] Context: RateLimitingFilter lit body avant controller sur endpoint public.
Solution: gate Content-Length + readBounded(max+1) borné, jamais copyToByteArray non borné.
Prevention: toute clé de map dérivée d'input client = borner longueur ; map non bornée sur
input attaquant = LRU évincée, jamais refus-d'ajout (laisse passer les victimes récentes).

STATUS: COMPLETED
