[BRIEFING ISSUE #110]

## Issue
[DB] Index manquants sur les colonnes FK (products, events)

## Contexte
Détecté pendant la review Sprint 3 (db-expert, PR #106). La baseline `V1__baseline.sql` crée les FK (`fk_products_category`, `fk_products_user`, `fk_events_product`) mais PostgreSQL ne crée PAS automatiquement d'index sur les colonnes portant une FK.

## Colonnes sans index
- `products.category_id`
- `products.user_id`
- `events.product_id`

## Impact
Jointures et cascades (`Product → events` en `cascade=ALL, orphanRemoval=true`) non indexées → scans séquentiels à mesure que le volume croît.

## À faire
- Nouvelle migration `V4` (ou regrouper avec #108) : `CREATE INDEX idx_products_category ON products(category_id);` + `idx_products_user ON products(user_id);` + `idx_events_product ON events(product_id);`
- Idempotence (`IF NOT EXISTS`). Rollback commenté. NE PAS éditer V1/V2/V3 (déjà appliquées → checksum).

## Triage estimé
S | Domaine : devops / DB


## Plan d'implementation (architect, /sprint plan)
```yaml
issue_110:
  fichiers_cles: ["backend/src/main/resources/db/migration/V5__fk_indexes.sql"]
  couches_touchees: ["infrastructure/db"]
  strategie_test: "integration Testcontainers — V1->V5 sans erreur ; verifier index crees (pg_indexes)"
  risque_regression: "manque IF NOT EXISTS -> echec si index deja cree manuellement en dev ; NE PAS editer V1..V4 (checksum)"
  ordre_ecriture: "V5 : CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id) ; idx_products_user ON products(user_id) ; idx_events_product ON events(product_id) ; rollback commente"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "CONFIRME — V1__baseline.sql cree les FK fk_products_category/fk_products_user/fk_events_product mais AUCUN CREATE INDEX (PG ne les cree pas auto sur les colonnes FK)."
```
IMPORTANT : vérifie les noms RÉELS des colonnes FK dans V1__baseline.sql avant d'écrire les CREATE INDEX (ne devine pas category_id/user_id/product_id — confirme). V4 (#108) est déjà sur HEAD : ta migration est V5.

## Triage
Taille: S
Modele: opus
Effort: high

## Référence — définitions FK réelles (V1__baseline.sql, extrait)
Confirme les noms de colonnes ci-dessous AVANT d'écrire les CREATE INDEX :
```sql
19:create table categories (
25:create table users (
35:create table products (
37:    category_id uuid not null,
38:    user_id     uuid,
43:create table events (
45:    product_id      uuid not null,
62:    add constraint fk_products_category
63:    foreign key (category_id) references categories;
66:    add constraint fk_products_user
67:    foreign key (user_id) references users;
70:    add constraint fk_events_product
71:    foreign key (product_id) references products;
```

Note : V4 (#108) vient d'ajouter des CHECK/NOT NULL sur events (déjà sur HEAD) — n'y touche pas, ta migration est V5 et ne concerne QUE les index FK.
