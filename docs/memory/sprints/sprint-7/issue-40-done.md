# Issue #40 — DONE

RETOUR :
- commits: [24807b1]
- resume:
  - Objectif: AuthContext React unique + montage Toaster + redirections 401/403 locale-aware. Reprise d'un run interrompu (implem livrée non commitée, tests RTL manquants). Audit conforme, finalisé + testé.
  - BR-AUTH-003: role ROLE_USER visible dans le contexte après login (user.role exposé via AuthContextType, peuplé par getUserProfile/me).
  - Fichiers clés: AuthContext.tsx (NOUVEAU, AuthProvider+useAuth, source unique état), layout.tsx (wrap Theme>Auth>children + <Toaster position=top-right> root), apiClient.ts (loginUrlForCurrentLocale → /[locale]/login, toast 401/403/400/500), useAuth.ts (re-export depuis context), types/auth.ts (RegisterSchema name≠username + AuthContextType).
  - 4 consumers migrés (tous via @/hooks/useAuth → context unique, ZÉRO localStorage résiduel): app/[locale]/dashboard/page.tsx, app/[locale]/login/page.tsx, src/components/products/AddProducts.tsx, src/components/EventContent.tsx. NB: AddProducts/EventContent sont sous src/components (pas components/ racine comme indiqué au brief).
  - register: signature register(name, username, email, password) OK; authService.registerUser envoie payload {name, username, email, password} aligné RegisterRequest backend (authService.ts déjà correct, non modifié).
  - Pitfalls: SSR hydration → useState(null)+useEffect pour réhydratation localStorage côté client uniquement (conforme). Wrap order respecté.
  - Tests: 3 fichiers RTL écrits (AuthContext.test.tsx, apiClient.test.ts, authService.test.ts). Suite frontend 8/8 verte (dont smoke #29). Zéro stderr (MEMO-007). typecheck tsc --noEmit OK (zéro any).
- [MEMORY:*] signaux:
  - [MEMORY:pitfall] Context: jsdom n'exécute PAS window.location.href= (no-op silencieux, pas d'erreur). Solution: stub window.location via Object.defineProperty(configurable) + setter href capturant la cible, restaurer le descriptor original en finally. Prevention: ne jamais asserter window.location.pathname après un href= en jsdom.
  - [MEMORY:pattern] Problem: tester un intercepteur axios sans vrai réseau. Solution: vi.mock('axios') exposant create() → instance dont interceptors.response.use capture le rejectionHandler dans une var module-scope ; l'appeler directement avec un faux error {response:{status}}. Anti-pattern: monter un vrai apiClient et déclencher de vraies requêtes HTTP.
- recommandations suite: PAS de RECOMMAND_TEST_RUNNER (suite frontend légère, 8 tests, 1s). PAS de RECOMMAND_DB_EXPERT (aucun backend touché). E2E Playwright login = reporté S8 (hors scope, non créé).
- contraintes layout.tsx laissées pour #48: <AuthProvider> est à l'intérieur de <ThemeProvider> et englobe directement {children}. Marqueur commentaire `{/* <QueryClientProvider> (#48) viendra ici */}` placé ENTRE <AuthProvider> et {children}. #48 doit envelopper {children} d'un <QueryClientProvider> à cet emplacement exact, sans déplacer Theme ni Auth. <Toaster position="top-right"/> est monté au niveau <body>, SOUS <ThemeProvider> (frère, pas enfant des providers) → reste visible quel que soit le wrap Query ultérieur, ne pas le déplacer.

STATUS: COMPLETED
