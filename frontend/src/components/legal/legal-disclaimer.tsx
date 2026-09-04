/**
 * Avertissement « la version française fait foi », affiché en tête des pages
 * légales HORS locale `fr` — #60, absorbe #172.
 *
 * L'appelant décide de l'afficher (`shouldShowLegalDisclaimer`) ; ce composant
 * ne fait que le rendre. `role="note"` l'expose comme un commentaire adjacent
 * au contenu plutôt que comme une alerte : le texte est informatif, pas urgent,
 * et un `role="alert"` le ferait annoncer de force au chargement.
 */
export function LegalDisclaimer({ children }: { children: string }) {
  return (
    <p
      role="note"
      data-testid="legal-disclaimer"
      className="bg-surface border border-rule rounded-xl px-4 py-3 mb-8 text-sm text-ink-muted"
    >
      {children}
    </p>
  )
}
