# Issue #56 — Slice contraste hero landing (Sprint 39)

## Objectif livré
Extraction non destructive du Hero de `HomePage.tsx` vers `components/landing/HeroSection.tsx` + correction contraste bouton secondaire hero WCAG AA. Slice uniquement (reste du L → backlog).

## Fichiers
- `frontend/src/components/landing/HeroSection.tsx` (créé — Client Component, prop `locale`, clés i18n existantes réutilisées)
- `frontend/src/components/landing/HeroSection.test.tsx` (créé — RTL, 4 tests)
- `frontend/src/components/pages/HomePage.tsx` (modifié — import + `<HeroSection locale={locale} />`, retire import `ArrowRight` inutilisé ; 7 autres sections intactes)
- **colors.css NON touché** (fix = swap de classe token, pas de valeur)

## Contraste (mesuré WCAG, avant→après)
| paire | seuil | clair | sombre | verdict |
|---|---|---|---|---|
| titre ink/bg | 4.5 | 17.32 | 16.70 | OK |
| sous-titre ink-muted/bg | 4.5 | 5.96 | 6.26 | OK |
| CTA accent-ink/accent | 4.5 | 4.71 | 6.94 | OK (déjà AA, pas ~4.3 comme estimé) |
| **bordure btn secondaire/bg (UI)** | 3.0 | **1.21→5.96** | **1.24→6.26** | **CORRIGÉ** (`border-rule`→`border-ink-muted`) |
| cadre image rule/bg | — | 1.21 | 1.24 | décoratif, laissé |

## Tests
PASSED 4/4 — `npx vitest run src/components/landing/` · `tsc --noEmit` clean.

## Pitfalls / mémoire
- **[MEMORY:pitfall]** Bordures UI ≥3:1 sur DS Graphite : `rule`/`rule-strong` (gray-100/200) échouent des deux côtés (~1.2–1.5:1). Pour une affordance de contrôle (outline button) sans remplissage, utiliser `ink-muted` (~6:1) ou `accent` (~4.6:1). `rule*` = séparateurs décoratifs uniquement. (La suggestion `border-rule-strong` du briefing était insuffisante — corrigé par le dev vers `border-ink-muted`.)

## Recommandations suite
- **RECOMMAND_FOLLOWUP** — reste du L #56 (backlog) : décomposer les 7 sections restantes de HomePage (Features/HowItWorks/Timeline/Testimonials/MobileApp/CTA/Footer), animation timeline horizontale (framer-motion présent), brancher Footer→pages légales (privacy/terms existent), dédup routes `/[locale]` vs `/[locale]/home`. Triage L | domaine design/frontend.
- Optionnel esthétique : cadre déco image hero `border-rule-strong` (non requis AA).

## Commit (proposé, sérialisé par le lead)
`:lipstick: Extraire HeroSection + contraste bouton secondaire hero WCAG AA (#56)`

STATUS: COMPLETED
