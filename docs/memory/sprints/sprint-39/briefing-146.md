[BRIEFING ISSUE #146 — Sprint 39 « Lisibilité Landing »]

## ⚠ Garde-fou worktree (LIRE EN PREMIER — pitfall récurrent sur ce projet)
Tu tournes dans un worktree partagé. AVANT toute action :
```
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-31-start-44258d
git branch --show-current   # DOIT afficher exactement : sprint/39
```
Si la branche n'est pas `sprint/39` → STOP, retourne STATUS: PARTIAL + BLOQUE_SUR "mauvaise branche/cwd".
Ne travaille QUE dans ce répertoire. Ne touche JAMAIS au repo principal hors worktree.

## Issue
**#146 — [CHORE] Vérifier le rendu clair/sombre des 4 écrans auth en navigateur**

Les 4 écrans auth (login, register, forgot-password, reset-password) ont été migrés sur les tokens Graphite au Sprint 8. La migration est couverte par des tests, mais le rendu visuel réel clair/sombre n'a jamais été vérifié. Objectif : **auditer et corriger la lisibilité** des 4 écrans en clair ET en sombre.

**Réalité vérifiée par le lead :** les pages auth sont DÉJÀ entièrement tokenisées (aucune couleur hardcodée dans `login/page.tsx` — vérifié). Cette issue est donc surtout de la **vérification** + micro-corrections. Ne réécris pas ce qui marche.

**CE QUE TU DOIS FAIRE :**
1. **Audit statique** des 4 pages : `frontend/app/[locale]/{login,register,forgot-password,reset-password}/page.tsx`. Pour chacune :
   - Repérer toute couleur hardcodée (hex `#…`, `rgb(...)`, classes Tailwind brutes `text-gray-*`, `bg-white`, `text-black`, `bg-slate-*`, etc.) → remplacer par le token Graphite équivalent.
   - Vérifier que chaque **texte essentiel** utilise un token conforme AA (**≥ 4.5:1** texte normal, **≥ 3:1** gros texte/UI/bordures) en clair ET en sombre. Interdit pour texte essentiel : `text-ink-faint` (~2.8:1, tier décoratif). `text-ink-muted` est OK (≈6:1).
   - Vérifier qu'aucune hypothèse « light-only » ne casse le sombre (les tokens sont theme-aware, mais repère une éventuelle classe en dur).
2. **Corriger** les écarts trouvés, localement dans les 4 `page.tsx` (et leurs tests si besoin d'ajustement).
3. **Test RTL** : si une page n'a pas de test vérifiant le rendu (présence des tokens/structure), ajoute/complète un test léger. Ne casse pas les tests existants (`page.test.tsx` existent déjà pour les 4).

## Plan d'implémentation (architecte, /sprint plan)
```yaml
issue_0146:
  fichiers_cles: [frontend/app/[locale]/{login,register,forgot-password,reset-password}/page.tsx]
  couches_touchees: [frontend]
  strategie_test: revue statique tokens clair+sombre, consigner écarts, corriger mineur, RTL
  risque_regression: FAIBLE
  possibly_done: false
```

## Triage
Taille: S · Modèle: opus · Effort: high

## Contexte technique VÉRIFIÉ par le lead
- Les pages auth utilisent déjà : `bg-bg text-ink`, carte `bg-surface`, inputs `bg-surface-2 border-rule-strong`, bouton primaire `bg-accent text-accent-ink hover:bg-accent-hover`, liens `text-accent hover:text-accent-hover`, aide `text-ink-muted`, erreurs `text-danger`. Structure = shadcn `Form/FormField/FormItem/FormLabel/FormControl/FormMessage` + `Input`/`Button`/`Spinner`.
- Tokens (valeurs) — CLAIR : `--color-ink-muted #5E626B` (≈6:1 ✅), `--color-accent #1170E4`, `--color-accent-ink #FFFFFF` (blanc/bleu ≈4.3:1, limite), `--color-danger #D13B40`. SOMBRE : `--color-ink-muted #8E9299`, `--color-accent #4D9BFF`, `--color-accent-ink #0B0C0E`.
- Fichier tokens : `frontend/src/styles/ds/tokens/colors.css` (référence LECTURE SEULE pour toi, cf. interdits ci-dessous).

## Fichiers que tu possèdes / fichiers INTERDITS
**Tu possèdes :** `frontend/app/[locale]/{login,register,forgot-password,reset-password}/page.tsx` + leurs `page.test.tsx`. Le footer auth `frontend/src/components/ui/footer-app.tsx` SI (et seulement si) un écart de lisibilité y est localisé.
**INTERDITS (possédés par #56 en parallèle, ou blast radius trop large) :**
- `frontend/src/styles/ds/tokens/colors.css` et `frontend/src/styles/globals.css` → **NE PAS modifier les valeurs de tokens.** Si tu trouves un token globalement sous-AA (ex. `text-accent-ink` sur `bg-accent` limite), **NE CORRIGE PAS** : signale-le en `RECOMMAND_FOLLOWUP` / `[MEMORY:*]` dans ton retour (c'est #56 qui possède le layer token ce sprint).
- Les primitives partagées `frontend/src/components/ui/{button,input,form,spinner}.tsx` → app-wide. Si un défaut de contraste y est localisé, **signale-le** au lieu de le corriger (éviter blast radius + collision). Tu ne corriges que ce qui est local aux 4 pages auth.

## ⚠ PROTOCOLE COMMIT — NE COMMITE PAS (worktree partagé, index git en course)
Deux subagents éditent en parallèle dans le MÊME working tree.
- **NE FAIS AUCUN `git add`, AUCUN `git commit`.** Laisse tes changements non stagés.
- Le LEAD sérialise les commits après ton retour.
- Retourne : **liste exacte des fichiers modifiés** + **message de commit gitmoji français** proposé (ex. `:lipstick: Vérifier/corriger lisibilité clair-sombre écrans auth (#146)`). Si tu n'as RIEN modifié (tout déjà conforme), dis-le clairement — le lead fera un commit doc-only ou fermera l'issue en conséquence.

## Contrôle navigateur (résiduel — sois honnête)
Le critère d'acceptation « vérifié visuellement dans un navigateur » exige un œil humain en clair+sombre. Tu ne peux pas le garantir de façon fiable en subagent. Fais l'audit statique + corrections, puis **liste explicitement dans ton retour le résiduel** « contrôle visuel manuel navigateur clair/sombre à faire par le dev/lead ». Ne coche pas ce critère toi-même.

## Tests
```
cd frontend && npx vitest run "app/[locale]/login" "app/[locale]/register" "app/[locale]/forgot-password" "app/[locale]/reset-password" 2>&1 | tail -30
```
Rapporte passed/failed. Ne prétends pas vert si la commande échoue.

## Livrable attendu (format strict, MAX 500 tokens, style caveman)
RETOUR :
- fichiers_modifies: [chemins exacts]  ← PAS de SHA (tu ne commites pas). Vide si rien changé.
- commit_msg_propose: ":lipstick: …(#146)"  (ou "AUCUN CHANGEMENT" si tout conforme)
- resume: <écarts trouvés + corrigés par écran, clair+sombre ; ou "conforme, rien à corriger">
- ecarts_signales_hors_scope: <tokens/primitives sous-AA repérés mais NON corrigés (pour #56/follow-up)>
- residuel: "contrôle visuel manuel navigateur clair/sombre — dev/lead"
- tests: <passed/failed + commande>
- recommandations suite: <RECOMMAND_FOLLOWUP si écart token/primitive à traiter ailleurs>
- STATUS: COMPLETED (ou PARTIAL + BLOQUE_SUR) en dernière ligne
