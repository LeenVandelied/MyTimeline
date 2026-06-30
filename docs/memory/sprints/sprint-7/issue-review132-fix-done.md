# Review PR #132 — fix done (caveman)

[FIX-1 SECU] frontend/src/contexts/AuthContext.tsx - 4x console.error loggaient `error` axios brut -> error.config.data = body -> password clair sur login/register.
  - SOLU: helper safeErrorMessage(error) -> message seul (error.message ou 'unknown error'). Jamais error/config. Control-flow inchangé.
[FIX-2 BACKEND] change-password new != old.
  - NEW: domain/exceptions/SamePasswordException (400, corps plat {"error":"new password must differ"}).
  - UserServiceImpl.changePassword: check `passwordEncoder.matches(newPassword, hash)` APRES le check BCrypt de l'ancien -> throw SamePasswordException.
  - GlobalExceptionHandler: @ExceptionHandler(SamePasswordException) -> 400.
  - TESTS: UserServiceImplTest (NEW, 3 branches: old faux / new==old / succes) + UserControllerTest.changePassword_returns400_whenNewPasswordSameAsOld.
[FIX-3 QUALITE] AuthContext.tsx:10 - import { } -> import type { AuthContextType, User } (isolatedModules). Pas d'autre value-import @/types restant dans fichiers auth.

[NON-TRAITE] reportes follow-up (enumeration 409, rate-limit /api/me, localStorage PII A17, audit log, DRY resolveCaller, propagation erreur login/register). Laisse tel quel.

[TESTS]
  - frontend: npx vitest run -> PASS 12 FAIL 0.
  - backend: ./scripts/test-quiet.sh unit -> Tests run 68, Failures 0, Errors 0. BUILD SUCCESS.
  - tsc --noEmit -> No errors.

[COMMITS] (branche sprint/7, pushed)
  - 235f3f3 backend (SamePasswordException + tests)
  - 0aae019 frontend (log assaini + import type)
  - .eslintcache NON commite (untracked, exclu).

STATUS: COMPLETED
