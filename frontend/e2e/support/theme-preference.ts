import type { Page, Request } from '@playwright/test'

/**
 * #653 — La préférence de thème est désormais PORTÉE PAR LE COMPTE : toute
 * bascule faite par un utilisateur authentifié part en `PUT /api/me/preferences`.
 *
 * LE RISQUE COUVERT ICI. Les specs qui basculent le thème avec le compte PARTAGÉ
 * (`SHARED`, storageState) écriraient une préférence sur ce compte, et l'API ne
 * permet PAS de la remettre à `null` (ADR-010 § 2) : l'état serait acquis pour
 * tout le reste du run. Aujourd'hui aucune spec n'en dépend (l'arbitrage n'a lieu
 * qu'à la CONNEXION par le formulaire, et seul `auth.setup.ts` connecte `SHARED`
 * ainsi — en passe 1 avant toute bascule), mais la passe 2 de la CI rejoue
 * `auth.setup.ts` contre le MÊME backend : le compte y appliquerait sa préférence
 * et l'écrirait dans `shared.json` (le storageState porte aussi `localStorage`).
 *
 * LA PARADE. On répond au `PUT` depuis le navigateur, sans le laisser atteindre le
 * backend : la réponse est le `UserResponse` RÉEL du compte (relu par
 * `GET /api/auth/me`) avec la valeur demandée, donc conforme au contrat que parse
 * le front (`UserSchema`). Le compte partagé reste à `null`.
 *
 * Renvoie la liste (vivante) des valeurs demandées, pour qu'une spec puisse
 * vérifier que sa bascule a bien été confiée à la persistance de compte.
 *
 * ⚠ À N'UTILISER QU'AVEC UN COMPTE PARTAGÉ. La persistance réelle est l'objet de
 * `sprint-111-theme-account-preference.spec.ts`, sur un compte neuf.
 */
export async function keepThemeOffSharedAccount(page: Page): Promise<string[]> {
  const requested: string[] = []
  await page.route('**/api/me/preferences', async (route) => {
    if (route.request().method() !== 'PUT') return route.fallback()
    const body = route.request().postDataJSON() as { themePreference?: unknown }
    const value = String(body?.themePreference)
    requested.push(value)
    // `page.request` porte les cookies du contexte et n'est pas intercepté par
    // `page.route` : c'est le vrai /me du compte courant.
    const me = await page.request.get('/api/auth/me')
    const user = (await me.json()) as Record<string, unknown>
    await route.fulfill({ status: 200, json: { ...user, themePreference: value } })
  })
  return requested
}

/** Vrai pour une requête `PUT /api/me/preferences` (écriture de la préférence). */
export function isThemePreferenceWrite(request: Request): boolean {
  return request.method() === 'PUT' && /\/api\/me\/preferences(?:\?|$)/.test(request.url())
}
