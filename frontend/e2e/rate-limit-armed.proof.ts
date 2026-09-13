import { test, expect } from '@playwright/test'

/**
 * #547 — PREUVE D'ARMEMENT du filtre de rate-limit sur le CHEMIN RÉSEAU RÉEL.
 *
 * POURQUOI. Retirer `RATE_LIMIT_ENABLED=false` de la stack E2E ne prouve pas que le
 * filtre est armé : une suite qui ne dépasse jamais aucun plafond serait verte avec ou
 * sans filtre. Les IT backend prouvent la LOGIQUE (seuils, clé de comptage) sous
 * MockMvc ; elles ne traversent ni le proxy Next, ni une vraie socket, ni le CORS.
 * Cette preuve fait exactement ce trajet : navigateur-like -> serveur Next (`/api/*`
 * réécrit) -> backend, avec une `Origin` autorisée.
 *
 * CE QU'ELLE ASSERTE, sur `POST /api/auth/refresh` (plafond 20/min/IP, non réglable) :
 *   1. les 20 premières requêtes de la minute rendent 401 (pas de cookie) — ni 403
 *      (CORS refusé), ni 404 (proxy absent), ni 429 ;
 *   2. la 21e rend 429 avec le corps générique du filtre ;
 *   3. un `X-Forwarded-For` forgé ne crée PAS de seau neuf : toujours 429 (la clé est
 *      l'IP de socket vue par le backend, derrière le proxy — PIT-S2-005).
 *
 * POURQUOI CE CRÉNEAU. `refresh` n'est consommé par AUCUNE spec (vérifié par
 * `src/__tests__/e2e-rate-limit-budget.test.ts`) : le rafraîchissement du client est
 * périodique toutes les 6 h (`apiClient.ts`), jamais déclenché pendant un run. Vider
 * ce seau ne peut donc faire échouer aucun autre test.
 *
 * POURQUOI UN PROJET PLAYWRIGHT DÉDIÉ. Le seau est partagé par toute la suite (une IP).
 * Le projet `rate-limit-armed` (playwright.config.ts) DÉPEND de `chromium` et `firefox` :
 * il ne démarre qu'une fois toutes les specs terminées, jamais en concurrence. Le
 * suffixe `.proof.ts` le tient hors du `testMatch` par défaut des autres projets, et
 * hors du filtre de la passe 2 CI (`auth.setup.ts auth-signature.spec.ts`).
 *
 * ⚠ Conséquence assumée : si une spec d'un projet dont il dépend ÉCHOUE, Playwright ne
 * lance pas ce projet (« did not run »). En local sur macOS, où
 * `sprint-77-theme-visual.spec.ts:620` échoue faute de référence `-darwin.png`, le
 * jouer seul, pile au repos depuis plus d'une minute :
 *   PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test --project=rate-limit-armed --no-deps
 */

const REFRESH_PATH = '/api/auth/refresh'

/** `RateLimitingFilter.DEFAULT_LIMITS` — `POST /api/auth/refresh`. */
const REFRESH_CEILING = 20

test.use({ storageState: { cookies: [], origins: [] } })

/**
 * AUCUN RETRY (revue S88), quelle que soit la valeur globale (`retries: 2` en CI).
 *
 * Le seul signal qui prouve un créneau `refresh` PROPRE est le 429 pile à la 21e requête,
 * et il ne vaut qu'au premier essai : un retry trouve le seau déjà vidé par l'essai
 * précédent. Avec des retries, une POLLUTION du créneau (une spec qui se mettrait à
 * appeler `refresh`, un refresh applicatif déclenché pendant le run) ferait échouer
 * l'essai 0, puis passer l'essai 1 : résultat « flaky », job VERT, pollution invisible.
 * Sans retry, elle rougit le job — c'est ce qu'on veut d'une preuve.
 */
test.describe.configure({ retries: 0 })

test('le filtre de rate-limit est ARMÉ derrière le proxy Next (401 x20, puis 429, XFF ignoré)', async ({
  request,
  baseURL,
}) => {
  expect(baseURL, 'baseURL requise (PLAYWRIGHT_BASE_URL ou webServer)').toBeTruthy()
  const origin = new URL(baseURL!).origin

  const statuses: number[] = []
  for (let i = 0; i <= REFRESH_CEILING; i++) {
    const response = await request.post(REFRESH_PATH, { headers: { Origin: origin } })
    statuses.push(response.status())
    if (response.status() === 429) {
      expect(await response.json()).toEqual({ error: 'too_many_requests' })
      break
    }
  }

  const firstThrottled = statuses.indexOf(429)
  const diagnosis =
    `statuts observés sur ${REFRESH_PATH} : [${statuses.join(', ')}]. Lecture : que des 401 ` +
    'jusqu’à la 21e = filtre DÉSARMÉ (RATE_LIMIT_ENABLED=false réintroduit ?) ; 403 = CORS ' +
    `refusé pour ${origin} (APP_CORS_ALLOWED_ORIGINS) ; 404 = proxy /api absent.`

  expect(
    firstThrottled,
    `aucun 429 en ${REFRESH_CEILING + 1} requêtes — ${diagnosis}`,
  ).toBeGreaterThanOrEqual(0)
  expect(
    statuses.slice(0, firstThrottled).every((status) => status === 401),
    `avant le 429, seuls des 401 sont attendus — ${diagnosis}`,
  ).toBe(true)
  // Seau plein au départ (aucune spec ne le consomme, et pas de retry — cf. `configure`
  // ci-dessus) : le 429 tombe PILE à la 21e, sinon le créneau a été pollué.
  expect(
    firstThrottled,
    `le 429 doit tomber à la requête ${REFRESH_CEILING + 1} — ${diagnosis}`,
  ).toBe(REFRESH_CEILING)

  const spoofed = await request.post(REFRESH_PATH, {
    headers: { Origin: origin, 'X-Forwarded-For': '203.0.113.7' },
  })
  expect(
    spoofed.status(),
    'un X-Forwarded-For forgé ne doit PAS ouvrir un seau neuf (trust-forwarded-header=false)',
  ).toBe(429)
})
