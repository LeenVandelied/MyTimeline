# Sprint 71 — verification NAVIGATEUR (mesure independante)

methode: NAVIGATEUR. backend-e2e Docker `:8085` (profil e2e verifie: test-support=404, /auth/me=401),
front `next dev :3100` (`NEXT_PUBLIC_API_URL=/api`, `E2E_API_PROXY_TARGET=:8085`, proxy verifie 401).
Instrument INDEPENDANT: script node + playwright-core hors runner (pas `e2e/support/contrast.ts`,
pas la spec de #497). Chromium. Themes clair+sombre (oracle `isDark` verifie). Viewports 1280x800,
1280x700, 500x800. Aucun fichier source touche.

## CIBLE A — grammaire de separation (edition vs creation)

1. filets PLEINE LARGEUR — `[OK]`. dialog clientW=478 ; header w=478 x=801 ; hote w=478 x=801.
   Creation: panel clientW=451 ; header w=451 ; `.mt-drawer__preview` w=451. Bord a bord des deux cotes.
2. DEUX filets quand epingle — `[OK]`. y=1 (header) et y=76 (hote), `1px solid rgb(230,231,235)` clair /
   `rgb(32,35,42)` sombre = `--color-rule`. Hote children=1 (portail monte).
3. `<640px` — `[OK]`. hote `display:none`, children=0 ; UN SEUL filet large restant (header, w=498).
   Apercu redescendu en flux. Pendant exact de `.mt-drawer__preview:empty`.
4. comparaison creation/edition — `[OK]`. paddings IDENTIQUES: header `20px 20px 16px`,
   apercu `16px 20px` ; meme token de filet, meme epaisseur, meme sequence titre|apercu|corps.
   Captures: `shots/edition-{light,dark}-1280.png` vs `shots/creation-{light,dark}-1280.png`,
   `shots/edition-{light,dark}-500.png`. Oeil humain: MEME grammaire.
5. `shadow-md` residuel — `[OK]`. bloc sticky/header/hote: `box-shadow:none`. Seule ombre = `shadow-xl`
   de `DialogContent` (`0 20px 25px -5px` + `0 8px 10px -6px`).

Ecarts NON demandes, constates: largeur panneau 480 (edition) vs 452 (creation) ; titre edition
`text-xl bold` vs `.mt-drawer__title` 19px font-display ; edition sans sous-titre ni bouton fermer.
Geometrie/typo preexistantes, hors grammaire de separation.

## CIBLE B — plancher 3:1 (ratios MESURES par moi, fond composite)

| couleur | theme | connecteur | fantome |
|---|---|---|---|
| cobalt `#3B62D4` | clair | 5.41 | 4.85 |
| cobalt | sombre | 3.38 | 3.17 |
| citron `#A7B83A` | clair | 3.06 `#8d9b35` | 3.07 `#889634` |
| citron | sombre | 8.32 | 7.33 |
| nuit `#101318` | clair | 18.61 | 15.77 |
| nuit | sombre | 3.08 `#626468` | 3.09 `#626468` |
| amber `#E3A82B` | clair | 3.08 `#ba8b28` | 3.07 `#b58728` |
| teal `#2FA7A2` | clair | 3.07 | 3.07 |
| grass `#4FA459` | clair | 3.09 | 3.06 |
| graphite `#6B7280` | clair / sombre | 4.83 / 3.78 | 4.38 / 3.51 |
| rose `#DD5C97` | clair / sombre | 3.47 / 5.27 | 3.17 / 4.84 |
| blanc `#FFFFFF` | clair / sombre | 3.07 `#929395` / 18.28 | 3.07 / 14.82 |
| gris `#808080` | clair / sombre | 3.95 / 4.63 | 3.62 / 4.25 |
| `#131519` (= surface sombre) | clair / sombre | 18.28 / 3.09 `#636468` | 15.51 / 3.09 |

44 mesures, minimum 3.06. **CONFORME** au seuil 3:1, sans exception.
SUR-CORRECTION couleur par defaut: **NON** — encre rendue `#3b62d4` = couleur saisie, les 4 valeurs
cobalt reproduisent le rapport #497.
Surface EDITION re-mesuree separement (cobalt/citron/nuit/blanc, 2 themes): valeurs IDENTIQUES
a la creation — le plancher n'est pas propre au drawer de creation.

## Ecarts vs rapports precedents

- #497 CONFIRME independamment. Deltas <=0.02 (ghost cobalt clair 4.85 vs 4.83 ; cobalt sombre 3.17
  vs 3.18 ; citron clair 3.07 vs 3.06) — arrondi, non materiel.
- 8 couleurs jamais mesurees (amber/teal/grass/graphite/rose/blanc/gris/#131519) ajoutees: aucune sous 3:1.
- Piege d'instrument decouvert: Chrome renvoie `color(srgb ...)` pour un fond `color-mix`. Un parseur
  qui ne matche que `rgb()` lit le MAUVAIS fond et SURESTIME le fantome (+0.18 mesure sur citron clair).
  Ma 1re passe est tombee dedans avant correction.

## Non mesure

Bottom sheet mobile `<640px` pour CIBLE B (apercu en flux, contraste non releve) ; locales != fr ;
firefox/webkit ; etats hover/focus des filets ; suite E2E complete (aucune spec relancee).

## Recommandations suite

- `RECOMMAND_FOLLOWUP` — mesurer le plancher 3:1 sur la bottom sheet mobile `<640px` (seule surface restante).
- Pas de `RECOMMAND_DB_EXPERT` car aucun fichier backend ni schema touche, lecture seule sur le code.
- Pas de `RECOMMAND_SECURITY` car aucune surface d'auth/PII modifiee, verification purement visuelle.
- Pas de `RECOMMAND_TEST_RUNNER` car aucune suite de tests n'etait a lancer, mesure faite hors runner.
- Pas de `RECOMMAND_UI_DESIGN` car la grammaire livree est mesuree conforme a la surface de creation.

STATUS: COMPLETED
