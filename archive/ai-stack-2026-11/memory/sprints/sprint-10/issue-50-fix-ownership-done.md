# Fix sécurité — ownership catégorie cible sur create/update produit (#50)

**Commit :** a94b279
**Origine :** security-expert (Phase 5) — CRITIQUE + MAJEUR sur `ProductServiceImpl`.

## Faille
Avec le modèle d'ownership catégorie de #52 (`Category.ownerId`, NULL=système), le service produit n'assurait pas que la catégorie cible appartient à l'appelant :
- CRITIQUE — `updateProduct` (PATCH) : `categoryId` d'un autre user accepté → linkage cross-tenant + oracle 404/200 pour énumérer les UUID de catégories d'autrui.
- MAJEUR — `createProduct` : même trou à la création.

## Correctif
Helper privé `resolveAssignableCategory(categoryId, callerId)` dans `ProductServiceImpl` : catégorie assignable SEULEMENT si `ownerId == callerId` OU `ownerId == null` (système), sinon `CategoryNotFoundException` → **404** (choix anti-énumération, PAS 403).
- `createProduct` : callerId = `user.getId()`.
- `updateProduct` : callerId = `product.getUser().getId()` (signature inchangée ; ownership produit déjà garanti au controller).
- Mapper OK : `CategoryMapper.toDomain` peuple déjà `ownerId` (aucun fix mapper).

## Tests
+6 cas dans `ProductServiceImplTest` (create autrui→404/no-save, create système→OK, create propre→OK, update autrui→404/inchangé/no-save, update système→OK, update propre→OK). **Suite backend 131/131 verte** (125→131).

## Signaux mémoire
- `[MEMORY:pitfall]` Tout endpoint prenant un `categoryId` (ou tout id de ressource « cible ») doit valider l'ownership de la CIBLE contre le caller, pas seulement l'ownership de la ressource parente. 404 systématique sur ressource d'autrui pour fermer l'oracle d'énumération d'UUID.

STATUS: COMPLETED
