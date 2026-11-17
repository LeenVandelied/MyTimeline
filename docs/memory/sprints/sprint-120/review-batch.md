# Review batch — Sprint 120

Reviewer `ai-env:reviewer` sur `origin/dev..504fff6e` (hors lock), lecture seule. **0 CRITIQUE / 1 MAJEUR / 5 MINEURS.**

| Constat | Traitement |
|---|---|
| [MAJEUR] `EventEditForm.tsx:366` ligne > printWidth → `format:check` rouge (job CI `frontend` rouge sur `504fff6e`, confirmé) | Corrigé (`prettier --write`) ; `prettier --list-different .` vide |
| [MINEUR] `ProductSparkline` : `now` figé au montage | Assumé : sparkline sur l'année, dérive d'une session négligeable ; `now` en dépendance du `useMemo` |
| [MINEUR] `useDensity` : lecture localStorage par rendu tant qu'aucun choix ; une 2e instance suit le stockage | Assumé : lecture synchrone triviale ; suivre le stockage est plus cohérent qu'un état isolé |
| [MINEUR] `toaster` : le disable n'est pas un faux positif strict | Justification reformulée (choix assumé, couplé à `target.focus()`) |
| [MINEUR] commentaires « Edge » / `middleware.ts` restants (`proxy.ts`, `useAuthGuard.ts`, `e2e/support/rs256.ts`) | Corrigés |
| [MINEUR] `TimelineView` : nom affiché des `React.memo` (DevTools) | Assumé : sans impact fonctionnel |

Vérifié OK par le reviewer : drawers (premier montage `open=true`, pas de boucle), ajustements « valeur précédente »,
`useExportFlow`, `useHydrated`/`useMediaQuery`/`EphemerisLeaf`, comparateur `propsEqualByContent` de la frise (callbacks
comparés par identité), ordre des effets de la frise, `proxy.ts` (export, matcher, état de module JWKS borné par TTL),
`page-chunk-gate.ts` (marqueurs dans un seul chunk chacun), 2 disables sur 3 vrais faux positifs/légitimes.

Re-review : non relancée — les corrections sont du formatage et des commentaires (aucune logique modifiée).
