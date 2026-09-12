# Rapport d'exécution E2E — Sprint 78

> Traite le signal `RECOMMAND_TEST_RUNNER` émis par `issue-528-done.md`.
>
> **Aucun subagent `test-runner` n'a été spawné, et c'est délibéré.** Sur ce projet, la délégation
> de l'exécution E2E à un `test-runner` a rendu un verdict « E2E impossible » FAUX **quatre fois
> sur quatre** (S49 ×2, S51, S73 — cf. `PIT-S73-004`). La règle retenue depuis le S73 est que le
> lead lance la suite lui-même. C'est ce qui a été fait ici.
>
> Convention de rangement : `PIT-S67-004` — le rapport d'un spécialiste (ou de ce qui en tient
> lieu) se dépose dans `docs/memory/sprints/sprint-N/`, sinon le vérificateur de complétude ne le
> voit pas et compte le signal comme non traité.

## Pourquoi le signal a été émis

L'agent de #528 a reformaté 14 specs sous `frontend/e2e/**` et n'a pas lancé la suite, pour deux
raisons qu'il a mesurées et qui sont justes :

1. Les 10 références de capture sont suffixées `-chromium-linux`. Sur darwin, Playwright ne les
   trouve pas, ne les signale pas manquantes, et **écrit de nouvelles références** — pollution du
   dépôt, aucun signal (`PIT-S77-019`).
2. Backend éteint (`curl :8080` → 000), et le lever dans un working tree partagé pendant que #434
   travaillait risquait de corrompre `.next` (`PIT-S73-008`).

## Ce que le lead a exécuté

Stack montée pour l'occasion, **sans effet de bord sur l'environnement du poste** :

- Conteneur Postgres **dédié et jetable** sur `:5436`. Le Postgres natif du poste porte une base
  `eventmanager` figée en **V6 sur 15** : y pointer le backend l'aurait migrée jusqu'à V15 au boot.
  Effet de bord non demandé sur l'environnement de dev — écarté.
- Le backend e2e d'une **autre session** (`sprint-plan-*-backend-e2e` sur `:8085`) était disponible
  et a été écarté aussi : la suite crée des comptes, donc elle aurait muté SA base.
- Backend natif `:8080` contre le conteneur dédié (Flyway crée le schéma from scratch).
- Frontend `npx next dev -p 3000` — **webpack**, pas turbopack (`PIT-S61-007` : en worktree,
  turbopack infère un mauvais workspace root et toutes les pages rendent 500).
- **Oracle vérifié AVANT de lancer quoi que ce soit** : `curl /api/auth/me` → **401**
  (401 = proxy en place, 404 = proxy absent).
- Stack démontée, conteneur supprimé, ports rendus après le run.

```
PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test --ignore-snapshots
→ 304 passed · 5 failed · 9 skipped · 6,3 min (318 tests)
```

`--ignore-snapshots` neutralise la comparaison de captures, impossible à juger sur darwin. Une
seule spec du dépôt utilise `toHaveScreenshot` (`sprint-77-theme-visual`) ; les deux autres dites
« visuelles » (`sprint-70-preview-visual`, `sprint-76-legal-visual`) mesurent du calcul et ont donc
bien tourné — ce sont précisément celles que le réordonnancement de classes Tailwind pouvait
casser.

## Les 5 échecs, instruits

| Spec | Cause établie |
|---|---|
| `sprint-77-theme-visual:559` | Référence `-chromium-darwin` absente. Le garde-fou de la spec a **refusé d'écrire** au lieu de graver une fausse référence — comportement voulu, conséquence mécanique de `--ignore-snapshots` sur darwin. |
| `forgot-password:40`, `reset-password-failures:136` et `:157` | « aucun token de réinitialisation exploitable … HTTP 401 ». Cause réelle lue dans le log backend : `BREVO_API_KEY absente : envoi d'email ignoré (no-op)`. Le symptôme HTTP n'y renvoie pas. |
| `golden-path:85` | Inscription refusée côté serveur (`alert: Une erreur est survenue lors de l'inscription`). **Rejoué en isolation : EXIT=0, 6 passed en 7,8 s.** |

**Sur `golden-path`, l'argument d'isolation ne suffit pas** (`PIT-S73-007` : l'isolation ne prouve
l'instabilité que si elle ne supprime pas aussi la cause — ici elle supprime la charge, qui EST la
cause soupçonnée). Ce qui tranche est structurel : **ce sprint ne modifie aucune ligne de backend
exécutable** (seul `pom.xml` change, et uniquement le build), or l'échec est un refus serveur sur
`POST /api/auth/register`. Un réordonnancement de classes Tailwind dans un `.tsx` ne peut pas
produire cet effet. Le suspect réel est la contention d'identités / le budget de rate-limit sur
`register` — c'est-à-dire **#475 et #463, déjà planifiées au Sprint 79**.

## Confirmation par la CI

Run `34030803910` sur `b2a5bea` : **7 jobs sur 7 verts, `e2e` compris**. Le seul point que darwin
ne pouvait pas juger — les comparaisons de captures — passe sur Linux avec les références du
dépôt. Le reformatage des 119 fichiers n'a cassé aucune comparaison visuelle.

Détail complet : `docs/memory/audits/sprint-78-test-coverage.md`.

## Verdict

Signal `RECOMMAND_TEST_RUNNER` **TRAITÉ**. Suite E2E exécutée, échecs instruits un par un, aucun
imputable au diff du sprint, et confirmation obtenue sur la CI pour la partie hors de portée du
poste local.
