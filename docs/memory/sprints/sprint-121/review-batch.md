# Review batch — Sprint 121

> Reviewer unique (`reviewer`) sur `origin/dev..HEAD` (commits `d5663546`, `5e8bd9b2`, `6faaa4ef`).
> Bilan : 0 CRITIQUE / 1 MAJEUR / 5 MINEURS.

## MAJEUR — corrigé (`802f8e35`)
- `useFocusTrap.ts` + `DeleteAccountSteps.tsx` : après « Continuer » (et « Retour »), l'élément focusé est démonté → focus sur `body` ; le handler Tab ne traitait que premier/dernier, donc Tab partait sur le document DERRIÈRE le panneau (WCAG 2.4.3 / 2.1.2). Le re-rendu supprimé par #858 masquait ce trou par accident.
  - Correctif : Tab/Shift+Tab depuis un focus hors conteneur → premier/dernier focusable ; `autoFocus` sur le champ username à l'étape 2.
  - Tests ajoutés (`useFocusTrap.test.tsx`, `AccountSection.test.tsx`) : 2 rouges contre le code précédent, verts après.

## MINEURS
1. `useFocusTrap.ts` — appelants à `active = Boolean(event)` : passer d'un event A à B sans fermer ne rejoue plus le focus initial. Impact faible → **assumé** (aucun parcours connu ne bascule sans fermer).
2. `e2e/sprint-121-density-persisted.spec.ts` — `toEqual(['compact'])` fragile face à une ré-écriture identique légitime → **corrigé** (`802f8e35` : aucune valeur ≠ `compact`, au moins une écriture).
3. `app/[locale]/layout.tsx` — `global-not-found.tsx` (document propre) n'applique pas la densité → **assumé** (404).
4. `e2e/sprint-121-bottom-sheet-focus.spec.ts` — `fill('x')` redondant avec le test 1 → **assumé**, pas d'action.
5. (signalé par le dev #858) commentaires d'appelants « onEscape en deps » devenus faux → suivi.

## OK
ci.yml commentaires seuls ; ref `onEscape` conforme react-hooks 7 ; garde #618 conservée ; 9 appelants sans régression ; injection du script de densité impossible (constantes `JSON.stringify`, liste fermée) ; aucune CSP front (vérifié `next.config.mjs`, `proxy.ts`) ; `suppressHydrationWarning` sur `<html>` ; tests #858/#898 discriminants.
