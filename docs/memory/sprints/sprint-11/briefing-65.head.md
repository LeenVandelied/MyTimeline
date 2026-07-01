[BRIEFING ISSUE #65]

## Issue
[FEATURE] Frontend : Dialogs de confirmation (desktop + mobile)

## Contexte
Actuellement, les boutons "Supprimer" (événement, produit, catégorie) agissent sans demander de confirmation, ce qui expose les utilisateurs à des pertes de données irréversibles. La suppression d'une catégorie avec des produits liés provoque en plus une violation FK côté backend si aucune réassignation n'est effectuée.

## À faire
Créer un composant `DeleteConfirmDialog` (ou `DeleteConfirmSheet` sur mobile) avec 3 variantes :

**Variante événement** :
- Message : "Supprimer cet événement ?"
- Si l'événement appartient à une série récurrente : warning "Cette action supprime uniquement cet événement, pas la série."
- Actions : Annuler / Supprimer

**Variante produit** :
- Message : "Supprimer ce produit ?"
- Actions : Annuler / Supprimer (archive via #50)

**Variante catégorie** :
- Message : "Supprimer cette catégorie ?"
- Si des produits référencent la catégorie : afficher un `<Select>` de réassignation obligatoire ("Déplacer les produits vers…") alimenté par `GET /api/categories` filtré (sans la catégorie à supprimer)
- Le bouton "Supprimer" est désactivé tant que la réassignation n'est pas choisie
- Actions : Annuler / Supprimer (+ réassigner)

**Layout** :
- Desktop : dialog modal centré
- Mobile : bottom sheet ancré en bas, boutons stackés verticalement, swipe-down pour annuler

## BR impactées
- BR-CAT-002 — Suppression d'une catégorie inexistante rejetée (le dialog gère aussi l'erreur 404 retournée par l'API)

## Critères d'acceptation
- [ ] Les 3 variantes (événement / produit / catégorie) sont implémentées
- [ ] La variante catégorie avec produits liés affiche le select de réassignation obligatoire
- [ ] Le bouton "Supprimer" de la variante catégorie est désactivé sans sélection de réassignation
- [ ] La variante événement affiche le warning série si applicable
- [ ] Le layout mobile est un bottom sheet avec boutons stackés et swipe-down
- [ ] Le dialog gère l'état `deleting` (spinner + désactivation des boutons)
- [ ] Une erreur API (404, 409) s'affiche inline dans le dialog

## Piste technique
- Nouveau fichier : `frontend/src/components/shared/DeleteConfirmDialog.tsx`
- Props : `variant: 'event' | 'product' | 'category'`, `onConfirm`, `onCancel`, `isRecurring?: boolean`, `linkedProductsCount?: number`
- Hook TanStack Query : `useCategories()` pour le select de réassignation (le créer s'il n'existe pas — `GET /api/categories`)
- Tokens Graphite (#45) pour les couleurs danger et les états désactivés
- Vérifier dans le registre composants si un `Dialog` ou `AlertDialog` de base existe déjà avant de créer

## Risques techniques
- Le select de réassignation doit filtrer la catégorie en cours de suppression : si l'utilisateur n'a qu'une seule catégorie, la suppression est impossible — afficher un message explicatif plutôt que bloquer silencieusement.

## Plan d'implementation (architect, /sprint plan)
```yaml
issue_0065:
  fichiers_cles:
    - "frontend/src/components/shared/DeleteConfirmDialog.tsx  # nouveau"
  couches_touchees: ["frontend"]
  strategie_test: "unit (3 variantes, bouton desactive sans reassignation, etat deleting, erreur inline 404/409)"
  risque_regression: "Select reassignation vide si user n'a qu'une categorie -> message explicatif requis (pas blocage silencieux)."
  ordre_ecriture: "frontend — verifier registre composants (AlertDialog Radix existant ?) avant creation"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"
```

## Triage
Taille: S
Modele: opus
Effort: high
