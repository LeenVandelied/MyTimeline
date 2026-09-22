-- =============================================================
-- V1__baseline.sql — Baseline schéma (issue #42)
--
-- Reflète EXACTEMENT le schéma généré par Hibernate (ddl-auto export
-- via jakarta.persistence.schema-generation, source=metadata) pour les
-- entités UserEntity / ProductEntity / EventEntity / CategoryEntity.
--
-- Décision (Option A) : les contraintes UNIQUE auto-générées par Hibernate
-- pour @Column(unique=true) sur users.username / users.email (#32) ne sont
-- PAS posées ici. Elles sont créées avec des noms STABLES dans V2
-- (uq_users_username / uq_users_email). Cela évite des uniques redondantes
-- et fait de Flyway la source unique de vérité des contraintes nommées.
-- `validate` ne contrôle pas les contraintes UNIQUE → aucun échec au boot.
--
-- Types : Postgres `uuid` pour les PK/FK (GenerationType.AUTO + UUID),
-- `varchar(255)` pour les String non bornés, conforme à l'export Hibernate.
-- =============================================================

create table categories (
    id   uuid not null,
    name varchar(255),
    primary key (id)
);

create table users (
    id       uuid not null,
    email    varchar(255),
    name     varchar(255),
    password varchar(255),
    role     varchar(255),
    username varchar(255),
    primary key (id)
);

create table products (
    id          uuid not null,
    category_id uuid not null,
    user_id     uuid,
    name        varchar(255),
    primary key (id)
);

create table events (
    id              uuid not null,
    product_id      uuid not null,
    title           varchar(255),
    type            varchar(255),
    duration_value  integer,
    duration_unit   varchar(255),
    is_recurring    boolean,
    recurrence_unit varchar(255),
    start_date      date,
    end_date        date,
    is_all_day      boolean,
    background_color varchar(255),
    border_color    varchar(255),
    text_color      varchar(255),
    primary key (id)
);

alter table if exists products
    add constraint fk_products_category
    foreign key (category_id) references categories;

alter table if exists products
    add constraint fk_products_user
    foreign key (user_id) references users;

alter table if exists events
    add constraint fk_events_product
    foreign key (product_id) references products;
