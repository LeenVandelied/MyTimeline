import fs from 'node:fs'

import { test, expect } from '@playwright/test'

import { SHARED } from './support/accounts'
import {
  BACKEND_ORIGIN,
  JWKS_PATH,
  PUBLIC_KEY_SPKI_BASE64,
  SIGNATURE_VERIFICATION_CONFIGURED,
  SIGNING_KEY_AVAILABLE,
  decodeClaims,
  decodeHeader,
  forgeAlgNone,
  forgeHs256,
  signRs256,
  spkiBase64FromJwk,
  tamperSignature,
  verifyRs256,
  type JwtClaims,
} from './support/rs256'

/**
 * #323 — La chaîne CROSS-SYSTEM de la signature RS256 : le backend Spring frappe le jeton
 * avec la clé PRIVÉE, le middleware Next (Edge) le vérifie avec la clé PUBLIQUE.
 *
 * ## Ce que ce fichier prouve, et qu'aucun test unitaire ne peut prouver
 *
 * `JwtServiceRs256Test` (backend) prouve que Spring signe en RS256.
 * `auth-token-verify.test.ts` et `middleware.test.ts` (frontend) prouvent que le vérifieur
 * rejette ce qu'il doit rejeter — mais sur des jetons que le TEST a lui-même fabriqués, avec
 * une paire que le TEST a lui-même générée. Les deux moitiés sont vertes séparément sans que
 * rien n'atteste qu'elles s'emboîtent : une divergence de format de clé (SPKI vs PKCS#1),
 * d'encodage (Base64 standard vs base64url) ou d'algorithme passerait entre les deux suites.
 *
 * Ici, le jeton est émis par un VRAI login contre un VRAI backend, et c'est le VRAI runtime
 * Next qui statue. On y ajoute les jetons qu'aucun parcours utilisateur ne peut produire —
 * signature altérée, `alg: none`, `alg: HS256`, jeton expiré — que seule une forge peut créer.
 *
 * ## Conditionnement (et pourquoi ce n'est pas un contournement)
 *
 * Le dépôt est PUBLIC : aucune clé privée n'y est committée, donc aucune clé publique STABLE
 * n'est publiable. La spec exige donc une paire JETABLE générée au lancement de la stack et
 * SKIPPE si `AUTH_JWT_PUBLIC_KEY` est absente de l'environnement du process de test.
 *
 * ⚠ #358 — CE QUI GOUVERNE LE SERVEUR A CHANGÉ. Le serveur Next ne lit plus de clé publique
 * en variable : il la DÉCOUVRE sur le JWKS du backend, et c'est la présence de `AUTH_JWKS_URL`
 * dans SON environnement qui le fait basculer en mode vérifiant. `AUTH_JWT_PUBLIC_KEY` ne
 * subsiste que comme MATÉRIEL DE FORGE dans le process de test (cf. `support/rs256.ts`). Les
 * deux modes restent mutuellement exclusifs sur une instance Next donnée — le job CI lève donc
 * toujours deux serveurs, `:3000` sans découverte (dégradé, couvert par `auth-guard.spec.ts`
 * § DÉGRADÉ) et `:3001` avec.
 *
 * ⚠ La variable du process de test n'est donc qu'une PROCURATION, et une procuration plus
 * lâche qu'avant. Le sens de défaillance reste fail-closed — un serveur resté en dégradé
 * répondrait 200 là où les cas ci-dessous attendent 307, donc la suite virerait au ROUGE,
 * jamais au faux vert. Le premier test ancre néanmoins ce postulat EXPLICITEMENT (« garde
 * anti-dégradé ») : c'est LUI l'oracle du mode serveur, et le diagnostic doit être immédiat,
 * pas déduit de quatre cas rouges.
 *
 * ## Recette de lancement (mesurée, cf. `docs/memory/sprints/sprint-47/e2e-local-runbook.md`)
 *
 * ```bash
 * # 1. Paire RS256 JETABLE, générée à l'exécution — RIEN n'est committé.
 * node -e 'const c=require("crypto"),f=require("fs");
 *   const {privateKey,publicKey}=c.generateKeyPairSync("rsa",{modulusLength:2048,
 *     privateKeyEncoding:{type:"pkcs8",format:"der"},publicKeyEncoding:{type:"spki",format:"der"}});
 *   f.writeFileSync("/tmp/priv.b64",privateKey.toString("base64"));
 *   f.writeFileSync("/tmp/pub.b64",publicKey.toString("base64"))'
 *
 * # 2. Backend :8080 — clé PRIVÉE. Le boot journalise la clé publique dérivée : elle DOIT
 * #    être identique à /tmp/pub.b64, sinon la paire est dépareillée.
 * cd backend && SPRING_PROFILES_ACTIVE=dev,e2e \
 *   DB_URL=jdbc:postgresql://localhost:5432/eventmanager_e2e \
 *   DB_USERNAME=eventuser DB_PASSWORD=motdepasse_dev_local \
 *   JWT_PRIVATE_KEY="$(cat /tmp/priv.b64)" RATE_LIMIT_ENABLED=false \
 *   java -jar target/*.jar --app.cors.allowed-origins=http://localhost:3000,http://localhost:3100
 *
 * # 3. Frontend :3100 — URL du JWKS (lue au RUNTIME par le middleware, cf. middleware.ts).
 * #    ⚠ #358 : plus de clé publique ici. Le middleware la découvre sur le backend.
 * cd frontend && NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8080 \
 *   AUTH_JWKS_URL=http://localhost:8080/.well-known/jwks.json npm run dev -- -p 3100
 *
 * # 4. Specs — la MÊME clé publique côté test, plus la privée pour le seul cas « expiré ».
 * cd frontend && SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 \
 *   AUTH_JWT_PUBLIC_KEY="$(cat /tmp/pub.b64)" E2E_JWT_PRIVATE_KEY="$(cat /tmp/priv.b64)" \
 *   npx playwright test auth-signature.spec.ts --workers=1 --reporter=line
 * ```
 *
 * ⚠ `--workers=1` obligatoire en local (identités partagées entre process, cf. le runbook).
 */

/** Route protégée de référence — miroir de `src/lib/auth-guard-paths.ts`. */
const PROTECTED_PATH = '/fr/dashboard'

/**
 * Récupère le cookie `jwt` AUTHENTIQUE frappé par le backend lors du login du projet `setup`.
 *
 * On lit le `storageState` sur disque plutôt que d'ouvrir un contexte : les jetons forgés
 * ci-dessous doivent reprendre les claims RÉELLES (`sub`, `jti`) pour que le SEUL écart avec
 * un jeton légitime soit le défaut injecté. Un jeton forgé sur des claims inventées pourrait
 * être rejeté pour une raison sans rapport avec la signature.
 */
function readAuthenticJwt(): string {
  const raw = fs.readFileSync(SHARED.storageState, 'utf8') as string
  const state = JSON.parse(raw) as { cookies?: { name: string; value: string }[] }
  const jwt = state.cookies?.find((cookie) => cookie.name === 'jwt')?.value
  if (jwt === undefined || jwt.length === 0) {
    throw new Error(
      `cookie 'jwt' absent de ${SHARED.storageState} — le projet Playwright \`setup\` ` +
        "n'a pas produit de session ; relancer la suite complète.",
    )
  }
  return jwt
}

/** Claims du jeton authentique, avec `exp` repoussé loin dans le futur. */
function claimsWithFutureExp(token: string): JwtClaims {
  const nowSec = Math.floor(Date.now() / 1000)
  return { ...decodeClaims(token), iat: nowSec, exp: nowSec + 3600 }
}

test.describe('Signature RS256 du cookie jwt — backend Spring -> middleware Edge (#323)', () => {
  // Contexte SANS session : chaque cas POSE lui-même le cookie qu'il veut éprouver.
  test.use({ storageState: { cookies: [], origins: [] } })

  test.skip(
    !SIGNATURE_VERIFICATION_CONFIGURED,
    'AUTH_JWT_PUBLIC_KEY absente du process de test (matériel de forge) : la stack visée ' +
      'tourne en mode DÉGRADÉ, garde sur la présence du cookie, couvert par ' +
      'auth-guard.spec.ts. Voir la recette de lancement en tête de fichier.',
  )

  /**
   * GARDE ANTI-DÉGRADÉ — doit rester le PREMIER cas du fichier.
   *
   * En mode dégradé, ce même cookie bidon renvoie 200 (c'est exactement ce qu'affirme
   * `auth-guard.spec.ts § DÉGRADÉ`). Un 200 ici signifie donc que le SERVEUR Next n'a PAS de
   * clé de vérification — #358 : soit `AUTH_JWKS_URL` n'est pas posée sur son process, soit le
   * JWKS du backend ne lui est pas joignable — quelle que soit la variable vue par le process
   * de test : rien de ce que ce fichier affirme ensuite n'aurait alors de valeur. Ne pas
   * « réparer » ce cas en assouplissant l'assertion.
   */
  test('anti-dégradé : un cookie non-JWT est REJETÉ (la vérification est bien active)', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: 'jwt', value: 'ceci-n-est-pas-un-jwt', url: baseURL! }])

    const response = await page.request.get(PROTECTED_PATH, { maxRedirects: 0 })

    expect(
      response.status(),
      '200 = le serveur Next est en mode DÉGRADÉ : AUTH_JWKS_URL absente de SON environnement, ' +
        'ou JWKS du backend injoignable depuis lui. La suite ci-dessous ne prouverait rien.',
    ).toBe(307)
    expect(new URL(response.headers()['location'], baseURL).pathname).toBe('/fr/login')
  })

  /**
   * #358 — LE DOCUMENT DE DÉCOUVERTE LUI-MÊME, interrogé en direct sur le backend.
   *
   * Les cas voisins prouvent que le middleware vérifie ; celui-ci prouve CE QU'IL A DÉCOUVERT.
   * Sans lui, un JWKS bien formé mais portant une AUTRE clé produirait exactement le même
   * symptôme qu'un middleware cassé (tout est rejeté), et le diagnostic partirait du mauvais
   * côté. L'assertion est CROSS-SYSTEM : la clé recomposée depuis `n`/`e` doit être, octet
   * pour octet, la moitié publique de la paire jetable injectée au backend en `JWT_PRIVATE_KEY`.
   *
   * ⚠ Requête DIRECTE vers le backend (`BACKEND_ORIGIN`), pas via `baseURL` : le rewrite
   * same-origin de Next ne couvre que `/api/*`, or ce chemin est à la racine (RFC 8615).
   * ⚠ Pas de `Origin` sur cette requête — elle ne dit donc RIEN du CORS, et n'a pas à le dire :
   * le `fetch` du middleware part lui aussi de serveur à serveur, sans `Origin`.
   */
  test('le backend PUBLIE un JWKS anonyme portant exactement la clé de signature', async ({
    request,
  }) => {
    const response = await request.get(`${BACKEND_ORIGIN}${JWKS_PATH}`)

    expect(
      response.status(),
      `${BACKEND_ORIGIN}${JWKS_PATH} doit répondre 200 SANS authentification — un 401 signifie ` +
        'que la whitelist de SecurityConfig a sauté et que la découverte boucle sur elle-même.',
    ).toBe(200)

    const jwks = (await response.json()) as { keys?: Record<string, string>[] }
    const key = jwks.keys?.[0]
    expect(key, 'le JWKS ne porte aucune clé').toBeDefined()
    expect(key!.kty).toBe('RSA')
    expect(key!.alg).toBe('RS256')
    expect(key!.use).toBe('sig')
    expect(key!.kid?.length ?? 0).toBeGreaterThan(0)

    expect(
      spkiBase64FromJwk(key!.n, key!.e),
      'la clé PUBLIÉE diffère de la clé de la paire injectée au backend : le middleware ' +
        'découvrirait une clé qui ne vérifie aucun jeton réel.',
    ).toBe(PUBLIC_KEY_SPKI_BASE64)
  })

  /**
   * CONTRÔLE POSITIF de la forge — sans lui, les cas négatifs pourraient être verts pour la
   * mauvaise raison (contexte cassé, cookie mal posé, route mal orthographiée) : tout
   * renverrait 307 et le fichier serait « vert » sans rien éprouver.
   */
  test('contrôle positif : le jeton AUTHENTIQUE réinjecté ouvre la route protégée', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: 'jwt', value: readAuthenticJwt(), url: baseURL! }])

    const response = await page.request.get(PROTECTED_PATH, { maxRedirects: 0 })
    expect(
      response.status(),
      'le jeton réel doit passer : sinon la paire de clés est dépareillée, pas la forge en cause',
    ).toBe(200)
  })

  /**
   * CAS 2 de l'audit — signature falsifiée. En-tête et charge utile restent authentiques :
   * seule la signature diffère. Le 307 (et non un 500) est explicitement affirmé : une
   * exception non catchée dans le middleware produirait un 500 sur TOUTES les routes
   * protégées (BUG-S45-001), régression bien plus grave qu'un cookie accepté à tort.
   */
  test('signature falsifiée -> 307 vers /fr/login, aucun octet du shell protégé', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([
      { name: 'jwt', value: tamperSignature(readAuthenticJwt()), url: baseURL! },
    ])

    const response = await page.request.get(PROTECTED_PATH, { maxRedirects: 0 })

    expect(response.status(), 'ni 200 (accès), ni 500 (garde en panne)').toBe(307)
    expect(new URL(response.headers()['location'], baseURL).pathname).toBe('/fr/login')

    const body = await response.text()
    expect(body).not.toContain('data-testid="dashboard"')
    expect(body).not.toContain('data-testid="app-shell"')

    // La navigation UI atterrit bien sur le formulaire de connexion (pas d'écran blanc).
    await page.goto(PROTECTED_PATH)
    await expect(page.getByTestId('login-form')).toBeVisible()
    await expect(page.getByTestId('dashboard')).toHaveCount(0)
  })

  /**
   * CAS 3 de l'audit — `alg: none`. Claims authentiques, `exp` dans le futur : le SEUL motif
   * de rejet possible est l'algorithme. Un vérifieur qui se fie à l'en-tête fourni par le
   * porteur accepterait ce jeton sans aucune clé.
   */
  test('alg: none (jeton sans signature) -> 307, aucun accès', async ({
    page,
    context,
    baseURL,
  }) => {
    const forged = forgeAlgNone(claimsWithFutureExp(readAuthenticJwt()))
    await context.addCookies([{ name: 'jwt', value: forged, url: baseURL! }])

    const response = await page.request.get(PROTECTED_PATH, { maxRedirects: 0 })

    expect(response.status()).toBe(307)
    expect(new URL(response.headers()['location'], baseURL).pathname).toBe('/fr/login')
    expect(await response.text()).not.toContain('data-testid="dashboard"')
  })

  /**
   * Complément au cas 3 — confusion d'algorithme par HMAC. La clé publique est PUBLIQUE :
   * si `HS256` était accepté, elle deviendrait un secret de frappe et n'importe qui pourrait
   * forger une identité valide. Cas gratuit à écrire, moitié manquante de la classe d'attaque.
   */
  test('alg: HS256 signé avec la clé publique -> 307, aucun accès', async ({
    page,
    context,
    baseURL,
  }) => {
    const forged = forgeHs256(claimsWithFutureExp(readAuthenticJwt()))
    await context.addCookies([{ name: 'jwt', value: forged, url: baseURL! }])

    const response = await page.request.get(PROTECTED_PATH, { maxRedirects: 0 })

    expect(response.status()).toBe(307)
    expect(new URL(response.headers()['location'], baseURL).pathname).toBe('/fr/login')
  })

  /**
   * CAS 4 de l'audit — jeton EXPIRÉ mais AUTHENTIQUEMENT signé.
   *
   * ⚠ La signature doit être VALIDE, sinon le rejet viendrait de la signature et l'expiration
   * ne serait pas éprouvée du tout. D'où la clé privée (`E2E_JWT_PRIVATE_KEY`) : sans elle, ce
   * cas SKIPPE plutôt que de se déguiser en test d'expiration.
   */
  test('jeton expiré (signature VALIDE, exp dépassée) -> 307, aucun accès', async ({
    page,
    context,
    baseURL,
  }) => {
    test.skip(
      !SIGNING_KEY_AVAILABLE,
      'E2E_JWT_PRIVATE_KEY absente : impossible de produire une signature authentique, donc ' +
        "impossible de distinguer un rejet pour expiration d'un rejet pour signature.",
    )

    const nowSec = Math.floor(Date.now() / 1000)
    const expired = signRs256({
      ...decodeClaims(readAuthenticJwt()),
      iat: nowSec - 7200,
      exp: nowSec - 60, // expiré il y a une minute
    })

    // Auto-contrôle : la signature du jeton forgé est bien valide — c'est ce qui fait de ce
    // cas un test d'EXPIRATION et non un doublon du cas « signature falsifiée ».
    expect(verifyRs256(expired), 'le jeton expiré doit être authentiquement signé').toBe(true)

    await context.addCookies([{ name: 'jwt', value: expired, url: baseURL! }])

    const response = await page.request.get(PROTECTED_PATH, { maxRedirects: 0 })

    expect(response.status()).toBe(307)
    expect(new URL(response.headers()['location'], baseURL).pathname).toBe('/fr/login')
  })
})

test.describe('Signature RS256 — parcours nominal, session réellement émise par le backend', () => {
  // Session RÉELLE : register + login UI contre le backend, provisionnés par le projet `setup`.
  test.use({ storageState: SHARED.storageState })

  test.skip(
    !SIGNATURE_VERIFICATION_CONFIGURED,
    'AUTH_JWT_PUBLIC_KEY absente du process de test (mode dégradé) — cf. auth-signature.spec.ts.',
  )

  /**
   * CAS 1 de l'audit. Les deux moitiés de l'assertion comptent :
   *  - le jeton du backend est vérifiable par la clé publique publiée au frontend
   *    (appairage RÉEL, le point aveugle des suites unitaires) ;
   *  - le middleware, vérification ACTIVE, le laisse effectivement passer.
   */
  test('un jeton réellement émis par le backend est accepté par la garde', async ({ page }) => {
    const jwt = readAuthenticJwt()

    // 1. Le backend a bien signé en RS256 (et non HS256, ni un algo inattendu).
    expect(decodeHeader(jwt).alg, 'JwtService doit signer en RS256 (#323)').toBe('RS256')

    // 2. APPAIRAGE : la clé publique servie au middleware vérifie ce jeton précis. C'est
    //    l'assertion cross-system : elle échoue si les deux côtés utilisent des paires
    //    différentes, un format de clé divergent (SPKI vs PKCS#1) ou un encodage divergent.
    expect(PUBLIC_KEY_SPKI_BASE64.length, 'clé publique requise pour ce cas').toBeGreaterThan(0)
    expect(verifyRs256(jwt), 'le jeton du backend doit se vérifier avec AUTH_JWT_PUBLIC_KEY').toBe(
      true,
    )

    // 3. `exp` présent et futur — `auth-token-verify.ts` rejette tout jeton sans `exp`.
    const exp = decodeClaims(jwt).exp
    expect(typeof exp).toBe('number')
    expect((exp as number) * 1000).toBeGreaterThan(Date.now())

    // 4. La garde laisse passer : 200 SANS redirection, sur la réponse HTTP brute.
    const response = await page.request.get(PROTECTED_PATH, { maxRedirects: 0 })
    expect(response.status()).toBe(200)

    // 5. Et la page connectée se monte réellement.
    await page.goto(PROTECTED_PATH)
    await expect(page.getByTestId('dashboard')).toBeVisible()
    await expect(page).toHaveURL(/\/fr\/dashboard$/)
  })
})
