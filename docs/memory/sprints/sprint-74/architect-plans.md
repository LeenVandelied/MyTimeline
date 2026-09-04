# Mini-plans architect — Sprint 74

> Généré par /sprint plan (architect, 2e vague S74-S77). Lu par /sprint start Phase 4.1.
> Type : UX-polish. Toutes issues XS → pas de bloc YAML. NO-OP vérifiés réels par l'architect.

# #384 (XS) — FeaturesSection : double lévitation au survol
#   `FeaturesSection.tsx:41` (`hover:-translate-y-2`) + `landing.css:55` (`translateY(-10px)`) s'additionnent (-18px). Choisir une seule source.
# #342 (XS) — LanguageSelector : `<Link>` enveloppe `<DropdownMenuItem>`
#   `frontend/src/components/ui/language-selector.tsx:135-149`. ⚠ fichier aussi touché par #172 (S75).
# #343 (XS) — Frise hero : easing hors DS + import CSS mal scopé
#   `hero-timeline.css:22` = cubic-bezier littéral (→ token `--ease-*`) ; importé `frontend/app/[locale]/layout.tsx:5` (PAS `app/layout.tsx` : drift énoncé).
# #417 (XS) — Contour de focus rogné
#   `.mt-zoom` overflow:hidden (`timeline.css:123`) rogne `.mt-tab` outline-offset:3px (`core.css:260`) dans le tablist réglages.
