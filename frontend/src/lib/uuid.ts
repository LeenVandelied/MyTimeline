const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Vrai pour un UUID textuel (toutes versions), faux pour tout autre identifiant. */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}
