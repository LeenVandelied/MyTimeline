# Mini-plans — Sprint 99

> Rédigés par le LEAD au démarrage (2026-09-21) : aucun `/sprint plan` n'a produit de mini-plan pour ce
> sprint (milestone #100 et labels posés au triage de clôture du S98). Énoncés contre-vérifiés dans le code
> avant spawn. Cohésion 1.00 (un seul thème : cibles tactiles / `epic:design`, frontend seul).

**Vagues :** V1 = #459 (Vitest seul) ∥ ui-design (arbitrage de charte #738 + #739, lecture seule)
| V2 = #738 (Playwright exclusif, après arbitrage du dev) ∥ #739 (Vitest seul, mesure E2E jouée par le lead ou reprise par l'agent #738)
**Migrations Flyway :** aucune

**Contre-vérification des énoncés (lead) :**
- #738 : confirmé. `button.tsx` size `default` h-9 (36), `sm` h-8 (32), `lg` h-10 (40), `icon` h-9 w-9 ; `input.tsx` h-9 ; `select.tsx:56` `SelectTrigger` h-9. Aucune règle `pointer: coarse` dans `src/**/*.css`. 29 fichiers importent `Button`, 6 `Input`, 6 `Select` ; 25 `size="sm"`, 7 `size="icon"` ; plusieurs consommateurs surchargent déjà la hauteur (`h-11 … lg:h-9`, `h-auto`, pseudo `before:h-11`). Bascule mobile des réglages : `< 768 px` (`settings/page.tsx:14`) = `max-md:` Tailwind. Références visuelles `sprint-77-theme-visual` (auth + landing) prises à **1280 px** seulement → garde-fou « desktop inchangé » gratuit.
- #739 : confirmé. `settings/mobile/BottomSheet.tsx:162` zone de glisser `h-7` (28 px) ; bouton fermer `h-11 w-11` (44). `a11y-audit.md:113` demande déjà « `✕` et grabber → zone 44×44 » (la ligne :101 citée par l'énoncé a glissé). **Hors énoncé :** la frise a la même zone à 28 px (`timeline.css:854` `.mt-sheet__grabber-zone`, `TimelineBottomSheet.tsx:141`) — à trancher par l'arbitrage (même décision ou non).
- #459 : périmètre réduit (commentaire de l'issue) : `timeline/Lane.tsx` n'existe plus, la frise porte déjà `title`. Reste `SessionList.tsx:108` (nom d'appareil, le `<p>` contient AUSSI le badge « session actuelle ») et `:116` (IP + ` · ` + `<SessionTimestamp>`).

```yaml
issue_459:
  fichiers_cles:
    - "frontend/src/components/settings/SessionList.tsx (lignes 108 et 116)"
    - "frontend/src/components/settings/SessionList.test.tsx"
  couches_touchees: ["frontend-settings"]
  strategie_test: "unit (Vitest) : title présent avec le texte complet, y compris valeurs de repli unknownDevice/unknownIp"
  risque_regression: "le title du nom d'appareil ne doit PAS contenir le libellé du badge « actuelle » ; celui de l'IP doit refléter ce qui est tronqué (IP + horodatage) — si l'horodatage n'est pas calculable sans dupliquer SessionTimestamp, IP seule et choix documenté"
  ordre_ecriture: "test rouge → attributs → test vert"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — partie frise déjà livrée, hors périmètre)"

issue_738:
  fichiers_cles:
    - "frontend/src/components/ui/button.tsx"
    - "frontend/src/components/ui/input.tsx"
    - "frontend/src/components/ui/select.tsx"
    - "frontend/e2e/sprint-99-touch-targets.spec.ts (nouveau)"
  couches_touchees: ["frontend-ui-primitives"]
  strategie_test: "unit (garde statique des classes) + E2E mesure à 375 px sur les 5 chapitres de réglages mobiles + contrôle 1280 px inchangé"
  risque_regression: "primitives partagées par 29/6/6 fichiers : consommateurs qui surchargent la hauteur (h-auto, h-11 lg:h-9, before:h-11), grilles serrées mobiles (en-têtes, barres d'actions, frise mobile) ; specs E2E qui mesurent des hauteurs"
  ordre_ecriture: "arbitrage dev (stratégie) → primitives → spec de mesure + contrôle négatif → balayage des consommateurs mobiles"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"

issue_739:
  fichiers_cles:
    - "frontend/src/components/settings/mobile/BottomSheet.tsx (ligne 162)"
    - "frontend/src/styles/ds/a11y-audit.md (ligne 113)"
    - "éventuellement frontend/src/styles/ds/components/timeline.css:854 selon l'arbitrage"
  couches_touchees: ["frontend-settings"]
  strategie_test: "unit si agrandie (classe) + mesure E2E à 375 px"
  risque_regression: "44 px de poignée repoussent le contenu du sheet de 16 px (hauteur max 85vh) ; le geste doit rester actif sur toute la zone"
  ordre_ecriture: "arbitrage dev (exception 2.5.8 ou non) → classe → doc a11y-audit"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"
```
