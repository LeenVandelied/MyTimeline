export type KeyDiff = {
  file: string
  locale: string
  missing: string[]
  extra: string[]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Chemins pointés des feuilles, triés. Un tableau est une feuille, un objet vide ne rend rien.
export function flattenKeys(obj: unknown): string[] {
  const out: string[] = []
  const walk = (value: unknown, path: string) => {
    if (isPlainObject(value)) {
      for (const [key, child] of Object.entries(value)) {
        walk(child, path ? `${path}.${key}` : key)
      }
    } else if (path) {
      out.push(path)
    }
  }
  walk(obj, '')
  return out.sort()
}

// Un élément par langue (hors référence) qui diverge de la référence, dans l'ordre de byLocale.
export function diffLocales(
  namespace: string,
  byLocale: Record<string, string[]>,
  reference = 'fr',
): KeyDiff[] {
  const refKeys = byLocale[reference] ?? []
  const refSet = new Set(refKeys)
  const diffs: KeyDiff[] = []
  for (const [locale, keys] of Object.entries(byLocale)) {
    if (locale === reference) continue
    const set = new Set(keys)
    const missing = refKeys.filter((k) => !set.has(k)).sort()
    const extra = keys.filter((k) => !refSet.has(k)).sort()
    if (missing.length || extra.length) {
      diffs.push({ file: namespace, locale, missing, extra })
    }
  }
  return diffs
}
