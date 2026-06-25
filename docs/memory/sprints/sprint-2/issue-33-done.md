# Issue #33 — done

commits: 435b583

## resume
objectif: rate limiting per-IP sur POST auth sensibles + security headers HTTP standard. Anti brute-force/credential-stuffing.
BR: famille BR-AUT-002 (durcissement auth). Aucune BR existante modifiee.

fichiers cles:
- pom.xml: dep `com.bucket4j:bucket4j-core:8.10.1` (in-memory, sans Redis). Resolue + build OK.
- RateLimitingFilter.java (NEW, infrastructure/security): OncePerRequestFilter. ConcurrentHashMap<String,Bucket>, cle = IP|requestURI. Seuils/min/IP: login=10, register=5, refresh=20, reset-password=5 (slot futur, pas d'endpoint). Bandwidth.classic + Refill.intervally (quota plein restaure 1x/min). Throttle UNIQUEMENT POST sur ces chemins; tout le reste passe (me, logout, refresh GET...). Depassement -> 429 `{"error":"too_many_requests"}` JSON, zero stack. IP via X-Forwarded-For (1er hop) sinon remoteAddr.
- RateLimitConfig.java (NEW): bean TimeMeter `rateLimitTimeMeter` = SYSTEM_NANOTIME. EXTRAIT de SecurityConfig pour casser un cycle de construction (voir pitfall).
- SecurityConfig.java (AJOUTS only): `.headers(...)` = X-Frame-Options DENY, X-Content-Type-Options nosniff, HSTS 1an+subdomains+requestMatcher(any), Referrer-Policy strict-origin-when-cross-origin, CSP `default-src 'self'` (PERMISSIVE, a durcir). `.addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter)` avant jwtFilter. #51 (exceptionHandling/writeJsonError/sessionManagement/authorizeHttpRequests/CORS/CSRF) PRESERVE intact.
- RateLimitingAndHeadersIntegrationTest.java (NEW): @SpringBootTest full chain + TimeMeter controllable via @TestConfiguration (allow-bean-definition-overriding). 5 cas.

pitfalls:
- Bucket4j 8.10.1 package = `io.github.bucket4j` (Bandwidth/Bucket/Refill/TimeMeter), PAS `com.github.vladimir...`. API: Bucket.builder().addLimit(Bandwidth.classic(n, Refill.intervally(n, dur))).withCustomTimePrecision(timeMeter).build().
- CYCLE construction: TimeMeter @Bean DANS SecurityConfig -> SecurityConfig depend de RateLimitingFilter depend de TimeMeter (produit par SecurityConfig en cours de creation) -> UnsatisfiedDependency. Fix: extraire TimeMeter dans RateLimitConfig dedie.
- MockMvc: request.getServletPath() retourne "" -> matching path casse. Utiliser getRequestURI() (rempli en test ET prod, context path vide ici).
- HSTS: writer Spring n'emet QUE sur requete deja secure. Derriere reverse proxy (TLS terminé) la requete app est HTTP -> ajouter `.requestMatcher(request -> true)` pour emettre quand meme.
- Test reset fenetre sans Thread.sleep(60s): TimeMeter injectable + advance(Duration) deterministe.
- LIMITE MONO-INSTANCE: buckets en memoire par JVM. Derriere LB a N replicas, plafond effectif = N x seuil. OK deploiement single-instance actuel; passer Redis+bucket4j-redis au scale-out. Pas d'eviction (1 entree/(IP,path)) — borne car set de chemins fini.

tests: 28/28 verts (5 nouveaux, 0 regression incl. #51 AuthErrorContract). BUILD SUCCESS ~12s. Volume < 500, temps < 3min.

## [MEMORY:*]
[MEMORY:pitfall] Context: @Bean injecte par un filtre lui-meme injecte dans la @Configuration qui declare le @Bean -> cycle construction Spring (UnsatisfiedDependency "currently in creation"). Solution: extraire le @Bean dans une @Configuration dediee. Prevention: ne pas declarer dans SecurityConfig un bean dont un filtre register-par-SecurityConfig depend.
[MEMORY:pitfall] Context: matcher un chemin dans un Filter teste via MockMvc. Solution: getRequestURI() (getServletPath() vide en MockHttpServletRequest). Prevention.
[MEMORY:pattern] Probleme: tester un rate-limit a fenetre temporelle sans sleep. Solution: Bucket4j .withCustomTimePrecision(TimeMeter) + bean TimeMeter override en test (advance(Duration)). Anti-pattern: Thread.sleep(60s).
[MEMORY:decision] Context: rate limiting auth. Decision: Bucket4j in-memory mono-instance (pas Redis). Why: deploiement single-instance, zero infra ajoutee; documente comme dette pour scale-out.

## recommandations suite
- RECOMMAND_FOLLOWUP: durcir CSP (`default-src 'self'` permissif -> politique stricte par directive script/style/connect) une fois le front Next.js stabilise.
- RECOMMAND_FOLLOWUP: rate-limit par compte/username (pas seulement IP) pour contrer le credential-stuffing distribue; + backend distribue (Redis) au passage multi-instance.
- RECOMMAND_FOLLOWUP: implementer endpoint reset-password (slot deja pre-cable, seuil 5/min).
- PAS de RECOMMAND_TEST_RUNNER (28 tests, ~12s, sous seuils).
- PAS de RECOMMAND_DB_EXPERT.

STATUS: COMPLETED
