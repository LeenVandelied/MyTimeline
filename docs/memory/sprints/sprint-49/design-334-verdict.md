# Revue design pré-implémentation — issue #334 (Sprint 49, vague 2)

> Produit par l'agent `ui-design` (lecture seule) le 2026-07-28, pendant la vague 1.
> Consommé par le briefing `fullstack-dev` de la vague 2.
> **Chemins re-vérifiés par le lead** : les 6 fichiers cités existent tous, et
> `frontend/public/locales/{de,en,es,fr}/` est confirmé (4 locales). Pas de chemin fantôme ici.

## VERDICT : APPROUVÉ

Burger sous `md` (nav + connexion + langue) + CTA « Inscription » maintenu visible + logo responsive.

## Solution retenue

Combinaison dosée des 3 pistes évoquées par l'issue :
- logo `text-lg sm:text-xl md:text-3xl`
- groupe droit `< md` = `[Inscription]` + `[burger 44×44]`
- le burger ouvre un panneau off-canvas contenant les ancres nav, « Connexion » et le `LanguageSelector`

**Budget à 375 px** (343 px réellement disponibles) : logo ~140 + 8 + Inscription ~125 (en allemand)
+ 8 + 44 = **~325 px** → critère 1 tenu.

**Pourquoi celle-ci :** connexion et sélecteur de langue restent atteignables en 1 tap depuis le header
(critère 2). Bonus : les ancres nav (`#features`…) deviennent accessibles sur mobile — elles sont
aujourd'hui `hidden md:flex`, donc purement perdues sous `md`.

### Pistes écartées, avec la raison

| Piste | Rejet |
|---|---|
| Masquage seul sous `md` | Le seul chemin restant vers `/login` serait `FooterSection.tsx:81`, en bas de page → **critère 2 non rempli**. |
| Réduction du logo seule | Le groupe de boutons fait 299 px sur 343 dispo : même avec un logo à 0 px, ça tient à peine et casse en allemand. |
| Burger total (Inscription cachée aussi) | Supprime le seul CTA primaire du header ; la marge gagnée n'est pas nécessaire. |

## Spec pour le dev

- **Breakpoint** : bascule à `md` (768 px) — cohérent avec la nav existante `hidden … md:flex`
  (`HeaderSection.tsx:40`). **Aucun breakpoint custom.**
- **Visible à 375 px** : logo, bouton « Inscription » (`h-11`, ≥ 44 px), burger 44×44.
- **Bascule dans le panneau `< md`** : 3 ancres nav, « Connexion », `LanguageSelector`.
  À `md:` et au-dessus, le header actuel reste **inchangé**.
- **Composant** : **aucun réutilisable tel quel.** `frontend/src/components/dashboard/MobileDrawer.tsx`
  est couplé au dashboard (logout, thème, clés `dashboard.mobile.drawer`).
  → Créer `frontend/src/components/landing/LandingMobileMenu.tsx` **calqué** dessus (overlay `z-40` +
  panneau `z-50` + `role="dialog"` `aria-modal` `aria-labelledby`), et **réutiliser**
  `frontend/src/components/timeline/useFocusTrap.ts` (signature `(ref, active, onEscape?)`).
  Généraliser `MobileDrawer` est **hors périmètre P1** → `[MEMORY:decision]` à consigner.
- **Tokens DS, par rôle** (aucun hex inline) : panneau = surface élevée (`bg-surface`), séparation =
  hairline décoratif (`border-rule`), texte = `text-ink` / `text-ink-muted`, CTA = accent + encre sur
  accent, survol = teinte accent douce, overlay = noir translucide (comme `MobileDrawer:48`),
  motion 200 ms sans rebond (DS 120–280 ms, `--ease-quart`).
- **a11y** : burger avec `aria-expanded` + `aria-controls` + `aria-label` (icône seule), cible `h-11 w-11` ;
  focus-trap + Escape + clic overlay + restauration du focus (via `useFocusTrap`) ; bouton de fermeture
  44×44 ; ordre de tabulation logo → Inscription → burger → (ouvert) contenu du panneau ; focus visible
  2 px accent offset 2 ; fermeture du menu au clic sur une ancre.
- **i18n** : nouvelles clés `common.landing.navigation.menuOpen` / `menuClose` / `menuTitle` dans les
  **4 locales** (`frontend/public/locales/{fr,en,es,de}/common.json`). Réutiliser `common.login.title` et
  `common.landing.buttons.register`. **Zéro chaîne en dur.**
- **testids** : `landing-header-menu-toggle`, `landing-header-menu`, `landing-header-menu-close`,
  `landing-header-menu-overlay`.

## Header partagé ?

**NON.** `HeaderSection` n'est importé que par `frontend/src/components/pages/HomePage.tsx:38`.
Aucune propagation à d'autres pages — le risque signalé par l'issue est écarté.

## Risques signalés

- **Marge ~18 px en allemand** (« Registrieren ») → vérifier **375 ET 390 px, en `fr` ET `de`**.
  Si dépassement : `px-3` sur le CTA, puis logo `text-base`.
- **`frontend/src/styles/landing.css` est réécrit par #335** (vague 1) → ne pas dépendre de l'état actuel
  de `.nav-link`. Styler les liens du panneau **par tokens**, pas via cette classe.
- **`HeaderSection.test.tsx`** porte des assertions sur la nav `hidden md:flex` → à mettre à jour.
- **jsdom ne détecte pas l'overflow** (précédent S48 : CI verte, 2 CTA invisibles) → contrôle navigateur
  obligatoire avant merge, assertion `document.documentElement.scrollWidth <= clientWidth`.

## Incertitudes déclarées par l'agent (à ne pas masquer)

- Les largeurs **234 px (logo) et 299 px (groupe) sont reprises de l'issue, PAS re-mesurées** — aucun
  navigateur n'a été ouvert. Les estimations `de`/`es` sont des extrapolations.
  ⇒ **Le dev de la vague 2 doit re-mesurer**, pas partir de ces chiffres comme acquis.
- `.claude/rules-jit/ux-patterns.md` **n'existe pas** dans ce dépôt (`find` → 0 résultat). La validation
  s'est faite sur `ds/readme.md` + `ds/a11y-audit.md` seuls.
- Le rendu clair/sombre du panneau n'a pas été vérifié, ni l'état réel de `landing.css` (en cours de
  réécriture par #335).

## Follow-up détecté (hors périmètre #334 — NE PAS absorber)

`LanguageSelector` (`frontend/src/components/ui/language-selector.tsx:27`) : déclencheur `h-9 w-9` = 36 px,
**sous les 44 px requis en mobile** (a11y-audit §2/§4). **Défaut existant et partagé avec le dashboard** →
issue dédiée à ouvrir au triage de clôture. Ne pas le corriger dans #334.
