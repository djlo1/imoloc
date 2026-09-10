-- Phase 1 — Propriete & gestion
-- Additif : biens.proprietaire_id n'est pas supprime (le code continue
-- de fonctionner avec), il sera abandonne une fois le wizard/la fiche
-- reecrits pour lire biens_proprietaires.

-- ─────────────────────────────────────────────────────────
-- 1. Multi-proprietaires
-- ─────────────────────────────────────────────────────────
create table if not exists biens_proprietaires (
  id              uuid primary key default gen_random_uuid(),
  bien_id         uuid not null references biens(id) on delete cascade,
  proprietaire_id uuid not null references proprietaires(id) on delete cascade,
  pourcentage     numeric(5,2) not null default 100.00 check (pourcentage > 0 and pourcentage <= 100),
  date_debut      date not null default current_date,
  date_fin        date,
  statut          text not null default 'actif' check (statut in ('actif','ancien')),
  created_at      timestamptz not null default now(),
  unique (bien_id, proprietaire_id)
);
create index if not exists idx_biens_proprietaires_bien on biens_proprietaires(bien_id);
create index if not exists idx_biens_proprietaires_proprietaire on biens_proprietaires(proprietaire_id);

-- Bascule des biens existants (proprietaire unique -> 100%)
insert into biens_proprietaires (bien_id, proprietaire_id, pourcentage, statut)
select id, proprietaire_id, 100.00, 'actif'
from biens
where proprietaire_id is not null
on conflict (bien_id, proprietaire_id) do nothing;

-- ─────────────────────────────────────────────────────────
-- 2. Mandats (gestion locative + vente, meme table)
-- ─────────────────────────────────────────────────────────
create table if not exists mandats (
  id                          uuid primary key default gen_random_uuid(),
  bien_id                     uuid not null references biens(id) on delete cascade,
  proprietaire_id             uuid not null references proprietaires(id) on delete cascade,
  agence_id                   uuid not null references agences(id) on delete cascade,
  agent_responsable_id        uuid references auth.users(id),
  categorie_mandat            text not null default 'gestion_locative' check (categorie_mandat in ('gestion_locative','vente')),
  type_mandat                 text check (type_mandat in ('exclusif','non_exclusif')),
  numero_mandat               text,
  date_debut                  date,
  date_fin                    date,
  commission_gestion          numeric(6,3),
  commission_location         numeric(6,3),
  commission_renouvellement   numeric(6,3),
  frais_administratifs        numeric(12,2),
  conditions_particulieres    text,
  frequence_reporting         text check (frequence_reporting in ('mensuel','trimestriel','annuel')),
  statut                      text not null default 'actif' check (statut in ('actif','expire','resilie','brouillon')),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index if not exists idx_mandats_bien on mandats(bien_id);
create index if not exists idx_mandats_proprietaire on mandats(proprietaire_id);
create index if not exists idx_mandats_agence on mandats(agence_id);
create index if not exists idx_mandats_date_fin on mandats(date_fin);

-- ─────────────────────────────────────────────────────────
-- 3. Cascade de commission — niveau 1 : defauts de l'agence
-- ─────────────────────────────────────────────────────────
alter table agences
  add column if not exists taux_commission_defaut_gestion  numeric(6,3),
  add column if not exists taux_commission_defaut_location numeric(6,3),
  add column if not exists taux_commission_defaut_vente    numeric(6,3);

-- ─────────────────────────────────────────────────────────
-- 4. Mode de reversement au proprietaire
-- ─────────────────────────────────────────────────────────
alter table proprietaires
  add column if not exists mode_reversement        text check (mode_reversement in ('virement_bancaire','mtn_momo','moov_money')),
  add column if not exists compte_bancaire_banque   text,
  add column if not exists compte_bancaire_numero   text,
  add column if not exists compte_bancaire_titulaire text,
  add column if not exists numero_mobile_money      text;

-- ─────────────────────────────────────────────────────────
-- 5. Moteur pays — domaine fiscalite (Benin + repli generique)
-- ─────────────────────────────────────────────────────────
insert into country_field_schemas (pays, domaine, cle, label, obligatoire, ordre) values
  ('__generic__','fiscalite','taxe_propriete','Taxe fonciere / impot propriete', false, 10),

  ('Benin','fiscalite','taxe_fonciere_unique','Taxe Fonciere Unique (TFU)', false, 10),
  ('Benin','fiscalite','autre_taxe_locale','Autre taxe locale', false, 20)
on conflict (pays, domaine, cle) do nothing;
