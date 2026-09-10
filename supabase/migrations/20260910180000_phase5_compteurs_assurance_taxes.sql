-- Phase 5 — Compteurs, assurance, taxes (points 27-29). Trois sous-systemes
-- independants, chacun rattache a un bien, tous en lecture/ecriture large
-- pour l'instant (meme posture que le reste du projet).

-- ─────────────────────────────────────────────────────────
-- 1. Compteurs + registre de releves (append-only)
-- ─────────────────────────────────────────────────────────
create table if not exists compteurs (
  id                   uuid primary key default gen_random_uuid(),
  bien_id              uuid not null references biens(id) on delete cascade,
  type_compteur        text not null, -- eau / electricite / gaz / internet / autre
  numero               text,
  numero_serie         text,
  fournisseur          text,
  unite                text, -- kWh, m3, ...
  emplacement          text,
  individuel_collectif text not null default 'individuel' check (individuel_collectif in ('individuel','collectif')),
  date_installation    date,
  souscripteur         text check (souscripteur in ('proprietaire','locataire','agence')),
  created_at           timestamptz not null default now()
);
create index if not exists idx_compteurs_bien on compteurs(bien_id);

create table if not exists releves_compteurs (
  id                 uuid primary key default gen_random_uuid(),
  compteur_id        uuid not null references compteurs(id) on delete cascade,
  date_releve        date not null default current_date,
  valeur             numeric(12,2) not null,
  contexte           text not null default 'routine' check (contexte in ('routine','entree_edl','sortie_edl')),
  etat_des_lieux_id  uuid references etats_des_lieux(id) on delete set null,
  releve_par         uuid references auth.users(id),
  notes              text,
  created_at         timestamptz not null default now()
);
create index if not exists idx_releves_compteur on releves_compteurs(compteur_id);

-- ─────────────────────────────────────────────────────────
-- 2. Assurance (plusieurs polices possibles par bien)
-- ─────────────────────────────────────────────────────────
create table if not exists assurances (
  id                uuid primary key default gen_random_uuid(),
  bien_id           uuid not null references biens(id) on delete cascade,
  assureur          text,
  numero_police     text,
  type_assurance    text, -- habitation / multirisque / responsabilite_civile / autre
  date_debut        date,
  date_expiration   date,
  prime             numeric(12,2),
  franchise         numeric(12,2),
  montant_couvert   numeric(14,2),
  risques_couverts  text,
  contact_assureur  text,
  zone_inondable    boolean not null default false,
  risque_naturel    text,
  statut            text not null default 'active' check (statut in ('active','expiree','resiliee')),
  created_at        timestamptz not null default now()
);
create index if not exists idx_assurances_bien on assurances(bien_id);

-- ─────────────────────────────────────────────────────────
-- 3. Taxes & fiscalite (separe des charges operationnelles :
--    obligation legale avec penalites de retard)
-- ─────────────────────────────────────────────────────────
create table if not exists taxes_bien (
  id             uuid primary key default gen_random_uuid(),
  bien_id        uuid not null references biens(id) on delete cascade,
  type_taxe      text not null, -- pilote par country_field_schemas (domaine fiscalite)
  nom_taxe       text,
  autorite       text,
  numero_fiscal  text,
  montant        numeric(12,2),
  taux           numeric(5,2),
  frequence      text check (frequence in ('mensuelle','trimestrielle','annuelle','unique')),
  date_echeance  date,
  statut         text not null default 'a_jour' check (statut in ('a_jour','en_retard','paye')),
  created_at     timestamptz not null default now()
);
create index if not exists idx_taxes_bien_bien on taxes_bien(bien_id);

-- ─────────────────────────────────────────────────────────
-- 4. RLS — meme posture que les autres tables du projet
-- ─────────────────────────────────────────────────────────
alter table compteurs         enable row level security;
alter table releves_compteurs enable row level security;
alter table assurances        enable row level security;
alter table taxes_bien        enable row level security;

create policy "authenticated_all_compteurs"         on compteurs         for all to authenticated using (true) with check (true);
create policy "authenticated_all_releves_compteurs" on releves_compteurs for all to authenticated using (true) with check (true);
create policy "authenticated_all_assurances"        on assurances        for all to authenticated using (true) with check (true);
create policy "authenticated_all_taxes_bien"        on taxes_bien        for all to authenticated using (true) with check (true);
