# Audit tests — Sprint 84

> Généré en fin de Phase 6 par le lead. Tous les chiffres ci-dessous ont été **mesurés par le lead
> depuis le worktree** (`sprint/84`), pas repris de rapports d'agents.

## Couverture par issue / règle

Aucune BR backend touchée (sprint 100 % frontend + dépendances ; `git diff origin/dev..HEAD -- backend` vide).
Décisions couvertes : DEC-S84-001 (non-réécriture des couleurs hors palette), DEC-S84-002 (casse de nav), DEC-S84-003 (orchidée).

| Sujet | Cross-system flow | Unit frontend | E2E parcours | E2E métier |
|---|:---:|:---:|:---:|:---:|
| #651 MAJ next 15.5.25 / sharp 0.35.4 | NON | ✅ suite complète | ✅ suite complète | N/A |
| #577 palette unique (12 pastilles + Personnalisé, 3 formulaires) | NON | ✅ `event-palette.test.ts`, `palette-color-picker.test.tsx`, `CategoryDrawer`/`EventEditForm`/`ProductDrawer` tests | ✅ `sprint-84-palette.spec.ts`, `categories.spec.ts` | ✅ DEC-S84-001 : couleur hors palette intacte en base après renommage (`sprint-84-palette.spec.ts`) |
| #577 AA sur les 12 (orchidée `#AE55A6`) | NON | ✅ `color.test.ts`, `CategoryDrawer.test.tsx` (aucun avertissement sur les 12) | ✅ `sprint-73-model-vs-rendered.spec.ts` (couleur peinte) | N/A |
| #575 titres de section + nav mono capitales | NON | ✅ `section-titles.test.tsx`, `nav-label-class.test.ts` (contrôles négatifs), AppShell/SettingsShell/ProductDetailView | ✅ `sprint-84-section-titles.spec.ts` (clair/sombre, 4 locales, 768/1024/1280, mobile de) | N/A |
| #575 salut + CTA à 375 px (absorbé) | NON | N/A (jsdom ne mesure pas la mise en page) | ✅ `sprint-84-section-titles.spec.ts` « jeton insécable » — armement vérifié (389,7 px sans correctif) | N/A |
| #634 suppression EventBar / Lane / EventContent | NON | ✅ couverture 409 (#77/#231) et prefill `archived` (#188) reportée sur `useEventEditConflict.test.tsx` (+6) et `TimelineEditHost.test.tsx` (+2) | ✅ suite complète (aucun testid supprimé consommé) | N/A |

Aucune ligne « cross-system flow = OUI » : pas d'E2E métier obligatoire manquant.

## Tests créés
- `frontend/src/lib/event-palette.test.ts` (synchro `colors.css` ↔ constante ↔ handoff, exception nommée orchidée ; fil-piège anti-duplication des hex)
- `frontend/src/components/ui/palette-color-picker.test.tsx`
- `frontend/src/components/dashboard/section-titles.test.tsx`
- `frontend/src/styles/__tests__/nav-label-class.test.ts`
- `frontend/e2e/sprint-84-palette.spec.ts`
- `frontend/e2e/sprint-84-section-titles.spec.ts` (+ garde « jeton insécable »)
- Tests ajoutés à `useEventEditConflict.test.tsx`, `TimelineEditHost.test.tsx`, `CategoryDrawer.test.tsx`, `EventEditForm.test.tsx`, `ProductDrawer.test.tsx`, `AppShell.test.tsx`, `SettingsShell.test.tsx`, `ProductDetailView.test.tsx`
- Supprimés avec le code mort : `EventContent.test.tsx`, stories `EventBar`/`Lane`

## Résultats runs (lead, HEAD `79e76d7`)
- Backend : non rejoué localement — aucun fichier backend modifié ; job CI `backend` sur la PR.
- Frontend : `./scripts/test-quiet.sh frontend` → build OK, **1456/1456** tests (124 fichiers), typecheck OK, lint OK ; `npm run format:check` OK.
- `npm audit --omit=dev --audit-level=high` : 0 vulnérabilité (avant #651 : 1 critical + 1 high).
- E2E (pile locale dédiée : backend `:8086`, `next dev` webpack `:3100`, `--ignore-snapshots`, darwin) sur `6edb430` : **345 passed / 1 failed / 8 skipped** (354). Le seul rouge est l'armement de `sprint-77-theme-visual` (contrôle négatif de capture, qui échoue par construction sous `--ignore-snapshots` — les références `-chromium-linux` sont jugées par la CI). Garde « jeton insécable » ajoutée ensuite (`79e76d7`) : spec rejouée seule, verte, et armement vérifié.
- Run précédent (sur `8ea6304`) : 344/2/8 — le 2e rouge était la nouvelle spec de #575, qui a révélé le débordement préexistant du salut à 375 px (corrigé `ededd26`).

## Vérification navigateur (lead)
- Dashboard `/de` clair + sombre : titres de section display 600 sentence case, eyebrow `.mt-eyebrow` sur le ruban, nav en mono capitales 13 px, espacement détendu `0.26px` (.02em) en allemand.
- Contraste des libellés de nav (couleur déclarée vs premier fond opaque, méthode `getComputedStyle` — ne prouve pas la couleur peinte, cf. PIT-S58-001) : actif 17,76 / 16,70, repos 6,11 / 5,85 (clair / sombre).
- Tiroir catégorie clair + sombre : 12 pastilles 28×28, navigation flèche → focus + sélection, aucun avertissement de contraste sur orchidée.

## Conclusion
Prêt pour PR. Non couvert en E2E : les pastilles du tiroir **produit** (couvertes en unitaire seulement). Non vérifié : capture pixel des écrans (réservé à la CI Linux).
