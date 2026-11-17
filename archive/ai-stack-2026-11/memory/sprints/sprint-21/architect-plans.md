# Mini-plans architect — Sprint 21

> Genere par /sprint plan (architect). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").
>
> MIGRATION : V12 (users.avatar_url) — SEULE migration de la serie S19-S23, isolee ici.
> RISQUE SECU : #75 upload multipart = surface OWASP → invoquer security-expert AVANT implem
> + decision stockage (local vs objet) = ADR.

issue_0075:
  fichiers_cles:
    - backend/.../domain/user/ (avatar value/champ)
    - backend/.../application/services/ (UserService port)
    - backend/.../infrastructure/rest/AuthController ou MeController (POST /me/avatar)
    - backend/.../infrastructure/ (adapter stockage fichier — local/S3)
    - backend/src/main/resources/db/migration/V12__user_avatar.sql
  couches_touchees: [backend/domain, backend/application, backend/infrastructure, db]
  strategie_test: JUnit service + MockMvc POST multipart + validation type/taille (OWASP upload)
  risque_regression: MOYEN — upload multipart = surface securite (type MIME, taille, path traversal) ; invoquer security-expert
  ordre_ecriture: [V12 migration, domain champ avatar, port UserService, adapter stockage, endpoint REST + validation, tests]
  zod_dto_sync: AvatarResponse DTO -> frontend type User (lie #151 exposer avatar)
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — pas d'endpoint avatar verifie ; V12 libre (derniere migration reelle = V11)"

issue_0086:
  fichiers_cles:
    - frontend/src/components/settings/ (nouveau dossier reglages)
    - frontend/src/app/(...)/reglages/page.tsx
    - 4 chapitres : Profil / Securite / Preferences / Compte
    - frontend/src/lib/auth/ (reuse AuthContext #40)
  couches_touchees: [frontend/components, frontend/app]
  strategie_test: Vitest 4 chapitres + Playwright navigation onglets + revue clair/sombre
  risque_regression: MOYEN — L = surface large ; chapitre Compte peut toucher flux DELETE /me #78 existant et export #59
  ordre_ecriture: [shell 4 chapitres, Profil (avatar #75), Securite (change-password), Preferences (langue/theme), Compte (suppression/export), tests]
  zod_dto_sync: reuse schemas auth existants ; avatar upload schema aligne #75
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — aucun dossier settings/reglages trouve (find: rien hors landing.css)"

issue_0087:
  fichiers_cles:
    - frontend/src/components/settings/SettingsMobile.tsx (drill-down)
    - bottom sheet suppression compte
  couches_touchees: [frontend/components]
  strategie_test: Vitest drill-down + Playwright 375px bottom sheet
  risque_regression: MOYEN — reutilise chapitres #86 ; bottom sheet partage pattern dialogs #65
  ordre_ecriture: [liste drill-down, ecrans detail par chapitre, bottom sheet suppression, tests]
  zod_dto_sync: aucun (reuse #86)
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"
